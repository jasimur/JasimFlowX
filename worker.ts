import handler from "vinext/server/fetch-handler";
import { firebaseOwnerKey, readFirebaseSession } from "./lib/firebase-server-auth";

const OWNER_HEADER = "x-jasimflow-owner";
const EMAIL_HEADER = "x-jasimflow-email";
const AUTH_KIND_HEADER = "x-jasimflow-auth-kind";

type AccessJwtHeader = {
  alg?: string;
  kid?: string;
};

type AccessJwtPayload = {
  aud?: string | string[];
  email?: string;
  exp?: number;
  iss?: string;
  nbf?: number;
};

type Jwk = JsonWebKey & { kid?: string };

type JwksResponse = {
  keys?: Jwk[];
};

let jwksCache: { url: string; expiresAt: number; keys: Jwk[] } | null = null;

function decodeBase64Url(value: string): Uint8Array {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(padded);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

function decodeJson<T>(value: string): T {
  return JSON.parse(new TextDecoder().decode(decodeBase64Url(value))) as T;
}

function normalizeTeamDomain(value: string): string {
  return value.trim().replace(/\/+$/, "");
}

async function getJwks(teamDomain: string): Promise<Jwk[]> {
  const url = `${teamDomain}/cdn-cgi/access/certs`;
  const now = Date.now();
  if (jwksCache?.url === url && jwksCache.expiresAt > now) return jwksCache.keys;

  const response = await fetch(url, {
    headers: { Accept: "application/json" },
    cf: { cacheTtl: 3600, cacheEverything: true },
  });
  if (!response.ok) throw new Error("Unable to load Cloudflare Access signing keys");

  const body = (await response.json()) as JwksResponse;
  const keys = Array.isArray(body.keys) ? body.keys : [];
  if (!keys.length) throw new Error("Cloudflare Access signing keys are unavailable");

  jwksCache = { url, expiresAt: now + 60 * 60 * 1000, keys };
  return keys;
}

async function verifyAccessJwt(token: string, teamDomain: string, audience: string): Promise<string> {
  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("Malformed Access token");

  const [encodedHeader, encodedPayload, encodedSignature] = parts;
  const header = decodeJson<AccessJwtHeader>(encodedHeader);
  const payload = decodeJson<AccessJwtPayload>(encodedPayload);

  if (header.alg !== "RS256" || !header.kid) throw new Error("Unsupported Access token algorithm");

  const keys = await getJwks(teamDomain);
  const jwk = keys.find((key) => key.kid === header.kid);
  if (!jwk) throw new Error("Access signing key not found");

  const key = await crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["verify"],
  );

  const data = new TextEncoder().encode(`${encodedHeader}.${encodedPayload}`);
  const signature = decodeBase64Url(encodedSignature);
  const valid = await crypto.subtle.verify(
    "RSASSA-PKCS1-v1_5",
    key,
    signature as BufferSource,
    data as BufferSource,
  );
  if (!valid) throw new Error("Invalid Access token signature");

  const now = Math.floor(Date.now() / 1000);
  if (typeof payload.exp !== "number" || payload.exp <= now) throw new Error("Expired Access token");
  if (typeof payload.nbf === "number" && payload.nbf > now + 30) throw new Error("Access token is not active yet");
  if (payload.iss !== teamDomain) throw new Error("Invalid Access token issuer");

  const audiences = Array.isArray(payload.aud) ? payload.aud : payload.aud ? [payload.aud] : [];
  if (!audiences.includes(audience)) throw new Error("Invalid Access token audience");

  const email = payload.email?.trim().toLowerCase();
  if (!email) throw new Error("Authenticated email is unavailable");
  return email;
}

function isLoopback(url: URL): boolean {
  return url.hostname === "localhost" || url.hostname === "127.0.0.1" || url.hostname === "::1";
}

function isPublicAuthPath(url: URL): boolean {
  const path = url.pathname;
  return (
    path === "/auth" ||
    path.startsWith("/api/auth/") ||
    path.startsWith("/_next/") ||
    path === "/favicon.svg" ||
    path === "/apple-touch-icon.png" ||
    path === "/manifest.webmanifest"
  );
}

function authRequiredResponse(url: URL): Response {
  if (url.pathname.startsWith("/api/")) {
    return Response.json(
      { error: "Email ও password দিয়ে আবার সাইন ইন করো।" },
      { status: 401, headers: { "Cache-Control": "no-store, private" } },
    );
  }
  return Response.redirect(new URL("/auth", url), 302);
}

export default {
  async fetch(request: Request, env: Cloudflare.Env, ctx: ExecutionContext): Promise<Response> {
    const forwarded = new Request(request);
    forwarded.headers.delete(OWNER_HEADER);
    forwarded.headers.delete(EMAIL_HEADER);
    forwarded.headers.delete(AUTH_KIND_HEADER);

    const url = new URL(request.url);
    let owner: string | null = null;
    let email: string | null = null;
    let authKind: "local" | "firebase" | "access" | null = null;

    // Local-only identity keeps development usable without weakening production.
    if (isLoopback(url)) {
      owner = "local@jasimflow.test";
      email = "local@jasimflow.test";
      authKind = "local";
    } else {
      const firebaseSession = await readFirebaseSession(request, env.AUTH_SESSION_SECRET).catch(() => null);
      if (firebaseSession) {
        owner = firebaseOwnerKey(firebaseSession.uid);
        email = firebaseSession.email;
        authKind = "firebase";
      } else {
        // Temporary migration fallback: existing Cloudflare Access sessions keep working
        // until Firebase Email/Password is fully verified and Access is retired.
        const token = request.headers.get("cf-access-jwt-assertion");
        const teamDomain = env.TEAM_DOMAIN ? normalizeTeamDomain(env.TEAM_DOMAIN) : "";
        const audience = env.POLICY_AUD?.trim() ?? "";
        if (token && teamDomain && audience) {
          try {
            email = await verifyAccessJwt(token, teamDomain, audience);
            owner = email;
            authKind = "access";
          } catch (error) {
            console.error("Cloudflare Access verification failed", error instanceof Error ? error.message : "unknown");
          }
        }
      }
    }

    if (!owner || !email || !authKind) {
      if (isPublicAuthPath(url)) return handler.fetch(forwarded, env, ctx);
      return authRequiredResponse(url);
    }

    forwarded.headers.set(OWNER_HEADER, owner);
    forwarded.headers.set(EMAIL_HEADER, email);
    forwarded.headers.set(AUTH_KIND_HEADER, authKind);
    return handler.fetch(forwarded, env, ctx);
  },
} satisfies ExportedHandler<Cloudflare.Env>;

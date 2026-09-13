import handler from "vinext/server/fetch-handler";

const OWNER_HEADER = "x-jasimflow-owner";
const EMAIL_HEADER = "x-jasimflow-email";

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
  const valid = await crypto.subtle.verify("RSASSA-PKCS1-v1_5", key, signature, data);
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

export default {
  async fetch(request: Request, env: Cloudflare.Env, ctx: ExecutionContext): Promise<Response> {
    const forwarded = new Request(request);
    forwarded.headers.delete(OWNER_HEADER);
    forwarded.headers.delete(EMAIL_HEADER);

    const url = new URL(request.url);
    let email: string | null = null;

    // Local-only identity keeps development usable without weakening production.
    if (isLoopback(url)) {
      email = "local@jasimflow.test";
    } else {
      const teamDomain = env.TEAM_DOMAIN ? normalizeTeamDomain(env.TEAM_DOMAIN) : "";
      const audience = env.POLICY_AUD?.trim() ?? "";
      if (!teamDomain || !audience) {
        return new Response("JasimFlow Access configuration is incomplete.", {
          status: 503,
          headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store, private" },
        });
      }

      const token = request.headers.get("cf-access-jwt-assertion");
      if (!token) {
        return new Response("Cloudflare Access authentication is required.", {
          status: 403,
          headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store, private" },
        });
      }

      try {
        email = await verifyAccessJwt(token, teamDomain, audience);
      } catch (error) {
        console.error("Cloudflare Access verification failed", error instanceof Error ? error.message : "unknown");
        return new Response("Cloudflare Access authentication failed.", {
          status: 403,
          headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store, private" },
        });
      }
    }

    forwarded.headers.set(OWNER_HEADER, email);
    forwarded.headers.set(EMAIL_HEADER, email);
    return handler.fetch(forwarded, env, ctx);
  },
} satisfies ExportedHandler<Cloudflare.Env>;

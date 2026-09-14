import { env } from "cloudflare:workers";
import {
  clearFirebaseSessionCookie,
  createFirebaseSessionCookie,
  firebaseOwnerKey,
  readFirebaseSession,
  verifyFirebaseIdToken,
} from "@/lib/firebase-server-auth";

export const dynamic = "force-dynamic";

function json(body: unknown, status = 200, extra: Record<string, string> = {}) {
  return Response.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store, private",
      "X-Content-Type-Options": "nosniff",
      ...extra,
    },
  });
}

function sessionSecret(): string {
  return ((env as unknown as { AUTH_SESSION_SECRET?: string }).AUTH_SESSION_SECRET || "").trim();
}

function sameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  return origin === new URL(request.url).origin;
}

export async function GET(request: Request) {
  const secret = sessionSecret();
  if (!secret) return json({ authenticated: false, configured: false }, 503);
  const identity = await readFirebaseSession(request, secret);
  if (!identity) return json({ authenticated: false, configured: true }, 401);
  return json({
    authenticated: true,
    configured: true,
    uid: identity.uid,
    email: identity.email,
    ownerKey: firebaseOwnerKey(identity.uid),
  });
}

export async function POST(request: Request) {
  if (!sameOrigin(request) || request.headers.get("sec-fetch-site") === "cross-site") {
    return json({ error: "Invalid origin" }, 403);
  }
  if (!request.headers.get("content-type")?.startsWith("application/json")) {
    return json({ error: "Invalid request" }, 415);
  }
  const secret = sessionSecret();
  if (!secret || secret.length < 32) {
    return json({ error: "JasimFlowX password login is not configured yet." }, 503);
  }
  try {
    const raw = await request.text();
    if (raw.length > 12000) return json({ error: "Request too large" }, 413);
    const body = JSON.parse(raw) as { idToken?: unknown };
    const idToken = typeof body.idToken === "string" ? body.idToken.trim() : "";
    if (!idToken) return json({ error: "Firebase login token is required." }, 400);
    const identity = await verifyFirebaseIdToken(idToken);
    const cookie = await createFirebaseSessionCookie(identity, secret);
    return json(
      {
        ok: true,
        uid: identity.uid,
        email: identity.email,
        ownerKey: firebaseOwnerKey(identity.uid),
      },
      200,
      { "Set-Cookie": cookie },
    );
  } catch (error) {
    console.error("Firebase session creation failed", error instanceof Error ? error.message : "unknown");
    return json({ error: "Email or password login could not be verified." }, 401);
  }
}

export async function DELETE(request: Request) {
  if (!sameOrigin(request) || request.headers.get("sec-fetch-site") === "cross-site") {
    return json({ error: "Invalid origin" }, 403);
  }
  return json({ ok: true }, 200, { "Set-Cookie": clearFirebaseSessionCookie() });
}

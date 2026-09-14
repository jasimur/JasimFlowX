import { FIREBASE_PROJECT_ID } from "./firebase-config";

const FIREBASE_JWKS_URL = "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com";
export const FIREBASE_SESSION_COOKIE = "jf_session";
export const FIREBASE_SESSION_MAX_AGE = 7 * 24 * 60 * 60;

type JwtHeader = { alg?: string; kid?: string };
type FirebaseClaims = {
  aud?: string;
  email?: string;
  exp?: number;
  iat?: number;
  iss?: string;
  sub?: string;
  user_id?: string;
};
type Jwk = JsonWebKey & { kid?: string };
type JwksResponse = { keys?: Jwk[] };

export type FirebaseIdentity = { uid: string; email: string };
type SessionPayload = FirebaseIdentity & { exp: number; iat: number; v: 1 };

let jwksCache: { expiresAt: number; keys: Jwk[] } | null = null;

function decodeBase64Url(value: string): Uint8Array {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(padded);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

function encodeBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function decodeJson<T>(value: string): T {
  return JSON.parse(new TextDecoder().decode(decodeBase64Url(value))) as T;
}

function encodeJson(value: unknown): string {
  return encodeBase64Url(new TextEncoder().encode(JSON.stringify(value)));
}

async function getFirebaseJwks(): Promise<Jwk[]> {
  const now = Date.now();
  if (jwksCache && jwksCache.expiresAt > now) return jwksCache.keys;
  const response = await fetch(FIREBASE_JWKS_URL, {
    headers: { Accept: "application/json" },
    cf: { cacheEverything: true, cacheTtl: 3600 },
  });
  if (!response.ok) throw new Error("Unable to load Firebase signing keys");
  const body = (await response.json()) as JwksResponse;
  const keys = Array.isArray(body.keys) ? body.keys : [];
  if (!keys.length) throw new Error("Firebase signing keys are unavailable");
  jwksCache = { expiresAt: now + 60 * 60 * 1000, keys };
  return keys;
}

export async function verifyFirebaseIdToken(token: string): Promise<FirebaseIdentity> {
  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("Malformed Firebase token");
  const [encodedHeader, encodedPayload, encodedSignature] = parts;
  const header = decodeJson<JwtHeader>(encodedHeader);
  const claims = decodeJson<FirebaseClaims>(encodedPayload);
  if (header.alg !== "RS256" || !header.kid) throw new Error("Unsupported Firebase token algorithm");

  const keys = await getFirebaseJwks();
  const jwk = keys.find((key) => key.kid === header.kid);
  if (!jwk) throw new Error("Firebase signing key not found");
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
  if (!valid) throw new Error("Invalid Firebase token signature");

  const now = Math.floor(Date.now() / 1000);
  if (claims.aud !== FIREBASE_PROJECT_ID) throw new Error("Invalid Firebase token audience");
  if (claims.iss !== `https://securetoken.google.com/${FIREBASE_PROJECT_ID}`) throw new Error("Invalid Firebase token issuer");
  if (typeof claims.exp !== "number" || claims.exp <= now) throw new Error("Expired Firebase token");
  if (typeof claims.iat !== "number" || claims.iat > now + 30) throw new Error("Invalid Firebase token issue time");
  const uid = (claims.sub || claims.user_id || "").trim();
  const email = claims.email?.trim().toLowerCase() || "";
  if (!uid || uid.length > 128 || !email) throw new Error("Firebase identity is incomplete");
  return { uid, email };
}

async function hmac(secret: string, value: string): Promise<Uint8Array> {
  if (secret.length < 32) throw new Error("AUTH_SESSION_SECRET must contain at least 32 characters");
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value));
  return new Uint8Array(signature);
}

function equalBytes(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

function readCookie(request: Request, name: string): string {
  const cookies = request.headers.get("cookie") || "";
  const prefix = `${name}=`;
  return cookies
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(prefix))
    ?.slice(prefix.length) || "";
}

export async function createFirebaseSessionCookie(identity: FirebaseIdentity, secret: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const payload: SessionPayload = { v: 1, uid: identity.uid, email: identity.email, iat: now, exp: now + FIREBASE_SESSION_MAX_AGE };
  const encoded = encodeJson(payload);
  const signature = encodeBase64Url(await hmac(secret, encoded));
  return `${FIREBASE_SESSION_COOKIE}=${encoded}.${signature}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${FIREBASE_SESSION_MAX_AGE}`;
}

export function clearFirebaseSessionCookie(): string {
  return `${FIREBASE_SESSION_COOKIE}=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0`;
}

export async function readFirebaseSession(request: Request, secret?: string): Promise<FirebaseIdentity | null> {
  if (!secret) return null;
  const raw = readCookie(request, FIREBASE_SESSION_COOKIE);
  if (!raw) return null;
  const dot = raw.lastIndexOf(".");
  if (dot <= 0) return null;
  const encoded = raw.slice(0, dot);
  const supplied = raw.slice(dot + 1);
  let suppliedBytes: Uint8Array;
  try {
    suppliedBytes = decodeBase64Url(supplied);
  } catch {
    return null;
  }
  const expected = await hmac(secret, encoded);
  if (!equalBytes(suppliedBytes, expected)) return null;
  try {
    const payload = decodeJson<SessionPayload>(encoded);
    const now = Math.floor(Date.now() / 1000);
    if (payload.v !== 1 || payload.exp <= now || payload.iat > now + 30 || !payload.uid || !payload.email) return null;
    return { uid: payload.uid, email: payload.email.toLowerCase() };
  } catch {
    return null;
  }
}

export function firebaseOwnerKey(uid: string): string {
  return `firebase:${uid}`;
}

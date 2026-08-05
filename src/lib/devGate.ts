// Signed-cookie helpers for the dev-site gate.
//
// Runs in BOTH the Edge proxy (verifying) and Node route handlers (issuing),
// so it uses Web Crypto only - no node:crypto, no bcrypt here. Password
// checking happens in Postgres via pgcrypto (see supabase/dev_access.sql);
// this file only deals with "has this browser already proved itself".

export const DEV_GATE_COOKIE = "blossom-dev-gate";
const SESSION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days - it's a dev gate, not a bank

// The signing key is derived from DEV_SITE_PASSWORD, which only exists on the
// dev project. Changing that value invalidates every existing session, which
// is a useful "log everyone out" lever.
function secret(): string | null {
  return process.env.DEV_SITE_PASSWORD || null;
}

function b64url(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function sign(payload: string, key: string): Promise<string> {
  const enc = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    enc.encode(key),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", cryptoKey, enc.encode(payload));
  return b64url(new Uint8Array(sig));
}

export interface DevSession {
  email: string;
  isAdmin: boolean;
}

export async function issueToken(session: DevSession): Promise<string | null> {
  const key = secret();
  if (!key) return null;
  const payload = `${session.email}|${session.isAdmin ? "1" : "0"}|${Date.now() + SESSION_MS}`;
  const encoded = b64url(new TextEncoder().encode(payload));
  return `${encoded}.${await sign(encoded, key)}`;
}

export async function readToken(token: string | undefined): Promise<DevSession | null> {
  const key = secret();
  if (!key || !token) return null;

  const [encoded, signature] = token.split(".");
  if (!encoded || !signature) return null;

  // Recompute rather than trust: a forged payload won't match.
  const expected = await sign(encoded, key);
  if (expected.length !== signature.length) return null;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  if (diff !== 0) return null;

  try {
    const payload = atob(encoded.replace(/-/g, "+").replace(/_/g, "/"));
    const [email, admin, expiry] = payload.split("|");
    if (!email || Number(expiry) < Date.now()) return null;
    return { email, isAdmin: admin === "1" };
  } catch {
    return null;
  }
}

// Whether the gate is switched on at all. Off in production, because
// DEV_SITE_PASSWORD only exists on the dev Vercel project - so this can never
// lock real users out of projectblossom.net.
export function gateEnabled(): boolean {
  return Boolean(secret());
}

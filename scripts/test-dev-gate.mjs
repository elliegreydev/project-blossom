import assert from "node:assert/strict";

/**
 * The dev app's access gate.
 *
 * One test here matters more than all the others: PRODUCTION MUST NEVER BE
 * GATED. Locking projectblossom.net out from behind a code meant for testers
 * would be a genuine outage for people who rely on it, and it would happen
 * silently at the proxy before any page rendered. So the two conditions that
 * enable the gate are tested from every direction, including the ones that
 * only happen if somebody sets the wrong variable on the wrong project.
 *
 * devGate reads process.env at call time rather than at import, so each case
 * sets the environment and re-imports with a cache-busting query.
 */

const PROD_SUPABASE = "https://tpbqqlbtwykfuimqgfwn.supabase.co";
const DEV_SUPABASE = "https://yqxpwxjmpyuqcwucjwqk.supabase.co";

let seq = 0;
async function load(env) {
  delete process.env.DEV_ACCESS_CODE;
  delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  for (const [k, v] of Object.entries(env)) if (v !== undefined) process.env[k] = v;
  return import(`../src/lib/devGate.ts?case=${seq++}`);
}

// Production is never gated ---------------------------------------------------

{
  // The ordinary production case: no code set at all.
  const g = await load({ NEXT_PUBLIC_SUPABASE_URL: PROD_SUPABASE });
  assert.equal(g.isDevGateEnabled(), false, "production with no code must not be gated");
}
{
  // The dangerous one. Somebody pastes DEV_ACCESS_CODE onto the production
  // project by mistake. The second condition has to save us.
  const g = await load({ DEV_ACCESS_CODE: "petunia", NEXT_PUBLIC_SUPABASE_URL: PROD_SUPABASE });
  assert.equal(
    g.isDevGateEnabled(),
    false,
    "DEV_ACCESS_CODE on production must NOT gate it, the database check is the backstop",
  );
}
{
  // No Supabase URL at all, e.g. a misconfigured build. Fail open, not closed.
  const g = await load({ DEV_ACCESS_CODE: "petunia" });
  assert.equal(g.isDevGateEnabled(), false, "an unknown database must not gate anything");
}
{
  // An empty or whitespace code is the same as no code.
  for (const code of ["", "   ", "\n"]) {
    const g = await load({ DEV_ACCESS_CODE: code, NEXT_PUBLIC_SUPABASE_URL: DEV_SUPABASE });
    assert.equal(g.isDevGateEnabled(), false, `code ${JSON.stringify(code)} must not enable the gate`);
  }
}

// Dev, with a code, is gated --------------------------------------------------

const gate = await load({ DEV_ACCESS_CODE: "Petunia-42", NEXT_PUBLIC_SUPABASE_URL: DEV_SUPABASE });
assert.equal(gate.isDevGateEnabled(), true, "dev with a code set should be gated");

// The code itself -------------------------------------------------------------

assert.equal(gate.isCorrectCode("Petunia-42"), true);
assert.equal(gate.isCorrectCode("petunia-42"), true, "case should be forgiven");
assert.equal(gate.isCorrectCode("  Petunia-42  "), true, "surrounding spaces should be forgiven");
assert.equal(gate.isCorrectCode("PETUNIA-42"), true);

assert.equal(gate.isCorrectCode("petunia42"), false, "a different code must fail");
assert.equal(gate.isCorrectCode("Petunia-4"), false, "a prefix must fail");
assert.equal(gate.isCorrectCode("Petunia-42x"), false, "a superstring must fail");
assert.equal(gate.isCorrectCode(""), false);
assert.equal(gate.isCorrectCode(null), false);
assert.equal(gate.isCorrectCode(undefined), false);
assert.equal(gate.isCorrectCode(42), false, "a non-string must never pass");
assert.equal(gate.isCorrectCode({}), false);

// The cookie ------------------------------------------------------------------

const token = gate.expectedToken();
assert.equal(gate.isValidGateCookie(token), true, "a token we issued should verify");
assert.match(token, /^[a-f0-9]{64}$/, "should be a sha256 hex digest");

assert.equal(gate.isValidGateCookie("nonsense"), false);
assert.equal(gate.isValidGateCookie(""), false);
assert.equal(gate.isValidGateCookie(null), false);
assert.equal(gate.isValidGateCookie(undefined), false);
assert.equal(gate.isValidGateCookie(token.slice(0, -1)), false, "a truncated token must fail");
assert.equal(gate.isValidGateCookie(token.toUpperCase()), false, "the token is not case-forgiving");

// Rotating the code invalidates every cookie already issued. This is the whole
// reason the cookie is derived from the code rather than stored: changing the
// environment variable IS the revocation.
{
  const rotated = await load({ DEV_ACCESS_CODE: "different-now", NEXT_PUBLIC_SUPABASE_URL: DEV_SUPABASE });
  assert.equal(
    rotated.isValidGateCookie(token),
    false,
    "changing the code must invalidate cookies issued under the old one",
  );
  assert.equal(rotated.isCorrectCode("Petunia-42"), false, "the old code must stop working");
  assert.notEqual(rotated.expectedToken(), token, "a new code must produce a new token");
}

// Paths that must stay reachable ----------------------------------------------

for (const path of [
  "/dev-access",              // the gate itself, or there is no way in
  "/api/dev-access",          // and its endpoint
  "/api/hq-enter",            // the door Ellie and Sarah come through from HQ
  "/_next/static/chunk.js",   // a gated stylesheet makes the gate unreadable
  "/manifest.webmanifest",
  "/favicon.ico",
]) {
  assert.equal(gate.isAlwaysAllowed(path), true, `${path} must never be gated`);
}

for (const path of ["/", "/track", "/settings", "/journey", "/api/aurora/chat", "/legal/privacy"]) {
  assert.equal(gate.isAlwaysAllowed(path), false, `${path} should be behind the gate`);
}

// Where we send people afterwards ---------------------------------------------
//
// An open redirect on a sign-in screen is a phishing gift, so anything that
// is not plainly a path on this site becomes the home page.

assert.equal(gate.safeReturnPath("/track/medication"), "/track/medication");
assert.equal(gate.safeReturnPath("/settings?tab=sync"), "/settings?tab=sync");

assert.equal(gate.safeReturnPath("//evil.example"), "/", "protocol-relative is another host");
assert.equal(gate.safeReturnPath("https://evil.example"), "/");
assert.equal(gate.safeReturnPath("http://evil.example"), "/");
assert.equal(gate.safeReturnPath("evil.example"), "/");
assert.equal(gate.safeReturnPath("/dev-access"), "/", "must not bounce back to the gate");
assert.equal(gate.safeReturnPath("/dev-access?next=/x"), "/");
assert.equal(gate.safeReturnPath(""), "/");
assert.equal(gate.safeReturnPath(null), "/");
assert.equal(gate.safeReturnPath(undefined), "/");
assert.equal(gate.safeReturnPath(42), "/");

console.log("dev gate: OK (production stays open under every misconfiguration tested)");

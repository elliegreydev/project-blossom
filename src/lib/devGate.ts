import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * The code on the door of the dev app.
 *
 * dev.projectblossom.net was reachable by anyone who guessed the URL, which
 * was fine while it was two people poking at it and is not fine now that
 * outside testers are being invited. This puts one shared code in front of it.
 *
 * PRODUCTION MUST NEVER BE GATED. That is the only rule here that really
 * matters: a bug in this file that locks projectblossom.net is far worse than
 * dev being open. So the gate needs two independent things to be true, exactly
 * like isHqDevEntry, and production satisfies neither:
 *
 *   1. DEV_ACCESS_CODE must be set and non-empty. It is set only on the
 *      project-blossom-dev Vercel project. Absent means no gate, and absent
 *      is the default everywhere.
 *   2. The Supabase project the build points at must be a known dev project.
 *      Production points somewhere else entirely, so even if the code above
 *      were set on production by mistake, the gate still would not engage.
 *
 * THE COOKIE IS DERIVED FROM THE CODE.
 *
 * There is no session store and nothing to clean up. The cookie is an HMAC of
 * a fixed string keyed by the code itself, so it verifies by recomputation.
 * The useful consequence is that changing DEV_ACCESS_CODE invalidates every
 * cookie that was ever issued, all at once, with no extra step. Rotating the
 * code is genuinely just changing the environment variable.
 *
 * This is a doormat, not a lock. It keeps out passers-by and search engines
 * and makes it obvious the app is not meant to be public yet. It is not
 * protecting anything sensitive: dev has its own database with no real
 * person's data in it, and every real protection lives in Supabase RLS.
 */

const DEV_SUPABASE_PROJECT_REFS = ["yqxpwxjmpyuqcwucjwqk"];

export const DEV_GATE_COOKIE = "blossom-dev-gate";
export const DEV_GATE_PATH = "/dev-access";

/** How long a device stays let in. Long enough that a tester is not asked
 *  twice in an evening, short enough that a shared device forgets. */
export const DEV_GATE_MAX_AGE = 60 * 60 * 24 * 30;

function configuredCode(): string {
  return (process.env.DEV_ACCESS_CODE ?? "").trim();
}

function pointsAtDevDatabase(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  return DEV_SUPABASE_PROJECT_REFS.some((ref) => url.includes(ref));
}

/** Both conditions, or no gate at all. Called on every request, so it stays
 *  cheap and does no I/O. */
export function isDevGateEnabled(): boolean {
  return configuredCode() !== "" && pointsAtDevDatabase();
}

/** The value we expect to find in the cookie, given the code currently set. */
export function expectedToken(code: string = configuredCode()): string {
  return createHmac("sha256", code).update(DEV_GATE_COOKIE).digest("hex");
}

function constantTimeEquals(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  // timingSafeEqual throws on a length mismatch, which would itself leak the
  // length, so the lengths are compared first and the result folded in.
  if (left.length !== right.length) {
    timingSafeEqual(left, left);
    return false;
  }
  return timingSafeEqual(left, right);
}

/** Whether the code somebody typed is the one on the door. */
export function isCorrectCode(submitted: unknown): boolean {
  const code = configuredCode();
  if (code === "" || typeof submitted !== "string") return false;
  // Case and surrounding spaces are forgiven. A code read off a phone screen
  // and typed into another device should not fail on a capital letter.
  return constantTimeEquals(submitted.trim().toLowerCase(), code.toLowerCase());
}

/** Whether a cookie we were handed is one we issued for the current code. */
export function isValidGateCookie(value: unknown): boolean {
  const code = configuredCode();
  if (code === "" || typeof value !== "string" || value === "") return false;
  return constantTimeEquals(value, expectedToken(code));
}

/**
 * Paths that must never be gated.
 *
 * The gate page itself and its endpoint, obviously, or there is no way in.
 * /api/hq-enter because that is the door Ellie and Sarah come through from
 * HQ, and gating it would mean the staff route needs the tester code, which
 * is backwards. Next's own asset paths, because a gated stylesheet renders
 * the gate page unreadable.
 */
export function isAlwaysAllowed(pathname: string): boolean {
  return (
    pathname === DEV_GATE_PATH ||
    pathname.startsWith("/api/dev-access") ||
    pathname.startsWith("/api/hq-enter") ||
    pathname.startsWith("/_next/") ||
    pathname === "/manifest.webmanifest" ||
    pathname === "/favicon.ico"
  );
}

/** Where to send somebody after they get the code right. Only ever a path on
 *  this site: an open redirect on a login screen is a phishing gift, and
 *  "//evil.example" is a URL a browser will happily treat as another host. */
export function safeReturnPath(raw: unknown): string {
  if (typeof raw !== "string" || raw === "") return "/";
  if (!raw.startsWith("/")) return "/";
  if (raw.startsWith("//")) return "/";
  if (raw.startsWith(DEV_GATE_PATH)) return "/";
  return raw;
}

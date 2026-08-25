// The shape of a failure, and nothing else.
//
// Blossom reports its breakages to Grey Studios HQ so someone finds out when
// the app stops working for a person, instead of finding out weeks later or
// never. This module is the vocabulary both halves of that share: the browser
// and the server file every failure down to the same small set of stable
// tokens before anything leaves the app.
//
// Two rules hold the rest up.
//
// One: operation and errorClass are STABLE STRINGS. HQ groups on the pair, so
// the same problem hitting a hundred people has to arrive as one row with a
// count. Interpolating an id, a name or a time into either shatters one
// problem into a hundred, and it stops being readable.
//
// Two: nothing here may carry anything a person wrote. Blossom is where people
// keep the things they haven't told anyone else, so a report says what broke
// and never what was in it. That rules out the obvious - journal text, notes,
// mood entries, search terms, email addresses - and it also rules out raw
// error messages, which is the part that catches people out. Postgres quotes
// the offending row straight back at you, so a unique-violation message on
// journal_entries can contain the entry. Everything below therefore reads
// codes and names off an error and never its message.

export type ErrorSeverity = "warning" | "error" | "fatal";

/**
 * The only context keys HQ accepts. It drops anything else silently, but that
 * allow-list is a backstop rather than permission to be careless, so the same
 * shape is enforced here as a type: a stray field is a compile error long
 * before it is somebody's data in a log.
 */
export interface ErrorContext {
  route?: string;
  method?: string;
  status?: number;
  browser?: string;
  platform?: string;
  release?: string;
  durationMs?: number;
  retryCount?: number;
}

export const ERROR_CONTEXT_KEYS = [
  "route",
  "method",
  "status",
  "browser",
  "platform",
  "release",
  "durationMs",
  "retryCount",
] as const;

/**
 * Everything the browser is allowed to report, spelled out. The endpoint that
 * forwards these to HQ has to be open to callers with no session (a sign-in
 * failure happens before there is one), so the list doubles as the guard: an
 * operation that isn't on it is dropped rather than written through.
 *
 * Written for Ellie to read. Deliberately vague where being precise would say
 * something about a person: "storing data on this device" covers the journal,
 * the intimacy log and the safety check-ins alike, and none of them are named.
 */
export const CLIENT_OPERATIONS = [
  "storing data on this device",
  "syncing their data in the background",
  "syncing their data when they asked",
  "connecting a device to their account",
  "asking for a sign-in code",
  "signing in with their code",
  "turning on reminder notifications",
  "the app falling back to its error screen",
  "an unexpected failure in the app",
] as const;

export type ClientOperation = (typeof CLIENT_OPERATIONS)[number];

export function isClientOperation(value: unknown): value is ClientOperation {
  return typeof value === "string" && (CLIENT_OPERATIONS as readonly string[]).includes(value);
}

export function isErrorSeverity(value: unknown): value is ErrorSeverity {
  return value === "warning" || value === "error" || value === "fatal";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/**
 * Files a string down to something that can only ever be a label: no spaces,
 * no punctuation, no length. Every errorClass goes through this, so even if a
 * message somehow reached it, it could not arrive as a sentence.
 */
export function token(value: string): string {
  const filed = value.trim().replace(/[^A-Za-z0-9_.-]/g, "_").slice(0, 48);
  return filed || "unknown";
}

// IndexedDB and Dexie report through DOMException names. Blossom writes
// everything to the device first, so these are not a nuisance: they are
// somebody's entry not being saved.
const DEVICE_STORAGE_ERRORS = new Set([
  "QuotaExceededError",
  "DatabaseClosedError",
  "MissingAPIError",
  "VersionError",
  "VersionChangeError",
  "InvalidStateError",
  "TransactionInactiveError",
  "ReadOnlyError",
  "ConstraintError",
  "NotFoundError",
  "DataError",
  "DataCloneError",
  "UnknownError",
  "OpenFailedError",
  "SchemaError",
  "UpgradeError",
]);

export function isDeviceStorageError(error: unknown): boolean {
  if (typeof DOMException !== "undefined" && error instanceof DOMException) return true;
  if (!isRecord(error)) return false;
  const name = typeof error.name === "string" ? error.name : "";
  if (DEVICE_STORAGE_ERRORS.has(name)) return true;
  // Dexie wraps the underlying DOMException rather than replacing it.
  return isRecord(error.inner) && DEVICE_STORAGE_ERRORS.has(String(error.inner.name ?? ""));
}

/**
 * Turns any thrown thing into one stable token. Reads codes and names only.
 * Where a message is consulted at all it is to *test* it, never to pass it on.
 */
export function errorClassOf(error: unknown): string {
  if (error === null || error === undefined) return "unknown";

  if (isRecord(error)) {
    const name = typeof error.name === "string" ? error.name : "";

    // Named storage failures keep their own name. Checked first so a device
    // running out of room reads as QuotaExceededError rather than being
    // folded into something vaguer further down.
    if (DEVICE_STORAGE_ERRORS.has(name)) return token(name);

    // Both a cancelled fetch and AbortSignal.timeout land here.
    if (name === "AbortError" || name === "TimeoutError") return "timeout";

    // Postgres and PostgREST both put the useful, stable part in `code`:
    // "23505", "42501", "PGRST116". Supabase auth uses it too ("otp_expired").
    if (typeof error.code === "string" && error.code.trim() !== "") return token(error.code);

    if (name === "TypeError") {
      const message = typeof error.message === "string" ? error.message.toLowerCase() : "";
      // The browser's way of saying the network went away mid-request. Generic
      // by construction, which is why it is safe to match on.
      if (message.includes("fetch") || message.includes("network")) return "fetch_failed";
    }

    if (typeof error.status === "number" && Number.isFinite(error.status)) {
      return `http_${Math.trunc(error.status)}`;
    }
    if (name) return token(name);
  }

  return "unknown";
}

/**
 * Extra narrowing for the one errorClass that arrives over the wire, from the
 * browser, through an endpoint that has to stay open.
 *
 * token() alone would still let "I_told_my_mum_today" through, which is nobody
 * exfiltrating anything (a caller can only send its own words) but is graffiti
 * in Ellie's error log all the same. Every real value is a short code:
 * "23505", "timeout", "fetch_failed", "QuotaExceededError", "http_429".
 *
 * THIS USED TO THROW AWAY THE CODES THAT MATTERED MOST.
 *
 * The old rules were "no longer than 24 characters, no more than 2 separators",
 * applied to the token()ed string. Supabase's auth codes are long snake_case
 * and 17 of the 57 documented ones failed one rule or both, including every
 * single rate limit and every refresh-token failure. On the night Blossom was
 * first shown publicly that cost us the two errors we most needed to read: a
 * person who could not get a sign-in code, and a background sync giving up.
 * Both arrived as "unknown", and isExpectedAuthFailure had deliberately let the
 * first one through precisely so it would be seen.
 *
 * The mistake was checking after filing. token() turns every space into an
 * underscore, so by the time it has run, "I told my mum today" and
 * "over_email_send_rate_limit" are the same shape, and length is the only thing
 * left to judge by. Checked before filing, they are nothing alike.
 *
 * So: a code is one word, in token()'s own charset, with no spaces. And a real
 * code never mixes capitals with underscores, because the vocabulary is either
 * snake_case ("over_email_send_rate_limit", "http_429") or CamelCase with no
 * underscores at all ("QuotaExceededError", "PGRST116"). A sentence filed down
 * to "I_told_my_mum_today" mixes both, which is what gives it away.
 */
export function narrowErrorClass(value: unknown): string {
  if (typeof value !== "string") return "unknown";
  const raw = value.trim();
  // Checked on the raw string, before token() can disguise a sentence as one.
  if (!/^[A-Za-z0-9][A-Za-z0-9_.-]*$/.test(raw)) return "unknown";
  if (raw.length > 48) return "unknown";
  if (/_/.test(raw) && /[A-Z]/.test(raw)) return "unknown";
  return token(raw);
}

export function httpErrorClass(status: number): string {
  return Number.isFinite(status) ? `http_${Math.trunc(status)}` : "unknown";
}

/**
 * A wrong code, an expired link, an email that isn't valid. Somebody mistyping
 * is not a breakage, and a log full of it would bury the failures that are.
 * A 429 is the exception: if Blossom's sign-in emails are being rate limited
 * then nobody can get in, and that is very much worth knowing about.
 */
export function isExpectedAuthFailure(error: unknown): boolean {
  if (!isRecord(error)) return false;
  const status = typeof error.status === "number" ? error.status : null;
  if (status === null) return false;
  return status >= 400 && status < 500 && status !== 429;
}

/**
 * How long until they can ask for another sign-in code, or null if this wasn't
 * a rate limit at all.
 *
 * Supabase enforces a fixed gap between codes to the same address, separate
 * from the hourly cap in the project's auth config. It is very easy to trip: a
 * code takes a minute to land, the person assumes the button didn't work, they
 * tap it again, and the second tap is refused. Without this they saw a bare
 * failure and had no idea it was a timer, which is a plausible way to lose
 * somebody at the door on the day they finally decided to try the app.
 *
 * The number is read out of Supabase's own message ("you can only request this
 * after 51 seconds") when it's there, and falls back to a minute when it isn't,
 * because a countdown that is roughly right is far better than no countdown.
 * Capped so a daft upstream value can't disable the button for an hour.
 */
export function rateLimitWaitSeconds(error: unknown): number | null {
  if (!isRecord(error)) return null;
  const status = typeof error.status === "number" ? error.status : null;
  const code = typeof error.code === "string" ? error.code : "";
  const rateLimited = status === 429 || (code.startsWith("over_") && code.includes("rate_limit"));
  if (!rateLimited) return null;

  const message = typeof error.message === "string" ? error.message : "";
  const found = /(\d{1,4})\s*second/i.exec(message);
  const seconds = found ? Number(found[1]) : Number.NaN;
  if (Number.isFinite(seconds) && seconds > 0 && seconds <= 300) return Math.ceil(seconds);
  return 60;
}

// Every first path segment Blossom actually serves. Anything else is somebody
// following a broken or hostile link, and becomes "/other".
const KNOWN_ROUTE_SEGMENTS = new Set([
  "about",
  "account",
  "api",
  "auth",
  "blog",
  "bridge",
  "calendar",
  "circle",
  "crisis-support",
  "data-deleted",
  "ideas",
  "join",
  "journey",
  "legal",
  "onboarding",
  "reminders",
  "roadmap",
  "search",
  "settings",
  "tickets",
  "track",
  "travel",
]);

/**
 * The first path segment and no more.
 *
 * Deeper would be more useful to debug with and is not worth what it costs.
 * "/track/intimacy" or "/settings/safety-checkins" sitting in a log next to an
 * account reference says something about a person that the failure itself
 * never needed to say. The second segment is also where every share token and
 * ticket id lives, and those are secrets. One segment is enough to know which
 * part of Blossom broke.
 */
export function coarseRoute(pathname: string): string {
  const first = pathname.split("?")[0].split("/").filter(Boolean)[0];
  if (!first) return "/";
  return KNOWN_ROUTE_SEGMENTS.has(first.toLowerCase()) ? `/${first.toLowerCase()}` : "/other";
}

/**
 * The same treatment for the route path Next hands us on the server, which is
 * a file path like "/(main)/track/journal" or "/api/tickets/notify-new".
 * API paths are kept whole: they are code, they never name a screen somebody
 * was sitting on, and knowing exactly which endpoint failed is most of the
 * answer. Page routes are cut back to one segment for the reason above.
 */
export function serverRoute(routePath: string): string {
  if (!routePath) return "/other";
  if (routePath.startsWith("/api/") || routePath === "/api") return routePath.slice(0, 120);
  // Route groups are a folder convention, not part of the URL.
  return coarseRoute(routePath.replace(/\/\([^)]*\)/g, ""));
}

const BROWSERS = new Set(["chrome", "safari", "firefox", "edge", "samsung", "other"]);
const PLATFORMS = new Set([
  "ios-installed",
  "ios-browser",
  "android-installed",
  "android-browser",
  "desktop-installed",
  "desktop-browser",
  "other",
]);

export function isKnownBrowser(value: unknown): value is string {
  return typeof value === "string" && BROWSERS.has(value);
}

export function isKnownPlatform(value: unknown): value is string {
  return typeof value === "string" && PLATFORMS.has(value);
}

// Coarse on purpose. A full user agent string is a fingerprint, and knowing
// the exact build of somebody's browser has never once been the thing that
// explained a bug.
export function browserToken(userAgent: string): string {
  const ua = userAgent.toLowerCase();
  if (ua.includes("firefox") || ua.includes("fxios")) return "firefox";
  if (ua.includes("edg/") || ua.includes("edgios")) return "edge";
  if (ua.includes("samsungbrowser")) return "samsung";
  if (ua.includes("chrome") || ua.includes("crios")) return "chrome";
  if (ua.includes("safari")) return "safari";
  return "other";
}

/**
 * Which kind of device, and whether Blossom is installed or running in a tab.
 * The installed/browser half earns its place: an installed copy can sit on an
 * old version for weeks, and "everyone reporting this is on an installed
 * Android build" has been the answer before.
 */
export function platformToken(userAgent: string, installed: boolean): string {
  const ua = userAgent.toLowerCase();
  const suffix = installed ? "installed" : "browser";
  if (/iphone|ipad|ipod/.test(ua)) return `ios-${suffix}`;
  if (ua.includes("android")) return `android-${suffix}`;
  if (/windows|macintosh|mac os|linux|cros/.test(ua)) return `desktop-${suffix}`;
  return "other";
}

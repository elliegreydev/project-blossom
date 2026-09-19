// The version number, and the two small things that reason about it.
//
// This is a separate file from changelog.ts for one reason: several places on
// the app's boot path need only the version string, and importing it from the
// changelog dragged every release note ever written into the chunk that has to
// parse before the first paint. There is still exactly one definition of the
// version. changelog.ts re-exports what is here, so nothing that already reads
// it from there has to change.
//
// RELEASE DISCIPLINE, unchanged apart from which line moved: every shipped
// change bumps APP_VERSION below, adds an entry to the top of CHANGELOG in
// changelog.ts, and bumps package.json. All three, every time.

export const APP_VERSION = "0.5.46";

export const LAST_SEEN_VERSION_KEY = "blossom-last-seen-version";

// Numeric compare so "0.10.0" is correctly newer than "0.9.0" - a plain string
// comparison gets that backwards.
export function isNewer(candidate: string, current: string): boolean {
  const a = candidate.split(".").map((n) => Number(n) || 0);
  const b = current.split(".").map((n) => Number(n) || 0);
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const diff = (a[i] ?? 0) - (b[i] ?? 0);
    if (diff !== 0) return diff > 0;
  }
  return false;
}

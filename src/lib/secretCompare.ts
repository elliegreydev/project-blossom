import { timingSafeEqual } from "node:crypto";

/**
 * Constant-time comparison of a shared secret against a request header.
 *
 * Several internal routes gated on `header === process.env.SECRET`. A plain
 * `===` on a string returns as soon as it finds a differing byte, so the time
 * it takes leaks how much of a guess was right, and a patient attacker on the
 * network path can walk the secret one byte at a time. Unlikely against these
 * particular routes, but there is no reason to compare a secret any other way.
 *
 * The length check short-circuits, which is fine: the length of a secret is not
 * itself secret, and timingSafeEqual throws on mismatched lengths anyway.
 *
 * Returns false for a missing or empty expected value, so an unset env var can
 * never accidentally authorise a request that also omits the header.
 */
export function secretMatches(
  expected: string | undefined | null,
  provided: string | undefined | null,
): boolean {
  if (!expected || !provided) return false;
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(provided, "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

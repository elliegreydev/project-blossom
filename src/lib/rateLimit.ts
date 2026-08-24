/**
 * A small rate limit for the endpoints anybody can post to.
 *
 * Blossom has four routes that take an unauthenticated POST: the join form,
 * feedback, the client error reporter, and the reminder action link. None of
 * them had any limit at all, so a script could sit in a loop and fill the
 * database, empty the push quota, or ring every administrator's phone all
 * night. The join form was the worst of them, because each request also made
 * a service-role admin.listUsers call before anything else happened.
 *
 * WHAT THIS IS NOT.
 *
 * This is in-memory and the app runs on serverless functions, so each instance
 * counts on its own and a limit of five is really five per instance. That is a
 * genuine weakness and it is written here rather than hidden: it stops a naive
 * flood from one machine, which is the thing that actually happens, and it does
 * not stop a distributed one. The real fix is a WAF rule or a shared counter,
 * and this is the version that works today without adding a dependency or a
 * bill.
 *
 * Keyed on the forwarded IP. Behind Vercel that header is set by the proxy, so
 * it cannot be spoofed by the client, but treat it as a nudge rather than an
 * identity.
 */

interface Bucket {
  hits: number[];
}

const buckets = new Map<string, Bucket>();

/** Stop the map growing without bound on a long-lived instance. */
function sweep(now: number, windowMs: number) {
  if (buckets.size < 5000) return;
  for (const [key, bucket] of buckets) {
    bucket.hits = bucket.hits.filter((t) => now - t < windowMs);
    if (bucket.hits.length === 0) buckets.delete(key);
  }
}

/**
 * The caller's IP as far as the proxy is concerned, or a shared fallback.
 *
 * The fallback deliberately groups every unknown caller together rather than
 * letting them through: an absent header should not be a way around the limit.
 */
export function callerKey(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const first = forwarded?.split(",")[0]?.trim();
  return first || request.headers.get("x-real-ip") || "unknown";
}

/**
 * True when this caller may proceed. Counts the request when it returns true,
 * so call it once per request and honour the answer.
 */
export function allow(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  sweep(now, windowMs);

  const bucket = buckets.get(key) ?? { hits: [] };
  bucket.hits = bucket.hits.filter((t) => now - t < windowMs);

  if (bucket.hits.length >= limit) {
    buckets.set(key, bucket);
    return false;
  }

  bucket.hits.push(now);
  buckets.set(key, bucket);
  return true;
}

export const MINUTE = 60_000;
export const HOUR = 60 * MINUTE;

/** 429 with a Retry-After, so a well-behaved client backs off rather than spins. */
export function tooManyRequests(retryAfterSeconds: number): Response {
  return new Response(JSON.stringify({ error: "Too many requests. Please try again shortly." }), {
    status: 429,
    headers: {
      "content-type": "application/json",
      "retry-after": String(retryAfterSeconds),
    },
  });
}

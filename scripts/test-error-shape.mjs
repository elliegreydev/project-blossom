import assert from "node:assert/strict";
import {
  errorClassOf,
  narrowErrorClass,
  httpErrorClass,
  isExpectedAuthFailure,
  rateLimitWaitSeconds,
  token,
} from "../src/lib/errorShape.ts";

/**
 * The error reporter's shape rules.
 *
 * Written after the reporter quietly ate the two errors that mattered most.
 * On the night Blossom was first posted publicly, somebody could not get a
 * sign-in code and somebody else's background sync gave up. Both arrived in
 * Ellie's log as "unknown", because narrowErrorClass rejected anything over
 * 24 characters or with more than two separators, and Supabase's auth codes
 * are long snake_case. The alarm worked. The thing that named it did not.
 *
 * So the whole vocabulary is pinned here. If a future tightening of the rules
 * starts eating real codes again, this fails rather than going quiet.
 */

// Every documented Supabase auth error code, verbatim -------------------------

const SUPABASE_AUTH_CODES = [
  "anonymous_provider_disabled", "bad_code_verifier", "bad_json", "bad_jwt",
  "captcha_failed", "conflict", "email_address_invalid",
  "email_address_not_authorized", "email_conflict_identity_not_deletable",
  "email_exists", "email_not_confirmed", "email_provider_disabled",
  "flow_state_expired", "flow_state_not_found", "hook_payload_invalid_content_type",
  "hook_payload_over_size_limit", "hook_timeout", "identity_already_exists",
  "identity_not_found", "insufficient_aal", "invite_not_found",
  "manual_linking_disabled", "mfa_challenge_expired", "mfa_factor_name_conflict",
  "mfa_factor_not_found", "mfa_verification_failed", "mfa_verification_rejected",
  "no_authorization", "not_admin", "oauth_provider_not_supported", "otp_disabled",
  "otp_expired", "over_email_send_rate_limit", "over_request_rate_limit",
  "over_sms_send_rate_limit", "phone_exists", "phone_not_confirmed",
  "provider_disabled", "provider_email_needs_verification", "reauthentication_needed",
  "refresh_token_already_used", "refresh_token_not_found", "request_timeout",
  "same_password", "session_expired", "session_not_found", "signup_disabled",
  "single_identity_not_deletable", "sms_send_failed", "unexpected_audience",
  "unexpected_failure", "user_already_exists", "user_banned", "user_not_found",
  "user_sso_managed", "validation_failed", "weak_password",
];

for (const code of SUPABASE_AUTH_CODES) {
  assert.equal(
    narrowErrorClass(code),
    code,
    `Supabase auth code "${code}" was flattened to unknown, so it would reach the log unnamed`,
  );
}

// The four that were actually being lost in production, named individually so
// a failure here reads as the bug it was rather than as one of fifty-seven.
assert.equal(narrowErrorClass("over_email_send_rate_limit"), "over_email_send_rate_limit");
assert.equal(narrowErrorClass("over_request_rate_limit"), "over_request_rate_limit");
assert.equal(narrowErrorClass("refresh_token_not_found"), "refresh_token_not_found");
assert.equal(narrowErrorClass("refresh_token_already_used"), "refresh_token_already_used");

// The rest of the real vocabulary --------------------------------------------

for (const code of [
  "23505", "42501", "PGRST116", "PGRST204",     // Postgres and PostgREST
  "timeout", "fetch_failed",                     // ours
  "http_400", "http_429", "http_500",            // httpErrorClass output
  "QuotaExceededError", "DatabaseClosedError",   // Dexie and IndexedDB
  "VersionError", "InvalidStateError",
  "AuthApiError", "AuthRetryableFetchError",     // Supabase error names
  "TypeError", "AbortError",
]) {
  assert.equal(narrowErrorClass(code), code, `real code "${code}" was flattened to unknown`);
}

// httpErrorClass output must survive its own narrowing, always.
for (const status of [400, 401, 403, 404, 409, 422, 429, 500, 502, 503]) {
  const cls = httpErrorClass(status);
  assert.equal(narrowErrorClass(cls), cls, `httpErrorClass(${status}) does not survive narrowing`);
}

// Somebody's own words must still never reach the log ------------------------
//
// This is what the rule was written for and it has to keep working. A caller
// can only ever send its own words, so this is graffiti rather than a leak,
// but Ellie's error log is not the place for either.

for (const graffiti of [
  "I told my mum today",
  "I_told_my_mum_today",              // already underscored, mixes case
  "Im_scared_about_tomorrow",
  "He_Said_He_Would_Call",
  "My name is Ellie and I",
  "started HRT on the 3rd",
  "drop table users",
  "<script>alert(1)</script>",
  "code: 429, message: too many requests",
  "over email send rate limit",       // the real code, but spaced
  "",
  "   ",
  "\n\t",
  "_leading_underscore",
  "-leading-dash",
  ".leading-dot",
  "a".repeat(49),                     // one over the cap
]) {
  assert.equal(
    narrowErrorClass(graffiti),
    "unknown",
    `graffiti ${JSON.stringify(graffiti)} reached the log`,
  );
}

// Non-strings are not codes.
for (const value of [null, undefined, 42, {}, [], true, Symbol("x")]) {
  assert.equal(narrowErrorClass(value), "unknown");
}

// Exactly at the cap is fine; one past it is not.
assert.equal(narrowErrorClass("a".repeat(48)), "a".repeat(48));
assert.equal(narrowErrorClass("a".repeat(49)), "unknown");

// Whatever narrowing lets through is still token-safe, always.
for (const code of [...SUPABASE_AUTH_CODES, "PGRST116", "http_429"]) {
  const out = narrowErrorClass(code);
  assert.equal(out, token(out), `${code} survived narrowing but is not token-stable`);
  assert.match(out, /^[A-Za-z0-9][A-Za-z0-9_.-]*$/);
}

// errorClassOf, the client half ----------------------------------------------

assert.equal(errorClassOf(null), "unknown");
assert.equal(errorClassOf(undefined), "unknown");
assert.equal(errorClassOf({}), "unknown");

// A Supabase auth error carries its code, and the code is what we want.
assert.equal(
  errorClassOf(Object.assign(new Error("rate limited"), {
    name: "AuthApiError", status: 429, code: "over_email_send_rate_limit",
  })),
  "over_email_send_rate_limit",
);

// Storage failures keep their own name rather than being folded into something
// vaguer: a device out of room is somebody's entry not being saved.
assert.equal(errorClassOf(Object.assign(new Error("full"), { name: "QuotaExceededError" })), "QuotaExceededError");

// Both a cancelled fetch and AbortSignal.timeout land as "timeout".
assert.equal(errorClassOf(Object.assign(new Error("x"), { name: "AbortError" })), "timeout");
assert.equal(errorClassOf(Object.assign(new Error("x"), { name: "TimeoutError" })), "timeout");

// The browser's way of saying the network went away.
assert.equal(errorClassOf(Object.assign(new TypeError("Failed to fetch"), {})), "fetch_failed");

// Status is the fallback when there is no code.
assert.equal(errorClassOf(Object.assign(new Error("x"), { name: "AuthApiError", status: 503 })), "http_503");

// The whole round trip, client through wire to log ---------------------------
//
// This is the path that was broken. errorClassOf runs in the browser, the
// string goes over the wire, narrowErrorClass runs on the server. Both halves
// have to agree or the code is lost in the middle, which is exactly what
// happened.

for (const code of SUPABASE_AUTH_CODES) {
  const thrown = Object.assign(new Error("x"), { name: "AuthApiError", status: 429, code });
  assert.equal(
    narrowErrorClass(errorClassOf(thrown)),
    code,
    `"${code}" is lost between the browser and the log`,
  );
}

// isExpectedAuthFailure --------------------------------------------------------
//
// Mistyping is not a breakage. A 429 is, because it means nobody new can get
// in at all, and that is the one that has to reach Ellie.

assert.equal(isExpectedAuthFailure({ status: 400 }), true, "a mistyped address should stay quiet");
assert.equal(isExpectedAuthFailure({ status: 403 }), true);
assert.equal(isExpectedAuthFailure({ status: 422 }), true);
assert.equal(isExpectedAuthFailure({ status: 429 }), false, "a rate limit must always be reported");
assert.equal(isExpectedAuthFailure({ status: 500 }), false);
assert.equal(isExpectedAuthFailure({ status: 503 }), false);
assert.equal(isExpectedAuthFailure({}), false, "no status means we do not know, so report it");
assert.equal(isExpectedAuthFailure(null), false);

// rateLimitWaitSeconds -------------------------------------------------------
//
// Being told to wait is not being told no, and the difference decides whether
// somebody tries once more or closes the tab.

const rateLimited = (message, extra = {}) =>
  Object.assign(new Error(message), { name: "AuthApiError", status: 429, ...extra });

// Supabase's own wording, which is where the number comes from.
assert.equal(
  rateLimitWaitSeconds(rateLimited("For security purposes, you can only request this after 51 seconds.")),
  51,
);
assert.equal(rateLimitWaitSeconds(rateLimited("try again after 9 seconds")), 9);
assert.equal(rateLimitWaitSeconds(rateLimited("wait 1 second")), 1);

// A rate limit with no number still counts. A minute is Supabase's fixed gap
// between codes to one address, so it is the right thing to guess.
assert.equal(rateLimitWaitSeconds(rateLimited("email rate limit exceeded")), 60);
assert.equal(rateLimitWaitSeconds({ status: 429 }), 60);
assert.equal(
  rateLimitWaitSeconds({ code: "over_email_send_rate_limit", message: "no" }),
  60,
  "the code alone should be enough, even without a 429",
);
assert.equal(rateLimitWaitSeconds({ code: "over_request_rate_limit" }), 60);

// A daft upstream number must not disable the button for an hour.
assert.equal(rateLimitWaitSeconds(rateLimited("after 99999 seconds")), 60);
assert.equal(rateLimitWaitSeconds(rateLimited("after 0 seconds")), 60);
assert.equal(rateLimitWaitSeconds(rateLimited("after 300 seconds")), 300);
assert.equal(rateLimitWaitSeconds(rateLimited("after 301 seconds")), 60);

// Anything that is not a rate limit gets no countdown at all, so an ordinary
// failure is never mistaken for a timer the person just has to sit out.
assert.equal(rateLimitWaitSeconds({ status: 400, message: "after 51 seconds" }), null);
assert.equal(rateLimitWaitSeconds({ status: 500 }), null);
assert.equal(rateLimitWaitSeconds({ code: "otp_expired" }), null);
assert.equal(rateLimitWaitSeconds({ code: "over_email_send_limit" }), null, "no rate_limit in the code");
assert.equal(rateLimitWaitSeconds(new Error("boom")), null);
assert.equal(rateLimitWaitSeconds(null), null);
assert.equal(rateLimitWaitSeconds("429"), null);

// The two halves have to agree: a rate limit must reach the log AND raise a
// countdown. If either stops being true, somebody is stuck at the door and
// Ellie cannot see it.
const realRateLimit = rateLimited(
  "For security purposes, you can only request this after 47 seconds.",
  { code: "over_email_send_rate_limit" },
);
assert.equal(isExpectedAuthFailure(realRateLimit), false, "a rate limit must still be reported");
assert.equal(narrowErrorClass(errorClassOf(realRateLimit)), "over_email_send_rate_limit");
assert.equal(rateLimitWaitSeconds(realRateLimit), 47);

console.log(`error shape: OK (${SUPABASE_AUTH_CODES.length} Supabase codes survive the round trip)`);

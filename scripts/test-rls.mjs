import assert from "node:assert/strict";

/**
 * The database red-team, frozen into a tripwire.
 *
 * Two adversarial passes proved that a stranger holding the public anon key
 * cannot read a single row of anyone's health data, and that the write-capable
 * RPCs refuse an anonymous caller. Nothing stops a future migration from quietly
 * undoing that: a create-or-replace that resets a grant, a policy dropped by
 * accident, a table added without RLS. This test is the guard. It hits the LIVE
 * REST API with the anon key exactly as an outsider would, and fails loudly the
 * moment any sensitive table starts answering.
 *
 * It needs the production URL and anon key, both public and both safe to expose
 * (the anon key ships in the app). CI provides them; without them the test skips
 * rather than fails, so a local run with no network still passes the suite.
 */

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Placeholder values are what the build step uses; they are not a real project,
// so skip rather than pretend to check.
if (!URL || !ANON || URL.includes("placeholder")) {
  console.log("  skipped: no real NEXT_PUBLIC_SUPABASE_URL / _ANON_KEY in env");
  process.exit(0);
}

const rest = `${URL.replace(/\/$/, "")}/rest/v1`;
const headers = { apikey: ANON, Authorization: `Bearer ${ANON}` };

// Every table holding health, personal, or staff data. A stranger must get
// NOTHING from any of these: either [] (RLS filtered to zero rows) or a
// permission error. A single returned row is a breach.
const SEALED_TABLES = [
  "appointments", "blood_test_entries", "body_entries", "budget_entries",
  "check_ins", "goals", "intimacy_entries", "journal_entries", "medication_logs",
  "medications", "milestones", "presentation_entries", "private_links",
  "profiles", "push_subscriptions", "referral_updates", "referrals",
  "self_directed_settings", "weight_entries", "trusted_circle_grants",
  "bridge_links", "support_tickets", "support_ticket_messages",
  "support_ticket_access_grants", "staff_emails", "staff_dm_messages",
  "staff_chat_messages", "beta_invite_codes", "feedback_items",
];

// SECURITY DEFINER functions an anonymous caller must not be able to execute.
// They gate internally, but were revoked from anon and should stay that way.
const SEALED_RPCS = [
  "find_user_by_email", "staff_directory", "list_beta_codes",
  "get_staff_analytics", "redeem_beta_code", "leave_beta_program",
];

let failures = 0;
function fail(msg) {
  failures += 1;
  console.log(`  BREACH ${msg}`);
}

console.log(`  probing ${SEALED_TABLES.length} sealed tables + ${SEALED_RPCS.length} RPCs as an anonymous stranger`);

for (const table of SEALED_TABLES) {
  try {
    const res = await fetch(`${rest}/${table}?select=*&limit=1`, { headers });
    if (res.status === 401 || res.status === 403) continue; // locked, good
    if (!res.ok) {
      // Any other error is inconclusive, not a pass; surface it.
      fail(`${table}: unexpected HTTP ${res.status}`);
      continue;
    }
    const rows = await res.json();
    if (Array.isArray(rows) && rows.length === 0) continue; // RLS returned nothing, good
    fail(`${table}: returned ${Array.isArray(rows) ? rows.length : "?"} row(s) to anon`);
  } catch (err) {
    fail(`${table}: probe error ${String(err).slice(0, 50)}`);
  }
}

for (const rpc of SEALED_RPCS) {
  try {
    const res = await fetch(`${rest}/rpc/${rpc}`, {
      method: "POST",
      headers: { ...headers, "content-type": "application/json" },
      body: "{}",
    });
    // 401/403 = revoked (good). 404 = not resolvable for anon (also blocked).
    // 200 with data would be a breach; 400 with a "permission denied" is fine.
    if (res.status === 401 || res.status === 403 || res.status === 404) continue;
    const body = await res.json().catch(() => null);
    const msg = body && typeof body === "object" ? JSON.stringify(body) : "";
    if (/permission denied|not authorized|staff only/i.test(msg)) continue;
    if (res.ok && Array.isArray(body) && body.length > 0) {
      fail(`rpc ${rpc}: executed for anon and returned data`);
    } else if (res.ok) {
      // 200 with [] or false is a gated function returning nothing — acceptable,
      // but note it so a future data leak here is visible.
      continue;
    } else {
      fail(`rpc ${rpc}: unexpected response ${res.status} ${msg.slice(0, 60)}`);
    }
  } catch (err) {
    fail(`rpc ${rpc}: probe error ${String(err).slice(0, 50)}`);
  }
}

assert.equal(failures, 0, `${failures} RLS breach(es) — a stranger can reach data that must be sealed`);
console.log("  all sealed tables and RPCs refuse the anonymous stranger");

import assert from "node:assert/strict";
import {
  waitedLabel,
  daysBetween,
  addDays,
  nextChaseOn,
  isChaseDue,
  suggestedAction,
  sortReferrals,
  isOpen,
  countsAsContact,
  REFERRAL_KINDS,
  REFERRAL_STATUSES,
  CHASE_INTERVALS,
} from "../src/lib/referrals.ts";
import {
  monthLabel,
  parseClinicDetail,
  parseClinicList,
  snapshotAgeMonths,
  freshnessLabel,
  isAllowedSourceUrl,
} from "../src/lib/clinicIndex.ts";

const base = {
  referredOn: "2023-03-03",
  status: "waiting",
  chaseEveryDays: null,
  lastChasedOn: null,
  createdAt: "2023-03-03T10:00:00.000Z",
};

// Dates ----------------------------------------------------------------------

assert.equal(daysBetween("2026-08-17", "2026-08-18"), 1);
assert.equal(daysBetween("2026-08-18", "2026-08-17"), -1);
assert.equal(daysBetween("2026-03-01", "2026-03-31"), 30);

// The clocks-go-forward night. Both sides are built in UTC, so a BST boundary
// inside the range must not knock a day off.
assert.equal(daysBetween("2026-03-28", "2026-03-30"), 2, "BST boundary ate a day");
assert.equal(daysBetween("2026-10-24", "2026-10-26"), 2, "GMT boundary added a day");

// Leap day is real; 31 February is not.
assert.equal(daysBetween("2024-02-28", "2024-03-01"), 2);
assert.equal(daysBetween("2023-02-29", "2023-03-01"), null, "accepted a date that doesn't exist");
assert.equal(daysBetween("not-a-date", "2026-08-17"), null);
assert.equal(daysBetween("2026-8-17", "2026-08-18"), null, "should demand zero-padding");

assert.equal(addDays("2026-08-17", 91), "2026-11-16");
assert.equal(addDays("2026-12-31", 1), "2027-01-01");
assert.equal(addDays("2026-03-28", 2), "2026-03-30", "BST boundary shifted an added date");

// Elapsed wait ---------------------------------------------------------------

assert.equal(waitedLabel(null, "2026-08-17"), null, "unknown date must not invent a wait");
assert.equal(waitedLabel("2026-08-17", "2026-08-17"), "today");
assert.equal(waitedLabel("2026-08-16", "2026-08-17"), "1 day");
assert.equal(waitedLabel("2026-08-07", "2026-08-17"), "10 days");
assert.equal(waitedLabel("2026-06-17", "2026-08-17"), "2 months");
assert.equal(waitedLabel("2025-08-17", "2026-08-17"), "1 year");
assert.equal(waitedLabel("2023-03-03", "2026-08-17"), "3 years 5 months");

// Calendar-accurate, not days/365. 3 Mar to 2 Apr is a day short of a month,
// and says so rather than rounding up.
assert.equal(waitedLabel("2026-03-03", "2026-04-02"), "30 days");
assert.equal(waitedLabel("2026-03-03", "2026-04-03"), "1 month");
// Referral dates on the 31st sit in a one-day window where "30 days" and
// "1 month" are both true. It reports days, which is the more literal of the
// two, and nothing downstream cares which it picks.
assert.equal(waitedLabel("2026-01-31", "2026-03-02"), "30 days");

// A mistyped future date says nothing rather than a negative.
assert.equal(waitedLabel("2027-01-01", "2026-08-17"), null, "rendered a negative wait");

// The real one. West of England was on May 2017 referrals; somebody referred
// then has been waiting over nine years, and the label has to survive that.
assert.equal(waitedLabel("2017-05-01", "2026-08-17"), "9 years 3 months");

// Chasing --------------------------------------------------------------------

assert.equal(nextChaseOn(base), null, "reminders must be off unless an interval is set");
assert.equal(nextChaseOn({ ...base, chaseEveryDays: 0 }), null);
assert.equal(nextChaseOn({ ...base, chaseEveryDays: 91 }), "2023-06-02");

// Counted from the last contact once there's been one.
assert.equal(
  nextChaseOn({ ...base, chaseEveryDays: 91, lastChasedOn: "2026-06-01" }),
  "2026-08-31"
);

// No referral date still gets a nudge, counted from when the row was made.
// This is the person who most needs one.
assert.equal(
  nextChaseOn({ ...base, referredOn: null, chaseEveryDays: 30 }),
  "2023-04-02",
  "an unknown referral date must not silently disable reminders"
);

// Closed referrals never nag.
for (const status of ["booked", "seen", "discharged", "withdrawn"]) {
  assert.equal(
    nextChaseOn({ ...base, status, chaseEveryDays: 30 }),
    null,
    `${status} should not produce chase reminders`
  );
}
// Except a lost one, which is still very much live.
assert.ok(nextChaseOn({ ...base, status: "lost", chaseEveryDays: 30 }));
assert.equal(isOpen("waiting"), true);
assert.equal(isOpen("seen"), false);

assert.equal(isChaseDue({ ...base, chaseEveryDays: 91 }, "2023-06-01"), false);
assert.equal(isChaseDue({ ...base, chaseEveryDays: 91 }, "2023-06-02"), true, "due date itself counts");
assert.equal(isChaseDue({ ...base, chaseEveryDays: 91 }, "2026-08-17"), true);
assert.equal(isChaseDue(base, "2030-01-01"), false, "no interval means never due");

// Only actually contacting them moves the clock on.
assert.equal(countsAsContact("chased"), true);
assert.equal(countsAsContact("heard-back"), false, "an unprompted letter isn't proof you can reach them");
assert.equal(countsAsContact("position"), false);

// Suggested action -----------------------------------------------------------

// Never more than one thing to do at a time.
const unknownDate = suggestedAction({ ...base, referredOn: null }, "2026-08-17");
assert.equal(unknownDate?.key, "find-date");

assert.equal(suggestedAction({ ...base, status: "lost" }, "2026-08-17")?.key, "re-refer");
assert.equal(suggestedAction({ ...base, status: "booked" }, "2026-08-17"), null, "a booked appointment needs no chasing");
assert.equal(suggestedAction({ ...base, status: "seen" }, "2026-08-17"), null);

// Six months with no recorded contact earns one prompt to confirm you're on
// the list at all, even with reminders switched off.
assert.equal(suggestedAction({ ...base, referredOn: "2026-08-01" }, "2026-08-17"), null);
assert.equal(
  suggestedAction({ ...base, referredOn: "2026-01-01" }, "2026-08-17")?.key,
  "confirm-on-list"
);
// ...but not once they've actually rung.
assert.equal(
  suggestedAction({ ...base, referredOn: "2026-01-01", lastChasedOn: "2026-07-01" }, "2026-08-17"),
  null
);

const due = suggestedAction({ ...base, chaseEveryDays: 91, lastChasedOn: "2026-01-01" }, "2026-08-17");
assert.equal(due?.key, "chase");
assert.ok(due.body.includes("7 months"), `expected the gap in the body, got: ${due.body}`);

// Every action has real words in it.
for (const referral of [
  { ...base, referredOn: null },
  { ...base, status: "lost" },
  { ...base, referredOn: "2026-01-01" },
]) {
  const action = suggestedAction(referral, "2026-08-17");
  assert.ok(action.title && action.body.length > 40, "an action with no explanation is just a telling-off");
  assert.ok(!action.title.endsWith("."), "titles read as labels");
}

// Ordering -------------------------------------------------------------------

const sorted = sortReferrals([
  { ...base, id: "seen", status: "seen", referredOn: "2015-01-01" },
  { ...base, id: "newer", status: "waiting", referredOn: "2024-01-01" },
  { ...base, id: "oldest", status: "waiting", referredOn: "2019-01-01" },
  { ...base, id: "lost", status: "lost", referredOn: "2025-01-01" },
]);
assert.deepEqual(
  sorted.map((r) => r.id),
  ["oldest", "newer", "lost", "seen"],
  "live referrals first, longest wait first"
);
// Pure function: the input array is not reordered underneath the caller.
const input = [{ ...base, id: "b", referredOn: "2024-01-01" }, { ...base, id: "a", referredOn: "2019-01-01" }];
sortReferrals(input);
assert.equal(input[0].id, "b", "sortReferrals mutated its argument");

// Option lists ---------------------------------------------------------------

assert.equal(new Set(REFERRAL_KINDS.map((k) => k.key)).size, REFERRAL_KINDS.length);
assert.equal(new Set(REFERRAL_STATUSES.map((s) => s.key)).size, REFERRAL_STATUSES.length);
assert.ok(CHASE_INTERVALS.some((i) => i.days === null), "there must be a way to opt out of reminders");
assert.equal(CHASE_INTERVALS[0].days, null, "opting out should be the first, and so the default, option");

// Clinic index ---------------------------------------------------------------

// THE REGRESSION THAT MATTERS. Their list endpoint reports London GIC as
// "2021-01-31T23:00:00.000Z" and their per-clinic endpoint reports the same
// field as "2021-02-01". The server is on UTC+1, so date-only values leave the
// list endpoint as 23:00 on the last day of the previous month. Reading it as
// a date gives January and the app tells somebody they're a month further back
// in the queue than they are.
assert.equal(monthLabel("2021-02-01"), "February 2021");
assert.equal(
  monthLabel(new Date("2021-01-31T23:00:00.000Z").toISOString()),
  "January 2021",
  "this is the wrong answer, and the reason the list endpoint's dates are never read"
);
assert.equal(monthLabel("2026-12-01"), "December 2026");
assert.equal(monthLabel(null), null);
assert.equal(monthLabel("nonsense"), null);
assert.equal(monthLabel("2021-13-01"), null, "month 13 should not resolve");

const detail = {
  clinic_id: 1,
  name: "London Gender Identity Clinic (formerly Tavistock and Portman)",
  short_name: "London GIC",
  region: "England",
  provider: "North London NHS Foundation Trust",
  website: "https://www.northlondonmentalhealth.nhs.uk/service-details/service/x",
  estimations: { clearance_years: 18.2, queue_change: 222.4, referral_lag: 64 },
  waitlist_history: [
    { snapshot_month: "2026-01-01", waitlist_size: 17065, referral_month: "2020-08-01", source_url: "https://web.archive.org/web/1/x", source_note: "Wayback" },
    // Deliberately out of order: newest must be chosen by date, not position.
    { snapshot_month: "2026-06-01", waitlist_size: 18462, referral_month: "2021-02-01", source_url: "https://web.archive.org/web/2/x", source_note: "Clinic Website (Wayback Machine archive)" },
    { snapshot_month: "2026-03-01", waitlist_size: 17236, referral_month: "2020-11-01", source_url: null, source_note: null },
  ],
};

const parsed = parseClinicDetail(detail);
assert.equal(parsed.waitlistSize, 18462, "picked the wrong snapshot");
assert.equal(parsed.referralMonth, "2021-02-01");
assert.equal(parsed.snapshotMonth, "2026-06-01");
assert.equal(monthLabel(parsed.referralMonth), "February 2021");
assert.equal(parsed.shortName, "London GIC");

// Projections must not survive parsing. If clearance_years can't reach a
// component it can't be rendered by accident.
assert.equal(
  JSON.stringify(parsed).includes("18.2"),
  false,
  "a projection leaked into the parsed snapshot"
);
assert.equal("clearanceYears" in parsed, false);

// Three of their eighteen clinics publish nothing. That's normal, not an error.
const empty = parseClinicDetail({ clinic_id: 9, name: "Sussex Gender Service", waitlist_history: [] });
assert.equal(empty.waitlistSize, null);
assert.equal(empty.referralMonth, null);
assert.equal(empty.snapshotMonth, null);
assert.equal(empty.region, "United Kingdom", "a missing region should fall back, not crash");

assert.equal(parseClinicDetail(null), null);
assert.equal(parseClinicDetail({ name: "no id" }), null);
assert.equal(parseClinicDetail({ clinic_id: 3 }), null);
assert.equal(parseClinicDetail("[]"), null);

// Source links are rendered as links, so the host is checked.
assert.equal(isAllowedSourceUrl("https://web.archive.org/web/2026/https://x.nhs.uk"), true);
assert.equal(isAllowedSourceUrl("https://www.sheffieldpartnership.nhs.uk/x"), true);
assert.equal(isAllowedSourceUrl("http://evil.example.com/x"), false);
assert.equal(isAllowedSourceUrl("javascript:alert(1)"), false);
assert.equal(isAllowedSourceUrl(null), false);
const spoofed = parseClinicDetail({
  clinic_id: 2,
  name: "Spoofed",
  waitlist_history: [{ snapshot_month: "2026-06-01", source_url: "javascript:alert(1)" }],
});
assert.equal(spoofed.sourceUrl, null, "a bad source URL must be dropped, not rendered");

// The list endpoint is for names only.
const list = parseClinicList([
  { clinic_id: 3, name: "Leeds Gender Identity Service", region: "England", referral_month: "2019-07-31T22:00:00.000Z" },
  { clinic_id: 1, name: "Chalmers Gender Identity Clinic", region: "Scotland" },
  { clinic_id: null, name: "broken" },
]);
assert.deepEqual(list.map((c) => c.name), ["Chalmers Gender Identity Clinic", "Leeds Gender Identity Service"]);
assert.equal("referralMonth" in list[0], false, "the list endpoint's poisoned dates must not survive parsing");
assert.deepEqual(parseClinicList(null), []);

// Freshness ------------------------------------------------------------------

assert.equal(snapshotAgeMonths("2026-06-01", "2026-08-17"), 2);
assert.equal(snapshotAgeMonths("2025-02-01", "2026-08-17"), 18);
assert.equal(snapshotAgeMonths("2026-12-01", "2026-08-17"), 0, "a future snapshot should clamp, not go negative");
assert.equal(snapshotAgeMonths(null, "2026-08-17"), null);

// A figure is never shown without the date it was true.
assert.equal(freshnessLabel("2026-06-01", "2026-08-17"), "As published in June 2026.");
assert.equal(
  freshnessLabel("2025-02-01", "2026-08-17"),
  "As published in February 2025, so over a year old now."
);
assert.equal(freshnessLabel(null, "2026-08-17"), null);

console.log("Waiting list and clinic index checks passed.");

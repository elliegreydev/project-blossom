import assert from "node:assert/strict";
import {
  BLOOD_CHECK_INTERVALS,
  DEFAULT_SECTION_LABEL,
  PRESCRIBER_OPTIONS,
  bloodRhythmStatus,
  overviewLine,
  sectionLabel,
  shouldOfferBloodRhythm,
  timeOnHrtLabel,
} from "../src/lib/selfDirected.ts";

const TODAY = "2026-08-17";

// The label ---------------------------------------------------------------
// Renameable because the default on a home screen is still a disclosure to
// anyone who glances at the phone.

assert.equal(sectionLabel(null), DEFAULT_SECTION_LABEL);
assert.equal(sectionLabel(""), DEFAULT_SECTION_LABEL);
assert.equal(sectionLabel("   "), DEFAULT_SECTION_LABEL, "whitespace must not become the label");
assert.equal(sectionLabel("Admin"), "Admin");
assert.equal(sectionLabel("  Bits  "), "Bits");

// The prescriber question --------------------------------------------------

const keys = PRESCRIBER_OPTIONS.map((o) => o.key);
assert.equal(new Set(keys).size, keys.length);
// "Rather not say" is a real answer, not an absence of one.
assert.ok(keys.includes("declined"), "there must be a way not to answer");
// The common real-world case: a GP who runs bloods but will not prescribe.
// Offering only yes/no tells those people the app does not understand them.
assert.ok(keys.includes("bloods-only"));
for (const option of PRESCRIBER_OPTIONS) {
  assert.ok(option.label.length > 8);
  // Nothing in the wording should ask somebody to account for themselves.
  assert.ok(!/why|should|risk|danger|warn/i.test(option.label), `loaded wording: ${option.label}`);
}

// Blossom only keeps the rhythm when nobody else is. A clinic already books
// these, and a second competing schedule is just noise.
assert.equal(shouldOfferBloodRhythm("monitored"), false);
assert.equal(shouldOfferBloodRhythm("self"), true);
assert.equal(shouldOfferBloodRhythm("bloods-only"), true);
assert.equal(shouldOfferBloodRhythm("declined"), true, "declining to answer must not remove the feature");
assert.equal(shouldOfferBloodRhythm(null), false);

// Intervals ----------------------------------------------------------------
// The person picks. Blossom never suggests a number, because how often anyone
// should test is clinical and this app does not answer clinical questions.
assert.equal(BLOOD_CHECK_INTERVALS[0].days, null, "opting out must be the first option");
assert.ok(BLOOD_CHECK_INTERVALS.some((i) => i.days === null));

// The rhythm ---------------------------------------------------------------

// Off unless asked for.
assert.equal(bloodRhythmStatus({ lastTestedOn: "2020-01-01", intervalDays: null, today: TODAY }).state, "off");
assert.equal(bloodRhythmStatus({ lastTestedOn: null, intervalDays: 0, today: TODAY }).state, "off");

// Nothing recorded yet. This is somebody who just started, and it must not
// read as a telling-off on day one.
const fresh = bloodRhythmStatus({ lastTestedOn: null, intervalDays: 182, today: TODAY });
assert.equal(fresh.state, "none-recorded");
assert.ok(fresh.body.includes("Nothing needs doing today"));
assert.ok(!/should|must|overdue|need to/i.test(fresh.title + fresh.body), "scolding copy");

// Inside the interval: silence.
assert.equal(bloodRhythmStatus({ lastTestedOn: "2026-06-01", intervalDays: 182, today: TODAY }).state, "recent");
assert.equal(bloodRhythmStatus({ lastTestedOn: "2026-06-01", intervalDays: 182, today: TODAY }).title, null);

// Past it: says how long, and says plainly that it knows nothing else.
const due = bloodRhythmStatus({ lastTestedOn: "2025-06-01", intervalDays: 182, today: TODAY });
assert.equal(due.state, "due");
assert.ok(due.since.includes("year"));
assert.ok(
  due.body.includes("doesn't know what you should be testing"),
  "must say out loud that it is only counting"
);
// It never names a test or implies a medical schedule.
assert.ok(!/estradiol|testosterone|oestrogen|level|LFT|prolactin/i.test(due.body + due.title));

// The boundary day itself counts as due.
assert.equal(bloodRhythmStatus({ lastTestedOn: "2026-02-16", intervalDays: 182, today: TODAY }).state, "due");
assert.equal(bloodRhythmStatus({ lastTestedOn: "2026-02-17", intervalDays: 182, today: TODAY }).state, "recent");

// A nonsense stored date must not crash or claim something is due.
assert.equal(bloodRhythmStatus({ lastTestedOn: "not-a-date", intervalDays: 182, today: TODAY }).state, "recent");

// Time on HRT --------------------------------------------------------------

assert.equal(timeOnHrtLabel(null, TODAY), null);
assert.equal(timeOnHrtLabel("2023-03-03", TODAY), "3 years 5 months");
assert.equal(timeOnHrtLabel(TODAY, TODAY), "today");
// A mistyped future date says nothing rather than a negative.
assert.equal(timeOnHrtLabel("2027-01-01", TODAY), null);

// The overview line --------------------------------------------------------
// A fact about a date, said once. Never framed as good or bad progress.

assert.equal(overviewLine(null, TODAY), "Add the date you started and Blossom can keep track of it for you.");
assert.equal(overviewLine(TODAY, TODAY), "You started today.");
assert.equal(overviewLine("2023-03-03", TODAY), "You've been going 3 years 5 months.");
for (const started of [null, TODAY, "2023-03-03", "2017-01-01"]) {
  const line = overviewLine(started, TODAY);
  assert.ok(!/well done|congratulations|great|amazing|only|just|behind|ahead/i.test(line), `judgemental: ${line}`);
}

console.log("Self-directed care checks passed.");

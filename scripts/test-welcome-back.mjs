import assert from "node:assert/strict";
import fs from "node:fs";
import {
  WELCOME_BACK_AFTER_DAYS,
  WELCOME_BACK_SHOWS_FOR_DAYS,
  isLongGap,
  isStillShowing,
  newSinceVersion,
  parseWelcomeBack,
  welcomeBackItems,
} from "../src/lib/welcomeBack.ts";

// "Coming back after a while": after two weeks away from this device, Home
// starts with a calm card. The rules these tests hold in place are the ones
// that would quietly erode: two weeks means two weeks, the card never counts
// anything, and nothing is offered for a module somebody switched off.

const DAY = 24 * 60 * 60 * 1000;
const now = new Date("2026-09-19T12:00:00Z");
const ago = (days) => new Date(now.getTime() - days * DAY).toISOString();

// The gap -------------------------------------------------------------------
assert.equal(WELCOME_BACK_AFTER_DAYS, 14, "Ellie chose two weeks on 19 Sep 2026");
assert.equal(isLongGap(ago(14), now), true, "exactly two weeks counts");
assert.equal(isLongGap(ago(13.9), now), false, "a week and a half does not");
assert.equal(isLongGap(ago(90), now), true);
assert.equal(isLongGap(null, now), false, "a brand new device is never a return");
assert.equal(isLongGap("rubbish", now), false);

// The card goes away by itself --------------------------------------------------
const state = { since: ago(40), shownAt: ago(1), versionSeen: "0.5.37" };
assert.equal(isStillShowing(state, now), true);
assert.equal(isStillShowing({ ...state, shownAt: ago(WELCOME_BACK_SHOWS_FOR_DAYS) }, now), false, "never greets forever");

// Stored state survives a round trip and junk is ignored.
assert.deepEqual(parseWelcomeBack(JSON.stringify(state)), state);
assert.equal(parseWelcomeBack("{not json"), null);
assert.equal(parseWelcomeBack(JSON.stringify({ since: 1 })), null);
assert.equal(parseWelcomeBack(null), null);

// The rows ------------------------------------------------------------------
const all = ["medication", "appointments", "waitingList"];
const base = { state, enabledModules: all, medications: [], appointments: [], referrals: [] };
const items = (overrides) => welcomeBackItems({ ...base, ...overrides });

assert.deepEqual(items({}), { medication: false, appointments: false, followUps: false }, "nothing there, nothing offered");

assert.equal(items({ medications: [{ active: true }] }).medication, true);
assert.equal(items({ medications: [{ active: false }] }).medication, false, "a stopped medication is not a nudge");
assert.equal(items({ medications: [{ active: true }], enabledModules: [] }).medication, false, "module off means no row");

// Only appointments that fell inside the time away.
assert.equal(items({ appointments: [{ appointmentAt: ago(20) }] }).appointments, true);
assert.equal(items({ appointments: [{ appointmentAt: ago(60) }] }).appointments, false, "before they left is not 'while you were away'");
assert.equal(items({ appointments: [{ appointmentAt: new Date(now.getTime() + 5 * DAY).toISOString() }] }).appointments, false, "upcoming ones are not part of this");

const referral = (over) => ({
  status: "waiting",
  chaseEveryDays: 30,
  lastChasedOn: null,
  referredOn: ago(100).slice(0, 10),
  createdAt: ago(100),
  ...over,
});
assert.equal(items({ referrals: [referral({})] }).followUps, true, "a follow-up came due while they were away");
assert.equal(items({ referrals: [referral({ chaseEveryDays: null })] }).followUps, false, "no follow-up set, no row");
assert.equal(items({ referrals: [referral({})], enabledModules: ["medication"] }).followUps, false);

// What's new ------------------------------------------------------------------
const changelog = [
  { version: "0.5.46", title: "Newest" },
  { version: "0.5.45", title: "Middle" },
  { version: "0.5.44", title: "Older" },
  { version: "0.5.43", title: "Oldest new" },
  { version: "0.5.37", title: "Already seen" },
];
assert.deepEqual(newSinceVersion(changelog, "0.5.37"), ["Newest", "Middle", "Older"], "at most three, newest first");
assert.deepEqual(newSinceVersion(changelog, "0.5.45"), ["Newest"]);
assert.deepEqual(newSinceVersion(changelog, "0.5.46"), [], "nothing new, no section");
assert.deepEqual(newSinceVersion(changelog, null), [], "unknown last version shows nothing rather than guessing");

// Never a count -----------------------------------------------------------------
// The whole card must be unable to show a number. The logic only hands the
// component booleans, and the component's own words must not carry digits.
for (const value of Object.values(items({ medications: [{ active: true }], appointments: [{ appointmentAt: ago(20) }] }))) {
  assert.equal(typeof value, "boolean", "rows are yes or no, never how many");
}
const component = fs.readFileSync(new URL("../src/components/WelcomeBack.tsx", import.meta.url), "utf8");
// JSX text between tags, skipping anything that is code rather than words.
const visibleText = [...component.matchAll(/>([^<>{}]+)</g)]
  .map((m) => m[1].replace(/\s+/g, " ").trim())
  .filter((t) => /[A-Za-z]{2}/.test(t) && !/[&=();]/.test(t.replace(/&apos;/g, "'")));
for (const text of visibleText) {
  assert.doesNotMatch(text, /\d/, `card copy must never contain a number: "${text}"`);
  assert.doesNotMatch(text, /\b(missed|overdue|late|behind)\b/i, `card copy must never frame anything as missed: "${text}"`);
}
assert.ok(visibleText.includes("Good to see you."), "sanity: the copy scan is actually reading the card");

console.log("Welcome back checks passed.");

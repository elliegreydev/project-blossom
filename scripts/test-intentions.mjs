import assert from "node:assert/strict";
import { INTENTION_LIST, orderIntentions, rememberIntention } from "../src/lib/intentions.ts";

const quiet = { dueToday: 0, appointmentSoon: false, supplyNeedsAttention: false, timeCapsuleReady: false, recentlyUsed: [] };
const keys = (list) => list.map((i) => i.key);

// The duplicates are gone. Every lens now produces a different Home, which
// was the whole problem: eight buttons, six outcomes.
const sets = INTENTION_LIST.map((i) => [...i.blocks].sort().join(","));
assert.equal(new Set(sets).size, sets.length, "two lenses still produce an identical Home");
assert.equal(INTENTION_LIST.length, 6);

// Every lens keeps the picker itself on screen, or you cannot get back out.
for (const i of INTENTION_LIST) assert.ok(i.blocks.includes("focus"), `${i.key} would hide the picker`);

// Nothing going on: the written order, every time. A Home with no signals
// must not shuffle for the sake of looking clever.
assert.deepEqual(keys(orderIntentions(quiet)), ["calm", "organise", "prepare", "reflect", "celebrate", "support"]);
assert.deepEqual(keys(orderIntentions(quiet)), keys(orderIntentions(quiet)));

// An appointment coming up promotes Prepare above everything.
assert.equal(keys(orderIntentions({ ...quiet, appointmentSoon: true }))[0], "prepare");

// Doses due promote Organise.
assert.equal(keys(orderIntentions({ ...quiet, dueToday: 2 }))[0], "organise");

// A ready Time Capsule promotes Celebrate.
assert.equal(keys(orderIntentions({ ...quiet, timeCapsuleReady: true }))[0], "celebrate");

// Today's facts beat habit: what someone picked last week must not outrank a
// dose that is due now.
const habitVsFact = keys(orderIntentions({ ...quiet, dueToday: 1, recentlyUsed: ["reflect", "support"] }));
assert.equal(habitVsFact[0], "organise", "habit outranked a due dose");

// With nothing happening, habit is allowed to break the tie.
assert.equal(keys(orderIntentions({ ...quiet, recentlyUsed: ["support"] }))[0], "support");

// Signals never remove a lens, only reorder. All six always reachable.
for (const s of [quiet, { ...quiet, dueToday: 5 }, { ...quiet, appointmentSoon: true, timeCapsuleReady: true }]) {
  assert.equal(orderIntentions(s).length, 6);
}

// Recently used: newest first, no repeats, capped at three.
assert.deepEqual(rememberIntention([], "calm"), ["calm"]);
assert.deepEqual(rememberIntention(["calm"], "reflect"), ["reflect", "calm"]);
assert.deepEqual(rememberIntention(["reflect", "calm"], "calm"), ["calm", "reflect"], "re-picking should promote, not duplicate");
assert.deepEqual(rememberIntention(["a", "b", "c"], "d"), ["d", "a", "b"]);

// Every lens has a summary, so nothing is ever tapped blind.
for (const i of INTENTION_LIST) {
  assert.ok(i.summary && i.summary.length > 6, `${i.key} has no summary`);
  assert.ok(!i.summary.endsWith("."), `${i.key} summary should read as a label, not a sentence`);
}

console.log("Intention picker checks passed.");

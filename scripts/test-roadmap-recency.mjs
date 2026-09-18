import assert from "node:assert/strict";
import { RECENT_DAYS, recentLabel } from "../src/lib/roadmapRecency.ts";

// The bug: "Recently added" came from a box ticked by hand and never unticked.
// On 18 Sep 2026 it sat on 53 of 86 roadmap items, every item in Up next, and
// ideas added two months earlier. The label now comes from dates alone.

const DAY = 24 * 60 * 60 * 1000;
const now = Date.parse("2026-09-18T22:00:00Z");
const ago = (days) => new Date(now - days * DAY).toISOString();
const item = (stage, createdDaysAgo, movedDaysAgo = createdDaysAgo) => ({
  stage,
  created_at: ago(createdDaysAgo),
  stage_changed_at: ago(movedDaysAgo),
});

// Plans: counted from when they were added.
assert.equal(recentLabel(item("next", 2), now), "Recently added");
assert.equal(recentLabel(item("later", RECENT_DAYS - 1), now), "Recently added");
assert.equal(recentLabel(item("next", RECENT_DAYS + 1), now), null, "old plans lose the label on their own");
assert.equal(recentLabel(item("next", 23), now), null, "the 26 Aug batch, seen on 18 Sep, is not recent");
assert.equal(recentLabel(item("later", 63), now), null, "the 17 Jul batch is not recent");

// Shipped: counted from when it moved into Available, not when it was first
// written down. A plan from July that shipped yesterday is recently shipped.
assert.equal(recentLabel(item("available", 63, 1), now), "Recently shipped");
assert.equal(recentLabel(item("available", 2, 40), now), null, "impossible in practice, but move date wins");
assert.equal(recentLabel(item("available", 63, 30), now), null);

// A plan moved from Future ideas to Up next is not "added" again.
assert.equal(recentLabel(item("next", 63, 1), now), null);

// Bad dates never produce a label.
assert.equal(recentLabel({ stage: "next", created_at: "not a date", stage_changed_at: "" }, now), null);

console.log("Roadmap recency checks passed.");

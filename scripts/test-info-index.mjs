import assert from "node:assert/strict";
import {
  INFO_ENTRIES,
  INFO_GROUPS,
  matchesQuery,
  searchInfo,
  visibleEntries,
} from "../src/lib/infoIndex.ts";

const ALL = ["selfDirected", "medication", "journal"];
const NONE = ["medication", "journal"];

// Structure ----------------------------------------------------------------

const keys = INFO_ENTRIES.map((e) => e.key);
assert.equal(new Set(keys).size, keys.length, "duplicate entry key");
for (const entry of INFO_ENTRIES) {
  assert.ok(entry.href.startsWith("/"), `${entry.key} needs an in-app href`);
  assert.ok(entry.summary.length > 20, `${entry.key} needs a real summary`);
  assert.ok(entry.keywords.split(" ").length >= 4, `${entry.key} needs searchable words`);
  assert.ok(INFO_GROUPS.some((g) => g.key === entry.group), `${entry.key} has no group`);
}

// THE RULE THAT MATTERS ----------------------------------------------------
// Self-directed care is renameable and lockable so it does not announce
// itself. An entry that shows up in search for somebody who never enabled the
// module would undo all of that in one keystroke.

const gated = INFO_ENTRIES.filter((e) => e.module);
assert.ok(gated.length > 0, "expected at least one module-gated entry");

assert.equal(
  searchInfo("bridging prescription", NONE).length,
  0,
  "a disabled module's content must not be searchable"
);
assert.equal(
  searchInfo("sharps", NONE).length,
  0,
  "a disabled module's content must not be searchable"
);
assert.ok(searchInfo("bridging prescription", ALL).length > 0, "should be findable when enabled");

assert.equal(visibleEntries(NONE).some((e) => e.module === "selfDirected"), false);
assert.equal(visibleEntries(ALL).some((e) => e.module === "selfDirected"), true);
// Everything ungated is always visible.
assert.equal(
  visibleEntries(NONE).length,
  INFO_ENTRIES.filter((e) => !e.module).length
);

// Crisis is never gated behind anything, ever.
const crisis = INFO_ENTRIES.find((e) => e.key === "crisis");
assert.equal(crisis.module, undefined, "crisis support must never be behind a module");
assert.ok(searchInfo("crisis", []).length > 0, "crisis must be findable with no modules at all");
assert.ok(searchInfo("suicide", []).some((e) => e.key === "crisis"));
assert.ok(searchInfo("999", []).some((e) => e.key === "crisis"));

// Searching -----------------------------------------------------------------

assert.deepEqual(searchInfo("", ALL), []);
assert.deepEqual(searchInfo("   ", ALL), []);

// Every word must match, in any order.
assert.ok(searchInfo("private bloods", ALL).length > 0);
assert.ok(searchInfo("bloods private", ALL).length > 0, "word order must not matter");
// Was 0 under the old strict-only design. The fallback deliberately changed
// this: a word that matches nothing should not wipe out the words that do,
// because the alternative is an empty screen for somebody who mistyped.
const partial = searchInfo("bloods unicorn", ALL);
assert.ok(partial.length > 0, "a stray word must not wipe out the useful ones");
assert.ok(partial.every((e) => /blood|test|hrt|diy/.test(e.keywords)), "results should still be about bloods");

// The words somebody would actually type.
for (const [query, expected] of [
  ["needles", "self-directed-info"],
  ["customs", "self-directed-info"],
  ["helpline", "support-resources"],
  ["travel", "travel-legal"],
  ["gdpr", "privacy"],
  ["changelog", "about"],
]) {
  const hit = searchInfo(query, ALL);
  assert.ok(hit.some((e) => e.key === expected), `"${query}" should find ${expected}, got ${hit.map((e) => e.key)}`);
}

// Natural phrasing. Found by typing real questions into the box rather than
// keyword-shaped ones: "share with my partner" and "show my doctor" both
// returned nothing, because "with" and "my" are in no keyword list anywhere.
assert.ok(searchInfo("share with my partner", ALL).some((e) => e.key === "trusted-circle"));
assert.ok(searchInfo("show my doctor", ALL).some((e) => e.key === "passport"));
assert.ok(searchInfo("what do I do if I go quiet", ALL).some((e) => e.key === "safety-checkins"));
assert.ok(searchInfo("how can I get help right now", ALL).some((e) => e.key === "crisis"));

// The fallback. "put" is in no keyword list anywhere, so the strict pass finds
// nothing and an empty screen was the alternative.
const needles = searchInfo("where do I put my needles", ALL);
assert.ok(needles.some((e) => e.key === "self-directed-info"), "fallback should still find sharps");
assert.equal(needles[0].key, "self-directed-info", "best match should be first");

// The fallback must never weaken a search that already worked. "crisis"
// matches exactly, so it must not start dragging in loosely related entries.
const exactCrisis = searchInfo("crisis", ALL);
assert.ok(exactCrisis.every((e) => /crisis|support/.test(e.keywords + e.title.toLowerCase())));

// And it must never smuggle a disabled module's content in through the back.
assert.equal(
  searchInfo("where do I put my needles", NONE).some((e) => e.module === "selfDirected"),
  false,
  "the fallback must respect module gating too"
);

// A query made entirely of filler finds nothing rather than everything.
assert.deepEqual(searchInfo("how do i", ALL), []);
assert.deepEqual(searchInfo("the a an", ALL), []);

// Punctuation and case must not defeat it.
assert.ok(searchInfo("GP's", ALL).length > 0);
assert.ok(searchInfo("SHARPS", ALL).length > 0);

// Shared matcher ------------------------------------------------------------
// Used for the 171 regional resources too, so one typed query behaves the same
// way against everything it searches.

assert.equal(matchesQuery("mindline", "Mindline Trans+", "0300 330 5468"), true);
assert.equal(matchesQuery("trans helpline", "Mindline Trans+", "a helpline for trans people"), true);
assert.equal(matchesQuery("nothing here", "Mindline Trans+"), false);
assert.equal(matchesQuery("", "anything"), false);
assert.equal(matchesQuery("mindline", null, undefined, "Mindline"), true, "nulls must be skipped");

console.log("Info index checks passed.");

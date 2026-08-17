import assert from "node:assert/strict";
import {
  ESSENTIAL_BLOCKS,
  essentialsActive,
  essentialsDaysLeft,
  essentialsExpiryFor,
  filterBlocksForEssentials,
} from "../src/lib/justTheEssentials.ts";

const ALL = ["focus", "today", "upcoming", "supplies", "pinned", "journey", "aurora", "nudges"];

// Off changes nothing at all, including order.
assert.deepEqual(filterBlocksForEssentials(ALL, false), ALL);

// On, only what's due and what's coming.
assert.deepEqual(filterBlocksForEssentials(ALL, true), ["today", "upcoming"]);
assert.deepEqual(ESSENTIAL_BLOCKS, ["today", "upcoming"]);

// The person's own order still decides what comes first: this filters, it
// never sorts, because their layout is theirs.
assert.deepEqual(filterBlocksForEssentials(["upcoming", "journey", "today"], true), ["upcoming", "today"]);

// A Home with none of the essentials enabled comes back empty rather than
// falling back to showing everything, which would be the opposite of asking
// for a quieter screen.
assert.deepEqual(filterBlocksForEssentials(["journey", "pinned"], true), []);

// "Just today" ends at the start of tomorrow, not 24 hours on. Turning it on
// late at night shouldn't quietly swallow most of the next day too.
const lateNight = new Date(2026, 7, 17, 23, 30);
assert.equal(essentialsExpiryFor("today", lateNight), new Date(2026, 7, 18, 0, 0, 0, 0).toISOString());

const morning = new Date(2026, 7, 17, 9, 0);
assert.equal(essentialsExpiryFor("today", morning), new Date(2026, 7, 18, 0, 0, 0, 0).toISOString());
assert.equal(essentialsExpiryFor("few-days", morning), new Date(2026, 7, 20, 0, 0, 0, 0).toISOString());
assert.equal(essentialsExpiryFor("indefinite", morning), null);

// Active while it lasts, quietly off once it lapses.
const until = essentialsExpiryFor("today", morning);
assert.equal(essentialsActive(true, until, morning), true);
assert.equal(essentialsActive(true, until, new Date(2026, 7, 17, 23, 59)), true);
assert.equal(essentialsActive(true, until, new Date(2026, 7, 18, 0, 1)), false);

// Indefinite never lapses.
assert.equal(essentialsActive(true, null, new Date(2030, 0, 1)), true);

// The flag itself still wins: turned off means off, whatever the date says.
assert.equal(essentialsActive(false, null, morning), false);
assert.equal(essentialsActive(false, until, morning), false);

// A corrupt date fails towards the quieter Home rather than yanking
// everything back on somebody who asked for less.
assert.equal(essentialsActive(true, "not a date", morning), true);

// Days remaining, for the line on Home.
assert.equal(essentialsDaysLeft(essentialsExpiryFor("today", morning), morning), 1);
assert.equal(essentialsDaysLeft(essentialsExpiryFor("few-days", morning), morning), 3);
assert.equal(essentialsDaysLeft(null, morning), null);
assert.equal(essentialsDaysLeft("not a date", morning), null);

console.log("Just the essentials checks passed.");

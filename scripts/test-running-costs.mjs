import assert from "node:assert/strict";
import {
  parseRunningCosts,
  runningCostsStatus,
  formatPence,
  daysLeftInMonth,
} from "../src/lib/runningCosts.ts";

// The figures are typed in by hand, so the parser's job is to refuse anything
// it can't be sure about rather than render a number that's out by a hundred.
assert.equal(parseRunningCosts(undefined, "0", "2026-08-14"), null, "no target");
assert.equal(parseRunningCosts("", "0", "2026-08-14"), null, "empty target");
assert.equal(parseRunningCosts("0", "0", "2026-08-14"), null, "zero target");
assert.equal(parseRunningCosts("-2000", "0", "2026-08-14"), null, "negative target");
assert.equal(parseRunningCosts("20.50", "0", "2026-08-14"), null, "pounds in a pence field");
assert.equal(parseRunningCosts("2000", "-1", "2026-08-14"), null, "negative raised");
assert.equal(parseRunningCosts("2000", "500", undefined), null, "no as-of date");
assert.equal(parseRunningCosts("2000", "500", "not a date"), null, "unparseable as-of date");
assert.notEqual(parseRunningCosts("2000", "500", "2026-08-14"), null, "a good set parses");

const august = (day) => new Date(2026, 7, day, 12, 0, 0);
const costs = (target, raised, asOf) => parseRunningCosts(String(target), String(raised), asOf);

// Short: the shortfall, not the total, because that's the number somebody
// organising a whip-round between them actually needs.
const short = runningCostsStatus(costs(6000, 2000, "2026-08-14"), august(14));
assert.equal(short.kind, "short");
assert.equal(short.shortfall, "£40");
assert.equal(short.month, "August");
assert.equal(short.daysLeft, 17);
assert.equal(short.asOf, "14 August");

// Covered, and still covered when more came in than was asked for.
assert.equal(runningCostsStatus(costs(6000, 6000, "2026-08-14"), august(14)).kind, "covered");
assert.equal(runningCostsStatus(costs(6000, 9500, "2026-08-14"), august(14)).kind, "covered");

// Not configured at all renders nothing, which is the third approved state.
assert.equal(runningCostsStatus(null, august(14)), null);

// The staleness rule, which is the one that stops the page lying about money.
// Figures last touched in a different month describe a month already settled.
assert.equal(runningCostsStatus(costs(6000, 6000, "2026-07-31"), august(1)), null, "last month");
assert.equal(runningCostsStatus(costs(6000, 2000, "2026-09-01"), august(31)), null, "next month");
assert.equal(runningCostsStatus(costs(6000, 6000, "2025-08-14"), august(14)), null, "a year ago");
assert.notEqual(runningCostsStatus(costs(6000, 2000, "2026-08-01"), august(31)), null, "same month");

// Money reads the way a person would say it.
assert.equal(formatPence(4000), "£40");
assert.equal(formatPence(4050), "£40.50");
assert.equal(formatPence(1), "£0.01");
assert.equal(formatPence(100), "£1");

// Days left, including the last day of the month, which the copy words
// separately so it never says "0 days left".
assert.equal(daysLeftInMonth(august(31)), 0);
assert.equal(daysLeftInMonth(august(30)), 1);
assert.equal(daysLeftInMonth(new Date(2026, 1, 27, 12)), 1, "February, non-leap");
assert.equal(daysLeftInMonth(new Date(2024, 1, 27, 12)), 2, "February, leap year");

console.log("Running-costs target checks passed.");

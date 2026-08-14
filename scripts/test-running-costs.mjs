import assert from "node:assert/strict";
import {
  parseRunningCosts,
  runningCostsStatus,
  formatPence,
  daysLeftInMonth,
  sumDonationsPence,
  londonMonthStartUtc,
  fetchMonthsTransactions,
  fetchLinkPaymentIntentIds,
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

// Summing Stripe. The allow-list is the whole point: a payout is money leaving
// for the bank account and would otherwise zero the month out every time it ran.
assert.equal(sumDonationsPence([{ type: "charge", net: 941, paymentIntent: "pi_1" }, { type: "charge", net: 470, paymentIntent: "pi_2" }]), 1411);
assert.equal(sumDonationsPence([{ type: "charge", net: 941, paymentIntent: "pi_1" }, { type: "payout", net: -941, paymentIntent: null }]), 941);
assert.equal(sumDonationsPence([{ type: "charge", net: 941, paymentIntent: "pi_1" }, { type: "stripe_fee", net: -200, paymentIntent: null }]), 941);
assert.equal(sumDonationsPence([{ type: "charge", net: 941, paymentIntent: "pi_1" }, { type: "refund", net: -941, paymentIntent: "pi_1" }]), 0, "a refund pulls it back");
assert.equal(sumDonationsPence([{ type: "payment", net: 500, paymentIntent: "pi_3" }, { type: "adjustment", net: -500, paymentIntent: "pi_3" }]), 0);
assert.equal(sumDonationsPence([]), 0, "no donations yet is zero, not a crash");
assert.equal(sumDonationsPence([{ type: "charge", net: Number.NaN, paymentIntent: "pi_1" }]), 0, "junk from the API counts as nothing");

// The month window is London's, not the server's UTC. During BST the first
// hour of a month is still "last month" in UTC, and an hour of somebody's
// donations would land in the wrong column.
const bstStart = londonMonthStartUtc(new Date("2026-08-14T12:00:00Z"));
assert.equal(bstStart.toISOString(), "2026-07-31T23:00:00.000Z", "August starts at 23:00 UTC on 31 July in BST");

const gmtStart = londonMonthStartUtc(new Date("2026-01-14T12:00:00Z"));
assert.equal(gmtStart.toISOString(), "2026-01-01T00:00:00.000Z", "January starts at midnight UTC, no offset");

// The edge itself: 00:30 London on 1 August is 23:30 UTC on 31 July. A UTC
// window would put this half hour in July.
const justAfterMidnight = londonMonthStartUtc(new Date("2026-07-31T23:30:00Z"));
assert.equal(justAfterMidnight.toISOString(), "2026-07-31T23:00:00.000Z", "already counted as August");

// Stripe paging, against a stub. A loop that stops one page early silently
// under-counts the month, which is the kind of wrong nobody notices.
function stubStripe(pages) {
  const calls = [];
  const impl = async (url) => {
    calls.push(url);
    const after = new URL(url).searchParams.get("starting_after");
    const index = after ? pages.findIndex((p) => p.at(-1)?.id === after) + 1 : 0;
    const data = pages[index] ?? [];
    return { ok: true, json: async () => ({ data, has_more: index < pages.length - 1 }) };
  };
  return { impl, calls };
}

const onePage = stubStripe([[{ id: "tx_1", type: "charge", net: 941 }]]);
assert.deepEqual(await fetchMonthsTransactions("rk_test", 0, onePage.impl), [{ type: "charge", net: 941, paymentIntent: null }]);
assert.equal(onePage.calls.length, 1, "stops as soon as has_more is false");

const threePages = stubStripe([
  [{ id: "tx_1", type: "charge", net: 100 }],
  [{ id: "tx_2", type: "charge", net: 200 }],
  [{ id: "tx_3", type: "charge", net: 300 }],
]);
const all = await fetchMonthsTransactions("rk_test", 0, threePages.impl);
assert.equal(all.length, 3, "follows every page");
assert.equal(sumDonationsPence(all), 600, "and nothing is lost on the way");
assert.equal(threePages.calls.length, 3);
assert.match(threePages.calls[1], /starting_after=tx_1/, "pages on the last id it saw");
assert.match(threePages.calls[0], /created%5Bgte%5D=0/, "asks only for this month");

// Everything Stripe sends other than the three fields the sum needs is dropped
// here, so the customer never travels any further into Blossom.
const withCustomer = stubStripe([[{ id: "tx_1", type: "charge", net: 500, customer: "cus_abc", description: "Ellie" }]]);
const carried = await fetchMonthsTransactions("rk_test", 0, withCustomer.impl);
assert.deepEqual(Object.keys(carried[0]).sort(), ["net", "paymentIntent", "type"], "only these three survive");

// A refusal from Stripe throws rather than quietly returning a total of zero,
// which would read as "nobody donated this month".
const failing = async () => ({ ok: false, status: 401, json: async () => ({}) });
await assert.rejects(() => fetchMonthsTransactions("rk_bad", 0, failing), /401/);

// A stub that always claims more pages must still terminate.
const runaway = { impl: async () => ({ ok: true, json: async () => ({ data: [{ id: "tx_same", type: "charge", net: 1 }], has_more: true }) }) };
const capped = await fetchMonthsTransactions("rk_test", 0, runaway.impl);
assert.equal(capped.length, 20, "stops at MAX_PAGES rather than looping forever");

// The whole reason this filter exists. Blossom shares a Stripe account with
// Filthy Rich Tycoon, so "everything on the account" is not "donations to
// Blossom" - and a game sale counted as a donation would look entirely
// plausible while quietly saying the bills were paid.
const mixedAccount = [
  { type: "charge", net: 300, paymentIntent: "pi_blossom" },
  { type: "charge", net: 4999, paymentIntent: "pi_game_sale" },
];
const onlyBlossom = new Set(["pi_blossom"]);
assert.equal(sumDonationsPence(mixedAccount, onlyBlossom), 300, "the game sale is not a donation");
assert.equal(sumDonationsPence(mixedAccount, null), 5299, "and without a set, everything counts");

// A refund of a Blossom donation still pulls Blossom's total down, because the
// refund carries the same payment_intent as the charge it reverses.
assert.equal(
  sumDonationsPence(
    [
      { type: "charge", net: 300, paymentIntent: "pi_blossom" },
      { type: "refund", net: -300, paymentIntent: "pi_blossom" },
      { type: "charge", net: 4999, paymentIntent: "pi_game_sale" },
    ],
    onlyBlossom
  ),
  0
);

// A row Stripe couldn't attribute to a payment counts as nothing rather than
// being waved through, which is the safe direction to fail in.
assert.equal(sumDonationsPence([{ type: "charge", net: 999, paymentIntent: null }], onlyBlossom), 0);

// Building the set of payments made through Blossom's link.
const sessions = stubStripe([
  [{ id: "cs_1", payment_intent: "pi_blossom" }, { id: "cs_2", payment_intent: "pi_two" }],
]);
const ids = await fetchLinkPaymentIntentIds("rk_test", "plink_abc", 1_000_000, sessions.impl);
assert.deepEqual([...ids].sort(), ["pi_blossom", "pi_two"]);
assert.match(sessions.calls[0], /payment_link=plink_abc/, "asks Stripe for one link only");
assert.match(sessions.calls[0], /status=complete/, "and only sessions that actually completed");

// Sessions are looked for a week before the month starts: someone opening the
// payment page late on the 31st can complete it on the 1st.
const lookback = Number(new URL(sessions.calls[0]).searchParams.get("created[gte]"));
assert.equal(lookback, 1_000_000 - 7 * 24 * 60 * 60);

// A session that never got a payment intent is skipped rather than adding
// undefined to the set.
const halfDone = stubStripe([[{ id: "cs_3", payment_intent: null }]]);
assert.equal((await fetchLinkPaymentIntentIds("rk_test", "plink_abc", 0, halfDone.impl)).size, 0);

// Balance transactions now ask Stripe to expand the source, which is where the
// payment_intent lives, and it survives the trip.
const expanded = stubStripe([[{ id: "txn_1", type: "charge", net: 300, source: { payment_intent: "pi_blossom" } }]]);
const withSource = await fetchMonthsTransactions("rk_test", 0, expanded.impl);
assert.deepEqual(withSource, [{ type: "charge", net: 300, paymentIntent: "pi_blossom" }]);
assert.match(expanded.calls[0], /expand%5B%5D=data.source/, "asks for the source");

console.log("Running-costs target checks passed.");

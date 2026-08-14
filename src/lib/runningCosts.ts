/**
 * The public running-costs target.
 *
 * Sarah asked for a visible figure so people can see what Blossom actually
 * costs and coordinate covering it between them. Two decisions came out of
 * that conversation and both are load-bearing:
 *
 * 1. No progress bar, anywhere. A bar sitting low reads as "this is dying",
 *    and for an app people are trusting with health and identity data that is
 *    a reason to stop putting their life into it. A plain number doesn't carry
 *    that, and a number is what somebody organising a whip-round actually
 *    needs.
 *
 * 2. Every state carries the date it was true. Blossom deliberately keeps no
 *    record of who donated (see support.ts), so the raised figure cannot be
 *    computed from anything - it is typed in by hand. A hand-typed number with
 *    no date is a claim about right now that might not be true.
 *
 * Point 2 is why staleness is enforced here rather than trusted. If the
 * figures were last touched in a different month from today, this renders
 * nothing at all. Showing no target is a state the design already has, and it
 * is the state from before a figure was ever set. Telling somebody September
 * is covered on the strength of August's numbers is not a state we want.
 */

export interface RunningCosts {
  /** What a month of Blossom costs to run, in pence. */
  targetPence: number;
  /** Given so far this month, in pence. Typed in by hand. */
  raisedPence: number;
  /** The moment both figures above were last known to be true. */
  asOf: Date;
}

export type RunningCostsStatus =
  | { kind: "covered"; month: string; asOf: string }
  | { kind: "short"; shortfall: string; month: string; daysLeft: number; asOf: string };

/** Absent or malformed means the whole block is inert, same as SUPPORT_URL.
 *  These are read at build time, so changing them needs a redeploy - which is
 *  fine for something updated by hand once a month. */
export function runningCostsFromEnv(): RunningCosts | null {
  return parseRunningCosts(
    process.env.NEXT_PUBLIC_BLOSSOM_COSTS_TARGET_PENCE,
    process.env.NEXT_PUBLIC_BLOSSOM_COSTS_RAISED_PENCE,
    process.env.NEXT_PUBLIC_BLOSSOM_COSTS_AS_OF
  );
}

/** Split out from the env read so the rules are testable without a build. */
export function parseRunningCosts(
  rawTarget: string | undefined,
  rawRaised: string | undefined,
  rawAsOf: string | undefined
): RunningCosts | null {
  const targetPence = wholePence(rawTarget);
  const raisedPence = wholePence(rawRaised);
  if (targetPence === null || targetPence <= 0) return null;
  if (raisedPence === null || raisedPence < 0) return null;

  if (!rawAsOf) return null;
  const asOf = new Date(rawAsOf);
  if (Number.isNaN(asOf.getTime())) return null;

  return { targetPence, raisedPence, asOf };
}

/** Money is only ever whole pence. A fractional or negative value means
 *  somebody typed pounds into a pence field, so refuse it rather than show a
 *  figure that's out by a hundred. */
function wholePence(raw: string | undefined): number | null {
  if (raw == null || raw.trim() === "") return null;
  const value = Number(raw);
  if (!Number.isFinite(value) || !Number.isInteger(value)) return null;
  return value;
}

export function runningCostsStatus(costs: RunningCosts | null, now: Date): RunningCostsStatus | null {
  if (!costs) return null;

  // The staleness rule. Figures from a different month describe a month that
  // has already been settled, and rewording them as "this month" would be a
  // false claim about money.
  if (costs.asOf.getFullYear() !== now.getFullYear() || costs.asOf.getMonth() !== now.getMonth()) {
    return null;
  }

  const month = monthName(now);
  const asOf = dayAndMonth(costs.asOf);
  const shortfallPence = costs.targetPence - costs.raisedPence;

  if (shortfallPence <= 0) return { kind: "covered", month, asOf };

  return {
    kind: "short",
    shortfall: formatPence(shortfallPence),
    month,
    daysLeft: daysLeftInMonth(now),
    asOf,
  };
}

/**
 * Which Stripe balance-transaction types count as donor money.
 *
 * An allow-list rather than a block-list, because getting this wrong silently
 * changes a number people are trusting. Refunds are included on purpose: they
 * carry a negative net and should pull the total back down. Payouts are not,
 * even though they look like money moving - that's the bank transfer of money
 * already counted here, and including it would zero the month out every time
 * Stripe paid us.
 *
 * Stripe's own fees are also excluded. They're a real cost, but this figure
 * answers "how much have people given", and netting Stripe's bill off it would
 * quietly conflate the two.
 */
export const COUNTED_BALANCE_TYPES = ["charge", "payment", "refund", "payment_refund", "adjustment"];

export interface BalanceTransaction {
  type: string;
  /** Already converted to the account's settlement currency, which is why this
   *  endpoint is used rather than charges: donors can pay in anything. */
  net: number;
  /** Which payment this belongs to. Carried so money from one payment link can
   *  be told apart from everything else on a shared account. */
  paymentIntent: string | null;
}

/**
 * Sum the month, counting only money that came through Blossom's own link.
 *
 * Grey Studios runs more than one thing through one Stripe account, so "every
 * transaction this month" is not the same as "donations to Blossom". Without
 * the second argument this would report Blossom's costs covered on the back of
 * a game sale, and nobody would notice because the number would look plausible.
 *
 * `allowedPaymentIntents` is the set of payments made through the Blossom link,
 * built separately by fetchLinkPaymentIntentIds. Pass null to count everything,
 * which is only right on an account that does nothing else.
 */
export function sumDonationsPence(
  transactions: BalanceTransaction[],
  allowedPaymentIntents: Set<string> | null = null
): number {
  return transactions
    .filter((t) => COUNTED_BALANCE_TYPES.includes(t.type))
    .filter((t) => allowedPaymentIntents === null || (t.paymentIntent !== null && allowedPaymentIntents.has(t.paymentIntent)))
    .reduce((total, t) => total + (Number.isFinite(t.net) ? t.net : 0), 0);
}

/**
 * The first instant of the current month, in London rather than UTC.
 *
 * The server runs on UTC and the people reading this are mostly in the UK. For
 * the hour after midnight on the first of a month during BST, UTC still thinks
 * it's last month, so a UTC window would count an hour of September's donations
 * towards August. One hour a month, but it's someone's money in the wrong
 * column and the fix is cheap.
 */
export function londonMonthStartUtc(now: Date): Date {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(now);
  const year = Number(parts.find((p) => p.type === "year")?.value);
  const month = Number(parts.find((p) => p.type === "month")?.value);

  // Treat midnight-in-London as if it were UTC, then correct by however far
  // London actually sits from UTC at that moment (0 in winter, +1 in BST).
  const naive = Date.UTC(year, month - 1, 1, 0, 0, 0);
  return new Date(naive - londonOffsetMs(new Date(naive)));
}

function londonOffsetMs(at: Date): number {
  // Formatting the same instant as London and as UTC and taking the difference
  // is the reliable way to get an offset without hardcoding BST's dates.
  const asLondon = new Date(at.toLocaleString("en-US", { timeZone: "Europe/London" }));
  const asUtc = new Date(at.toLocaleString("en-US", { timeZone: "UTC" }));
  return asLondon.getTime() - asUtc.getTime();
}

const BALANCE_TX_API = "https://api.stripe.com/v1/balance_transactions";
const CHECKOUT_SESSIONS_API = "https://api.stripe.com/v1/checkout/sessions";
const PAGE_SIZE = 100;
/** A month of donations for an app this size will not run to thousands of
 *  rows. The cap stops a misconfiguration becoming an unbounded loop. */
const MAX_PAGES = 20;

/**
 * Page through a Stripe list endpoint and hand back the raw rows.
 *
 * `fetchImpl` is injectable purely so the paging can be tested without a Stripe
 * account, which is the part most likely to be wrong: a loop that stops one
 * page early silently under-counts somebody's month.
 */
async function stripeList(
  url: string,
  apiKey: string,
  params: URLSearchParams,
  fetchImpl: typeof fetch
): Promise<unknown[]> {
  const collected: unknown[] = [];
  let startingAfter: string | undefined;

  for (let page = 0; page < MAX_PAGES; page++) {
    const query = new URLSearchParams(params);
    query.set("limit", String(PAGE_SIZE));
    if (startingAfter) query.set("starting_after", startingAfter);

    const response = await fetchImpl(`${url}?${query}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    if (!response.ok) {
      // Deliberately without the body. Stripe quotes the offending object back
      // inside its error messages, and the point of this whole path is that
      // nothing identifying leaves it - including into an error report.
      throw new Error(`Stripe returned ${response.status}`);
    }

    const body = await response.json();
    const rows: unknown[] = Array.isArray(body?.data) ? body.data : [];
    collected.push(...rows);

    if (!body?.has_more || rows.length === 0) break;
    const last = rows[rows.length - 1] as { id?: unknown };
    if (typeof last?.id !== "string") break;
    startingAfter = last.id;
  }

  return collected;
}

/** Every balance transaction since `since`, cut down to the three fields the
 *  sum needs. Everything else Stripe sent, the customer included, is dropped
 *  here and never travels any further into Blossom. */
export async function fetchMonthsTransactions(
  apiKey: string,
  since: number,
  fetchImpl: typeof fetch = fetch
): Promise<BalanceTransaction[]> {
  const params = new URLSearchParams({ "created[gte]": String(since) });
  // The source says which payment a row belongs to. Charges and refunds both
  // carry payment_intent, so a refund stays attributable to the link it came
  // from and still pulls that link's total back down.
  params.append("expand[]", "data.source");

  return (await stripeList(BALANCE_TX_API, apiKey, params, fetchImpl)).map((row) => {
    const item = row as { type?: unknown; net?: unknown; source?: { payment_intent?: unknown } | null };
    const paymentIntent = item.source?.payment_intent;
    return {
      type: typeof item.type === "string" ? item.type : "",
      net: typeof item.net === "number" ? item.net : 0,
      paymentIntent: typeof paymentIntent === "string" ? paymentIntent : null,
    };
  });
}

/** How far back before the month to look for sessions. Somebody who opens the
 *  payment page late on the 31st can complete it on the 1st, and that payment
 *  would otherwise be unattributable and silently dropped. */
const SESSION_LOOKBACK_SECONDS = 7 * 24 * 60 * 60;

/**
 * The payments made through one specific payment link.
 *
 * This is the piece that keeps a shared Stripe account honest. Grey Studios
 * runs more than one thing through one account, so without this the figure
 * would count a game sale as a donation to Blossom - and it would look
 * entirely plausible while doing it.
 *
 * Known gap, and it bites the moment a monthly link exists: a subscription's
 * renewals don't create new checkout sessions, so only the first payment of a
 * subscription shows up here. Handling renewals means expanding the charge's
 * invoice and matching it back to the subscription id on the session.
 */
export async function fetchLinkPaymentIntentIds(
  apiKey: string,
  paymentLinkId: string,
  since: number,
  fetchImpl: typeof fetch = fetch
): Promise<Set<string>> {
  const params = new URLSearchParams({
    payment_link: paymentLinkId,
    status: "complete",
    "created[gte]": String(Math.max(0, since - SESSION_LOOKBACK_SECONDS)),
  });

  const ids = new Set<string>();
  for (const row of await stripeList(CHECKOUT_SESSIONS_API, apiKey, params, fetchImpl)) {
    const item = row as { payment_intent?: unknown };
    if (typeof item.payment_intent === "string") ids.add(item.payment_intent);
  }
  return ids;
}

/** Whole pounds lose the ".00", because "£40" is what a person would say. */
export function formatPence(pence: number): string {
  const pounds = pence / 100;
  return pounds % 1 === 0 ? `£${pounds}` : `£${pounds.toFixed(2)}`;
}

/** Zero on the last day of the month, which the copy words separately. */
export function daysLeftInMonth(now: Date): number {
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  return lastDay - now.getDate();
}

function monthName(date: Date): string {
  return date.toLocaleDateString("en-GB", { month: "long" });
}

function dayAndMonth(date: Date): string {
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "long" });
}

import { NextResponse } from "next/server";
import { fetchMonthsTransactions, londonMonthStartUtc, sumDonationsPence } from "@/lib/runningCosts";
import { reportError } from "@/lib/errorReport";

/**
 * This month's donation total, asked of Stripe rather than typed in by hand.
 *
 * The one rule this route exists to keep: it returns a sum and nothing else.
 * Blossom deliberately holds no record of who donated - no donor table, no
 * supporter flag, no link to an account - and reading a total from Stripe must
 * not quietly become a way around that. So nothing here stores a transaction,
 * logs one, or returns anything below the aggregate. Stripe knows who paid,
 * because it has to; Blossom still doesn't, and this route doesn't learn.
 *
 * Inert without STRIPE_API_KEY and BLOSSOM_COSTS_TARGET_PENCE, in which case
 * it says so and the page falls back to the manually-set figure.
 *
 * STRIPE_API_KEY, not STRIPE_SECRET_KEY, because this only ever reads balance
 * transactions and should be a restricted key (rk_live_...) scoped to exactly
 * that. Stripe's own guidance is not to use unrestricted secret keys for new
 * integrations, and a name with "secret" in it invites pasting the wrong one.
 */

// Matches every other route here. The caching below is done by hand rather
// than with segment revalidate, because Next ignores both options when a
// route's revalidate and an inner fetch's cache setting disagree, and a
// silently-uncached route would mean asking Stripe for every page view.
export const dynamic = "force-dynamic";

/** Fifteen minutes. Nobody needs a donations total to the second. Held in
 *  module scope, so it lasts as long as the warm instance does - a cold start
 *  just asks Stripe again, which is correct and cheap. */
const CACHE_MS = 15 * 60 * 1000;
let cached: { at: number; body: unknown } | null = null;


export async function GET() {
  const apiKey = process.env.STRIPE_API_KEY;
  const targetPence = Number(process.env.BLOSSOM_COSTS_TARGET_PENCE);

  if (!apiKey || !Number.isInteger(targetPence) || targetPence <= 0) {
    return NextResponse.json({ configured: false });
  }

  const now = new Date();
  if (cached && now.getTime() - cached.at < CACHE_MS) {
    return NextResponse.json(cached.body);
  }

  const since = Math.floor(londonMonthStartUtc(now).getTime() / 1000);

  try {
    const transactions = await fetchMonthsTransactions(apiKey, since);
    const body = {
      configured: true,
      targetPence,
      // Clamped at zero. A month where refunds outweigh donations would go
      // negative, and "raised minus five pounds" is a puzzle rather than a
      // figure - the honest reading of that month is that none of it is covered.
      raisedPence: Math.max(0, sumDonationsPence(transactions)),
      // What "as of" means here is the moment we last asked, which is why the
      // page can show it honestly without anyone maintaining it.
      asOf: now.toISOString(),
    };
    cached = { at: now.getTime(), body };
    return NextResponse.json(body);
  } catch {
    // A donation figure is not worth breaking the page over. Report the shape
    // of the failure and let the page fall back to the manual figure, or to
    // showing nothing. The error itself is deliberately not read: Stripe puts
    // object ids in its messages, and this route's whole point is that nothing
    // identifying leaves it, including into an error report.
    reportError({
      operation: "reading this month's donation total",
      errorClass: "stripe_fetch_failed",
      detail: "GET balance_transactions for the running-costs figure",
      accountRef: null,
      context: { route: "/api/running-costs", method: "GET" },
    });
    return NextResponse.json({ configured: false });
  }
}

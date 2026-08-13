/**
 * Asking people to chip in.
 *
 * Blossom is local-first, so hosting it costs almost nothing and would still
 * cost almost nothing at ten thousand users. What costs is the checking: the
 * 163 support resources somebody verified by hand, and the regional legal
 * notes somebody has to rewrite when the law moves. That's what donations pay
 * for, and it's what the copy should say.
 *
 * Two rules this module exists to enforce:
 *
 * 1. Blossom never learns who donated. Payment happens entirely on Stripe's
 *    own page; there's no donor flag, no table, no link to an account. So
 *    there is no "who paid" record to leak or be asked for. The trade is that
 *    someone who has already given has to tell us to stop showing the card,
 *    which the card offers on trust.
 *
 * 2. The ask is never someone's first experience of the app, and never the
 *    first thing on Home. See shouldOfferSupport.
 */

/** Set in Vercel once the Stripe payment page exists. Absent means the whole
 *  feature is inert - no card, no row, nothing to configure wrongly. */
export const SUPPORT_URL = process.env.NEXT_PUBLIC_BLOSSOM_SUPPORT_URL ?? "";

export function supportConfigured(): boolean {
  return SUPPORT_URL.startsWith("https://");
}

/** How long "not now" lasts. Long enough that it doesn't feel like nagging. */
export const SNOOZE_DAYS = 45;

/** Nobody is asked for money in their first week. They haven't got anything out
 *  of Blossom yet, and an app that asks on day one reads as a shop. */
export const MIN_DAYS_BEFORE_ASKING = 7;

export interface SupportPromptState {
  onboardingCompletedAt: string | null;
  hiddenUntil: string | null;
  dismissedForever: boolean;
}

export function daysBetween(fromIso: string, now: Date): number {
  const from = new Date(fromIso).getTime();
  if (Number.isNaN(from)) return 0;
  return Math.floor((now.getTime() - from) / 86_400_000);
}

export function shouldOfferSupport(state: SupportPromptState, now: Date = new Date()): boolean {
  if (!supportConfigured()) return false;
  if (state.dismissedForever) return false;
  if (!state.onboardingCompletedAt) return false;
  if (daysBetween(state.onboardingCompletedAt, now) < MIN_DAYS_BEFORE_ASKING) return false;
  if (state.hiddenUntil && new Date(state.hiddenUntil).getTime() > now.getTime()) return false;
  return true;
}

export function snoozeUntil(now: Date = new Date()): string {
  return new Date(now.getTime() + SNOOZE_DAYS * 86_400_000).toISOString();
}

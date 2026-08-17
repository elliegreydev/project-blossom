import type { HomeBlockKey } from "./db";

/**
 * Just the essentials: a quieter Home for hard days.
 *
 * Home normally shows every block someone has enabled, at full volume, no
 * matter how they're doing when they open it. On a bad day that's eleven
 * areas of tracking, a supply warning and a nudge about the budget, and the
 * honest response to all of it is to close the app. This is the release
 * valve.
 *
 * Two rules shape everything below.
 *
 * It is a lens, never an edit. Their saved Home layout is not touched, not
 * reordered and not rewritten - turning this off puts Home back exactly as
 * they left it. Somebody reaching for this is already having a rough time and
 * must never have to rebuild their Home afterwards as the price of it.
 *
 * It hides visual load, never safety. Doses and appointments stay, because
 * those are the things it would actually hurt to miss, and crisis help is not
 * a block so it is untouchable by construction. Reminders and notifications
 * are deliberately out of scope too: this is about what Home looks like, not
 * about silencing medication.
 */

/** What survives. Deliberately short: what's due, and what's coming. */
export const ESSENTIAL_BLOCKS: HomeBlockKey[] = ["today", "upcoming"];

export type EssentialsDuration = "today" | "few-days" | "indefinite";

export const ESSENTIALS_DURATIONS: { key: EssentialsDuration; label: string; hint: string }[] = [
  { key: "today", label: "Just today", hint: "Back to normal tomorrow morning." },
  { key: "few-days", label: "A few days", hint: "Three days, then Home comes back on its own." },
  { key: "indefinite", label: "Until I turn it off", hint: "Stays exactly like this until you say otherwise." },
];

/** Matches the supply snooze, which is the app's existing shape for "not now". */
const FEW_DAYS = 3;

/**
 * When a chosen duration runs out, or null for indefinite.
 *
 * "Just today" ends at the start of tomorrow rather than 24 hours from now,
 * so turning it on at 11pm doesn't quietly cover most of the next day too.
 */
export function essentialsExpiryFor(duration: EssentialsDuration, now: Date): string | null {
  if (duration === "indefinite") return null;
  const end = new Date(now);
  end.setHours(0, 0, 0, 0);
  end.setDate(end.getDate() + (duration === "today" ? 1 : FEW_DAYS));
  return end.toISOString();
}

/**
 * Is it on right now?
 *
 * A lapsed expiry counts as off, and nothing announces that it lapsed. Home
 * simply has its things back. Telling somebody "your low-energy period has
 * ended" is the app deciding their day is going better, which it cannot know.
 */
export function essentialsActive(
  enabled: boolean,
  until: string | null | undefined,
  now: Date
): boolean {
  if (!enabled) return false;
  if (!until) return true;
  const ends = new Date(until).getTime();
  // An unparseable date is treated as indefinite rather than as off: failing
  // towards the quieter Home is the kinder way round.
  if (Number.isNaN(ends)) return true;
  return ends > now.getTime();
}

/** The blocks Home should render, given whether this is on. Order is the
 *  person's own, so their layout still decides what comes first. */
export function filterBlocksForEssentials(blocks: HomeBlockKey[], active: boolean): HomeBlockKey[] {
  if (!active) return blocks;
  return blocks.filter((block) => ESSENTIAL_BLOCKS.includes(block));
}

/** How long is left, for the line on Home. Null when indefinite or off. */
export function essentialsDaysLeft(until: string | null | undefined, now: Date): number | null {
  if (!until) return null;
  const ends = new Date(until).getTime();
  if (Number.isNaN(ends)) return null;
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  return Math.max(0, Math.round((ends - startOfToday.getTime()) / 86_400_000));
}

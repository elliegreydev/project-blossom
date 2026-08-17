import type { HomeBlockKey } from "./db";

/**
 * "What would help right now?" - the temporary lenses on Home.
 *
 * There used to be eight of these and only six of them did anything
 * different. "Calm down" and "Check today's tasks" produced an identical
 * Home, as did "Celebrate" and "Record something quickly", because `blocks`
 * is consumed as a Set so the order written here never mattered. Somebody
 * hunting for the right one was choosing between options that weren't
 * choices. They're merged, keeping the warmer label and the more useful
 * action from each pair.
 */
export type IntentionKey = "organise" | "prepare" | "reflect" | "calm" | "celebrate" | "support";

export interface Intention {
  key: IntentionKey;
  label: string;
  /** Shown under the buttons before anything is picked, so nobody has to tap
   *  blind to find out what a lens does. */
  summary: string;
  description: string;
  blocks: HomeBlockKey[];
  href: string;
  action: string;
}

export const INTENTION_LIST: Intention[] = [
  {
    key: "calm",
    label: "Calm down",
    summary: "Only what's due and what's coming",
    description: "Just the essentials. Nothing else needs your attention right now.",
    blocks: ["focus", "today", "upcoming"],
    href: "/reminders",
    action: "See what's due",
  },
  {
    key: "organise",
    label: "Organise",
    summary: "Today, appointments and your shortcuts",
    description: "Today, appointments and your chosen shortcuts.",
    blocks: ["focus", "today", "upcoming", "pinned"],
    href: "/plan",
    action: "Open calendar",
  },
  {
    key: "prepare",
    label: "Prepare",
    summary: "Plans, medication and supplies",
    description: "Upcoming plans, medication and practical supplies.",
    blocks: ["focus", "today", "upcoming", "supplies", "pinned"],
    href: "/plan",
    action: "Review appointments",
  },
  {
    key: "reflect",
    label: "Reflect",
    summary: "Writing, and a little space",
    description: "A quieter place for notes and your Journey.",
    blocks: ["focus", "journey", "pinned", "aurora"],
    href: "/care/journal",
    action: "Open journal",
  },
  {
    key: "celebrate",
    label: "Celebrate",
    summary: "Wins, milestones and a place to record one",
    description: "A moment for affirming wins and milestones, and somewhere to add another.",
    blocks: ["focus", "journey", "pinned"],
    href: "/care/journal",
    action: "Record a good moment",
  },
  {
    key: "support",
    label: "Find support",
    summary: "Checked sources for where you are",
    description: "Verified regional sources and urgent support, when useful.",
    blocks: ["focus", "aurora", "pinned"],
    href: "/aurora",
    action: "Find support",
  },
];

export const INTENTIONS: Record<IntentionKey, Intention> = Object.fromEntries(
  INTENTION_LIST.map((i) => [i.key, i])
) as Record<IntentionKey, Intention>;

/** Facts Blossom already knows, used to decide what to put first. */
export interface IntentionSignals {
  dueToday: number;
  appointmentSoon: boolean;
  supplyNeedsAttention: boolean;
  timeCapsuleReady: boolean;
  /** Most-picked keys, most recent first. Device-local. */
  recentlyUsed: IntentionKey[];
}

/**
 * Order the lenses by what's actually happening.
 *
 * Deliberately only practical facts: a dose is due, an appointment is close,
 * a supply needs checking, a Time Capsule is ready. Never anything that
 * amounts to guessing how somebody is feeling. An app that quietly moves
 * "Calm down" to the front because it thinks you're having a bad day has
 * made a judgement it has no business making, and being wrong about that is
 * worse than being unhelpful.
 *
 * What somebody actually picks is a weaker nudge than today's facts, so it
 * only breaks ties. A rough week shouldn't reshape a good one.
 */
export function orderIntentions(signals: IntentionSignals): Intention[] {
  const score = (i: Intention): number => {
    let n = 0;
    if (i.key === "organise" && signals.dueToday > 0) n += 3;
    if (i.key === "prepare" && signals.appointmentSoon) n += 4;
    if (i.key === "prepare" && signals.supplyNeedsAttention) n += 2;
    if (i.key === "celebrate" && signals.timeCapsuleReady) n += 3;

    const seen = signals.recentlyUsed.indexOf(i.key);
    if (seen >= 0) n += Math.max(0, 2 - seen) * 0.5;
    return n;
  };

  // Stable: equal scores keep the order written above, so a Home with nothing
  // going on looks the same every time rather than shuffling for no reason.
  return INTENTION_LIST.map((i, index) => ({ i, index, s: score(i) }))
    .sort((a, b) => b.s - a.s || a.index - b.index)
    .map((x) => x.i);
}

/** Newest first, no duplicates, capped. Device-local, never synced: which
 *  lens someone reached for is not something to copy to another device. */
export function rememberIntention(previous: IntentionKey[], key: IntentionKey): IntentionKey[] {
  return [key, ...previous.filter((k) => k !== key)].slice(0, 3);
}

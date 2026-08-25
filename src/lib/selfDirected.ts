// Shared with the waiting list, deliberately. Both features need "how long has
// it been" in plain words, and two implementations of that would drift.
// Explicit .ts extension so the test script resolves it under node.
import { daysBetween, waitedLabel } from "./referrals.ts";

/**
 * Self-directed care.
 *
 * For people looking after their own HRT without a prescriber, or alongside
 * one, or while still sat on a waiting list, which is the most common case of
 * all. Blossom's waiting list tracker and this section are two ends of the
 * same problem: multi-year waits are why most people end up here.
 *
 * WHAT THIS IS NOT, AND WILL NOT BECOME.
 *
 * No dosing guidance. No sources, vendors or where-to-buy. No interpreting a
 * blood result. Those are clinical and they are not ours to give, whatever
 * anyone asks for. What is here is admin: the schedule nobody else is keeping,
 * the record nobody else is holding, and the safety net nobody else set up.
 *
 * ONE NARROW EXCEPTION, ADDED DELIBERATELY (25 Aug 2026).
 *
 * The strength converter in src/components/StrengthConverter.tsx turns two
 * numbers the person typed into a third: 4mg at 40mg/mL is 0.1mL. That is
 * arithmetic, and it is the same arithmetic this app already does when it
 * predicts a supply running out from amountPerDose.
 *
 * It is not a hole in the rule above, and the line is worth stating precisely
 * because it will be pushed on. Converting a number somebody gives you is not
 * guidance. Telling them which number to put in would be. So the converter has
 * no opinion: it does not know what anybody should be taking, it will not say a
 * figure looks high or low, it does not check anything, and it saves nothing.
 * Ask it to convert an absurd number and it converts the absurd number, because
 * deciding the number is absurd is the clinical judgement we are refusing.
 *
 * The reason for having it: people already do this sum in their heads at the
 * point of drawing up, and a calculator that shows its working makes a slipped
 * decimal visible in a way mental arithmetic does not. That is harm reduction.
 *
 * The no-sources, no-vendors half of the rule was put to Ellie directly on the
 * same day and she kept it. Do not revisit it on your own initiative.
 *
 * THE TONE IS THE FEATURE.
 *
 * This has to work for somebody three years in, somebody still deciding, and
 * somebody stopping, without pushing any of them anywhere. Nothing asks a
 * person to justify themselves and nothing warns them off. Supervised care
 * stays visibly available and is never a nag - the wording throughout is
 * lifted from the existing "Starting HRT safely" checklist, which already got
 * this right: "whenever, if ever".
 *
 * Get this wrong and people either close the app and get their information
 * somewhere worse, or quietly lie to it, which makes every feature downstream
 * worthless.
 */

/** The section is renameable, because "self-directed care" on a home screen is
 *  still a disclosure to anyone who glances at the phone. */
export const DEFAULT_SECTION_LABEL = "Self-directed care";

export function sectionLabel(custom: string | null | undefined): string {
  const trimmed = (custom ?? "").trim();
  return trimmed === "" ? DEFAULT_SECTION_LABEL : trimmed;
}

/**
 * Whether anyone else is watching.
 *
 * Asked so the app knows which jobs to pick up, never to check up on anybody.
 * "bloods-only" exists because it is extremely common and offering only yes or
 * no would tell those people the app does not understand their situation: a GP
 * who will run monitoring but will not prescribe is a real and ordinary
 * arrangement. "declined" is a first-class answer, not a refusal to cooperate.
 */
export type PrescriberStatus = "monitored" | "bloods-only" | "self" | "declined";

export const PRESCRIBER_OPTIONS: { key: PrescriberStatus; label: string }[] = [
  { key: "monitored", label: "A clinic or doctor is monitoring me" },
  { key: "bloods-only", label: "Someone does my bloods, but that's it" },
  { key: "self", label: "No, it's just me" },
  { key: "declined", label: "I'd rather not say" },
];

/** Whether Blossom should be the one keeping the monitoring rhythm. If a
 *  clinic is doing it, the app stays out of the way rather than adding a
 *  second competing schedule. */
export function shouldOfferBloodRhythm(status: PrescriberStatus | null): boolean {
  return status === "self" || status === "bloods-only" || status === "declined";
}

/**
 * How often to be reminded. The person picks; Blossom never suggests a number
 * and has no default, because how often anyone should test is a clinical
 * question and this file does not answer those.
 */
export const BLOOD_CHECK_INTERVALS: { key: string; label: string; days: number | null }[] = [
  { key: "none", label: "Don't remind me", days: null },
  { key: "3m", label: "Every 3 months", days: 91 },
  { key: "6m", label: "Every 6 months", days: 182 },
  { key: "12m", label: "Every year", days: 365 },
];

export interface BloodRhythmInput {
  /** Most recent recorded blood test, or null if there has never been one. */
  lastTestedOn: string | null;
  /** Null when reminders are off. */
  intervalDays: number | null;
  today: string;
}

export interface BloodRhythmStatus {
  state: "off" | "none-recorded" | "recent" | "due";
  /** Plain-words elapsed time, or null when there is nothing to measure. */
  since: string | null;
  title: string | null;
  body: string | null;
}

/**
 * Where the monitoring rhythm has got to.
 *
 * Deliberately only arithmetic. It counts, and it says what it counted. It
 * never says a test is overdue in a medical sense, never names a test, and
 * never implies a number is wrong, because it has no idea and neither has the
 * app.
 *
 * "none-recorded" is written for somebody who has just started and has nothing
 * yet. It must not read as a telling-off; that person has done nothing wrong
 * and is the most likely of anyone to close the app if it starts wagging a
 * finger on day one.
 */
export function bloodRhythmStatus(input: BloodRhythmInput): BloodRhythmStatus {
  const { lastTestedOn, intervalDays, today } = input;
  const since = lastTestedOn ? waitedLabel(lastTestedOn, today) : null;

  if (!intervalDays || intervalDays <= 0) {
    return {
      state: "off",
      since,
      title: null,
      body: null,
    };
  }

  if (!lastTestedOn) {
    return {
      state: "none-recorded",
      since: null,
      title: "No bloods recorded yet",
      body: "Whenever you have some done, adding them here means the next lot actually mean something. Nothing needs doing today.",
    };
  }

  const elapsed = daysBetween(lastTestedOn, today);
  if (elapsed === null || elapsed < intervalDays) {
    return {
      state: "recent",
      since,
      title: null,
      body: null,
    };
  }

  return {
    state: "due",
    since,
    title: "Might be worth booking some bloods",
    body: `Your last recorded test was ${since ?? "a while"} ago, and you asked to be reminded around now. Blossom doesn't know what you should be testing or how often, only how long it's been.`,
  };
}

/** How long on HRT, in plain words. Nobody else is holding this date when
 *  there is no clinic, and it is the first thing a doctor asks. */
export function timeOnHrtLabel(startedOn: string | null, today: string): string | null {
  if (!startedOn) return null;
  return waitedLabel(startedOn, today);
}

/**
 * The one-line summary at the top of the section.
 *
 * No number is ever presented as good or bad. It is a fact about a date, said
 * once, quietly.
 */
export function overviewLine(startedOn: string | null, today: string): string {
  const on = timeOnHrtLabel(startedOn, today);
  if (!on) return "Add the date you started and Blossom can keep track of it for you.";
  if (on === "today") return "You started today.";
  return `You've been going ${on}.`;
}

/** The sync category key. Its own category so it can be left off, and off is
 *  the default: this is the most sensitive fact in the app, and the setup copy
 *  promises it stays on the device unless somebody turns syncing on. */
export const SELF_DIRECTED_SYNC_CATEGORY = "selfDirected";

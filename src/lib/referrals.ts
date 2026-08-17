/**
 * Waiting lists and referrals.
 *
 * The roadmap entry for this said "years of someone's life currently have
 * nowhere to go in Blossom", and that's the whole feature. A referral is made,
 * and then nothing happens for a very long time, and the person holds all of
 * it in their head: which service, roughly when, the thing the receptionist
 * said that one time. There's no paperwork. When a referral goes missing - and
 * they do go missing - the only record that ever existed was the clinic's.
 *
 * So this does four jobs, and only one of them is "a list".
 *
 * PROOF. The date, the reference number, who sent it. What you say back when
 * someone tells you there's no record of you.
 *
 * CHASING. When you last rang, who you spoke to, what they actually said.
 *
 * POSITION. Not an estimate. The real thing people get told: "we're currently
 * seeing people referred in June 2023."
 *
 * MEANWHILE. What you can do in the years in between.
 *
 * Two rules run through all of it.
 *
 * Blossom stores no waiting times of its own. What it stores is what somebody
 * was told, and when they were told it. A figure typed into this app in August
 * is wrong by Christmas, and being wrong about a queue position is not a
 * cosmetic bug - it's someone deciding not to ring because the app implied
 * they were nearly there. A record of a phone call can't rot. A claim can.
 *
 * And nothing here dramatises the wait. No progress bars, because there is no
 * progress and a bar that fills up would be a lie. No projected date, because
 * a date that keeps slipping is worse than no date. No counter presented as an
 * achievement. The elapsed time is a fact, printed the size of a fact, and the
 * only number that gets any emphasis is the one that does work: when it's
 * worth ringing them again.
 */

export type ReferralKind =
  | "gender-clinic"
  | "voice"
  | "surgery"
  | "hair-removal"
  | "fertility"
  | "mental-health"
  | "other";

export const REFERRAL_KINDS: { key: ReferralKind; label: string }[] = [
  { key: "gender-clinic", label: "Gender clinic" },
  { key: "voice", label: "Voice therapy" },
  { key: "surgery", label: "Surgery" },
  { key: "hair-removal", label: "Hair removal" },
  { key: "fertility", label: "Fertility" },
  { key: "mental-health", label: "Mental health" },
  { key: "other", label: "Something else" },
];

/**
 * Where a referral has got to.
 *
 * "lost" is deliberately its own status rather than a flavour of waiting.
 * Being told there's no record of you is a different situation with a
 * different next move, and folding it into "waiting" would keep nudging
 * somebody to chase a referral that isn't there to chase.
 */
export type ReferralStatus =
  | "waiting"
  | "booked"
  | "seen"
  | "discharged"
  | "withdrawn"
  | "lost";

export const REFERRAL_STATUSES: { key: ReferralStatus; label: string; hint: string }[] = [
  { key: "waiting", label: "Waiting", hint: "On the list, nothing booked yet." },
  { key: "booked", label: "First appointment booked", hint: "You have a date." },
  { key: "seen", label: "Been seen", hint: "You're under their care now." },
  { key: "discharged", label: "Discharged", hint: "They've finished with you." },
  { key: "withdrawn", label: "I came off the list", hint: "Your choice, for any reason." },
  { key: "lost", label: "They've lost it", hint: "No record of your referral." },
];

/** Statuses where the wait is still running, so elapsed time still means
 *  something. Once you've been seen, how long it took stops being live
 *  information and becomes history. */
const OPEN_STATUSES: ReferralStatus[] = ["waiting", "lost"];

export function isOpen(status: ReferralStatus): boolean {
  return OPEN_STATUSES.includes(status);
}

export const CHASE_INTERVALS: { key: string; label: string; days: number | null }[] = [
  { key: "none", label: "Don't remind me", days: null },
  { key: "monthly", label: "Every month", days: 30 },
  { key: "quarterly", label: "Every 3 months", days: 91 },
  { key: "biannual", label: "Every 6 months", days: 182 },
];

/** The shape the date helpers need. Kept structural rather than importing the
 *  Dexie row, so this file has no runtime imports and stays trivially
 *  testable. */
export interface ReferralLike {
  referredOn: string | null;
  status: ReferralStatus;
  chaseEveryDays: number | null;
  lastChasedOn: string | null;
  createdAt: string;
}

// Dates ----------------------------------------------------------------------
// Everything here is a "YYYY-MM-DD" date key, never a Date, and never a
// timestamp. Referral dates are days, not moments, and the moment you let a
// Date near them you're one BST boundary away from the app telling somebody
// they were referred a day earlier than they were.

interface Ymd {
  y: number;
  m: number;
  d: number;
}

function parseKey(key: string): Ymd | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key);
  if (!match) return null;
  const y = Number(match[1]);
  const m = Number(match[2]);
  const d = Number(match[3]);
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  // Round-trip through UTC to reject the 31st of February and friends.
  const stamp = new Date(Date.UTC(y, m - 1, d));
  if (stamp.getUTCMonth() !== m - 1 || stamp.getUTCDate() !== d) return null;
  return { y, m, d };
}

function toUtcMs(parts: Ymd): number {
  return Date.UTC(parts.y, parts.m - 1, parts.d);
}

/** Whole days from one date key to another. Negative if `to` is earlier.
 *  Both sides are built the same way in UTC, so daylight saving never enters
 *  the arithmetic. */
export function daysBetween(from: string, to: string): number | null {
  const a = parseKey(from);
  const b = parseKey(to);
  if (!a || !b) return null;
  return Math.round((toUtcMs(b) - toUtcMs(a)) / 86_400_000);
}

/** Calendar months between two dates, counting only whole ones. 3 Mar to 2 Apr
 *  is nought months, not one. */
function monthsBetween(a: Ymd, b: Ymd): number {
  let months = (b.y - a.y) * 12 + (b.m - a.m);
  if (b.d < a.d) months -= 1;
  return months;
}

export function addDays(key: string, days: number): string | null {
  const parts = parseKey(key);
  if (!parts) return null;
  const stamp = new Date(toUtcMs(parts) + days * 86_400_000);
  return stamp.toISOString().slice(0, 10);
}

function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

/**
 * How long the wait has been, in words.
 *
 * Calendar-accurate, so somebody referred on 3 March 2023 reads "3 years
 * 5 months" in August 2026 rather than a days-divided-by-365 approximation
 * that drifts. People quote this number down the phone; it should match what
 * they'd work out themselves on a calendar.
 *
 * Returns null when the date is unknown, which is common and not an error.
 */
export function waitedLabel(referredOn: string | null, today: string): string | null {
  if (!referredOn) return null;
  const from = parseKey(referredOn);
  const to = parseKey(today);
  if (!from || !to) return null;

  const days = Math.round((toUtcMs(to) - toUtcMs(from)) / 86_400_000);
  // A referral dated in the future is somebody mistyping the year. Say
  // nothing rather than "-2 years".
  if (days < 0) return null;
  if (days === 0) return "today";
  if (days < 31) return plural(days, "day");

  const months = monthsBetween(from, to);
  if (months < 12) return plural(Math.max(1, months), "month");

  const years = Math.floor(months / 12);
  const rest = months % 12;
  return rest === 0 ? plural(years, "year") : `${plural(years, "year")} ${plural(rest, "month")}`;
}

// Chasing --------------------------------------------------------------------

/**
 * When the next check-in is due, or null if reminders are off for this one.
 *
 * Counted from the last contact if there was one, otherwise from the referral
 * date, otherwise from when the row was made. That last fallback matters:
 * somebody who doesn't know when they were referred still deserves a nudge,
 * and it's arguably the case where a nudge helps most.
 */
export function nextChaseOn(referral: ReferralLike): string | null {
  if (!referral.chaseEveryDays || referral.chaseEveryDays <= 0) return null;
  if (!isOpen(referral.status)) return null;
  const base =
    referral.lastChasedOn ?? referral.referredOn ?? referral.createdAt.slice(0, 10);
  return addDays(base, referral.chaseEveryDays);
}

export function isChaseDue(referral: ReferralLike, today: string): boolean {
  const due = nextChaseOn(referral);
  if (!due) return false;
  const gap = daysBetween(due, today);
  return gap !== null && gap >= 0;
}

// What to do next ------------------------------------------------------------

export interface SuggestedAction {
  key: string;
  title: string;
  body: string;
}

/**
 * One suggestion, or none.
 *
 * Never more than one at a time. A screen about a multi-year wait with a stack
 * of things you ought to be doing reads as a telling-off, and the person is
 * not the reason the queue is long.
 */
export function suggestedAction(referral: ReferralLike, today: string): SuggestedAction | null {
  if (referral.status === "lost") {
    return {
      key: "re-refer",
      title: "Ask to be referred again",
      body: "Your GP can send a new referral. If you have the date of the first one, bring it - it's evidence the first referral was made, which sometimes gets the original date honoured.",
    };
  }

  if (referral.status !== "waiting") return null;

  if (!referral.referredOn) {
    return {
      key: "find-date",
      title: "Find out when you were referred",
      body: "Your GP practice can tell you the date they sent it and the reference number. It's the thing you'll want if anyone ever says there's no record of you.",
    };
  }

  if (isChaseDue(referral, today)) {
    const since = referral.lastChasedOn
      ? waitedLabel(referral.lastChasedOn, today)
      : waitedLabel(referral.referredOn, today);
    return {
      key: "chase",
      title: "Worth checking in",
      body: referral.lastChasedOn
        ? `It's been ${since ?? "a while"} since you last heard anything.`
        : `It's been ${since ?? "a while"} and you haven't recorded a check-in yet.`,
    };
  }

  // Nobody has ever rung, and it's been long enough that a referral could
  // quietly have gone astray without anyone noticing.
  const waited = daysBetween(referral.referredOn, today);
  if (!referral.lastChasedOn && waited !== null && waited >= 180) {
    return {
      key: "confirm-on-list",
      title: "Have you checked you're on the list?",
      body: "A short call to confirm they received the referral is worth doing once. Referrals do get lost, and the sooner that's spotted the less time you lose.",
    };
  }

  return null;
}

// Ordering -------------------------------------------------------------------

const STATUS_ORDER: ReferralStatus[] = [
  "waiting",
  "lost",
  "booked",
  "seen",
  "discharged",
  "withdrawn",
];

/** Live things first, then longest wait first. Somebody with four referrals
 *  should open this and see the one that's been dragging on longest, not the
 *  one they happened to add last. */
export function sortReferrals<T extends ReferralLike>(list: T[]): T[] {
  return [...list].sort((a, b) => {
    const rank = STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status);
    if (rank !== 0) return rank;
    const aDate = a.referredOn ?? a.createdAt.slice(0, 10);
    const bDate = b.referredOn ?? b.createdAt.slice(0, 10);
    return aDate.localeCompare(bDate);
  });
}

// Update log -----------------------------------------------------------------

export type ReferralUpdateKind = "chased" | "heard-back" | "position" | "note";

export const REFERRAL_UPDATE_KINDS: { key: ReferralUpdateKind; label: string; hint: string }[] = [
  { key: "chased", label: "I contacted them", hint: "Rang, emailed or wrote to them." },
  { key: "heard-back", label: "They contacted me", hint: "A letter, call or email from the service." },
  { key: "position", label: "They told me where I am", hint: "The month they're currently seeing, or a number." },
  { key: "note", label: "Just a note", hint: "Anything else worth remembering." },
];

export type ContactMethod = "phone" | "email" | "letter" | "portal" | "in-person";

export const CONTACT_METHODS: { key: ContactMethod; label: string }[] = [
  { key: "phone", label: "Phone" },
  { key: "email", label: "Email" },
  { key: "letter", label: "Letter" },
  { key: "portal", label: "Online portal" },
  { key: "in-person", label: "In person" },
];

/** Kinds that count as "I made contact", and so move the chase clock on.
 *  Hearing from them unprompted doesn't reset it, because it isn't evidence
 *  you can still get through to anyone. */
export function countsAsContact(kind: ReferralUpdateKind): boolean {
  return kind === "chased";
}

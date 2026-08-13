/**
 * Travel Mode: working out what a timezone change actually does to someone's
 * schedule, so Blossom can say it out loud instead of silently moving things.
 *
 * Deliberately free of runtime imports (same discipline as reminders.ts) so the
 * arithmetic here can be exercised on its own - getting this wrong means
 * telling someone the wrong time to take medication.
 */

export type TripStage = "upcoming" | "active" | "past";

/** How to treat reminder times when the device lands in a new zone. */
export type TimezoneChoice = "local" | "home";

/**
 * Minutes that `timeZone`'s wall clock is ahead of UTC at a given moment.
 * Derived from Intl rather than a table, so DST is handled by the platform
 * and the answer is correct for the actual date of travel, not today.
 */
export function offsetMinutes(timeZone: string, at: Date = new Date()): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(at);

  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? "0");
  const asIfUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  // Seconds are enough resolution; zones are whole minutes.
  return Math.round((asIfUtc - Math.floor(at.getTime() / 1000) * 1000) / 60000);
}

export function parseHHMM(value: string): number {
  const [h, m] = value.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return 0;
  return h * 60 + m;
}

export function formatHHMM(minuteOfDay: number): string {
  const wrapped = ((minuteOfDay % 1440) + 1440) % 1440;
  return `${String(Math.floor(wrapped / 60)).padStart(2, "0")}:${String(wrapped % 60).padStart(2, "0")}`;
}

export interface ShiftedTime {
  time: string;
  /** -1 the day before, 0 same day, +1 the next day. */
  dayOffset: number;
}

/**
 * A time that means "08:00 in fromZone" expressed as wall-clock in toZone.
 *
 * This is what "stay on home time" costs: an 8am London dose is midnight in
 * Los Angeles, and someone deserves to see that before choosing it.
 */
export function shiftTime(hhmm: string, fromZone: string, toZone: string, at: Date = new Date()): ShiftedTime {
  const delta = offsetMinutes(toZone, at) - offsetMinutes(fromZone, at);
  const raw = parseHHMM(hhmm) + delta;
  return {
    time: formatHHMM(raw),
    dayOffset: Math.floor(raw / 1440),
  };
}

/** "Europe/London" -> "London". Zone ids are the only label we have, and the
 *  city half is the part a person recognises. */
export function zoneLabel(timeZone: string | null | undefined): string {
  if (!timeZone) return "your home timezone";
  const last = timeZone.split("/").pop() ?? timeZone;
  return last.replace(/_/g, " ");
}

/** Whole hours where possible, because "8 hours behind" reads better than
 *  "-480 minutes". Half-hour zones (India, parts of Australia) exist, so this
 *  can't assume. */
export function describeOffset(fromZone: string, toZone: string, at: Date = new Date()): string {
  const delta = offsetMinutes(toZone, at) - offsetMinutes(fromZone, at);
  if (delta === 0) return "the same time as";
  const abs = Math.abs(delta);
  const hours = Math.floor(abs / 60);
  const minutes = abs % 60;
  const parts: string[] = [];
  if (hours) parts.push(`${hours} hour${hours === 1 ? "" : "s"}`);
  if (minutes) parts.push(`${minutes} minute${minutes === 1 ? "" : "s"}`);
  return `${parts.join(" ")} ${delta > 0 ? "ahead of" : "behind"}`;
}

export function tripStage(startDate: string, endDate: string, todayKey: string): TripStage {
  if (todayKey < startDate) return "upcoming";
  if (todayKey > endDate) return "past";
  return "active";
}

export interface ChecklistItem {
  key: string;
  label: string;
  detail: string;
}

/**
 * Practical, not alarmist. Every line is something that has actually caught
 * people out; none of it assumes where someone is going or why, and none of it
 * tells them travel is dangerous.
 */
export const TRAVEL_CHECKLIST: ChecklistItem[] = [
  {
    key: "hand-luggage",
    label: "Hormones in your hand luggage",
    detail: "Checked bags get lost or delayed. Anything you can't miss should stay with you.",
  },
  {
    key: "prescription",
    label: "A copy of your prescription",
    detail: "A photo of the label or a letter from whoever prescribes for you. Useful at security and if you need a refill.",
  },
  {
    key: "spare-doses",
    label: "Enough doses, plus a few spare",
    detail: "Cover the trip and then some - delays happen, and a pharmacy abroad may not stock what you take.",
  },
  {
    key: "sharps",
    label: "If you inject, check the airline's rules",
    detail: "Needles are usually fine in hand luggage with a prescription, but airlines differ. Worth ten minutes before you fly.",
  },
  {
    key: "passport-doc",
    label: "Save your Blossom Passport somewhere offline",
    detail: "A PDF on your phone works when roaming doesn't.",
  },
  {
    key: "local-support",
    label: "Note somewhere local you could go",
    detail: "Not because you'll need it. It's just easier to find now than in the moment.",
  },
];

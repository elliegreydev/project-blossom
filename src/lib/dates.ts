// Local calendar dates.
//
// The trap this exists to close: `new Date().toISOString().slice(0, 10)` looks
// like "today" but is the date in UTC. For anyone not on UTC it's the wrong
// day for part of every day - a dose logged at 9pm in New York was filed under
// tomorrow, and one logged at 00:30 in Britain during BST under yesterday.
//
// Entries in Blossom are anchored to the day the person experienced, so every
// date key has to come from their own clock. There were five separate correct
// implementations of this scattered around and eighteen files doing it the
// wrong way; this is the one both should use.

/** "YYYY-MM-DD" for a date, in the device's own timezone. */
export function localDateKey(date: Date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

/** "YYYY-MM-DD" for today, in the device's own timezone. */
export function todayLocalDateKey(): string {
  return localDateKey(new Date());
}

/** Today shifted by whole days, still in the device's own timezone. */
export function localDateKeyOffset(days: number, from: Date = new Date()): string {
  const shifted = new Date(from);
  shifted.setDate(shifted.getDate() + days);
  return localDateKey(shifted);
}

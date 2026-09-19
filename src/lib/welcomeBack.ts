// Coming back after a while.
//
// If somebody has not opened Blossom on this device for two weeks or more,
// Home starts with a calm card instead of carrying on as if they were here
// yesterday: everything is still here, a few things that are probably out of
// date, what is new in Blossom, and a plain line when there is nothing to
// catch up on.
//
// The rules that must not drift:
//
//   - Never a count. Not days away, not doses missed, not appointments
//     missed. Rows say that something is there, never how much of it. A number
//     turns a welcome into a tally of what somebody failed to do, and the
//     person most likely to see this card is somebody who stepped away from
//     their transition for a hard reason.
//   - Nothing is framed as missed or overdue. Appointments "while you were
//     away" are an invitation to note how they went.
//   - Device-local. "Away" means away from this device. Nothing here syncs.
//
// This file holds no React and no database, so it can be tested directly.

import { APP_VERSION, LAST_SEEN_VERSION_KEY, isNewer } from "@/lib/appVersion";
import { localDateKey } from "@/lib/dates";
import { isChaseDue, type ReferralLike } from "@/lib/referrals";

export const WELCOME_BACK_AFTER_DAYS = 14;

// The card is a welcome, not a to-do list. If somebody never presses Carry on,
// it quietly goes after a week rather than greeting them forever.
export const WELCOME_BACK_SHOWS_FOR_DAYS = 7;

export const LAST_ACTIVE_KEY = "blossom-last-active-at";
export const WELCOME_BACK_KEY = "blossom-welcome-back";
export const WELCOME_BACK_EVENT = "blossom:welcome-back";

const DAY_MS = 24 * 60 * 60 * 1000;

export interface WelcomeBackState {
  /** When they were last here, before this return. */
  since: string;
  /** When this card first appeared. */
  shownAt: string;
  /** The version they had last seen, for "New in Blossom". Null if unknown. */
  versionSeen: string | null;
}

export interface WelcomeBackItems {
  medication: boolean;
  appointments: boolean;
  followUps: boolean;
}

// Pure -----------------------------------------------------------------------

export function isLongGap(lastActiveAt: string | null, now: Date): boolean {
  if (!lastActiveAt) return false;
  const last = Date.parse(lastActiveAt);
  if (!Number.isFinite(last)) return false;
  return now.getTime() - last >= WELCOME_BACK_AFTER_DAYS * DAY_MS;
}

export function isStillShowing(state: WelcomeBackState, now: Date): boolean {
  const shown = Date.parse(state.shownAt);
  if (!Number.isFinite(shown)) return false;
  return now.getTime() - shown < WELCOME_BACK_SHOWS_FOR_DAYS * DAY_MS;
}

export function parseWelcomeBack(raw: string | null): WelcomeBackState | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<WelcomeBackState>;
    if (typeof value.since !== "string" || typeof value.shownAt !== "string") return null;
    return {
      since: value.since,
      shownAt: value.shownAt,
      versionSeen: typeof value.versionSeen === "string" ? value.versionSeen : null,
    };
  } catch {
    return null;
  }
}

/**
 * Which rows the card offers. Booleans on purpose: the card must never be
 * able to show a count, so it is never handed one.
 */
export function welcomeBackItems(input: {
  state: WelcomeBackState;
  enabledModules: readonly string[];
  medications: ReadonlyArray<{ active: boolean }>;
  appointments: ReadonlyArray<{ appointmentAt: string }>;
  referrals: ReadonlyArray<ReferralLike>;
}): WelcomeBackItems {
  const { state, enabledModules } = input;
  const since = Date.parse(state.since);
  const until = Date.parse(state.shownAt);
  const today = localDateKey(new Date(until));

  const medication =
    enabledModules.includes("medication") && input.medications.some((medication) => medication.active);

  const appointments =
    enabledModules.includes("appointments") &&
    input.appointments.some((appointment) => {
      const at = Date.parse(appointment.appointmentAt);
      return Number.isFinite(at) && at >= since && at < until;
    });

  const followUps =
    enabledModules.includes("waitingList") && input.referrals.some((referral) => isChaseDue(referral, today));

  return { medication, appointments, followUps };
}

/** Titles of changelog entries newer than the version they had last seen. */
export function newSinceVersion(
  entries: ReadonlyArray<{ version: string; title: string }>,
  versionSeen: string | null,
  limit = 3
): string[] {
  if (!versionSeen) return [];
  return entries.filter((entry) => isNewer(entry.version, versionSeen)).slice(0, limit).map((entry) => entry.title);
}

// Browser ----------------------------------------------------------------------
// Every function below swallows storage failures. A private window or a phone
// that blocks storage just never sees the card, which is the right failure.

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Nothing to do.
  }
}

function remove(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    // Nothing to do.
  }
}

function announce(): void {
  window.dispatchEvent(new Event(WELCOME_BACK_EVENT));
}

export function touchLastActive(now: Date = new Date()): void {
  write(LAST_ACTIVE_KEY, now.toISOString());
}

/**
 * The one place that decides whether this is a return. Safe to call from
 * anywhere, as often as you like: it creates the card at most once per return
 * and then keeps the "last active" clock current.
 *
 * It also marks the current version as seen when it creates the card, because
 * the card's "New in Blossom" replaces the What's new popup for this return.
 * Without that, somebody would get both, which is exactly the pile this
 * feature exists to avoid.
 */
export function resolveWelcomeBack(now: Date = new Date()): WelcomeBackState | null {
  if (typeof window === "undefined") return null;

  const existing = parseWelcomeBack(read(WELCOME_BACK_KEY));
  if (existing && isStillShowing(existing, now)) {
    touchLastActive(now);
    return existing;
  }
  if (existing) {
    remove(WELCOME_BACK_KEY);
    announce();
  }

  const lastActive = read(LAST_ACTIVE_KEY);
  let created: WelcomeBackState | null = null;
  if (lastActive && isLongGap(lastActive, now)) {
    created = { since: lastActive, shownAt: now.toISOString(), versionSeen: read(LAST_SEEN_VERSION_KEY) };
    write(WELCOME_BACK_KEY, JSON.stringify(created));
    write(LAST_SEEN_VERSION_KEY, APP_VERSION);
  }
  touchLastActive(now);
  if (created) announce();
  return created;
}

export function readWelcomeBackRaw(): string | null {
  if (typeof window === "undefined") return null;
  return read(WELCOME_BACK_KEY);
}

export function dismissWelcomeBack(): void {
  remove(WELCOME_BACK_KEY);
  write(LAST_SEEN_VERSION_KEY, APP_VERSION);
  announce();
}

export function subscribeWelcomeBack(onChange: () => void): () => void {
  window.addEventListener(WELCOME_BACK_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(WELCOME_BACK_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

/**
 * Keeps "last active" honest while the app is open, and catches a return
 * that happens without a reload. An installed app can sit in the background
 * for weeks and then be brought back to the front, and that is a return too.
 */
export function startActivityClock(): () => void {
  const onVisibility = () => {
    if (document.visibilityState === "visible") resolveWelcomeBack();
    else touchLastActive();
  };
  const onHide = () => touchLastActive();
  document.addEventListener("visibilitychange", onVisibility);
  window.addEventListener("pagehide", onHide);
  return () => {
    document.removeEventListener("visibilitychange", onVisibility);
    window.removeEventListener("pagehide", onHide);
  };
}

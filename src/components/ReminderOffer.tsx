"use client";

import { useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import type { User } from "@supabase/supabase-js";
import { db, LOCAL_PROFILE_ID, updateProfile } from "@/lib/db";
import { createClient } from "@/lib/supabase/client";
import { subscribeToPush } from "@/lib/push";
import styles from "./ReminderOffer.module.css";

// Its own resurface key, separate from SyncNudge. Once someone waves this away
// it stays gone for a fortnight, on every surface that shows it, rather than
// popping back the next time they open the page.
const DISMISSED_KEY = "blossom-reminder-offer-dismissed-until";
const RESURFACE_AFTER_MS = 14 * 24 * 60 * 60 * 1000;

// A gentle, dismissable offer to turn reminders on, shown at the moment a
// reason to have them has just been created (a medication schedule, an
// appointment reminder). It never nags and never guilts: it is an offer.
//
// It decides whether to appear entirely from safe state and shows only when it
// can actually do something useful. Crucially it NEVER calls
// Notification.requestPermission() on its own; that is a one-shot a browser
// remembers forever, so it fires only from an explicit tap on the button below.
export default function ReminderOffer({ reason }: { reason: string }) {
  const profile = useLiveQuery(() => db.profiles.get(LOCAL_PROFILE_ID));
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    try {
      setDismissed(Number(localStorage.getItem(DISMISSED_KEY)) > Date.now());
    } catch {
      // The offer can still be dismissed for this visit.
    }
    const supabase = createClient();
    void supabase.auth.getSession().then(({ data }) => setUser(data.session?.user ?? null));
    const { data } = supabase.auth.onAuthStateChange((_event, session) => setUser(session?.user ?? null));
    setReady(true);
    return () => data.subscription.unsubscribe();
  }, []);

  function dismiss() {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISSED_KEY, String(Date.now() + RESURFACE_AFTER_MS));
    } catch {
      // Nothing else is needed when storage is unavailable.
    }
  }

  // Only ever from the button's onClick. requestPermission is a one-shot, so it
  // must never run on mount, on render, or as a side effect.
  async function turnOn() {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    const result = await Notification.requestPermission();
    if (result === "granted") {
      await updateProfile({ notificationsEnabled: true });
      // Background push, so reminders still arrive with Blossom closed. Only a
      // signed-in person can have it, and a failure here is not worth raising:
      // the while-open reminders are already on either way.
      if (user) {
        try {
          await subscribeToPush(user.id);
        } catch {
          // Left quiet on purpose. Foreground reminders work regardless.
        }
      }
      // notificationsEnabled is now true, so this card simply stops rendering.
    } else {
      // "denied" or "default". Say so once, plainly, and stop asking.
      setFailed(true);
    }
  }

  if (!ready || !profile || dismissed) return null;

  const supported = typeof window !== "undefined" && "Notification" in window;
  if (!supported) return null;
  // A remembered denial cannot be undone from here, so don't show a control
  // that would silently fail. The person made their choice.
  if (Notification.permission === "denied") return null;
  if (profile.notificationsEnabled) return null;

  return (
    <aside className={styles.offer} aria-label="Turn on reminders">
      <div className={styles.icon} aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.7 21a2 2 0 0 1-3.4 0" />
        </svg>
      </div>
      <div className={styles.content}>
        <span className={styles.label}>{reason}</span>
        <strong className={styles.title}>Want a reminder?</strong>
        {failed ? (
          <p className={styles.copy}>
            That didn&apos;t turn on. You can switch reminders on any time from Settings.
          </p>
        ) : (
          <>
            <p className={styles.copy}>
              Blossom can nudge you at the times you set.
              {/* Only promise discretion when the setting actually delivers it.
                  reminderPrivacy defaults to "discreet", but someone who chose
                  "Detailed" would see the medication named on their lock screen,
                  so an absolute promise here would be one the app breaks for
                  them. Say nothing rather than reassure falsely. */}
              {profile.reminderPrivacy === "discreet" &&
                " It stays discreet on the lock screen by default, so a glance shows Blossom and nothing more."}
              {/* Signed out means foreground only: LocalReminderService fires
                  from an open tab. Do not imply it arrives with the app shut,
                  which is the signed-in, push-subscribed case. */}
              {!user && " Reminders work while Blossom's open on this device, no account needed."}
            </p>
            <button type="button" className={styles.action} onClick={turnOn}>
              Turn on reminders
            </button>
          </>
        )}
      </div>
      <button type="button" className={styles.dismiss} onClick={dismiss} aria-label="Not now">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="m6 6 12 12M18 6 6 18" />
        </svg>
      </button>
    </aside>
  );
}

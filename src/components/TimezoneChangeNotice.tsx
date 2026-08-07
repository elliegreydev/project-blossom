"use client";

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, LOCAL_PROFILE_ID, resolvePendingTimezone } from "@/lib/db";
import { describeOffset, shiftTime, zoneLabel } from "@/lib/travel";
import styles from "./TimezoneChangeNotice.module.css";

/**
 * Shown when the device has moved to a new timezone.
 *
 * Blossom used to adopt the new zone silently, which meant landing in Los
 * Angeles quietly moved an 08:00 London dose eight hours. Nobody was told.
 * This asks instead, and shows what each answer does to real medication times
 * rather than describing it in the abstract.
 *
 * Dismissible on purpose, unlike the update prompt: nothing is broken, the
 * current schedule is still a valid answer, and someone stepping off a plane
 * should not be forced to make a medical decision before they can open the app.
 * The question comes back next launch if they skip it.
 */
export default function TimezoneChangeNotice() {
  const profile = useLiveQuery(() => db.profiles.get(LOCAL_PROFILE_ID));
  const medications = useLiveQuery(() => db.medications.filter((m) => m.active).toArray(), []);
  const [dismissed, setDismissed] = useState(false);
  const [working, setWorking] = useState(false);

  const home = profile?.timezone ?? null;
  const detected = profile?.pendingTimezone ?? null;
  if (dismissed || !home || !detected || home === detected) return null;

  const now = new Date();

  // Every distinct scheduled time across active medications, so the preview
  // shows the person's actual schedule rather than a made-up example.
  const times = [...new Set((medications ?? []).flatMap((m) => m.frequency?.times ?? []))].sort();

  async function choose(choice: "local" | "home") {
    setWorking(true);
    await resolvePendingTimezone(choice);
    setWorking(false);
  }

  return (
    <div className={styles.backdrop} role="dialog" aria-modal="true" aria-labelledby="tz-title">
      <div className={styles.sheet}>
        <p className={styles.eyebrow}>Looks like you&rsquo;ve travelled</p>
        <h2 id="tz-title" className={styles.title}>
          You&rsquo;re in {zoneLabel(detected)} now
        </h2>
        <p className={styles.body}>
          That&rsquo;s {describeOffset(home, detected, now)} {zoneLabel(home)}. How should your
          reminders handle it?
        </p>

        {times.length > 0 && (
          <div className={styles.preview}>
            <div className={styles.previewHead}>
              <span>Now</span>
              <span>Stay on {zoneLabel(home)} time</span>
            </div>
            {times.map((t) => {
              const shifted = shiftTime(t, home, detected, now);
              return (
                <div key={t} className={styles.previewRow}>
                  <span className={styles.time}>{t}</span>
                  <span className={styles.time}>
                    {shifted.time}
                    {shifted.dayOffset !== 0 && (
                      <span className={styles.dayHint}>
                        {shifted.dayOffset > 0 ? " next day" : " day before"}
                      </span>
                    )}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        <button type="button" className={styles.primary} disabled={working} onClick={() => void choose("local")}>
          Keep the same times here
          <span>{times.length ? `Still ${times[0]}, now ${zoneLabel(detected)} time` : "Times stay as they look"}</span>
        </button>

        <button type="button" className={styles.secondary} disabled={working} onClick={() => void choose("home")}>
          Stay on {zoneLabel(home)} time
          <span>Keeps the gap between doses the same</span>
        </button>

        <button type="button" className={styles.later} onClick={() => setDismissed(true)}>
          Decide later
        </button>
      </div>
    </div>
  );
}

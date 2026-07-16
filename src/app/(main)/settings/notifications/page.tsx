"use client";

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import ScreenHeader from "@/components/ScreenHeader";
import { db, LOCAL_PROFILE_ID, updateProfile } from "@/lib/db";
import styles from "@/components/settingsForm.module.css";

export default function NotificationsSettingsPage() {
  const profile = useLiveQuery(() => db.profiles.get(LOCAL_PROFILE_ID));
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [unsupported, setUnsupported] = useState(false);
  if (!profile) return null;

  async function turnOn() {
    if (typeof window === "undefined" || !("Notification" in window)) {
      setUnsupported(true);
      return;
    }
    const result = await Notification.requestPermission();
    if (result === "granted") {
      setPermissionDenied(false);
      await updateProfile({ notificationsEnabled: true });
    } else {
      setPermissionDenied(true);
    }
  }

  async function turnOff() {
    await updateProfile({ notificationsEnabled: false });
  }

  const browserBlocked =
    typeof window !== "undefined" && "Notification" in window && Notification.permission === "denied";

  return (
    <div className={styles.screen}>
      <ScreenHeader title="Notifications" backHref="/settings" />

      <p className={styles.hint}>
        Reminders fire while Blossom is open in a tab or installed app window -
        for medication doses and any appointment you&apos;ve added a reminder
        to. They can&apos;t yet wake a fully closed app; that needs either
        account sync or a browser feature we&apos;re still evaluating.
      </p>

      <div className={styles.toggleRow}>
        <div className={styles.toggleText}>
          <span className={styles.toggleTitle}>Reminders while Blossom is open</span>
          <span className={styles.toggleDesc}>
            {profile.notificationsEnabled ? "On" : "Off"}
          </span>
        </div>
        <button
          type="button"
          className={styles.primaryButton}
          onClick={profile.notificationsEnabled ? turnOff : turnOn}
        >
          {profile.notificationsEnabled ? "Turn off" : "Turn on"}
        </button>
      </div>

      {unsupported && (
        <p className={styles.hint}>This browser doesn&apos;t support notifications.</p>
      )}
      {(permissionDenied || browserBlocked) && (
        <p className={styles.hint}>
          Notifications are blocked for Blossom in your browser settings. You&apos;ll
          need to allow them there before this can turn on.
        </p>
      )}

      <div className={styles.field}>
        <span className={styles.label}>Reminder text</span>
        <div className={styles.optionGrid}>
          <button
            type="button"
            className={`${styles.optionCard} ${profile.reminderPrivacy === "discreet" ? styles.selected : ""}`}
            onClick={() => updateProfile({ reminderPrivacy: "discreet" })}
          >
            <span className={styles.optionTitle}>Discreet</span>
            <span className={styles.optionDesc}>
              e.g. &ldquo;You have something scheduled&rdquo;. No medication
              names, appointment types, or journal content
            </span>
          </button>
          <button
            type="button"
            className={`${styles.optionCard} ${profile.reminderPrivacy === "detailed" ? styles.selected : ""}`}
            onClick={() => updateProfile({ reminderPrivacy: "detailed" })}
          >
            <span className={styles.optionTitle}>Detailed</span>
            <span className={styles.optionDesc}>Notifications can show what they&apos;re actually for</span>
          </button>
        </div>
      </div>
    </div>
  );
}

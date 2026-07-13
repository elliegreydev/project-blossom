"use client";

import { useLiveQuery } from "dexie-react-hooks";
import ScreenHeader from "@/components/ScreenHeader";
import { db, LOCAL_PROFILE_ID, updateProfile } from "@/lib/db";
import styles from "@/components/settingsForm.module.css";

export default function NotificationsSettingsPage() {
  const profile = useLiveQuery(() => db.profiles.get(LOCAL_PROFILE_ID));
  if (!profile) return null;

  return (
    <div className={styles.screen}>
      <ScreenHeader title="Notifications" backHref="/settings" />

      <p className={styles.hint}>
        Notification delivery (actual push reminders) isn&apos;t built yet, but
        your preference is saved now so it&apos;s ready when it is.
      </p>

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

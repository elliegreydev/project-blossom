"use client";

import { useLiveQuery } from "dexie-react-hooks";
import ScreenHeader from "@/components/ScreenHeader";
import { db, LOCAL_PROFILE_ID } from "@/lib/db";
import styles from "@/components/settingsForm.module.css";

export default function AccountSettingsPage() {
  const profile = useLiveQuery(() => db.profiles.get(LOCAL_PROFILE_ID));
  if (!profile) return null;

  return (
    <div className={styles.screen}>
      <ScreenHeader title="Account & sync" backHref="/settings" />

      <div className={styles.optionCard} style={{ cursor: "default" }}>
        <span className={styles.optionTitle}>You&apos;re using Blossom locally</span>
        <span className={styles.optionDesc}>
          Everything you&apos;ve added lives only on this device. That&apos;s a
          complete way to use Blossom, not a step you&apos;re missing.
        </span>
      </div>

      <div className={styles.field}>
        <span className={styles.label}>Cross-device sync</span>
        <p className={styles.hint}>
          Coming soon: create an optional account to keep your data backed up
          and available on more than one device. You&apos;ll never need your
          real name or identity to set one up, and you can switch back to
          local-only whenever you like.
        </p>
      </div>
    </div>
  );
}

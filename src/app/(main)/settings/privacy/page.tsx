"use client";

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import ScreenHeader from "@/components/ScreenHeader";
import Toggle from "@/components/Toggle";
import PinSetupSheet from "@/components/PinSetupSheet";
import { db, LOCAL_PROFILE_ID, updateProfile, disableAppLock } from "@/lib/db";
import styles from "@/components/settingsForm.module.css";

export default function PrivacySettingsPage() {
  const profile = useLiveQuery(() => db.profiles.get(LOCAL_PROFILE_ID));
  const [pinSetupOpen, setPinSetupOpen] = useState(false);

  if (!profile) return null;

  return (
    <div className={styles.screen}>
      <ScreenHeader title="Privacy & security" backHref="/settings" />

      <div className={styles.toggleRow}>
        <div className={styles.toggleText}>
          <span className={styles.toggleTitle}>App lock (PIN)</span>
          <span className={styles.toggleDesc}>
            {profile.appLockEnabled ? "On, a 4-digit PIN is required to open Blossom" : "Off"}
          </span>
        </div>
        <Toggle
          checked={profile.appLockEnabled}
          onChange={(v) => (v ? setPinSetupOpen(true) : disableAppLock())}
          label="App lock"
        />
      </div>
      {profile.appLockEnabled && (
        <button
          type="button"
          className={styles.tertiaryButton}
          style={{ alignSelf: "flex-start", padding: "0 0 4px" }}
          onClick={() => setPinSetupOpen(true)}
        >
          Change PIN
        </button>
      )}

      <div className={styles.toggleRow}>
        <div className={styles.toggleText}>
          <span className={styles.toggleTitle}>Lock sensitive modules</span>
          <span className={styles.toggleDesc}>
            Require an extra step to open medication, journal, and body-related areas
          </span>
        </div>
        <Toggle
          checked={profile.sensitiveModulesLocked}
          onChange={(v) => updateProfile({ sensitiveModulesLocked: v })}
          label="Lock sensitive modules"
        />
      </div>

      <div className={styles.field}>
        <span className={styles.label}>How your data is protected</span>
        <p className={styles.hint}>
          Everything you enter stays on this device unless you turn on sync.
          If you do sync, your data is encrypted in transit and at rest, and
          strict per-account access rules mean no one else can read it,
          including us in normal operation.
        </p>
      </div>

      {pinSetupOpen && <PinSetupSheet onClose={() => setPinSetupOpen(false)} />}
    </div>
  );
}

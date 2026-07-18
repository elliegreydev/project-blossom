"use client";

import { useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import ScreenHeader from "@/components/ScreenHeader";
import Toggle from "@/components/Toggle";
import PinSetupSheet from "@/components/PinSetupSheet";
import {
  db,
  LOCAL_PROFILE_ID,
  updateProfile,
  disableAppLock,
  clearBiometricUnlockCredential,
  setBiometricUnlockCredential,
} from "@/lib/db";
import { isPlatformAuthenticatorAvailable, registerBiometricUnlock } from "@/lib/webauthn";
import styles from "@/components/settingsForm.module.css";

export default function PrivacySettingsPage() {
  const profile = useLiveQuery(() => db.profiles.get(LOCAL_PROFILE_ID));
  const [pinSetupOpen, setPinSetupOpen] = useState(false);
  const [biometricSupported, setBiometricSupported] = useState(false);
  const [biometricBusy, setBiometricBusy] = useState(false);
  const [biometricError, setBiometricError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void isPlatformAuthenticatorAvailable().then((available) => {
      if (!cancelled) setBiometricSupported(available);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!profile) return null;

  async function toggleBiometric(enable: boolean) {
    setBiometricError(false);
    if (!enable) {
      await clearBiometricUnlockCredential();
      return;
    }
    setBiometricBusy(true);
    const credentialId = await registerBiometricUnlock();
    setBiometricBusy(false);
    if (credentialId) await setBiometricUnlockCredential(credentialId);
    else setBiometricError(true);
  }

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

      {profile.appLockEnabled && biometricSupported && (
        <div className={styles.toggleRow}>
          <div className={styles.toggleText}>
            <span className={styles.toggleTitle}>Unlock with Face ID / Touch ID</span>
            <span className={styles.toggleDesc}>
              {profile.webauthnCredentialId
                ? "On - your PIN still works as a fallback"
                : "A faster alternative to typing your PIN, using this device's own biometric unlock"}
            </span>
          </div>
          <Toggle
            checked={Boolean(profile.webauthnCredentialId)}
            onChange={(v) => void toggleBiometric(v)}
            label="Biometric unlock"
          />
        </div>
      )}
      {biometricBusy && <p className={styles.hint}>Waiting for your device…</p>}
      {biometricError && (
        <p className={styles.hint}>That didn&apos;t work - your PIN is untouched and still works as normal.</p>
      )}

      <div className={styles.toggleRow}>
        <div className={styles.toggleText}>
          <span className={styles.toggleTitle}>Lock sensitive modules</span>
          <span className={styles.toggleDesc}>
            Require your PIN again to open medication, journal, and body-related areas
          </span>
        </div>
        <Toggle
          checked={profile.sensitiveModulesLocked}
          onChange={(v) => updateProfile({ sensitiveModulesLocked: v })}
          label="Lock sensitive modules"
        />
      </div>
      {profile.sensitiveModulesLocked && !profile.appLockEnabled && (
        <p className={styles.hint}>Turn on App lock above first - there&apos;s nothing to check this PIN against yet.</p>
      )}

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

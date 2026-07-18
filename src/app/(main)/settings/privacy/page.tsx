"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
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
import { createClient } from "@/lib/supabase/client";
import styles from "@/components/settingsForm.module.css";

interface OpenCase {
  subject: string;
  access_expires_at: string;
}

const SYNCED_CATEGORIES = [
  "Profile & preferences",
  "Journey milestones & timeline",
  "Medications, dose logs, and supply tracking",
  "Appointments",
  "Check-ins",
  "Goals",
];

export default function PrivacySettingsPage() {
  const profile = useLiveQuery(() => db.profiles.get(LOCAL_PROFILE_ID));
  const [pinSetupOpen, setPinSetupOpen] = useState(false);
  const [biometricSupported, setBiometricSupported] = useState(false);
  const [biometricBusy, setBiometricBusy] = useState(false);
  const [biometricError, setBiometricError] = useState(false);

  const [receiptLoading, setReceiptLoading] = useState(true);
  const [signedIn, setSignedIn] = useState(false);
  const [openCase, setOpenCase] = useState<OpenCase | null>(null);
  const [pushEnabled, setPushEnabled] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void isPlatformAuthenticatorAvailable().then((available) => {
      if (!cancelled) setBiometricSupported(available);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Live-queried, not a static claim - the whole point of a privacy receipt
  // is that it's more trustworthy than a policy document, which only holds
  // if it actually reflects the current, real state rather than drifting.
  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();

    async function load() {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        if (!cancelled) {
          setSignedIn(false);
          setReceiptLoading(false);
        }
        return;
      }
      if (cancelled) return;
      setSignedIn(true);

      const [{ data: cases }, { data: subs }] = await Promise.all([
        supabase
          .from("support_cases")
          .select("subject,access_expires_at")
          .eq("status", "open")
          .order("created_at", { ascending: false })
          .limit(1),
        supabase.from("push_subscriptions").select("id").limit(1),
      ]);
      if (cancelled) return;
      setOpenCase((cases?.[0] as OpenCase) ?? null);
      setPushEnabled(Boolean(subs && subs.length > 0));
      setReceiptLoading(false);
    }

    void load();
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
        <span className={styles.label}>Your privacy receipt</span>
        {receiptLoading ? (
          <p className={styles.hint}>Loading…</p>
        ) : (
          <>
            <p className={styles.hint}>
              {signedIn && profile.syncEnabled
                ? "You have sync turned on, so some of your data is stored on Blossom's servers so it's available across your devices. Here's exactly what: " +
                  SYNCED_CATEGORIES.join(", ") + "."
                : "Sync is off. Everything you've entered stays only on this device - nothing has been sent to Blossom's servers."}
            </p>
            <p className={styles.hint}>
              These always stay on this device only, even with sync on:
              journal entries, blood test results, voice practice recordings,
              presentation and body/progress photos and notes, your saved
              private links, your app lock PIN or biometric, and your
              accessibility settings.
            </p>
          </>
        )}
      </div>

      <div className={styles.field}>
        <span className={styles.label}>Active staff access</span>
        {receiptLoading ? (
          <p className={styles.hint}>Loading…</p>
        ) : !signedIn ? (
          <p className={styles.hint}>You&apos;re not signed in, so there&apos;s no synced account for staff to access.</p>
        ) : openCase ? (
          <p className={styles.hint}>
            A Blossom staff member currently has temporary access to help with
            &ldquo;{openCase.subject}&rdquo;. This ends automatically by{" "}
            {new Date(openCase.access_expires_at).toLocaleString("en-GB", {
              day: "numeric",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
            })}
            , or sooner if the case is closed first.
          </p>
        ) : (
          <p className={styles.hint}>No one from the Blossom team currently has access to your account.</p>
        )}
      </div>

      <div className={styles.field}>
        <span className={styles.label}>Connected services</span>
        <p className={styles.hint}>
          {(pushEnabled ? "Push notifications: on for this device. " : "Push notifications: off. ") +
            "Blossom doesn't connect to any third-party services."}
        </p>
      </div>

      <div className={styles.field}>
        <p className={styles.hint}>
          See the full{" "}
          <Link href="/legal/privacy" style={{ textDecoration: "underline" }}>
            Privacy Policy
          </Link>{" "}
          for more detail, or{" "}
          <Link href="/settings/data" style={{ textDecoration: "underline" }}>
            Data controls
          </Link>{" "}
          to export or delete your data.
        </p>
      </div>

      {pinSetupOpen && <PinSetupSheet onClose={() => setPinSetupOpen(false)} />}
    </div>
  );
}

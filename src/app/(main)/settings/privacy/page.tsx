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
import { CATEGORY_LABELS, type TicketCategory } from "@/lib/ticketCategories";
import { checkPersistentStorage, persistenceMessage, type PersistenceState } from "@/lib/persistentStorage";
import styles from "@/components/settingsForm.module.css";

interface ActiveGrant {
  category: string;
  access_expires_at: string;
}

const SYNCED_CATEGORIES = [
  "Profile & preferences",
  "Journey milestones & timeline",
  "Medications, dose logs, and supply tracking",
  "Appointments, including what you prepare for them and private notes",
  "Check-ins",
  "Goals",
  "Journal entries",
  "Blood test results",
  "Voice practice goals & session notes (not recordings)",
  "Presentation entries (not photos)",
  "Body/progress entries (not photos)",
  "Intimacy & wellbeing entries",
  "Weight & calorie entries",
  "Budget entries & goals",
  "Private links",
  "Personal Support Map",
  "Safety check-ins",
];

export default function PrivacySettingsPage() {
  const profile = useLiveQuery(() => db.profiles.get(LOCAL_PROFILE_ID));
  const [pinSetupOpen, setPinSetupOpen] = useState(false);
  const [biometricSupported, setBiometricSupported] = useState(false);
  const [biometricBusy, setBiometricBusy] = useState(false);
  const [biometricError, setBiometricError] = useState(false);

  const [persistence, setPersistence] = useState<PersistenceState | null>(null);
  const [receiptLoading, setReceiptLoading] = useState(true);
  const [signedIn, setSignedIn] = useState(false);
  const [activeGrant, setActiveGrant] = useState<ActiveGrant | null>(null);
  const [pushEnabled, setPushEnabled] = useState(false);

  useEffect(() => {
    void checkPersistentStorage().then(setPersistence);
  }, []);

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

      const [{ data: grants }, { data: subs }] = await Promise.all([
        supabase
          .from("support_ticket_access_grants")
          .select("access_expires_at,support_tickets(category)")
          .not("verified_at", "is", null)
          .is("revoked_at", null)
          .gt("access_expires_at", new Date().toISOString())
          .order("access_expires_at", { ascending: false })
          .limit(1),
        supabase.from("push_subscriptions").select("id").limit(1),
      ]);
      if (cancelled) return;
      const grantRow = grants?.[0];
      const ticket = grantRow ? (Array.isArray(grantRow.support_tickets) ? grantRow.support_tickets[0] : grantRow.support_tickets) : null;
      setActiveGrant(grantRow ? { category: ticket?.category ?? "your account", access_expires_at: grantRow.access_expires_at } : null);
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
              {!signedIn
                ? "You're not signed in, and nothing has been sent to Blossom's servers - staying signed out (or using the app without an account) keeps everything on this device only, always."
                : profile.syncEnabled
                  ? "You have sync turned on, so this data is stored on Blossom's servers so it's available across your devices. Here's exactly what: " +
                    SYNCED_CATEGORIES.join(", ") + "."
                  : "You're signed in but sync is off. Everything you've entered stays only on this device - nothing has been sent to Blossom's servers."}
            </p>
            <p className={styles.hint}>
              Photos and voice recordings never sync, full stop - not while
              signed out, not with sync on, no exception. That covers your
              presentation photos, body/progress photos, and voice practice
              recordings: they only ever exist on the device you took or
              recorded them on.
            </p>
            <p className={styles.hint}>
              Some things you write never sync either: your euphoria entries,
              including anything you&apos;ve sealed as a Time Capsule, and any
              trips you&apos;ve planned. Your
              app lock PIN/biometric and accessibility settings also always
              stay local, since they&apos;re per-device settings rather than
              account data.
            </p>
            <p className={styles.hint}>
              <strong>Whether your phone will keep it.</strong>{" "}
              {persistence === null ? "Checking…" : persistenceMessage(persistence)}
            </p>
            <div className={styles.field} style={{ gap: 7 }}>
              <span className={styles.label}>At a glance</span>
              <span className={styles.hint}>Signed out, or sync off: everything stays on this device, no exceptions.</span>
              <span className={styles.hint}>Signed in with sync on: the categories listed above sync so they follow you across devices - photos, voice recordings, euphoria entries and trips still never do.</span>
              <span className={styles.hint}>Exports: created on this device, and only include the sections you select.</span>
            </div>
          </>
        )}
      </div>

      <div className={styles.field}>
        <span className={styles.label}>Active staff access</span>
        {receiptLoading ? (
          <p className={styles.hint}>Loading…</p>
        ) : !signedIn ? (
          <p className={styles.hint}>You&apos;re not signed in, so there&apos;s no synced account for staff to access.</p>
        ) : activeGrant ? (
          <p className={styles.hint}>
            A Blossom staff member currently has temporary access to help with your ticket
            (&ldquo;{CATEGORY_LABELS[activeGrant.category as TicketCategory] ?? activeGrant.category}&rdquo;). This ends
            automatically by{" "}
            {new Date(activeGrant.access_expires_at).toLocaleString("en-GB", {
              day: "numeric",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
            })}
            , or sooner if staff end it early.
          </p>
        ) : (
          <p className={styles.hint}>No one from the Blossom team currently has access to your account.</p>
        )}
      </div>

      <div className={styles.field}>
        <span className={styles.label}>Connected services</span>
        <p className={styles.hint}>
          {signedIn ? "Supabase: used for your signed-in account and any data you choose to sync. " : "Supabase: not connected on this device. "}
          {pushEnabled ? "Push notifications: on for this device. " : "Push notifications: off. "}
          Blossom has no AI service, no analytics and no advertising code, so nothing you write is sent anywhere to be read by another company. The rest of what Blossom relies on, hosting and the donation page, is listed in the Privacy Policy.
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

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import type { User } from "@supabase/supabase-js";
import ScreenHeader from "@/components/ScreenHeader";
import { db, LOCAL_PROFILE_ID, updateProfile } from "@/lib/db";
import { createClient } from "@/lib/supabase/client";
import {
  getExistingPushSubscription,
  isPushSupported,
  subscribeToPush,
  unsubscribeFromPush,
} from "@/lib/push";
import styles from "@/components/settingsForm.module.css";

export default function NotificationsSettingsPage() {
  const profile = useLiveQuery(() => db.profiles.get(LOCAL_PROFILE_ID));
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [unsupported, setUnsupported] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [pushSubscribed, setPushSubscribed] = useState(false);
  const [pushWorking, setPushWorking] = useState(false);
  const [pushMessage, setPushMessage] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    void supabase.auth.getSession().then(({ data }) => setUser(data.session?.user ?? null));
    const { data } = supabase.auth.onAuthStateChange((_event, session) => setUser(session?.user ?? null));
    void getExistingPushSubscription().then((sub) => setPushSubscribed(Boolean(sub)));
    return () => data.subscription.unsubscribe();
  }, []);

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

  async function togglePush() {
    if (!user) return;
    setPushWorking(true);
    setPushMessage(null);
    try {
      if (pushSubscribed) {
        await unsubscribeFromPush();
        setPushSubscribed(false);
        setPushMessage("Background reminders are off on this device.");
      } else {
        const result = await subscribeToPush(user.id);
        if (result === "subscribed") {
          setPushSubscribed(true);
          setPushMessage("Background reminders are on for this device.");
        } else if (result === "permission-denied") {
          setPushMessage("Notifications are blocked for Blossom in your browser settings.");
        } else {
          setPushMessage("This browser doesn't support background reminders.");
        }
      }
    } catch {
      setPushMessage("Something went wrong turning this on. Your other settings are unaffected.");
    } finally {
      setPushWorking(false);
    }
  }

  const browserBlocked =
    typeof window !== "undefined" && "Notification" in window && Notification.permission === "denied";

  return (
    <div className={styles.screen}>
      <ScreenHeader title="Notifications" backHref="/settings" />

      <p className={styles.hint}>
        There are two separate kinds of reminder in Blossom. Below, &ldquo;while
        Blossom is open&rdquo; works for everyone, on this device, with no
        account needed. &ldquo;Even when Blossom is closed&rdquo; needs a
        signed-in, synced account, since delivering a notification to a closed
        app requires a server to send it.
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

      <div className={styles.toggleRow}>
        <div className={styles.toggleText}>
          <span className={styles.toggleTitle}>Even when Blossom is closed</span>
          <span className={styles.toggleDesc}>
            {!user
              ? "Needs a signed-in, synced account"
              : !profile.syncEnabled
                ? "Needs sync turned on"
                : !isPushSupported()
                  ? "Not supported in this browser"
                  : pushSubscribed
                    ? "On for this device"
                    : "Off"}
          </span>
        </div>
        {user && profile.syncEnabled && isPushSupported() ? (
          <button type="button" className={styles.primaryButton} onClick={togglePush} disabled={pushWorking}>
            {pushWorking ? "Working…" : pushSubscribed ? "Turn off" : "Turn on"}
          </button>
        ) : (
          <Link href="/account" className={styles.primaryButton}>
            {user ? "Turn on sync" : "Sign in"}
          </Link>
        )}
      </div>
      {pushMessage && <p className={styles.hint}>{pushMessage}</p>}

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

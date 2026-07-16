"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import { db, LOCAL_PROFILE_ID } from "@/lib/db";
import { createClient } from "@/lib/supabase/client";
import styles from "./SyncNudge.module.css";

const DISMISSED_KEY = "blossom-sync-nudge-dismissed-until";
const RESURFACE_AFTER_MS = 14 * 24 * 60 * 60 * 1000;

export default function SyncNudge() {
  const profile = useLiveQuery(() => db.profiles.get(LOCAL_PROFILE_ID));
  const syncState = useLiveQuery(() => db.syncMeta.get("sync"));
  const [ready, setReady] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    const authFallback = window.setTimeout(() => setReady(true), 250);
    void supabase.auth.getSession().then(({ data }) => {
      window.clearTimeout(authFallback);
      try {
        setDismissed(Number(localStorage.getItem(DISMISSED_KEY)) > Date.now());
      } catch {
        // The prompt can still be dismissed for this visit.
      }
      setSignedIn(Boolean(data.session?.user));
      setReady(true);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setSignedIn(Boolean(session?.user));
      setReady(true);
    });
    return () => {
      window.clearTimeout(authFallback);
      data.subscription.unsubscribe();
    };
  }, []);

  function dismiss() {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISSED_KEY, String(Date.now() + RESURFACE_AFTER_MS));
    } catch {
      // Nothing else is needed when storage is unavailable.
    }
  }

  if (!ready || !profile || dismissed) return null;
  if (profile.syncEnabled && signedIn && syncState?.ownerId) return null;

  return (
    <aside className={styles.nudge} aria-label="Blossom account and sync">
      <div className={styles.icon} aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M7.5 18.5A5.5 5.5 0 0 1 8 7.52 6.5 6.5 0 0 1 20 11a4 4 0 0 1-1 7.87" />
          <path d="m9 16 3 3 3-3M12 11v8" />
        </svg>
      </div>
      <div className={styles.content}>
        <span className={styles.label}>Optional sync</span>
        <strong className={styles.title}>{signedIn ? "Ready when you are" : "Keep Blossom across devices"}</strong>
        <p className={styles.copy}>
          {signedIn
            ? "You’re signed in. Your local data stays here until you choose to connect it."
            : "Create an account when you want backup and cross-device access."}
        </p>
        <Link href="/account" className={styles.action}>
          {signedIn ? "Review sync" : "Account & sync"}
        </Link>
      </div>
      <button type="button" className={styles.dismiss} onClick={dismiss} aria-label="Dismiss sync tip">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="m6 6 12 12M18 6 6 18" />
        </svg>
      </button>
    </aside>
  );
}

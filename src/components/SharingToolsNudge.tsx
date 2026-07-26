"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import styles from "./SyncNudge.module.css";

const DISMISSED_KEY = "blossom-sharing-tools-nudge-dismissed-until";
const RESURFACE_AFTER_MS = 30 * 24 * 60 * 60 * 1000;

export default function SharingToolsNudge() {
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    try {
      setDismissed(Number(localStorage.getItem(DISMISSED_KEY)) > Date.now());
    } catch {
      setDismissed(false);
    }
  }, []);

  function dismiss() {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISSED_KEY, String(Date.now() + RESURFACE_AFTER_MS));
    } catch {
      // Nothing else is needed when storage is unavailable.
    }
  }

  if (dismissed) return null;

  return (
    <aside className={styles.nudge} aria-label="Sharing and safety tools">
      <div className={styles.icon} aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <rect x="5" y="11" width="14" height="9" rx="2" />
          <path d="M8 11V8a4 4 0 0 1 8 0v3" />
        </svg>
      </div>
      <div className={styles.content}>
        <span className={styles.label}>Sharing &amp; safety</span>
        <strong className={styles.title}>A few tools worth knowing about</strong>
        <p className={styles.copy}>
          Share specific details with someone you trust, send a read-only link to someone without an
          account, or set up a gentle check-in for someone to notice if you go quiet.
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          <Link href="/settings/circle" className={styles.action}>Trusted Circle</Link>
          <Link href="/settings/bridge" className={styles.action}>Blossom Bridge</Link>
          <Link href="/settings/safety-checkins" className={styles.action}>Safety check-ins</Link>
        </div>
      </div>
      <button type="button" className={styles.dismiss} onClick={dismiss} aria-label="Dismiss sharing tools tip">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="m6 6 12 12M18 6 6 18" />
        </svg>
      </button>
    </aside>
  );
}

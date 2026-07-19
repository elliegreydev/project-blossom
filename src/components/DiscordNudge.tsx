"use client";

import { useEffect, useState } from "react";
import styles from "./SyncNudge.module.css";

const DISCORD_INVITE_URL = "https://discord.gg/jD3yS2HN7s";
const DISMISSED_KEY = "blossom-discord-nudge-dismissed-until";
const RESURFACE_AFTER_MS = 14 * 24 * 60 * 60 * 1000;

export default function DiscordNudge() {
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
    <aside className={styles.nudge} aria-label="Join the Discord">
      <div className={styles.icon} aria-hidden="true">
        💬
      </div>
      <div className={styles.content}>
        <span className={styles.label}>Community</span>
        <strong className={styles.title}>Come say hi on Discord</strong>
        <p className={styles.copy}>Chat with other people using Blossom and the team building it.</p>
        <a href={DISCORD_INVITE_URL} target="_blank" rel="noopener noreferrer" className={styles.action}>
          Join Discord
        </a>
      </div>
      <button type="button" className={styles.dismiss} onClick={dismiss} aria-label="Dismiss Discord tip">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="m6 6 12 12M18 6 6 18" />
        </svg>
      </button>
    </aside>
  );
}

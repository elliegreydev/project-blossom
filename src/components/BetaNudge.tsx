"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useUnreadBetaChat } from "./useUnreadBetaChat";
import styles from "./SyncNudge.module.css";

const DISMISSED_KEY = "blossom-beta-nudge-dismissed-until";
const RESURFACE_AFTER_MS = 7 * 24 * 60 * 60 * 1000;

export default function BetaNudge() {
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();

    async function check() {
      try {
        setDismissed(Number(localStorage.getItem(DISMISSED_KEY)) > Date.now());
      } catch {
        // The prompt can still be dismissed for this visit.
      }
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) return;
      const { data } = await supabase.rpc("is_beta_tester");
      if (!cancelled) setVisible(data === true);
    }

    void check();
    return () => {
      cancelled = true;
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

  const hasUnread = useUnreadBetaChat(visible);

  if (!visible || dismissed) return null;

  return (
    <aside className={styles.nudge} aria-label="Beta tester">
      <div className={styles.icon} aria-hidden="true">
        🧪
      </div>
      <div className={styles.content}>
        <span className={styles.label}>Beta tester</span>
        <strong className={styles.title}>You&apos;re helping test Blossom</strong>
        <p className={styles.copy}>
          {hasUnread ? "New message in beta chat." : "See what's new, chat with the team, or report something."}
        </p>
        <Link href="/beta" className={styles.action}>
          Open beta hub
        </Link>
      </div>
      <button type="button" className={styles.dismiss} onClick={dismiss} aria-label="Dismiss beta tip">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="m6 6 12 12M18 6 6 18" />
        </svg>
      </button>
    </aside>
  );
}

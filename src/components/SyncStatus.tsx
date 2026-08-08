"use client";

import { useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import styles from "./SyncStatus.module.css";

/**
 * Says when Blossom is catching up, everywhere in the app.
 *
 * Until now the only screen that admitted a sync was happening was the account
 * screen, which is why a tester reported that Blossom "only syncs after opening
 * the sync menu". It always synced. There was simply no way to tell a sync in
 * progress from a sync that had never started, so the honest thing to do was
 * press the one button that talks back, and that looked like the fix.
 */

// Same reasoning as the app's opening loader: a sync that finishes in a blink
// should show nothing at all, or this becomes a flicker people learn to ignore.
// Only a sync slow enough to be worth explaining gets to speak.
const APPEAR_AFTER_MS = 600;

export default function SyncStatus() {
  const syncState = useLiveQuery(() => db.syncMeta.get("sync"));
  const syncing = Boolean(syncState?.syncing);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!syncing) return;
    const timer = window.setTimeout(() => setVisible(true), APPEAR_AFTER_MS);
    // Cleared on the way out rather than on the way in, so the next slow sync
    // waits its 600ms again instead of appearing instantly.
    return () => {
      window.clearTimeout(timer);
      setVisible(false);
    };
  }, [syncing]);

  if (!syncing || !visible) return null;

  return (
    <div className={styles.pill} role="status" aria-live="polite">
      <span className={styles.spinner} aria-hidden="true" />
      Catching up
    </div>
  );
}

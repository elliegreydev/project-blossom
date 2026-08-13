"use client";

import { useState } from "react";
import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import { db, LOCAL_PROFILE_ID, setSyncExcludedCategories } from "@/lib/db";
import { purgeExcludedFromServer } from "@/lib/sync";
import { createClient } from "@/lib/supabase/client";
import { SYNC_CATEGORIES, NEVER_SYNCED, categoryLabel } from "@/lib/syncCategories";
import styles from "./whatSyncs.module.css";

export default function WhatSyncsPage() {
  const profile = useLiveQuery(() => db.profiles.get(LOCAL_PROFILE_ID));
  const [pendingPurge, setPendingPurge] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!profile) return null;
  const excluded = profile.syncExcludedCategories ?? [];

  async function toggle(key: string) {
    const isExcluded = excluded.includes(key);
    const next = isExcluded ? excluded.filter((k) => k !== key) : [...excluded, key];
    setMessage(null);
    setError(null);
    await setSyncExcludedCategories(next);
    // Turning something OFF is the moment to deal with what's already up there.
    // Turning it back on needs no cleanup.
    if (!isExcluded) setPendingPurge(key);
  }

  async function purge(key: string) {
    setBusy(true);
    setError(null);
    try {
      const { data } = await createClient().auth.getUser();
      if (!data.user) throw new Error("You're signed out, so there's nothing on the server to remove.");
      const removed = await purgeExcludedFromServer(data.user.id, [key]);
      setMessage(
        removed === 0
          ? `Nothing for ${categoryLabel(key)} was on the server.`
          : `Removed ${removed} ${removed === 1 ? "record" : "records"} from the server. Everything is still on your devices.`
      );
      setPendingPurge(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't remove those just now.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className={styles.screen}>
      <Link href="/account" className={styles.back}>&larr; Account &amp; sync</Link>

      <p className={styles.eyebrow}>What leaves this device</p>
      <h1 className={styles.title}>Choose what syncs</h1>
      <p className={styles.lede}>
        Sync used to be all or nothing. Turn off anything you&rsquo;d rather keep on your devices only -
        it stays exactly where it is, it just stops being copied to your account.
      </p>

      {!profile.syncEnabled && (
        <p className={styles.notice}>
          Sync is off entirely, so nothing is being uploaded at all. These choices apply if you turn it on.
        </p>
      )}

      <div className={styles.list}>
        {SYNC_CATEGORIES.map((cat) => {
          const off = excluded.includes(cat.key);
          return (
            <div key={cat.key} className={styles.item}>
              <label className={styles.row}>
                <span className={styles.rowText}>
                  <strong>{cat.label}</strong>
                  <em>{cat.description}</em>
                </span>
                <input
                  type="checkbox"
                  checked={!off}
                  onChange={() => void toggle(cat.key)}
                  aria-label={`Sync ${cat.label}`}
                />
              </label>

              {off && pendingPurge === cat.key && (
                <div className={styles.purge}>
                  <p>
                    {/* Built as one string: JSX drops the space between an
                        expression and the text that follows it here. */}
                    {`${cat.label} won’t be uploaded again.`} There may still be older copies
                    on the server from before now.
                  </p>
                  <div className={styles.purgeActions}>
                    <button type="button" className={styles.purgeGo} disabled={busy} onClick={() => void purge(cat.key)}>
                      {busy ? "Removing…" : "Remove them from the server"}
                    </button>
                    <button type="button" className={styles.purgeSkip} onClick={() => setPendingPurge(null)}>
                      Leave them
                    </button>
                  </div>
                  <p className={styles.reassure}>
                    Either way, nothing is removed from this phone or any other device you use.
                  </p>
                </div>
              )}

              {off && pendingPurge !== cat.key && <p className={styles.offNote}>On your devices only</p>}
            </div>
          );
        })}
      </div>

      {message && <p className={styles.success} role="status">{message}</p>}
      {error && <p className={styles.error} role="alert">{error}</p>}

      <aside className={styles.never}>
        <strong>Never uploaded, whatever you choose</strong>
        <ul>
          {NEVER_SYNCED.map((n) => <li key={n}>{n}</li>)}
        </ul>
      </aside>
    </main>
  );
}

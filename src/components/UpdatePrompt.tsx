"use client";

import { useEffect, useState } from "react";
import { APP_VERSION, isNewer } from "@/lib/changelog";
import styles from "./UpdatePrompt.module.css";

const POLL_INTERVAL_MS = 120_000;

/**
 * Keeps an open Blossom from running a stale build.
 *
 * The service worker calls skipWaiting/clients.claim, so a new deploy's worker
 * takes over straight away - but the *page* never reloads, so an installed app
 * that's been left open can sit on week-old JavaScript while being served the
 * new deploy's fingerprinted chunks. That mismatch is how you get features
 * that appear not to exist and requests shaped for a schema that moved on.
 *
 * So: poll /api/version, and when the deployed build is newer than this one,
 * say so and don't take no for an answer. There's no dismiss - the whole point
 * is that nobody stays on the old build.
 *
 * That's only fair because nothing is lost by restarting: journal entries and
 * check-in notes are kept as drafts while they're being written (see
 * src/lib/drafts.ts), so a reload picks up exactly where the person was.
 * If you ever add another free-text field, give it a draft before relying on
 * this to be harmless.
 */
const ATTEMPTS_KEY = "blossom:update-restarts";

/** How many restarts we let someone try before admitting it isn't working and
 *  telling them something they can actually act on. Without this, a reload
 *  that fails to pick up the new build traps them in a modal with one button
 *  and no way past it. */
const MAX_SILENT_ATTEMPTS = 2;

function readAttempts(version: string): number {
  try {
    const raw = sessionStorage.getItem(`${ATTEMPTS_KEY}:${version}`);
    return raw ? Number(raw) || 0 : 0;
  } catch {
    return 0;
  }
}

export default function UpdatePrompt() {
  const [newVersion, setNewVersion] = useState<string | null>(null);

  useEffect(() => {
    let stopped = false;

    async function check() {
      if (document.hidden) return;
      try {
        const res = await fetch("/api/version", { cache: "no-store" });
        if (!res.ok) return;
        const { version } = (await res.json()) as { version?: string };
        if (stopped || !version) return;
        if (isNewer(version, APP_VERSION)) setNewVersion(version);
      } catch {
        // Offline, or the deploy is mid-flight. Blossom works offline by
        // design, so a failed check is just a non-event - try again later.
      }
    }

    void check();
    const onVisible = () => {
      if (!document.hidden) void check();
    };
    document.addEventListener("visibilitychange", onVisible);
    const timer = setInterval(() => void check(), POLL_INTERVAL_MS);

    return () => {
      stopped = true;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  if (!newVersion) return null;

  const stuck = readAttempts(newVersion) >= MAX_SILENT_ATTEMPTS;

  async function restart(version: string) {
    try {
      sessionStorage.setItem(`${ATTEMPTS_KEY}:${version}`, String(readAttempts(version) + 1));
    } catch {}

    // The service worker is network-first for navigations, so a plain reload
    // is normally enough - but dropping the cached shell first means the
    // fallback can't hand back the old build if the network is slow enough to
    // time out mid-restart.
    try {
      const names = await caches.keys();
      await Promise.all(names.filter((n) => n.startsWith("blossom-shell-")).map((n) => caches.delete(n)));
    } catch {}

    window.location.reload();
  }

  return (
    <div className={styles.backdrop} role="dialog" aria-modal="true" aria-labelledby="update-title">
      <div className={styles.sheet}>
        <h2 id="update-title" className={styles.title}>Blossom has been updated</h2>
        <p className={styles.body}>
          There&rsquo;s a newer version ready. Restarting takes a second, and anything you were
          part-way through writing will still be here.
        </p>
        <button type="button" className={styles.restart} onClick={() => void restart(newVersion)}>
          Restart Blossom
        </button>
        {stuck && (
          <p className={styles.stuck}>
            Still on the old version after restarting? Close Blossom completely and open it again.
            Nothing you&rsquo;ve saved is affected.
          </p>
        )}
        <p className={styles.version}>v{APP_VERSION} &rarr; v{newVersion}</p>
      </div>
    </div>
  );
}

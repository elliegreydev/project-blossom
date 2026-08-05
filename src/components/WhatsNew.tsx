"use client";

import { useEffect, useState } from "react";
import { APP_VERSION, CHANGELOG, LAST_SEEN_VERSION_KEY, isNewer } from "@/lib/changelog";
import styles from "./WhatsNew.module.css";

const TAG_CLASS: Record<string, string> = {
  new: styles.new,
  improved: styles.improved,
  fix: styles.fix,
};

// Shows once per version bump, then not again until the next one.
//
// Two deliberate choices for Blossom specifically:
//  - Never on a first visit. Someone opening the app for the first time gets
//    onboarding, not a list of changes to an app they've never used.
//  - Nothing celebratory. This can appear in front of someone who opened
//    Blossom on a bad day, so it stays quiet and is easy to dismiss.
export default function WhatsNew() {
  const [open, setOpen] = useState(false);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    let seen: string | null = null;
    try {
      seen = localStorage.getItem(LAST_SEEN_VERSION_KEY);
    } catch {
      return; // storage blocked; skip silently rather than break the app
    }

    if (seen === null) {
      // First run on this device - record the version and stay quiet.
      try {
        localStorage.setItem(LAST_SEEN_VERSION_KEY, APP_VERSION);
      } catch {}
      return;
    }

    if (isNewer(APP_VERSION, seen)) setOpen(true);
  }, []);

  function dismiss() {
    setOpen(false);
    try {
      localStorage.setItem(LAST_SEEN_VERSION_KEY, APP_VERSION);
    } catch {}
  }

  if (!open || CHANGELOG.length === 0) return null;

  const entries = showAll ? CHANGELOG : CHANGELOG.slice(0, 1);

  return (
    <div
      className={styles.backdrop}
      role="dialog"
      aria-modal="true"
      aria-labelledby="whats-new-title"
      onClick={dismiss}
    >
      <div className={styles.sheet} onClick={(event) => event.stopPropagation()}>
        <div className={styles.head}>
          <h2 className={styles.title} id="whats-new-title">
            What&apos;s new in Blossom
          </h2>
          <p className={styles.sub}>
            <span className={styles.version}>v{APP_VERSION}</span>
            <span>A few things have changed since you were last here.</span>
          </p>
        </div>

        <div className={styles.body}>
          {entries.map((entry) => (
            <section className={styles.entry} key={entry.version}>
              <div className={styles.entryHead}>
                <span className={styles.entryTitle}>{entry.title}</span>
                <span className={styles.entryVersion}>v{entry.version}</span>
              </div>
              <div className={styles.entryDate}>
                {new Date(entry.date).toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </div>
              <ul className={styles.items}>
                {entry.items.map((item, index) => (
                  <li className={styles.item} key={index}>
                    <span className={`${styles.tag} ${TAG_CLASS[item.tag] ?? ""}`} aria-hidden="true" />
                    <span>{item.text}</span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        <div className={styles.foot}>
          {CHANGELOG.length > 1 && (
            <button type="button" className={styles.more} onClick={() => setShowAll((v) => !v)}>
              {showAll ? "Show only the latest" : `Everything before this (${CHANGELOG.length - 1})`}
            </button>
          )}
          <button type="button" className={styles.close} onClick={dismiss}>
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}

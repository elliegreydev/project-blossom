"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import { db, LOCAL_PROFILE_ID } from "@/lib/db";
import { APP_VERSION, isNewer } from "@/lib/appVersion";
import {
  dismissWelcomeBack,
  newSinceVersion,
  parseWelcomeBack,
  readWelcomeBackRaw,
  resolveWelcomeBack,
  subscribeWelcomeBack,
  welcomeBackItems,
} from "@/lib/welcomeBack";
import styles from "./WelcomeBack.module.css";

// See src/lib/welcomeBack.ts for the rules. The short version: never a count,
// nothing framed as missed, and it goes away the moment they say so.

const ICON = {
  width: 24,
  height: 24,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.7,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

export default function WelcomeBack() {
  // The card lives in localStorage, so it is read as an external store rather
  // than copied into state. The server renders nothing and the client picks
  // it up after hydration.
  const raw = useSyncExternalStore(subscribeWelcomeBack, readWelcomeBackRaw, () => null);
  const state = parseWelcomeBack(raw);

  const profile = useLiveQuery(() => db.profiles.get(LOCAL_PROFILE_ID));
  const medications = useLiveQuery(() => db.medications.toArray());
  const appointments = useLiveQuery(() => db.appointments.toArray());
  const referrals = useLiveQuery(() => db.referrals.toArray());
  const [news, setNews] = useState<string[]>([]);

  // Deciding whether this is a return has side effects (it starts the card and
  // keeps the clock current), so it happens here and not while rendering.
  useEffect(() => {
    resolveWelcomeBack();
  }, []);

  const versionSeen = state?.versionSeen ?? null;
  useEffect(() => {
    if (!versionSeen || !isNewer(APP_VERSION, versionSeen)) return;
    let cancelled = false;
    // Only fetched when there is something new to list. The changelog is kept
    // off the boot path on purpose, see WhatsNew.
    void import("@/lib/changelog").then(({ CHANGELOG }) => {
      if (!cancelled) setNews(newSinceVersion(CHANGELOG, versionSeen));
    });
    return () => {
      cancelled = true;
    };
  }, [versionSeen]);

  if (!state || !profile || !medications || !appointments || !referrals) return null;

  const items = welcomeBackItems({
    state,
    enabledModules: profile.enabledModules ?? [],
    medications,
    appointments,
    referrals,
  });
  const anything = items.medication || items.appointments || items.followUps;

  return (
    <section className={styles.card} aria-labelledby="welcome-back-title">
      <div className={styles.head}>
        <span className={styles.eyebrow}>Welcome back</span>
        <h2 className={styles.title} id="welcome-back-title">
          Good to see you.
        </h2>
        <p className={styles.lede}>Everything you kept here is still here, just as you left it.</p>
      </div>

      {anything ? (
        <div className={styles.rows}>
          {items.medication && (
            <Link href="/care/medication" className={styles.row}>
              <span className={styles.icon} data-tint="mint">
                <svg {...ICON}>
                  <rect x="3" y="8" width="18" height="8" rx="4" transform="rotate(45 12 12)" />
                  <path d="M9 9l6 6" />
                </svg>
              </span>
              <span className={styles.rowText}>
                <span className={styles.rowTitle}>Your medication details</span>
                <span className={styles.rowBody}>From before you were away. Worth a look if anything&apos;s changed.</span>
              </span>
              <span className={styles.chevron} aria-hidden="true">
                ›
              </span>
            </Link>
          )}
          {items.appointments && (
            <Link href="/plan" className={styles.row}>
              <span className={styles.icon} data-tint="sky">
                <svg {...ICON}>
                  <rect x="3.5" y="5" width="17" height="15.5" rx="3" />
                  <path d="M3.5 10.2h17M8 3.4v3.2M16 3.4v3.2" />
                </svg>
              </span>
              <span className={styles.rowText}>
                <span className={styles.rowTitle}>Appointments while you were away</span>
                <span className={styles.rowBody}>Jot down how they went, if you&apos;d like.</span>
              </span>
              <span className={styles.chevron} aria-hidden="true">
                ›
              </span>
            </Link>
          )}
          {items.followUps && (
            <Link href="/care/waiting-list" className={styles.row}>
              <span className={styles.icon} data-tint="pink">
                <svg {...ICON}>
                  <path d="M4 12h12M12 6l6 6-6 6" />
                </svg>
              </span>
              <span className={styles.rowText}>
                <span className={styles.rowTitle}>Things you wanted to follow up on</span>
                <span className={styles.rowBody}>Ready whenever you are. Nothing&apos;s gone anywhere.</span>
              </span>
              <span className={styles.chevron} aria-hidden="true">
                ›
              </span>
            </Link>
          )}
        </div>
      ) : (
        <p className={styles.nothing}>
          <strong>Nothing to catch up on.</strong> Take your time.
        </p>
      )}

      {news.length > 0 && (
        <div className={styles.news}>
          <span className={styles.newsTitle}>
            <svg {...ICON}>
              <path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18" />
            </svg>
            New in Blossom
          </span>
          <ul className={styles.newsList}>
            {news.map((title) => (
              <li key={title}>{title}</li>
            ))}
          </ul>
        </div>
      )}

      <div className={styles.actions}>
        <button type="button" className={styles.carryOn} onClick={dismissWelcomeBack}>
          Carry on
        </button>
        {news.length > 0 && (
          <Link href="/changelog" className={styles.quietLink}>
            Everything that&apos;s new
          </Link>
        )}
      </div>
    </section>
  );
}

"use client";

import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import { db, LOCAL_PROFILE_ID, dismissAuroraNudge, type Milestone, type JourneyEvent } from "@/lib/db";
import styles from "./home.module.css";

function formatEntryDate(entry: Milestone | JourneyEvent): string | null {
  if (entry.datePrecision === "none" || !entry.eventDate) return null;
  if (entry.datePrecision === "approximate") return entry.eventDate;
  return new Date(entry.eventDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export default function HomePage() {
  const profile = useLiveQuery(() => db.profiles.get(LOCAL_PROFILE_ID));
  const milestones = useLiveQuery(() => db.milestones.toArray(), []);
  const journeyEvents = useLiveQuery(() => db.journeyEvents.toArray(), []);
  const firstMilestoneNudge = useLiveQuery(() => db.auroraNudges.get("first_milestone"));

  if (!profile || milestones === undefined || journeyEvents === undefined) return null;

  const recentJourney = [...milestones, ...journeyEvents]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 2);

  const showFirstMilestoneNudge =
    profile.auroraMode !== "disabled" && milestones.length === 0 && !firstMilestoneNudge;

  const name = profile.displayName || "there";

  return (
    <div className={styles.screen}>
      <div className={styles.greeting}>Hi {name} 🌸</div>

      <div className={styles.section}>
        <div className={styles.sectionTitle}>Today</div>
        <div className={styles.emptyRow}>Nothing needs you right now.</div>
      </div>

      <div className={styles.section}>
        <div className={styles.sectionTitle}>Coming up</div>
        <div className={styles.emptyRow}>
          Once you add appointments or medication, they&apos;ll show up here.
        </div>
      </div>

      {showFirstMilestoneNudge && (
        <div className={styles.auroraCard}>
          <div className={styles.auroraText}>
            Whenever you&apos;re ready, your Journey is a quiet place to note things that
            matter to you. No pressure.
          </div>
          <button
            type="button"
            className={styles.auroraDismiss}
            onClick={() => dismissAuroraNudge("first_milestone")}
          >
            Dismiss
          </button>
        </div>
      )}

      <div className={styles.section}>
        <div className={styles.linkRow}>
          <div className={styles.sectionTitle}>Recent journey activity</div>
          <Link href="/journey" className={styles.link}>
            View all
          </Link>
        </div>
        {recentJourney.length === 0 ? (
          <div className={styles.emptyRow}>Your journey, your pace. Nothing here yet.</div>
        ) : (
          recentJourney.map((entry) => (
            <div key={entry.id} className={styles.card}>
              <div className={styles.cardTitle}>{entry.title}</div>
              {formatEntryDate(entry) && <div className={styles.cardMeta}>{formatEntryDate(entry)}</div>}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

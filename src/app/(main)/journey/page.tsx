"use client";

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, LOCAL_PROFILE_ID, type JourneyCategory, type Milestone, type JourneyEvent } from "@/lib/db";
import styles from "./journey.module.css";

const CATEGORY_LABELS: Record<JourneyCategory, string> = {
  identity: "Identity",
  medical: "Medical",
  legal: "Legal",
  social: "Social",
  voice_presentation: "Voice & presentation",
};

function formatEntryDate(entry: Milestone | JourneyEvent): string | null {
  if (entry.datePrecision === "none" || !entry.eventDate) return null;
  if (entry.datePrecision === "approximate") return entry.eventDate;
  return new Date(entry.eventDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export default function JourneyPage() {
  const profile = useLiveQuery(() => db.profiles.get(LOCAL_PROFILE_ID));
  const milestones = useLiveQuery(() => db.milestones.toArray(), []);
  const journeyEvents = useLiveQuery(() => db.journeyEvents.toArray(), []);
  const [activeCategory, setActiveCategory] = useState<JourneyCategory | null>(null);

  if (!profile || milestones === undefined || journeyEvents === undefined) return null;

  const visibleCategories = (Object.keys(CATEGORY_LABELS) as JourneyCategory[]).filter((cat) => {
    if (cat === "medical") return profile.enabledModules.includes("medication");
    if (cat === "voice_presentation") return false; // v1.5 module, not available yet
    return true;
  });

  const allEntries = [...milestones, ...journeyEvents]
    .filter((e) => !activeCategory || e.category === activeCategory)
    .sort((a, b) => {
      // Undated entries first-ish is jarring; sort by eventDate desc, undated last.
      if (!a.eventDate && !b.eventDate) return b.createdAt.localeCompare(a.createdAt);
      if (!a.eventDate) return 1;
      if (!b.eventDate) return -1;
      return b.eventDate.localeCompare(a.eventDate);
    });

  return (
    <div className={styles.screen}>
      <header className={styles.pageHeader}>
        <div className={styles.eyebrow}>Your story</div>
        <h1 className={styles.title}>Journey</h1>
        <p className={styles.subtitle}>A quiet timeline of the moments that matter to you.</p>
      </header>

      {visibleCategories.length > 0 && (
        <div className={styles.filters} role="group" aria-label="Filter journey by category">
          <button
            type="button"
            className={`${styles.filterChip} ${activeCategory === null ? styles.active : ""}`}
            onClick={() => setActiveCategory(null)}
            aria-pressed={activeCategory === null}
          >
            All
          </button>
          {visibleCategories.map((cat) => (
            <button
              key={cat}
              type="button"
              className={`${styles.filterChip} ${activeCategory === cat ? styles.active : ""}`}
              onClick={() => setActiveCategory(cat)}
              aria-pressed={activeCategory === cat}
            >
              {CATEGORY_LABELS[cat]}
            </button>
          ))}
        </div>
      )}

      {allEntries.length === 0 ? (
        <div className={styles.empty}>
          <div className={styles.emptyMark} aria-hidden="true">✦</div>
          <div className={styles.emptyTitle}>Your journey, your pace</div>
          <div className={styles.emptySubtitle}>
            This space is yours when you&apos;re ready. The + button is here whenever it feels useful.
          </div>
        </div>
      ) : (
        <div className={styles.timeline} role="list">
          {allEntries.map((entry) => (
            <article key={entry.id} className={styles.entry} role="listitem">
              <div className={styles.entryTopline}>
                <div className={styles.entryTitle}>{entry.title}</div>
                {entry.category && (
                  <div className={styles.entryCategory}>{CATEGORY_LABELS[entry.category]}</div>
                )}
              </div>
              {formatEntryDate(entry) && <time className={styles.entryMeta}>{formatEntryDate(entry)}</time>}
              {entry.note && <div className={styles.entryNote}>{entry.note}</div>}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

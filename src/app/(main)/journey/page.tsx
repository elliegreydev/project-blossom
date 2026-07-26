"use client";

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import UndoRemovalNotice from "@/components/UndoRemovalNotice";
import { useUndoableRemoval } from "@/components/useUndoableRemoval";
import {
  db,
  LOCAL_PROFILE_ID,
  deleteMilestone,
  deleteJourneyEvent,
  type JourneyCategory,
  type Milestone,
  type JourneyEvent,
} from "@/lib/db";
import styles from "./journey.module.css";

const CATEGORY_LABELS: Record<JourneyCategory, string> = {
  identity: "Identity",
  medical: "Medical",
  legal: "Legal",
  social: "Social",
  voice_presentation: "Voice & presentation",
};

function isMilestone(entry: Milestone | JourneyEvent): entry is Milestone {
  return "templateKey" in entry;
}

function formatEntryDate(entry: Milestone | JourneyEvent): string | null {
  if (entry.datePrecision === "none" || !entry.eventDate) return null;
  if (entry.datePrecision === "approximate") return entry.eventDate;
  return new Date(entry.eventDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

// Anniversaries within the next ANNIVERSARY_WINDOW_DAYS, including today.
// Only entries with an exact date and at least one completed year qualify -
// no "0 years since" for something added today. Mirrors the day/month
// matching aurora.ts's onThisDayMemory uses, just looking forward instead
// of only at today.
const ANNIVERSARY_WINDOW_DAYS = 45;
const ANNIVERSARY_LIMIT = 6;

interface Anniversary {
  id: string;
  title: string;
  years: number;
  daysUntil: number;
}

function upcomingAnniversaries(entries: (Milestone | JourneyEvent)[], now: Date): Anniversary[] {
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return entries
    .filter((entry) => entry.datePrecision === "exact" && entry.eventDate)
    .map((entry) => {
      // Parse "YYYY-MM-DD" as local calendar components directly, not via
      // `new Date(string)` (which parses date-only strings as UTC midnight -
      // reading .getMonth()/.getDate() back in local time can then land on
      // the wrong calendar day depending on the device's timezone offset).
      const [eventYear, eventMonth, eventDay] = (entry.eventDate as string).split("-").map(Number);
      let next = new Date(now.getFullYear(), eventMonth - 1, eventDay);
      if (next < todayStart) next = new Date(now.getFullYear() + 1, eventMonth - 1, eventDay);
      const daysUntil = Math.round((next.getTime() - todayStart.getTime()) / 86400000);
      const years = next.getFullYear() - eventYear;
      return { id: entry.id, title: entry.title, years, daysUntil };
    })
    .filter((a) => a.years >= 1 && a.daysUntil <= ANNIVERSARY_WINDOW_DAYS)
    .sort((a, b) => a.daysUntil - b.daysUntil)
    .slice(0, ANNIVERSARY_LIMIT);
}

export default function JourneyPage() {
  const profile = useLiveQuery(() => db.profiles.get(LOCAL_PROFILE_ID));
  const milestones = useLiveQuery(() => db.milestones.toArray(), []);
  const journeyEvents = useLiveQuery(() => db.journeyEvents.toArray(), []);
  const [activeCategory, setActiveCategory] = useState<JourneyCategory | null>(null);
  const { pendingRemoval, stageRemoval, undoRemoval, isPendingRemoval } = useUndoableRemoval();

  if (!profile || milestones === undefined || journeyEvents === undefined) return null;

  const anniversaries = upcomingAnniversaries([...milestones, ...journeyEvents], new Date());

  const visibleCategories = (Object.keys(CATEGORY_LABELS) as JourneyCategory[]).filter((cat) => {
    if (cat === "medical") return profile.enabledModules.includes("medication");
    if (cat === "voice_presentation") return false; // v1.5 module, not available yet
    return true;
  });

  const allEntries = [...milestones, ...journeyEvents]
    .filter((entry) => !isPendingRemoval(entry.id))
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

      {anniversaries.length > 0 && (
        <div className={styles.anniversaries}>
          {anniversaries.map((a) => (
            <div key={a.id} className={styles.anniversaryCard}>
              <span className={styles.anniversaryEyebrow}>
                {a.daysUntil === 0 ? "Today" : `In ${a.daysUntil} day${a.daysUntil === 1 ? "" : "s"}`}
              </span>
              <span className={styles.anniversaryTitle}>
                {a.years} year{a.years === 1 ? "" : "s"} since {a.title}
              </span>
            </div>
          ))}
        </div>
      )}

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
              <button
                type="button"
                className={styles.entryRemove}
                onClick={() => stageRemoval(entry.id, "This Journey entry", () => isMilestone(entry) ? deleteMilestone(entry.id) : deleteJourneyEvent(entry.id))}
              >
                Remove
              </button>
            </article>
          ))}
        </div>
      )}
      {pendingRemoval && <UndoRemovalNotice label={pendingRemoval.label} onUndo={undoRemoval} />}
    </div>
  );
}

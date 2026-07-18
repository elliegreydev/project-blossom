"use client";

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import ScreenHeader from "@/components/ScreenHeader";
import SensitiveModuleGate from "@/components/SensitiveModuleGate";
import JournalSheet from "@/components/JournalSheet";
import CheckInSheet from "@/components/CheckInSheet";
import { db, deleteJournalEntry, deleteCheckIn, type CheckIn } from "@/lib/db";
import styles from "@/components/feature.module.css";
import local from "./journal.module.css";

function dateLabel(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

const SCALE_LABELS: [keyof CheckIn, string][] = [
  ["mood", "Mood"],
  ["energy", "Energy"],
  ["confidence", "Confidence"],
  ["stress", "Stress"],
  ["comfort", "Comfort"],
];

export default function JournalPage() {
  const [tab, setTab] = useState<"journal" | "checkins" | "trends">("journal");
  const [journalOpen, setJournalOpen] = useState(false);
  const [checkInOpen, setCheckInOpen] = useState(false);

  const entries = useLiveQuery(() => db.journalEntries.orderBy("createdAt").reverse().toArray(), []);
  const checkIns = useLiveQuery(() => db.checkIns.orderBy("createdAt").reverse().toArray(), []);

  if (entries === undefined || checkIns === undefined) return null;

  const trendGroups = SCALE_LABELS.map(([key, label]) => {
    const values = checkIns
      .filter((ci) => ci[key])
      .map((ci) => ({ date: ci.createdAt, value: ci[key] as number }))
      .sort((a, b) => b.date.localeCompare(a.date));
    const average = values.length > 0 ? values.reduce((sum, v) => sum + v.value, 0) / values.length : 0;
    return { key, label, values, average };
  }).filter((group) => group.values.length > 0);

  return (
    <SensitiveModuleGate>
    <div className={styles.screen}>
      <ScreenHeader title="Journal & check-ins" backHref="/track" />

      <div className={local.segmented}>
        <button
          className={`${local.segment} ${tab === "journal" ? local.active : ""}`}
          onClick={() => setTab("journal")}
        >
          Journal
        </button>
        <button
          className={`${local.segment} ${tab === "checkins" ? local.active : ""}`}
          onClick={() => setTab("checkins")}
        >
          Check-ins
        </button>
        <button
          className={`${local.segment} ${tab === "trends" ? local.active : ""}`}
          onClick={() => setTab("trends")}
        >
          Trends
        </button>
      </div>

      {tab === "trends" ? (
        <div className={styles.section}>
          {trendGroups.length === 0 ? (
            <div className={styles.empty}>
              <div className={styles.emptyTitle}>Nothing to show yet</div>
              <div className={styles.emptySubtitle}>
                Once you&apos;ve logged a few check-ins, they&apos;ll show up here grouped
                by scale so you can see how things have moved.
              </div>
            </div>
          ) : (
            <div className={styles.list}>
              {trendGroups.map((group) => (
                <div key={group.key} className={styles.item}>
                  <div className={styles.itemTitle}>{group.label}</div>
                  <div className={local.trendAverage}>Average {group.average.toFixed(1)}/5</div>
                  <div className={local.trendGroup}>
                    {group.values.map((v, i) => (
                      <div key={i} className={local.trendRow}>
                        <span className={styles.itemMeta}>{dateLabel(v.date)}</span>
                        <span>{v.value}/5</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : tab === "journal" ? (
        <div className={styles.section}>
          {entries.length === 0 ? (
            <div className={styles.empty}>
              <div className={styles.emptyTitle}>A private space</div>
              <div className={styles.emptySubtitle}>
                Nothing here but you. Write whenever you feel like it.
              </div>
            </div>
          ) : (
            <div className={styles.list}>
              {entries.map((entry) => (
                <div key={entry.id} className={styles.item}>
                  <div className={styles.itemRow}>
                    <span className={styles.itemMeta}>{dateLabel(entry.createdAt)}</span>
                    <button className={styles.linkButton} onClick={() => deleteJournalEntry(entry.id)}>
                      Remove
                    </button>
                  </div>
                  <div className={styles.itemBody}>{entry.bodyText}</div>
                </div>
              ))}
            </div>
          )}
          <button className={styles.addButton} onClick={() => setJournalOpen(true)}>
            + New entry
          </button>
        </div>
      ) : (
        <div className={styles.section}>
          {checkIns.length === 0 ? (
            <div className={styles.empty}>
              <div className={styles.emptyTitle}>No check-ins yet</div>
              <div className={styles.emptySubtitle}>
                A quick, gentle way to note how you feel. No streaks, no pressure.
              </div>
            </div>
          ) : (
            <div className={styles.list}>
              {checkIns.map((ci) => (
                <div key={ci.id} className={styles.item}>
                  <div className={styles.itemRow}>
                    <span className={styles.itemMeta}>{dateLabel(ci.createdAt)}</span>
                    <button className={styles.linkButton} onClick={() => deleteCheckIn(ci.id)}>
                      Remove
                    </button>
                  </div>
                  <div className={local.checkInScales}>
                    {SCALE_LABELS.map(([key, label]) =>
                      ci[key] ? (
                        <span key={String(key)} className={local.scaleTag}>
                          {label} {ci[key] as number}/5
                        </span>
                      ) : null
                    )}
                  </div>
                  {ci.note && <div className={styles.itemBody}>{ci.note}</div>}
                </div>
              ))}
            </div>
          )}
          <button className={styles.addButton} onClick={() => setCheckInOpen(true)}>
            + New check-in
          </button>
        </div>
      )}

      {journalOpen && <JournalSheet onClose={() => setJournalOpen(false)} />}
      {checkInOpen && <CheckInSheet onClose={() => setCheckInOpen(false)} />}
    </div>
    </SensitiveModuleGate>
  );
}

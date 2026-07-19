"use client";

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import ScreenHeader from "@/components/ScreenHeader";
import SensitiveModuleGate from "@/components/SensitiveModuleGate";
import JournalSheet from "@/components/JournalSheet";
import CheckInSheet from "@/components/CheckInSheet";
import EuphoriaEntrySheet from "@/components/EuphoriaEntrySheet";
import PhotoThumbnail from "@/components/PhotoThumbnail";
import { db, deleteJournalEntry, deleteCheckIn, deleteEuphoriaEntry, type CheckIn, type EuphoriaEntry, type EuphoriaMomentKind } from "@/lib/db";
import TrendChart from "@/components/TrendChart";
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

const EUPHORIA_LABELS: Record<EuphoriaMomentKind, string> = {
  "affirming-interaction": "Affirming moment",
  style: "Style",
  voice: "Voice",
  confidence: "Confidence",
  compliment: "Kind words",
  celebration: "Celebration",
  "future-self": "Future me",
  other: "Something else",
};

function capsuleLabel(date: string): string {
  return new Date(`${date}T12:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

function EuphoriaCard({
  entry,
  expanded,
  onToggle,
  sealed = false,
}: {
  entry: EuphoriaEntry;
  expanded: boolean;
  onToggle: () => void;
  sealed?: boolean;
}) {
  const hiddenForLater = sealed && !expanded;

  return (
    <div className={styles.item}>
      <button type="button" className={local.entryButton} onClick={onToggle}>
        <div className={styles.itemRow}>
          <span className={styles.itemMeta}>{hiddenForLater ? "Time Capsule" : EUPHORIA_LABELS[entry.kind]}</span>
          <span className={local.expandHint}>
            {hiddenForLater ? `Set for ${capsuleLabel(entry.reopenAt!)} · Open early` : expanded ? "Close" : "View"}
          </span>
        </div>
        <div className={styles.itemTitle}>{hiddenForLater ? "A little something for later" : entry.title ?? EUPHORIA_LABELS[entry.kind]}</div>
        {!hiddenForLater && <span className={styles.itemMeta}>{dateLabel(entry.createdAt)}</span>}
      </button>
      {expanded && (
        <>
          {entry.photo && (
            <div className={local.photoWrap}>
              <PhotoThumbnail photo={entry.photo} alt="A private euphoria journal photo" />
            </div>
          )}
          {entry.bodyText && <div className={styles.itemBody}>{entry.bodyText}</div>}
          {entry.reopenAt && <span className={local.capsuleNote}>Time Capsule opened {capsuleLabel(entry.reopenAt)}</span>}
          <button type="button" className={styles.linkButton} onClick={() => deleteEuphoriaEntry(entry.id)}>
            Remove
          </button>
        </>
      )}
    </div>
  );
}

export default function JournalPage() {
  const [tab, setTab] = useState<"journal" | "checkins" | "trends" | "euphoria">("journal");
  const [journalOpen, setJournalOpen] = useState(false);
  const [checkInOpen, setCheckInOpen] = useState(false);
  const [euphoriaOpen, setEuphoriaOpen] = useState(false);
  const [euphoriaView, setEuphoriaView] = useState<"moments" | "capsules">("moments");
  const [expandedEuphoriaId, setExpandedEuphoriaId] = useState<string | null>(null);

  const entries = useLiveQuery(() => db.journalEntries.orderBy("createdAt").reverse().toArray(), []);
  const checkIns = useLiveQuery(() => db.checkIns.orderBy("createdAt").reverse().toArray(), []);
  const euphoriaEntries = useLiveQuery(() => db.euphoriaEntries.orderBy("createdAt").reverse().toArray(), []);

  if (entries === undefined || checkIns === undefined || euphoriaEntries === undefined) return null;

  const trendGroups = SCALE_LABELS.map(([key, label]) => {
    const values = checkIns
      .filter((ci) => ci[key])
      .map((ci) => ({ date: ci.createdAt, value: ci[key] as number }))
      .sort((a, b) => b.date.localeCompare(a.date));
    const average = values.length > 0 ? values.reduce((sum, v) => sum + v.value, 0) / values.length : 0;
    return { key, label, values, average };
  }).filter((group) => group.values.length > 0);

  const today = new Date().toISOString().slice(0, 10);
  const visibleMoments = euphoriaEntries.filter((entry) => !entry.reopenAt || entry.reopenAt <= today);
  const capsules = euphoriaEntries.filter((entry) => entry.reopenAt);

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
          className={`${local.segment} ${tab === "euphoria" ? local.active : ""}`}
          onClick={() => setTab("euphoria")}
        >
          Euphoria
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
                  <TrendChart points={group.values} min={1} max={5} />
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
      ) : tab === "checkins" ? (
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
      ) : (
        <div className={styles.section}>
          <div className={local.euphoriaIntro}>
            <span className={local.euphoriaEyebrow}>A quiet collection</span>
            <h2>Keep the moments that feel like you.</h2>
            <p>No progress score, no pressure. Just private things worth holding on to.</p>
          </div>

          <div className={local.euphoriaTabs} role="group" aria-label="Euphoria journal view">
            <button
              type="button"
              className={`${local.euphoriaTab} ${euphoriaView === "moments" ? local.euphoriaTabActive : ""}`}
              onClick={() => setEuphoriaView("moments")}
            >
              Moments
            </button>
            <button
              type="button"
              className={`${local.euphoriaTab} ${euphoriaView === "capsules" ? local.euphoriaTabActive : ""}`}
              onClick={() => setEuphoriaView("capsules")}
            >
              Time Capsules {capsules.length > 0 && <span>{capsules.length}</span>}
            </button>
          </div>

          {euphoriaView === "moments" &&
            (visibleMoments.length === 0 ? (
              <div className={styles.empty}>
                <div className={styles.emptyTitle}>Nothing needs to be recorded to make it real</div>
                <div className={styles.emptySubtitle}>When you want to keep a little moment close, this is here.</div>
              </div>
            ) : (
              <div className={styles.list}>
                {visibleMoments.map((entry) => (
                  <EuphoriaCard
                    key={entry.id}
                    entry={entry}
                    expanded={expandedEuphoriaId === entry.id}
                    onToggle={() => setExpandedEuphoriaId(expandedEuphoriaId === entry.id ? null : entry.id)}
                  />
                ))}
              </div>
            ))}

          {euphoriaView === "capsules" &&
            (capsules.length === 0 ? (
              <div className={styles.empty}>
                <div className={styles.emptyTitle}>No Time Capsules yet</div>
                <div className={styles.emptySubtitle}>You can seal a moment for a future version of you whenever it feels right.</div>
              </div>
            ) : (
              <div className={styles.list}>
                {capsules.map((entry) => {
                  const sealed = entry.reopenAt! > today;
                  return (
                    <EuphoriaCard
                      key={entry.id}
                      entry={entry}
                      sealed={sealed}
                      expanded={expandedEuphoriaId === entry.id}
                      onToggle={() => setExpandedEuphoriaId(expandedEuphoriaId === entry.id ? null : entry.id)}
                    />
                  );
                })}
              </div>
            ))}

          <button className={styles.addButton} onClick={() => setEuphoriaOpen(true)}>
            + Keep a moment
          </button>
        </div>
      )}

      {journalOpen && <JournalSheet onClose={() => setJournalOpen(false)} />}
      {checkInOpen && <CheckInSheet onClose={() => setCheckInOpen(false)} />}
      {euphoriaOpen && <EuphoriaEntrySheet onClose={() => setEuphoriaOpen(false)} />}
    </div>
    </SensitiveModuleGate>
  );
}

"use client";

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import ScreenHeader from "@/components/ScreenHeader";
import AddBodyEntrySheet from "@/components/AddBodyEntrySheet";
import PhotoThumbnail from "@/components/PhotoThumbnail";
import SensitiveModuleGate from "@/components/SensitiveModuleGate";
import { db, deleteBodyEntry } from "@/lib/db";
import styles from "@/components/feature.module.css";
import local from "./body.module.css";

function dateLabel(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export default function BodyProgressPage() {
  const entries = useLiveQuery(() => db.bodyEntries.orderBy("date").reverse().toArray(), []);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (entries === undefined) return null;

  return (
    <SensitiveModuleGate>
    <div className={styles.screen}>
      <ScreenHeader title="Body & progress" backHref="/track" />

      <div className={styles.section}>
        {entries.length === 0 ? (
          <div className={styles.empty}>
            <div className={styles.emptyTitle}>You don&apos;t have to track your body at all</div>
            <div className={styles.emptySubtitle}>
              If it ever feels useful, this is a quiet, private place to notice
              change, not judge it. Nothing here is required.
            </div>
          </div>
        ) : (
          <div className={styles.list}>
            {entries.map((entry) => {
              const expanded = expandedId === entry.id;
              return (
                <div key={entry.id} className={styles.item}>
                  <button
                    type="button"
                    className={local.entryButton}
                    onClick={() => setExpandedId(expanded ? null : entry.id)}
                  >
                    <div className={styles.itemRow}>
                      <span className={styles.itemMeta}>{dateLabel(entry.date)}</span>
                      {!expanded && <span className={local.expandHint}>Tap to view</span>}
                    </div>
                    {!expanded && entry.measurements.length > 0 && (
                      <div className={local.labelRow}>
                        {entry.measurements.map((m, i) => (
                          <span key={i} className={local.labelTag}>
                            {m.label}
                          </span>
                        ))}
                      </div>
                    )}
                  </button>

                  {expanded && (
                    <>
                      {entry.measurements.length > 0 && (
                        <div style={{ marginTop: 6 }}>
                          {entry.measurements.map((m, i) => (
                            <div key={i} className={local.measurementRow}>
                              <span>{m.label}</span>
                              <span className={local.measurementValue}>{m.value}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      {entry.photo && (
                        <div className={local.photoWrap}>
                          <PhotoThumbnail photo={entry.photo} alt="Body progress photo" />
                        </div>
                      )}
                      {entry.note && <div className={styles.itemBody}>{entry.note}</div>}
                      <button
                        type="button"
                        className={styles.linkButton}
                        style={{ marginTop: 6 }}
                        onClick={() => deleteBodyEntry(entry.id)}
                      >
                        Remove
                      </button>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
        <button className={styles.addButton} onClick={() => setSheetOpen(true)}>
          + Add entry
        </button>
      </div>

      {sheetOpen && <AddBodyEntrySheet onClose={() => setSheetOpen(false)} />}
    </div>
    </SensitiveModuleGate>
  );
}

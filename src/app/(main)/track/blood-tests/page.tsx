"use client";

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import ScreenHeader from "@/components/ScreenHeader";
import AddBloodTestSheet from "@/components/AddBloodTestSheet";
import { db, deleteBloodTestEntry, type BloodTestEntry } from "@/lib/db";
import styles from "@/components/feature.module.css";

function dateLabel(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export default function BloodTestsPage() {
  const entries = useLiveQuery(() => db.bloodTestEntries.toArray(), []);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<BloodTestEntry | null>(null);

  if (entries === undefined) return null;

  const groups = new Map<string, BloodTestEntry[]>();
  for (const entry of entries) {
    const list = groups.get(entry.testName) ?? [];
    list.push(entry);
    groups.set(entry.testName, list);
  }
  const groupList = [...groups.entries()]
    .map(([testName, items]) => ({
      testName,
      items: items.sort((a, b) => b.date.localeCompare(a.date)),
    }))
    .sort((a, b) => (b.items[0]?.date ?? "").localeCompare(a.items[0]?.date ?? ""));

  return (
    <div className={styles.screen}>
      <ScreenHeader title="Blood tests" backHref="/track" />

      <div className={styles.section}>
        <div className={styles.sectionTitle}>Your results</div>
        {groupList.length === 0 ? (
          <div className={styles.empty}>
            <div className={styles.emptyTitle}>Nothing added yet</div>
            <div className={styles.emptySubtitle}>
              Keep a private, descriptive record of your results. Blossom never
              interprets values, flags them, or gives treatment advice.
            </div>
          </div>
        ) : (
          <div className={styles.list}>
            {groupList.map((group) => (
              <div key={group.testName} className={styles.item}>
                <div className={styles.itemTitle}>{group.testName}</div>
                {group.items.map((entry) => (
                  <div key={entry.id} style={{ marginTop: 8 }}>
                    <div className={styles.itemRow}>
                      <span className={styles.itemMeta}>{dateLabel(entry.date)}</span>
                      <button
                        type="button"
                        className={styles.linkButton}
                        onClick={() => deleteBloodTestEntry(entry.id)}
                      >
                        Remove
                      </button>
                    </div>
                    <button type="button" className={styles.itemButton} onClick={() => setEditingEntry(entry)}>
                      <div className={styles.itemTitle} style={{ fontSize: 14 }}>
                        {entry.value}
                        {entry.unit ? ` ${entry.unit}` : ""}
                      </div>
                      {entry.labSource && <div className={styles.itemMeta}>{entry.labSource}</div>}
                      {entry.referenceRangeRaw && (
                        <div className={styles.itemMeta}>Reference on report: {entry.referenceRangeRaw}</div>
                      )}
                      {entry.note && <div className={styles.itemBody}>{entry.note}</div>}
                    </button>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
        <button className={styles.addButton} onClick={() => setSheetOpen(true)}>
          + Add result
        </button>
      </div>

      {(sheetOpen || editingEntry) && (
        <AddBloodTestSheet
          entry={editingEntry}
          onClose={() => {
            setSheetOpen(false);
            setEditingEntry(null);
          }}
        />
      )}
    </div>
  );
}

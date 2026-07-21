"use client";

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import ScreenHeader from "@/components/ScreenHeader";
import AddBodyEntrySheet from "@/components/AddBodyEntrySheet";
import AddWeightEntrySheet from "@/components/AddWeightEntrySheet";
import AddCalorieEntrySheet from "@/components/AddCalorieEntrySheet";
import WeightFoodSettingsSheet from "@/components/WeightFoodSettingsSheet";
import PhotoThumbnail from "@/components/PhotoThumbnail";
import SensitiveModuleGate from "@/components/SensitiveModuleGate";
import { db, deleteBodyEntry, deleteCalorieEntry, deleteWeightEntry, LOCAL_PROFILE_ID } from "@/lib/db";
import { formatWeight, resolvedWeightUnit, todayKey } from "@/lib/weight";
import styles from "@/components/feature.module.css";
import local from "./body.module.css";

function dateLabel(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export default function BodyProgressPage() {
  const profile = useLiveQuery(() => db.profiles.get(LOCAL_PROFILE_ID));
  const entries = useLiveQuery(() => db.bodyEntries.orderBy("date").reverse().toArray(), []);
  const weights = useLiveQuery(() => db.weightEntries.orderBy("date").reverse().toArray(), []);
  const calorieEntries = useLiveQuery(() => db.calorieEntries.orderBy("date").reverse().toArray(), []);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [weightSheetOpen, setWeightSheetOpen] = useState(false);
  const [calorieSheetOpen, setCalorieSheetOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [tab, setTab] = useState<"entries" | "byMeasurement">("entries");

  if (!profile || entries === undefined || weights === undefined || calorieEntries === undefined) return null;

  const unit = resolvedWeightUnit(profile.weightUnit, profile.region);
  const latestWeight = weights[0] ?? null;
  const today = todayKey();
  const todayFood = calorieEntries.filter((entry) => entry.date === today);
  const todayCalories = todayFood.reduce((total, entry) => total + entry.calories, 0);
  const gentle = profile.gentleMode;

  const byMeasurement = new Map<string, { date: string; value: string }[]>();
  for (const entry of entries) {
    for (const measurement of entry.measurements) {
      const list = byMeasurement.get(measurement.label) ?? [];
      list.push({ date: entry.date, value: measurement.value });
      byMeasurement.set(measurement.label, list);
    }
  }
  const measurementGroups = [...byMeasurement.entries()]
    .map(([label, values]) => ({ label, values: values.sort((a, b) => b.date.localeCompare(a.date)) }))
    .sort((a, b) => (b.values[0]?.date ?? "").localeCompare(a.values[0]?.date ?? ""));

  return (
    <SensitiveModuleGate>
      <div className={styles.screen}>
        <ScreenHeader title="Body & progress" backHref="/track" />

        <section className={styles.section}>
          <div className={local.trackingHeading}>
            <div>
              <h2 className={styles.sectionTitle}>Weight &amp; food</h2>
              <p className={local.sectionCopy}>Optional, private to this device, and never shared or synced.</p>
            </div>
            <button type="button" className={styles.linkButton} onClick={() => setSettingsOpen(true)}>Preferences</button>
          </div>

          {!profile.weightTrackingEnabled && !profile.calorieTrackingEnabled ? (
            <button type="button" className={local.setupCard} onClick={() => setSettingsOpen(true)}>
              <span className={styles.itemTitle}>Set up only what feels useful</span>
              <span className={styles.itemBody}>Track weight, food calories, both, or neither. Nothing is switched on by default.</span>
            </button>
          ) : (
            <div className={local.trackingGrid}>
              {profile.weightTrackingEnabled && (
                <div className={local.trackingCard} data-gentle-mode={gentle}>
                  <div className={styles.itemRow}>
                    <span className={styles.itemTitle}>Weight</span>
                    <span className={styles.itemMeta}>{gentle ? "Private tracking is on" : latestWeight ? dateLabel(latestWeight.date) : "No entry yet"}</span>
                  </div>
                  {gentle ? (
                    <p className={local.gentleSummary}>Numbers and goals are tucked away in Gentle Mode.</p>
                  ) : latestWeight ? (
                    <>
                      <strong className={local.primaryNumber}>{formatWeight(latestWeight.weightGrams, unit)}</strong>
                      {profile.weightGoalGrams != null && <span className={styles.itemMeta}>Goal: {formatWeight(profile.weightGoalGrams, unit)}</span>}
                    </>
                  ) : <p className={styles.itemBody}>There is no pressure to add an entry.</p>}
                  <div className={local.cardActions}>
                    <button type="button" className={styles.addButton} onClick={() => setWeightSheetOpen(true)}>Log weight</button>
                  </div>
                  {weights.length > 0 && !gentle && (
                    <div className={local.recentList}>
                      {weights.slice(0, 3).map((entry) => (
                        <div className={local.recentRow} key={entry.id}>
                          <span>{dateLabel(entry.date)}</span><span>{formatWeight(entry.weightGrams, unit)}</span>
                          <button type="button" aria-label={`Remove weight entry from ${dateLabel(entry.date)}`} onClick={() => deleteWeightEntry(entry.id)}>Remove</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {profile.calorieTrackingEnabled && (
                <div className={local.trackingCard} data-gentle-mode={gentle}>
                  <div className={styles.itemRow}>
                    <span className={styles.itemTitle}>Food log</span>
                    <span className={styles.itemMeta}>{gentle ? "Private logging is on" : todayFood.length === 1 ? "1 entry today" : `${todayFood.length} entries today`}</span>
                  </div>
                  {gentle ? (
                    <p className={local.gentleSummary}>Totals and references are tucked away in Gentle Mode.</p>
                  ) : (
                    <>
                      <strong className={local.primaryNumber}>{todayCalories} kcal</strong>
                      {profile.calorieTarget != null && <span className={styles.itemMeta}>Personal reference: {profile.calorieTarget} kcal</span>}
                    </>
                  )}
                  <div className={local.cardActions}>
                    <button type="button" className={styles.addButton} onClick={() => setCalorieSheetOpen(true)}>Add food</button>
                  </div>
                  {todayFood.length > 0 && !gentle && (
                    <div className={local.recentList}>
                      {todayFood.slice(0, 4).map((entry) => (
                        <div className={local.recentRow} key={entry.id}>
                          <span>{entry.label}</span><span>{entry.calories} kcal</span>
                          <button type="button" aria-label={`Remove ${entry.label}`} onClick={() => deleteCalorieEntry(entry.id)}>Remove</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </section>

        {entries.length > 0 && (
          <div className={local.segmented}>
            <button className={`${local.segment} ${tab === "entries" ? local.active : ""}`} onClick={() => setTab("entries")}>All entries</button>
            <button className={`${local.segment} ${tab === "byMeasurement" ? local.active : ""}`} onClick={() => setTab("byMeasurement")}>By measurement</button>
          </div>
        )}

        {tab === "byMeasurement" && entries.length > 0 ? (
          <div className={styles.section}>
            {measurementGroups.length === 0 ? (
              <div className={styles.empty}>
                <div className={styles.emptyTitle}>No measurements noted yet</div>
                <div className={styles.emptySubtitle}>Entries without measurements do not appear here. That is completely fine.</div>
              </div>
            ) : <div className={styles.list}>{measurementGroups.map((group) => (
              <div key={group.label} className={styles.item}>
                <div className={styles.itemTitle}>{group.label}</div>
                <div className={local.byMeasurementGroup}>{group.values.map((value, index) => <div key={index} className={local.byMeasurementRow}><span className={styles.itemMeta}>{dateLabel(value.date)}</span><span>{value.value}</span></div>)}</div>
              </div>
            ))}</div>}
          </div>
        ) : (
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Body notes</h2>
            {entries.length === 0 ? (
              <div className={styles.empty}>
                <div className={styles.emptyTitle}>You do not have to track your body at all</div>
                <div className={styles.emptySubtitle}>If it ever feels useful, this is a quiet, private place to notice change, not judge it.</div>
              </div>
            ) : (
              <div className={styles.list}>
                {entries.map((entry) => {
                  const expanded = expandedId === entry.id;
                  return <div key={entry.id} className={styles.item}>
                    <button type="button" className={local.entryButton} onClick={() => setExpandedId(expanded ? null : entry.id)}>
                      <div className={styles.itemRow}><span className={styles.itemMeta}>{dateLabel(entry.date)}</span>{!expanded && <span className={local.expandHint}>Tap to view</span>}</div>
                      {!expanded && entry.measurements.length > 0 && <div className={local.labelRow}>{entry.measurements.map((measurement, index) => <span key={index} className={local.labelTag}>{measurement.label}</span>)}</div>}
                    </button>
                    {expanded && <>
                      {entry.measurements.length > 0 && <div style={{ marginTop: 6 }}>{entry.measurements.map((measurement, index) => <div key={index} className={local.measurementRow}><span>{measurement.label}</span><span className={local.measurementValue}>{measurement.value}</span></div>)}</div>}
                      {entry.photo && <div className={local.photoWrap}><PhotoThumbnail photo={entry.photo} alt="Body progress photo" /></div>}
                      {entry.note && <div className={styles.itemBody}>{entry.note}</div>}
                      <button type="button" className={styles.linkButton} style={{ marginTop: 6 }} onClick={() => deleteBodyEntry(entry.id)}>Remove</button>
                    </>}
                  </div>;
                })}
              </div>
            )}
            <button className={styles.addButton} onClick={() => setSheetOpen(true)}>+ Add body note</button>
          </div>
        )}

        {sheetOpen && <AddBodyEntrySheet onClose={() => setSheetOpen(false)} />}
        {weightSheetOpen && <AddWeightEntrySheet profile={profile} onClose={() => setWeightSheetOpen(false)} />}
        {calorieSheetOpen && <AddCalorieEntrySheet onClose={() => setCalorieSheetOpen(false)} />}
        {settingsOpen && <WeightFoodSettingsSheet profile={profile} onClose={() => setSettingsOpen(false)} />}
      </div>
    </SensitiveModuleGate>
  );
}

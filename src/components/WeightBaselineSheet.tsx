"use client";

import { useState } from "react";
import styles from "./Sheet.module.css";
import { useSheetDialog } from "./useSheetDialog";
import { updateDeviceProfile, type WeightBaseline, type WeightEntry, type WeightUnit } from "@/lib/db";
import { formatWeight } from "@/lib/weight";

function dateLabel(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export default function WeightBaselineSheet({
  weights,
  unit,
  baseline,
  baselineNote,
  onClose,
}: {
  weights: WeightEntry[];
  unit: Exclude<WeightUnit, "auto">;
  baseline: WeightBaseline | null;
  baselineNote: string | null;
  onClose: () => void;
}) {
  const dialogRef = useSheetDialog(onClose);
  const [selectedId, setSelectedId] = useState(baseline?.sourceEntryId ?? weights.at(-1)?.id ?? "");
  const [note, setNote] = useState(baselineNote ?? "");
  const [saving, setSaving] = useState(false);
  const selected = weights.find((entry) => entry.id === selectedId) ?? null;

  async function save() {
    if (!selected) return;
    setSaving(true);
    await updateDeviceProfile({
      weightBaseline: { sourceEntryId: selected.id, date: selected.date, weightGrams: selected.weightGrams },
      weightBaselineNote: note.trim() || null,
    });
    onClose();
  }

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div ref={dialogRef} className={styles.sheet} onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="weight-baseline-title">
        <div className={styles.grabber} />
        <h2 id="weight-baseline-title" className={styles.title}>Choose your reference point</h2>
        <p className={styles.helpText}>This is just for you. It never predicts a date, judges change, or compares you with anyone else.</p>

        <div className={styles.field}>
          <span className={styles.label}>A recorded weight</span>
          <div className={styles.chipRow}>
            {weights.map((entry) => (
              <button key={entry.id} type="button" className={`${styles.chip} ${selectedId === entry.id ? styles.selected : ""}`} onClick={() => setSelectedId(entry.id)}>
                {dateLabel(entry.date)} · {formatWeight(entry.weightGrams, unit)}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="weight-baseline-note">A note for yourself (optional)</label>
          <textarea id="weight-baseline-note" className={styles.textarea} value={note} maxLength={280} onChange={(event) => setNote(event.target.value)} placeholder="What would you like this reference to mean to you?" />
        </div>

        <div className={styles.actions}>
          <button type="button" className={styles.tertiaryButton} onClick={onClose}>Cancel</button>
          <button type="button" className={styles.primaryButton} disabled={!selected || saving} onClick={() => void save()}>{saving ? "Saving…" : "Save reference"}</button>
        </div>
      </div>
    </div>
  );
}

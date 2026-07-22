"use client";

import { useMemo, useState } from "react";
import styles from "./Sheet.module.css";
import { useSheetDialog } from "./useSheetDialog";
import { addWeightEntry, updateWeightEntry, type Profile, type WeightEntry } from "@/lib/db";
import { gramsFromWeight, resolvedWeightUnit, weightFromGrams, weightUnitLabel } from "@/lib/weight";

export default function AddWeightEntrySheet({ profile, entry, onClose }: { profile: Profile; entry?: WeightEntry | null; onClose: () => void }) {
  const dialogRef = useSheetDialog(onClose);
  const unit = useMemo(() => resolvedWeightUnit(profile.weightUnit, profile.region), [profile.region, profile.weightUnit]);
  const [date, setDate] = useState(entry?.date ?? (() => new Date().toISOString().slice(0, 10)));
  const [value, setValue] = useState(entry ? String(weightFromGrams(entry.weightGrams, unit)) : "");
  const [note, setNote] = useState(entry?.note ?? "");
  const [saving, setSaving] = useState(false);

  const parsed = Number(value);
  const valid = Number.isFinite(parsed) && parsed > 0 && parsed < 1000;

  async function save() {
    if (!valid) return;
    setSaving(true);
    const input = {
      date,
      weightGrams: gramsFromWeight(parsed, unit),
      note: note.trim() || null,
    };
    if (entry) await updateWeightEntry(entry.id, input);
    else await addWeightEntry(input);
    onClose();
  }

  const examples = unit === "kg" ? "e.g. 68.4" : unit === "lb" ? "e.g. 151" : "e.g. 10.5";

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div ref={dialogRef} className={styles.sheet} onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="weight-entry-title">
        <div className={styles.grabber} />
        <h2 id="weight-entry-title" className={styles.title}>{entry ? "Edit weight" : "Log weight"}</h2>
        <p className={styles.helpText}>Private to this device. A number is only a note, never a grade.</p>

        <div className={styles.field}>
          <span className={styles.label}>Date</span>
          <input type="date" className={styles.input} value={date} onChange={(event) => setDate(event.target.value)} />
        </div>

        <div className={styles.field}>
          <span className={styles.label}>Weight in {weightUnitLabel(unit)}</span>
          <input type="number" inputMode="decimal" min="0" step="0.1" className={styles.input} value={value} onChange={(event) => setValue(event.target.value)} placeholder={examples} autoFocus />
          {profile.weightGoalGrams != null && (
            <span className={styles.fieldHint}>Your chosen goal is {weightFromGrams(profile.weightGoalGrams, unit).toFixed(unit === "st" ? 2 : 1)} {weightUnitLabel(unit)}.</span>
          )}
        </div>

        <div className={styles.field}>
          <span className={styles.label}>Note (optional)</span>
          <textarea className={styles.textarea} value={note} onChange={(event) => setNote(event.target.value)} placeholder="Anything useful to remember" />
        </div>

        <div className={styles.actions}>
          <button type="button" className={styles.tertiaryButton} onClick={onClose}>Cancel</button>
          <button type="button" className={styles.primaryButton} disabled={!valid || saving} onClick={save}>{saving ? "Saving…" : entry ? "Save changes" : "Save weight"}</button>
        </div>
      </div>
    </div>
  );
}

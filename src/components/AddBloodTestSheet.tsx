"use client";

import { useState } from "react";
import styles from "./Sheet.module.css";
import { useSheetDialog } from "./useSheetDialog";
import { addBloodTestEntry, updateBloodTestEntry, type BloodTestEntry } from "@/lib/db";

export default function AddBloodTestSheet({
  entry,
  onClose,
}: {
  entry?: BloodTestEntry | null;
  onClose: () => void;
}) {
  const dialogRef = useSheetDialog(onClose);
  const [testName, setTestName] = useState(entry?.testName ?? "");
  const [date, setDate] = useState(entry?.date ?? "");
  const [value, setValue] = useState(entry?.value ?? "");
  const [unit, setUnit] = useState(entry?.unit ?? "");
  const [labSource, setLabSource] = useState(entry?.labSource ?? "");
  const [referenceRangeRaw, setReferenceRangeRaw] = useState(entry?.referenceRangeRaw ?? "");
  const [note, setNote] = useState(entry?.note ?? "");
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!testName.trim() || !date || !value.trim()) return;
    setSaving(true);
    const input = {
      testName: testName.trim(),
      date,
      value: value.trim(),
      unit: unit.trim() || null,
      labSource: labSource.trim() || null,
      referenceRangeRaw: referenceRangeRaw.trim() || null,
      note: note.trim() || null,
    };
    if (entry) await updateBloodTestEntry(entry.id, input);
    else await addBloodTestEntry(input);
    setSaving(false);
    onClose();
  }

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div
        ref={dialogRef}
        className={styles.sheet}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="blood-test-sheet-title"
      >
        <div className={styles.grabber} />
        <h2 id="blood-test-sheet-title" className={styles.title}>
          {entry ? "Edit blood test result" : "Add a blood test result"}
        </h2>
        <p style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.5, marginTop: -8 }}>
          Blossom records what you enter. It never interprets values, flags them,
          or suggests what to do about them.
        </p>

        <div className={styles.field}>
          <span className={styles.label}>Test name</span>
          <input
            className={styles.input}
            value={testName}
            onChange={(e) => setTestName(e.target.value)}
            placeholder="e.g. Estradiol, Testosterone"
            autoFocus
          />
        </div>

        <div className={styles.field}>
          <span className={styles.label}>Date</span>
          <input
            type="date"
            className={styles.input}
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>

        <div className={styles.field}>
          <span className={styles.label}>Result</span>
          <input
            className={styles.input}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="e.g. 210"
          />
        </div>

        <div className={styles.field}>
          <span className={styles.label}>Unit (optional)</span>
          <input
            className={styles.input}
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            placeholder="e.g. pmol/L"
          />
        </div>

        <div className={styles.field}>
          <span className={styles.label}>Lab or source (optional)</span>
          <input
            className={styles.input}
            value={labSource}
            onChange={(e) => setLabSource(e.target.value)}
          />
        </div>

        <div className={styles.field}>
          <span className={styles.label}>Reference range on the report (optional)</span>
          <input
            className={styles.input}
            value={referenceRangeRaw}
            onChange={(e) => setReferenceRangeRaw(e.target.value)}
            placeholder="Copy exactly what your lab printed"
          />
        </div>

        <div className={styles.field}>
          <span className={styles.label}>Note (optional)</span>
          <textarea
            className={styles.textarea}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>

        <div className={styles.actions}>
          <button type="button" className={styles.tertiaryButton} onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className={styles.primaryButton}
            disabled={!testName.trim() || !date || !value.trim() || saving}
            onClick={save}
          >
            {entry ? "Save changes" : "Save result"}
          </button>
        </div>
      </div>
    </div>
  );
}

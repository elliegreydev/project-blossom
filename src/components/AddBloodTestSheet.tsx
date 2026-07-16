"use client";

import { useState } from "react";
import styles from "./Sheet.module.css";
import { useSheetDialog } from "./useSheetDialog";
import { addBloodTestEntry } from "@/lib/db";

export default function AddBloodTestSheet({ onClose }: { onClose: () => void }) {
  const dialogRef = useSheetDialog(onClose);
  const [testName, setTestName] = useState("");
  const [date, setDate] = useState("");
  const [value, setValue] = useState("");
  const [unit, setUnit] = useState("");
  const [labSource, setLabSource] = useState("");
  const [referenceRangeRaw, setReferenceRangeRaw] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!testName.trim() || !date || !value.trim()) return;
    setSaving(true);
    await addBloodTestEntry({
      testName: testName.trim(),
      date,
      value: value.trim(),
      unit: unit.trim() || null,
      labSource: labSource.trim() || null,
      referenceRangeRaw: referenceRangeRaw.trim() || null,
      note: note.trim() || null,
    });
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
          Add a blood test result
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
            Save result
          </button>
        </div>
      </div>
    </div>
  );
}

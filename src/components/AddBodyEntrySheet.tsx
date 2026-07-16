"use client";

import { useState } from "react";
import styles from "./Sheet.module.css";
import { useSheetDialog } from "./useSheetDialog";
import { addBodyEntry, type BodyMeasurement } from "@/lib/db";

export default function AddBodyEntrySheet({ onClose }: { onClose: () => void }) {
  const dialogRef = useSheetDialog(onClose);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [measurements, setMeasurements] = useState<BodyMeasurement[]>([{ label: "", value: "" }]);
  const [photo, setPhoto] = useState<File | null>(null);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  function setMeasurement(index: number, field: "label" | "value", value: string) {
    setMeasurements((prev) => prev.map((m, i) => (i === index ? { ...m, [field]: value } : m)));
  }

  function addMeasurementRow() {
    setMeasurements((prev) => [...prev, { label: "", value: "" }]);
  }

  function removeMeasurementRow(index: number) {
    setMeasurements((prev) => prev.filter((_, i) => i !== index));
  }

  async function save() {
    setSaving(true);
    const cleanMeasurements = measurements.filter((m) => m.label.trim() && m.value.trim());
    await addBodyEntry({
      date,
      measurements: cleanMeasurements,
      photo,
      note: note.trim() || null,
    });
    setSaving(false);
    onClose();
  }

  const hasAnything =
    measurements.some((m) => m.label.trim() && m.value.trim()) || photo !== null || note.trim().length > 0;

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div
        ref={dialogRef}
        className={styles.sheet}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="body-entry-sheet-title"
      >
        <div className={styles.grabber} />
        <h2 id="body-entry-sheet-title" className={styles.title}>
          Add an entry
        </h2>
        <p style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.5, marginTop: -8 }}>
          Everything here is optional. Any photo stays only on this device -
          it&apos;s never uploaded, synced, or used to train anything.
        </p>

        <div className={styles.field}>
          <span className={styles.label}>Date</span>
          <input type="date" className={styles.input} value={date} onChange={(e) => setDate(e.target.value)} />
        </div>

        <div className={styles.field}>
          <span className={styles.label}>Anything you&apos;d like to note (optional)</span>
          {measurements.map((m, i) => (
            <div key={i} style={{ display: "flex", gap: 8 }}>
              <input
                className={styles.input}
                style={{ flex: 1 }}
                value={m.label}
                onChange={(e) => setMeasurement(i, "label", e.target.value)}
                placeholder="e.g. Waist, Weight, Voice pitch note"
              />
              <input
                className={styles.input}
                style={{ flex: 1 }}
                value={m.value}
                onChange={(e) => setMeasurement(i, "value", e.target.value)}
                placeholder="Value"
              />
              {measurements.length > 1 && (
                <button
                  type="button"
                  className={styles.tertiaryButton}
                  style={{ padding: "0 8px" }}
                  onClick={() => removeMeasurementRow(i)}
                  aria-label="Remove this measurement"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
          <button
            type="button"
            className={styles.tertiaryButton}
            style={{ alignSelf: "flex-start", padding: "6px 0" }}
            onClick={addMeasurementRow}
          >
            + Add another
          </button>
        </div>

        <div className={styles.field}>
          <span className={styles.label}>Photo (optional)</span>
          <input
            type="file"
            accept="image/*"
            className={styles.input}
            onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
          />
        </div>

        <div className={styles.field}>
          <span className={styles.label}>Note (optional)</span>
          <textarea
            className={styles.textarea}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Whatever's useful to remember"
          />
        </div>

        <p style={{ fontSize: 12, color: "var(--text-muted)" }}>
          Weekly or less tends to feel better than daily. Totally up to you.
        </p>

        <div className={styles.actions}>
          <button type="button" className={styles.tertiaryButton} onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className={styles.primaryButton}
            disabled={!hasAnything || saving}
            onClick={save}
          >
            Save entry
          </button>
        </div>
      </div>
    </div>
  );
}

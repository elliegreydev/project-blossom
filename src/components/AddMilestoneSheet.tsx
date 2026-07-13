"use client";

import { useState } from "react";
import styles from "./Sheet.module.css";
import { useSheetDialog } from "./useSheetDialog";
import { addMilestone, type DatePrecision, type JourneyCategory } from "@/lib/db";

const TEMPLATES: { key: string; title: string; category: JourneyCategory }[] = [
  { key: "explore_identity", title: "Started exploring identity", category: "identity" },
  { key: "chose_name", title: "Chose a name", category: "identity" },
  { key: "came_out", title: "Came out to someone", category: "social" },
  { key: "started_hrt", title: "Started HRT", category: "medical" },
  { key: "first_appointment", title: "First appointment", category: "medical" },
  { key: "legal_name_change", title: "Legal name change", category: "legal" },
  { key: "updated_id", title: "Updated identification", category: "legal" },
  { key: "presented_publicly", title: "First time presenting publicly", category: "social" },
  { key: "voice_goal", title: "Reached a voice goal", category: "voice_presentation" },
  { key: "found_community", title: "Found a supportive community", category: "social" },
];

export default function AddMilestoneSheet({ onClose }: { onClose: () => void }) {
  const dialogRef = useSheetDialog(onClose);
  const [templateKey, setTemplateKey] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [datePrecision, setDatePrecision] = useState<DatePrecision>("exact");
  const [exactDate, setExactDate] = useState("");
  const [approxDate, setApproxDate] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  function pickTemplate(key: string) {
    const template = TEMPLATES.find((t) => t.key === key);
    if (!template) return;
    setTemplateKey(key);
    setTitle(template.title);
  }

  async function save() {
    if (!title.trim()) return;
    setSaving(true);
    const template = TEMPLATES.find((t) => t.key === templateKey);
    const eventDate =
      datePrecision === "exact" ? exactDate || null : datePrecision === "approximate" ? approxDate || null : null;
    await addMilestone({
      title: title.trim(),
      templateKey,
      category: template?.category ?? null,
      eventDate,
      datePrecision,
      note: note.trim() || null,
    });
    setSaving(false);
    onClose();
  }

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div ref={dialogRef} className={styles.sheet} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="milestone-sheet-title">
        <div className={styles.grabber} />
        <h2 id="milestone-sheet-title" className={styles.title}>Add a milestone</h2>

        <div className={styles.field}>
          <span className={styles.label}>A suggestion, if it helps</span>
          <div className={styles.chipRow} role="group" aria-label="Milestone suggestions">
            {TEMPLATES.map((t) => (
              <button
                key={t.key}
                type="button"
                className={`${styles.chip} ${templateKey === t.key ? styles.selected : ""}`}
                onClick={() => pickTemplate(t.key)}
              >
                {t.title}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.field}>
          <span className={styles.label}>Title</span>
          <input
            aria-label="Milestone title"
            className={styles.input}
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              setTemplateKey(null);
            }}
            placeholder="Whatever this means to you"
          />
        </div>

        <div className={styles.field}>
          <span className={styles.label}>When</span>
          <div className={styles.chipRow} role="group" aria-label="Milestone date precision">
            {(["exact", "approximate", "none"] as DatePrecision[]).map((p) => (
              <button
                key={p}
                type="button"
                className={`${styles.chip} ${datePrecision === p ? styles.selected : ""}`}
                onClick={() => setDatePrecision(p)}
              >
                {p === "exact" ? "Exact date" : p === "approximate" ? "Roughly" : "No date"}
              </button>
            ))}
          </div>
          {datePrecision === "exact" && (
            <input
              aria-label="Milestone date"
              type="date"
              className={styles.input}
              value={exactDate}
              onChange={(e) => setExactDate(e.target.value)}
            />
          )}
          {datePrecision === "approximate" && (
            <input
              aria-label="Approximate milestone date"
              className={styles.input}
              value={approxDate}
              onChange={(e) => setApproxDate(e.target.value)}
              placeholder="e.g. March 2025, or last spring"
            />
          )}
        </div>

        <div className={styles.field}>
          <span className={styles.label}>Note (optional)</span>
          <textarea
            aria-label="Milestone note"
            className={styles.textarea}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Just for you"
          />
        </div>

        <div className={styles.actions}>
          <button type="button" className={styles.tertiaryButton} onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className={styles.primaryButton}
            disabled={!title.trim() || saving}
            onClick={save}
          >
            Add milestone
          </button>
        </div>
      </div>
    </div>
  );
}

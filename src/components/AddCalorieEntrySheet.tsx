"use client";

import { useState } from "react";
import styles from "./Sheet.module.css";
import { useSheetDialog } from "./useSheetDialog";
import { addCalorieEntry } from "@/lib/db";

const MEALS = ["Breakfast", "Lunch", "Dinner", "Snack", "Drink", "Other"];

export default function AddCalorieEntrySheet({ onClose }: { onClose: () => void }) {
  const dialogRef = useSheetDialog(onClose);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [label, setLabel] = useState("");
  const [calories, setCalories] = useState("");
  const [meal, setMeal] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const parsed = Number(calories);
  const valid = label.trim().length > 0 && Number.isFinite(parsed) && parsed > 0 && parsed <= 10000;

  async function save() {
    if (!valid) return;
    setSaving(true);
    await addCalorieEntry({ date, label: label.trim(), calories: Math.round(parsed), meal, note: note.trim() || null });
    onClose();
  }

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div ref={dialogRef} className={styles.sheet} onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="food-entry-title">
        <div className={styles.grabber} />
        <h2 id="food-entry-title" className={styles.title}>Add food or drink</h2>
        <p className={styles.helpText}>A simple personal log. Blossom does not judge, recommend, or calculate a diet.</p>

        <div className={styles.field}>
          <span className={styles.label}>Date</span>
          <input type="date" className={styles.input} value={date} onChange={(event) => setDate(event.target.value)} />
        </div>
        <div className={styles.field}>
          <span className={styles.label}>What was it?</span>
          <input className={styles.input} value={label} onChange={(event) => setLabel(event.target.value)} placeholder="e.g. Pasta lunch" autoFocus />
        </div>
        <div className={styles.field}>
          <span className={styles.label}>Calories</span>
          <input type="number" inputMode="numeric" min="0" step="1" className={styles.input} value={calories} onChange={(event) => setCalories(event.target.value)} placeholder="e.g. 520" />
        </div>
        <div className={styles.field}>
          <span className={styles.label}>Meal (optional)</span>
          <div className={styles.chipRow}>
            {MEALS.map((option) => <button key={option} type="button" className={`${styles.chip} ${meal === option ? styles.selected : ""}`} onClick={() => setMeal(meal === option ? null : option)}>{option}</button>)}
          </div>
        </div>
        <div className={styles.field}>
          <span className={styles.label}>Note (optional)</span>
          <textarea className={styles.textarea} value={note} onChange={(event) => setNote(event.target.value)} placeholder="Anything useful to remember" />
        </div>
        <div className={styles.actions}>
          <button type="button" className={styles.tertiaryButton} onClick={onClose}>Cancel</button>
          <button type="button" className={styles.primaryButton} disabled={!valid || saving} onClick={save}>{saving ? "Saving…" : "Add entry"}</button>
        </div>
      </div>
    </div>
  );
}

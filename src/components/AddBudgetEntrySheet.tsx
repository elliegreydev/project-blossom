"use client";

import { useState } from "react";
import styles from "./Sheet.module.css";
import { useSheetDialog } from "./useSheetDialog";
import { addBudgetEntry, updateBudgetEntry, type BudgetCategory, type BudgetEntry } from "@/lib/db";

const CATEGORIES: { key: BudgetCategory; label: string }[] = [
  { key: "hrt", label: "HRT" },
  { key: "surgery", label: "Surgery" },
  { key: "legal", label: "Legal" },
  { key: "other", label: "Other" },
];

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function AddBudgetEntrySheet({
  entry,
  onClose,
}: {
  entry?: BudgetEntry | null;
  onClose: () => void;
}) {
  const dialogRef = useSheetDialog(onClose);
  const [category, setCategory] = useState<BudgetCategory>(entry?.category ?? "hrt");
  const [amount, setAmount] = useState(entry ? String(entry.amount) : "");
  const [description, setDescription] = useState(entry?.description ?? "");
  const [date, setDate] = useState(entry?.date ?? today());
  const [saving, setSaving] = useState(false);

  const parsedAmount = Number(amount);
  const valid = amount.trim() !== "" && Number.isFinite(parsedAmount) && parsedAmount > 0;

  async function save() {
    if (!valid) return;
    setSaving(true);
    const input = { category, description: description.trim() || null, amount: parsedAmount, date };
    if (entry) await updateBudgetEntry(entry.id, input);
    else await addBudgetEntry(input);
    setSaving(false);
    onClose();
  }

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div ref={dialogRef} className={styles.sheet} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="budget-sheet-title">
        <div className={styles.grabber} />
        <h2 id="budget-sheet-title" className={styles.title}>{entry ? "Edit expense" : "Add an expense"}</h2>

        <div className={styles.field}>
          <span className={styles.label}>Category</span>
          <div className={styles.chipRow}>
            {CATEGORIES.map((c) => (
              <button key={c.key} type="button" className={`${styles.chip} ${category === c.key ? styles.selected : ""}`} onClick={() => setCategory(c.key)}>
                {c.label}
              </button>
            ))}
          </div>
        </div>

        <label className={styles.field}>
          <span className={styles.label}>Amount</span>
          <input
            className={styles.input}
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            autoFocus
          />
        </label>

        <label className={styles.field}>
          <span className={styles.label}>What was it? (optional)</span>
          <input className={styles.input} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g. Pharmacy pickup" />
        </label>

        <label className={styles.field}>
          <span className={styles.label}>Date</span>
          <input className={styles.input} type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </label>

        <div className={styles.actions}>
          <button type="button" className={styles.tertiaryButton} onClick={onClose}>Cancel</button>
          <button type="button" className={styles.primaryButton} disabled={!valid || saving} onClick={save}>
            {entry ? "Save changes" : "Add expense"}
          </button>
        </div>
      </div>
    </div>
  );
}

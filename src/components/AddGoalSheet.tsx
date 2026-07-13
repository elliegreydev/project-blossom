"use client";

import { useState } from "react";
import styles from "./Sheet.module.css";
import { addGoal, type JourneyCategory } from "@/lib/db";

const CATEGORIES: { key: JourneyCategory; label: string }[] = [
  { key: "identity", label: "Identity" },
  { key: "medical", label: "Medical" },
  { key: "legal", label: "Legal" },
  { key: "social", label: "Social" },
  { key: "voice_presentation", label: "Voice & presentation" },
];

export default function AddGoalSheet({ onClose }: { onClose: () => void }) {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<JourneyCategory | null>(null);
  const [target, setTarget] = useState("");
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!title.trim()) return;
    setSaving(true);
    await addGoal({ title: title.trim(), category, target: target.trim() || null });
    setSaving(false);
    onClose();
  }

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div className={styles.sheet} onClick={(e) => e.stopPropagation()}>
        <div className={styles.grabber} />
        <h2 className={styles.title}>Add a goal</h2>

        <div className={styles.field}>
          <span className={styles.label}>What are you working towards?</span>
          <input
            className={styles.input}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Something you'd like to do"
            autoFocus
          />
        </div>

        <div className={styles.field}>
          <span className={styles.label}>Area (optional)</span>
          <div className={styles.chipRow}>
            {CATEGORIES.map((c) => (
              <button
                key={c.key}
                type="button"
                className={`${styles.chip} ${category === c.key ? styles.selected : ""}`}
                onClick={() => setCategory(category === c.key ? null : c.key)}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.field}>
          <span className={styles.label}>A note or target (optional)</span>
          <input
            className={styles.input}
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            placeholder="e.g. by summer, or twice a week"
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
            Add goal
          </button>
        </div>
      </div>
    </div>
  );
}

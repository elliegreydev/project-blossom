"use client";

import { useState } from "react";
import styles from "./Sheet.module.css";
import { addJournalEntry } from "@/lib/db";

export default function JournalSheet({ onClose }: { onClose: () => void }) {
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!body.trim()) return;
    setSaving(true);
    await addJournalEntry(body.trim());
    setSaving(false);
    onClose();
  }

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div className={styles.sheet} onClick={(e) => e.stopPropagation()}>
        <div className={styles.grabber} />
        <h2 className={styles.title}>New journal entry</h2>
        <div className={styles.field}>
          <textarea
            className={styles.textarea}
            style={{ minHeight: 160 }}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="This is just for you. Write as much or as little as you like."
            autoFocus
          />
        </div>
        <div className={styles.actions}>
          <button type="button" className={styles.tertiaryButton} onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className={styles.primaryButton}
            disabled={!body.trim() || saving}
            onClick={save}
          >
            Save entry
          </button>
        </div>
      </div>
    </div>
  );
}

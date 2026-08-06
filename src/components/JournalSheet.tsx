"use client";

import { useState } from "react";
import styles from "./Sheet.module.css";
import { useSheetDialog } from "./useSheetDialog";
import { addJournalEntry, updateJournalEntry, type JournalEntry } from "@/lib/db";
import { readDraft, writeDraft, clearDraft, draftKey } from "@/lib/drafts";

export default function JournalSheet({ entry, onClose }: { entry?: JournalEntry | null; onClose: () => void }) {
  const dialogRef = useSheetDialog(onClose);
  const key = draftKey("journal", entry?.id);
  const saved = entry?.bodyText ?? "";
  // A draft only exists when a previous attempt was interrupted, so it wins
  // over the saved text - it's the newer of the two.
  const [body, setBody] = useState(() => readDraft(key) ?? saved);
  const [saving, setSaving] = useState(false);
  const [restored] = useState(() => readDraft(key) !== null);

  const dirty = body !== saved;

  function edit(value: string) {
    setBody(value);
    // Only stash a draft once it differs from what's already stored, so
    // opening an entry and closing it again leaves nothing behind.
    if (value !== saved) writeDraft(key, value);
    else clearDraft(key);
  }

  async function save() {
    if (!body.trim()) return;
    setSaving(true);
    if (entry) await updateJournalEntry(entry.id, body.trim());
    else await addJournalEntry(body.trim());
    clearDraft(key);
    setSaving(false);
    onClose();
  }

  // Closing any other way - the backdrop, Escape, a restart, the phone dying -
  // keeps the draft. Only this button throws away words someone wrote.
  function discard() {
    clearDraft(key);
    onClose();
  }

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div ref={dialogRef} className={styles.sheet} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="journal-sheet-title">
        <div className={styles.grabber} />
        <h2 id="journal-sheet-title" className={styles.title}>{entry ? "Edit journal entry" : "New journal entry"}</h2>
        {restored && <p className={styles.draftNote}>Picking up where you left off.</p>}
        <div className={styles.field}>
          <textarea
            aria-label="Journal entry"
            className={styles.textarea}
            style={{ minHeight: 160 }}
            value={body}
            onChange={(e) => edit(e.target.value)}
            placeholder="This is just for you. Write as much or as little as you like."
            autoFocus
          />
        </div>
        <div className={styles.actions}>
          <button type="button" className={styles.tertiaryButton} onClick={dirty ? discard : onClose}>
            {dirty ? "Discard" : "Cancel"}
          </button>
          <button
            type="button"
            className={styles.primaryButton}
            disabled={!body.trim() || saving}
            onClick={save}
          >
            {entry ? "Save changes" : "Save entry"}
          </button>
        </div>
      </div>
    </div>
  );
}

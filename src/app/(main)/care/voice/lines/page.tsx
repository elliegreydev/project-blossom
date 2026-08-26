"use client";

import { useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import ScreenHeader from "@/components/ScreenHeader";
import { db, addVoiceLine, deleteVoiceLine, updateVoiceLine } from "@/lib/db";
import { readDraft, writeDraft, clearDraft, draftKey } from "@/lib/drafts";
import styles from "./lines.module.css";

// The things you actually have to say out loud, in your own words.
//
// Every word here is written by the person, which is the point: it sidesteps
// the technique problem completely (Blossom is not telling anybody how to
// sound) and it is the real thing most people are practising for. Ordering a
// coffee is the exam, not the paragraph of prose.
//
// Device-local, no sync. See the VoiceLine comment in db.ts.
export default function VoiceLinesPage() {
  const lines = useLiveQuery(() => db.voiceLines.orderBy("createdAt").reverse().toArray(), []);
  const [text, setText] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  // A line is short, but it is still writing, and a forced reload for a new
  // build mid-sentence would still take it. Same draft treatment as the
  // journal gets.
  const key = draftKey("voiceline", editingId);
  useEffect(() => {
    setText(readDraft(key) ?? "");
  }, [key]);

  function change(value: string) {
    setText(value);
    writeDraft(key, value);
  }

  async function submit() {
    const trimmed = text.trim();
    if (!trimmed) return;
    if (editingId) await updateVoiceLine(editingId, trimmed);
    else await addVoiceLine(trimmed);
    clearDraft(key);
    setText("");
    setEditingId(null);
  }

  if (lines === undefined) return null;

  return (
    <div className={styles.screen}>
      <ScreenHeader title="Your own lines" backHref="/care/voice" />

      <p className={styles.intro}>
        The things you actually have to say. Your coffee order, your name at a reception
        desk, the sentence you always trip over. Write them here and read them back
        whenever you want to.
      </p>

      <div className={styles.composer}>
        <label className={styles.label} htmlFor="voice-line">
          {editingId ? "Edit this line" : "Add a line"}
        </label>
        <textarea
          id="voice-line"
          className={styles.input}
          value={text}
          rows={2}
          placeholder="Hi, I've got an appointment at half two."
          onChange={(event) => change(event.target.value)}
        />
        <div className={styles.composerActions}>
          {editingId && (
            <button
              type="button"
              className={styles.textButton}
              onClick={() => {
                clearDraft(key);
                setEditingId(null);
                setText("");
              }}
            >
              Cancel
            </button>
          )}
          <button type="button" className={styles.addButton} disabled={!text.trim()} onClick={() => void submit()}>
            {editingId ? "Save" : "Add"}
          </button>
        </div>
      </div>

      {lines.length === 0 ? (
        <div className={styles.empty}>
          <p className={styles.emptyTitle}>Nothing here yet</p>
          <p className={styles.emptyBody}>
            Most people start with the one they dread. There&apos;s no wrong thing to put
            here and nothing counts it.
          </p>
        </div>
      ) : (
        <ul className={styles.list}>
          {lines.map((line) => (
            <li key={line.id} className={styles.line}>
              <p className={styles.lineText}>{line.text}</p>
              <div className={styles.lineActions}>
                <button
                  type="button"
                  className={styles.textButton}
                  onClick={() => {
                    setEditingId(line.id);
                    setText(line.text);
                  }}
                >
                  Edit
                </button>
                <button type="button" className={styles.textButton} onClick={() => void deleteVoiceLine(line.id)}>
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <p className={styles.footnote}>
        These stay on this device and are included in your data export. They&apos;re never
        synced to your account.
      </p>
    </div>
  );
}

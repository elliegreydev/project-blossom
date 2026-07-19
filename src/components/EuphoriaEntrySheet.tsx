"use client";

import { useState } from "react";
import styles from "./Sheet.module.css";
import { useSheetDialog } from "./useSheetDialog";
import { addEuphoriaEntry, type EuphoriaMomentKind } from "@/lib/db";

const MOMENT_KINDS: Array<{ key: EuphoriaMomentKind; label: string }> = [
  { key: "affirming-interaction", label: "Affirming moment" },
  { key: "style", label: "Style" },
  { key: "voice", label: "Voice" },
  { key: "confidence", label: "Confidence" },
  { key: "compliment", label: "Kind words" },
  { key: "celebration", label: "Celebration" },
  { key: "future-self", label: "Future me" },
  { key: "other", label: "Something else" },
];

type CapsuleChoice = "none" | "one-month" | "three-months" | "one-year" | "custom";

function addMonths(months: number): string {
  const date = new Date();
  date.setMonth(date.getMonth() + months);
  return date.toISOString().slice(0, 10);
}

export default function EuphoriaEntrySheet({ onClose }: { onClose: () => void }) {
  const dialogRef = useSheetDialog(onClose);
  const [kind, setKind] = useState<EuphoriaMomentKind>("affirming-interaction");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [capsuleChoice, setCapsuleChoice] = useState<CapsuleChoice>("none");
  const [customDate, setCustomDate] = useState("");
  const [saving, setSaving] = useState(false);

  const hasSomethingToKeep = title.trim() || body.trim() || photo;

  function reopenAt(): string | null {
    if (capsuleChoice === "one-month") return addMonths(1);
    if (capsuleChoice === "three-months") return addMonths(3);
    if (capsuleChoice === "one-year") return addMonths(12);
    if (capsuleChoice === "custom") return customDate || null;
    return null;
  }

  async function save() {
    if (!hasSomethingToKeep) return;
    setSaving(true);
    await addEuphoriaEntry({
      kind,
      title: title.trim() || null,
      bodyText: body.trim() || null,
      photo,
      reopenAt: reopenAt(),
    });
    setSaving(false);
    onClose();
  }

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div ref={dialogRef} className={styles.sheet} onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="euphoria-sheet-title">
        <div className={styles.grabber} />
        <h2 id="euphoria-sheet-title" className={styles.title}>Keep an affirming moment</h2>
        <p className={styles.helpText}>This is private and stays on this device. A few words is enough.</p>

        <div className={styles.field}>
          <span className={styles.label}>What kind of moment was it?</span>
          <div className={styles.chipRow}>
            {MOMENT_KINDS.map((moment) => (
              <button key={moment.key} type="button" className={`${styles.chip} ${kind === moment.key ? styles.selected : ""}`} onClick={() => setKind(moment.key)}>
                {moment.label}
              </button>
            ))}
          </div>
        </div>

        <label className={styles.field}>
          <span className={styles.label}>A small title (optional)</span>
          <input className={styles.input} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="A moment I want to remember" />
        </label>

        <label className={styles.field}>
          <span className={styles.label}>{kind === "future-self" ? "A note for future you" : "What felt good?"}</span>
          <textarea className={styles.textarea} style={{ minHeight: 130 }} value={body} onChange={(event) => setBody(event.target.value)} placeholder={kind === "future-self" ? "Write something kind for the version of you who opens this." : "Anything you want to keep close."} />
        </label>

        <label className={styles.field}>
          <span className={styles.label}>Photo (optional)</span>
          <input type="file" accept="image/*" className={styles.input} onChange={(event) => setPhoto(event.target.files?.[0] ?? null)} />
          <span className={styles.fieldHint}>Photos stay only on this device. They are never uploaded or synced.</span>
        </label>

        <div className={styles.field}>
          <span className={styles.label}>Make this a Time Capsule?</span>
          <div className={styles.chipRow}>
            {([
              ["none", "Not this time"],
              ["one-month", "One month"],
              ["three-months", "Three months"],
              ["one-year", "One year"],
              ["custom", "Choose a date"],
            ] as Array<[CapsuleChoice, string]>).map(([value, label]) => (
              <button key={value} type="button" className={`${styles.chip} ${capsuleChoice === value ? styles.selected : ""}`} onClick={() => setCapsuleChoice(value)}>
                {label}
              </button>
            ))}
          </div>
          {capsuleChoice === "custom" && (
            <input type="date" min={new Date().toISOString().slice(0, 10)} className={styles.input} value={customDate} onChange={(event) => setCustomDate(event.target.value)} />
          )}
        </div>

        <div className={styles.actions}>
          <button type="button" className={styles.tertiaryButton} onClick={onClose}>Cancel</button>
          <button type="button" className={styles.primaryButton} disabled={!hasSomethingToKeep || saving} onClick={save}>
            {capsuleChoice === "none" ? "Keep this moment" : "Seal Time Capsule"}
          </button>
        </div>
      </div>
    </div>
  );
}

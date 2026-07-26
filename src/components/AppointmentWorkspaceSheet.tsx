"use client";

import { useState } from "react";
import styles from "./Sheet.module.css";
import { useSheetDialog } from "./useSheetDialog";
import { emptyAppointmentBuilderData, updateAppointment, type Appointment, type AppointmentBuilderData, type AppointmentBuilderItem } from "@/lib/db";

type ListKey = "questions" | "bringList" | "documentsReceived" | "followUps";

function newItem(text: string): AppointmentBuilderItem {
  return { id: crypto.randomUUID(), text, done: false };
}

export default function AppointmentWorkspaceSheet({
  appointment,
  onClose,
  onCreateGoal,
  onCreateAppointment,
}: {
  appointment: Appointment;
  onClose: () => void;
  onCreateGoal: (title: string) => Promise<void>;
  onCreateAppointment: (title: string) => void;
}) {
  const dialogRef = useSheetDialog(onClose);
  const [builder, setBuilder] = useState<AppointmentBuilderData>(appointment.builderData ?? emptyAppointmentBuilderData());
  const [outcome, setOutcome] = useState(appointment.outcomeNote ?? "");
  const [drafts, setDrafts] = useState<Record<ListKey, string>>({ questions: "", bringList: "", documentsReceived: "", followUps: "" });
  const [saving, setSaving] = useState(false);

  function addItem(key: ListKey) {
    const text = drafts[key].trim();
    if (!text) return;
    setBuilder((current) => ({ ...current, [key]: [...current[key], newItem(text)] }));
    setDrafts((current) => ({ ...current, [key]: "" }));
  }

  function toggleItem(key: ListKey, id: string) {
    setBuilder((current) => ({ ...current, [key]: current[key].map((item) => item.id === id ? { ...item, done: !item.done } : item) }));
  }

  function removeItem(key: ListKey, id: string) {
    setBuilder((current) => ({ ...current, [key]: current[key].filter((item) => item.id !== id) }));
  }

  async function save() {
    setSaving(true);
    await updateAppointment(appointment.id, { builderData: builder, outcomeNote: outcome.trim() || null });
    setSaving(false);
    onClose();
  }

  function listEditor(key: ListKey, label: string, placeholder: string, action?: (item: AppointmentBuilderItem) => React.ReactNode) {
    return <div className={styles.field}>
      <span className={styles.label}>{label}</span>
      {builder[key].map((item) => <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <button type="button" className={`${styles.chip} ${item.done ? styles.selected : ""}`} onClick={() => toggleItem(key, item.id)} aria-pressed={item.done}>{item.done ? "Done" : "To do"}</button>
        <span style={{ flex: 1, fontSize: 14, textDecoration: item.done ? "line-through" : "none" }}>{item.text}</span>
        {action?.(item)}
        <button type="button" className={styles.tertiaryButton} style={{ padding: 6, minHeight: 34 }} onClick={() => removeItem(key, item.id)} aria-label={`Remove ${item.text}`}>Remove</button>
      </div>)}
      <div style={{ display: "flex", gap: 8 }}>
        <input className={styles.input} style={{ flex: 1 }} value={drafts[key]} onChange={(event) => setDrafts((current) => ({ ...current, [key]: event.target.value }))} placeholder={placeholder} />
        <button type="button" className={styles.tertiaryButton} onClick={() => addItem(key)}>Add</button>
      </div>
    </div>;
  }

  return <div className={styles.backdrop} onClick={onClose}>
    <div ref={dialogRef} className={styles.sheet} onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="appointment-workspace-title">
      <div className={styles.grabber} />
      <h2 id="appointment-workspace-title" className={styles.title}>Prepare for {appointment.title}</h2>
      <p className={styles.helpText}>A private workspace for what you want to ask, bring, and remember. Nothing is shared automatically.</p>

      {listEditor("questions", "Questions to ask", "A question you want to remember")}
      {listEditor("bringList", "Things to bring", "A document, item, or reminder")}
      <label className={styles.field}><span className={styles.label}>Travel, accessibility or communication notes</span><textarea className={styles.textarea} value={builder.accessibilityNeeds ?? ""} onChange={(event) => setBuilder((current) => ({ ...current, accessibilityNeeds: event.target.value || null }))} placeholder="Anything that could make this appointment easier" /></label>

      <div className={styles.field}>
        <span className={styles.label}>After the appointment</span>
        <textarea className={styles.textarea} value={outcome} onChange={(event) => setOutcome(event.target.value)} placeholder="What was discussed, agreed, or still unclear" />
      </div>
      {listEditor("documentsReceived", "Documents received", "Something you were given")}
      {listEditor("followUps", "Follow-ups", "A next step", (item) => <><button type="button" className={styles.tertiaryButton} style={{ padding: 6, minHeight: 34 }} onClick={() => void onCreateGoal(item.text)}>Goal</button><button type="button" className={styles.tertiaryButton} style={{ padding: 6, minHeight: 34 }} onClick={() => onCreateAppointment(item.text)}>Appointment</button></>)}

      <div className={styles.actions}>
        <button type="button" className={styles.tertiaryButton} onClick={onClose}>Cancel</button>
        <button type="button" className={styles.primaryButton} disabled={saving} onClick={save}>{saving ? "Saving…" : "Save workspace"}</button>
      </div>
    </div>
  </div>;
}

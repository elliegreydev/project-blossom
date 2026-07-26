"use client";

import { useState } from "react";
import styles from "./Sheet.module.css";
import { useSheetDialog } from "./useSheetDialog";
import { logDose, INJECTION_SITE_LABELS, type DoseStatus, type InjectionSite, type Medication, type MedicationLog } from "@/lib/db";

const STATUSES: Array<{ key: DoseStatus; label: string }> = [
  { key: "taken", label: "Taken" },
  { key: "delayed", label: "Delayed" },
  { key: "skipped", label: "Skipped" },
];

const INJECTION_SITES = Object.keys(INJECTION_SITE_LABELS) as InjectionSite[];

export default function ManualDoseSheet({
  medications,
  medicationLogs,
  onClose,
}: {
  medications: Medication[];
  medicationLogs: MedicationLog[];
  onClose: () => void;
}) {
  const dialogRef = useSheetDialog(onClose);
  const now = new Date();
  const [medicationId, setMedicationId] = useState(medications[0]?.id ?? "");
  const [date, setDate] = useState(now.toISOString().slice(0, 10));
  const [time, setTime] = useState(now.toTimeString().slice(0, 5));
  const [status, setStatus] = useState<DoseStatus>("taken");
  const [note, setNote] = useState("");
  const [injectionSite, setInjectionSite] = useState<InjectionSite | null>(null);
  const [saving, setSaving] = useState(false);

  const medication = medications.find((m) => m.id === medicationId);
  const isInjection = medication?.route === "injection";
  const lastSite = [...medicationLogs]
    .filter((l) => l.medicationId === medicationId && l.injectionSite)
    .sort((a, b) => (b.scheduledTime ?? b.loggedAt).localeCompare(a.scheduledTime ?? a.loggedAt))[0]?.injectionSite;

  async function save() {
    if (!medicationId || !date || !time) return;
    setSaving(true);
    await logDose({
      medicationId,
      scheduledTime: new Date(`${date}T${time}:00`).toISOString(),
      status,
      note: note.trim() || null,
      injectionSite: isInjection ? injectionSite : null,
    });
    setSaving(false);
    onClose();
  }

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div ref={dialogRef} className={styles.sheet} onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="manual-dose-title">
        <div className={styles.grabber} />
        <h2 id="manual-dose-title" className={styles.title}>Log a dose</h2>
        <p className={styles.helpText}>Use this for an unscheduled dose or to add something you took earlier. Blossom never suggests a dose or treatment change.</p>

        <label className={styles.field}>
          <span className={styles.label}>Medication</span>
          <select className={styles.input} value={medicationId} onChange={(event) => setMedicationId(event.target.value)}>
            {medications.map((medication) => <option key={medication.id} value={medication.id}>{medication.name}</option>)}
          </select>
        </label>

        <div className={styles.field}>
          <span className={styles.label}>When</span>
          <div style={{ display: "flex", gap: 8 }}>
            <input type="date" className={styles.input} style={{ flex: 1 }} value={date} onChange={(event) => setDate(event.target.value)} />
            <input type="time" className={styles.input} style={{ flex: 1 }} value={time} onChange={(event) => setTime(event.target.value)} />
          </div>
        </div>

        <div className={styles.field}>
          <span className={styles.label}>Status</span>
          <div className={styles.chipRow}>
            {STATUSES.map((option) => <button key={option.key} type="button" className={`${styles.chip} ${status === option.key ? styles.selected : ""}`} onClick={() => setStatus(option.key)}>{option.label}</button>)}
          </div>
          {status === "taken" && <span className={styles.fieldHint}>If you set up supply tracking, this will reduce the active supply by one recorded dose.</span>}
        </div>

        {isInjection && (
          <div className={styles.field}>
            <span className={styles.label}>Injection site (optional)</span>
            <div className={styles.chipRow}>
              {INJECTION_SITES.map((site) => (
                <button
                  key={site}
                  type="button"
                  className={`${styles.chip} ${injectionSite === site ? styles.selected : ""}`}
                  onClick={() => setInjectionSite(injectionSite === site ? null : site)}
                >
                  {INJECTION_SITE_LABELS[site]}
                </button>
              ))}
            </div>
            {lastSite && <span className={styles.fieldHint}>Last used: {INJECTION_SITE_LABELS[lastSite]}. Just a memory aid - nothing here tells you where to inject.</span>}
          </div>
        )}

        <label className={styles.field}>
          <span className={styles.label}>Note (optional)</span>
          <textarea className={styles.textarea} value={note} onChange={(event) => setNote(event.target.value)} placeholder="Anything useful to remember" />
        </label>

        <div className={styles.actions}>
          <button type="button" className={styles.tertiaryButton} onClick={onClose}>Cancel</button>
          <button type="button" className={styles.primaryButton} disabled={!medicationId || !date || !time || saving} onClick={save}>{saving ? "Saving…" : "Log dose"}</button>
        </div>
      </div>
    </div>
  );
}

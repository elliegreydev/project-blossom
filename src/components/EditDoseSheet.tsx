"use client";

import { useState } from "react";
import styles from "./Sheet.module.css";
import { updateMedicationLog, INJECTION_SITE_LABELS, type DoseStatus, type InjectionSite, type Medication, type MedicationLog } from "@/lib/db";
import { useSheetDialog } from "./useSheetDialog";

const STATUSES: Array<{ key: DoseStatus; label: string }> = [{ key: "taken", label: "Taken" }, { key: "delayed", label: "Delayed" }, { key: "skipped", label: "Skipped" }];
const INJECTION_SITES = Object.keys(INJECTION_SITE_LABELS) as InjectionSite[];

function localParts(iso: string) {
  const date = new Date(iso);
  return { date: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`, time: `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}` };
}

export default function EditDoseSheet({ log, medication, onClose }: { log: MedicationLog; medication: Medication | undefined; onClose: () => void }) {
  const dialogRef = useSheetDialog(onClose);
  const original = localParts(log.scheduledTime ?? log.loggedAt);
  const [date, setDate] = useState(original.date);
  const [time, setTime] = useState(original.time);
  const [status, setStatus] = useState<DoseStatus>(log.status);
  const [note, setNote] = useState(log.note ?? "");
  const [injectionSite, setInjectionSite] = useState<InjectionSite | null>(log.injectionSite ?? null);
  const [saving, setSaving] = useState(false);
  const isInjection = medication?.route === "injection";

  async function save() {
    setSaving(true);
    await updateMedicationLog(log.id, { scheduledTime: new Date(`${date}T${time}:00`).toISOString(), status, note: note.trim() || null, injectionSite: isInjection ? injectionSite : null });
    setSaving(false);
    onClose();
  }

  return <div className={styles.backdrop} onClick={onClose}><div ref={dialogRef} className={styles.sheet} onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="edit-dose-title"><div className={styles.grabber} /><h2 id="edit-dose-title" className={styles.title}>Edit dose record</h2><p className={styles.helpText}>{log.supplyAdjustmentId ? "Changes will safely recalculate the linked supply count." : "This older record has no linked supply change, so editing it will not alter your current supply count."}</p><div className={styles.field}><span className={styles.label}>When</span><div style={{ display: "flex", gap: 8 }}><input type="date" className={styles.input} style={{ flex: 1 }} value={date} onChange={(event) => setDate(event.target.value)} /><input type="time" className={styles.input} style={{ flex: 1 }} value={time} onChange={(event) => setTime(event.target.value)} /></div></div><div className={styles.field}><span className={styles.label}>Status</span><div className={styles.chipRow}>{STATUSES.map((option) => <button key={option.key} type="button" className={`${styles.chip} ${status === option.key ? styles.selected : ""}`} onClick={() => setStatus(option.key)}>{option.label}</button>)}</div></div>{isInjection && <div className={styles.field}><span className={styles.label}>Injection site (optional)</span><div className={styles.chipRow}>{INJECTION_SITES.map((site) => <button key={site} type="button" className={`${styles.chip} ${injectionSite === site ? styles.selected : ""}`} onClick={() => setInjectionSite(injectionSite === site ? null : site)}>{INJECTION_SITE_LABELS[site]}</button>)}</div></div>}<label className={styles.field}><span className={styles.label}>Note (optional)</span><textarea className={styles.textarea} value={note} onChange={(event) => setNote(event.target.value)} /></label><div className={styles.actions}><button type="button" className={styles.tertiaryButton} onClick={onClose}>Cancel</button><button type="button" className={styles.primaryButton} disabled={saving} onClick={save}>{saving ? "Saving…" : "Save changes"}</button></div></div></div>;
}

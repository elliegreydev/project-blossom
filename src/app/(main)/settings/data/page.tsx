"use client";

import { ChangeEvent, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import ScreenHeader from "@/components/ScreenHeader";
import {
  DEFAULT_DATA_EXPORT_SELECTION,
  addAppointment,
  addJournalEntry,
  addMedication,
  addWeightEntry,
  deleteAllData,
  exportSelectedData,
  mergeBlossomImport,
  previewBlossomImport,
  type BlossomImportPreview,
  type BlossomImportSection,
  type DataExportSection,
  type DataExportSelection,
  type MedicationRoute,
} from "@/lib/db";
import styles from "@/components/settingsForm.module.css";
import sheetStyles from "@/components/Sheet.module.css";

const EXPORT_SECTIONS: { key: DataExportSection; title: string; desc: string; sensitive?: boolean }[] = [
  { key: "profile", title: "Profile basics", desc: "Name, pronouns and preferences." },
  { key: "journey", title: "Journey", desc: "Milestones and timeline entries." },
  { key: "medications", title: "Medications & supplies", desc: "Schedules, dose history and stock records." },
  { key: "appointments", title: "Appointments", desc: "Appointments and their private preparation notes." },
  { key: "journal", title: "Journal & check-ins", desc: "Writing and private wellbeing check-ins.", sensitive: true },
  { key: "goals", title: "Goals", desc: "Personal goals and their progress." },
  { key: "health", title: "Health & body records", desc: "Blood tests, body notes, weight and calories.", sensitive: true },
  { key: "voiceAndPresentation", title: "Voice & presentation", desc: "Goals, sessions and presentation notes.", sensitive: true },
  { key: "euphoriaAndSocial", title: "Euphoria & social transition", desc: "Private affirming moments and plans.", sensitive: true },
  { key: "budget", title: "Budget", desc: "Costs and savings goals.", sensitive: true },
  { key: "savedLinks", title: "Saved links", desc: "Your own saved resources." },
  { key: "supportMap", title: "Personal Support Map", desc: "Private people, places and organisations.", sensitive: true },
];

type CsvKind = "medication" | "appointment" | "weight" | "journal";
const CSV_TEMPLATES: Record<CsvKind, { label: string; filename: string; body: string }> = {
  medication: { label: "Medication", filename: "blossom-medications-template.csv", body: "name,route,unit,times,days,interval_days\nExample medication,tablet,mg,09:00,,\n" },
  appointment: { label: "Appointment", filename: "blossom-appointments-template.csv", body: "title,appointment_at,location,preparation_note\nExample appointment,2026-08-14T10:00:00Z,Clinic,Questions to ask\n" },
  weight: { label: "Weight", filename: "blossom-weight-template.csv", body: "date,weight_kg,note\n2026-08-14,70.2,Optional note\n" },
  journal: { label: "Journal", filename: "blossom-journal-template.csv", body: "body_text\nA private note I want to bring into Blossom\n" },
};

function download(name: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  URL.revokeObjectURL(url);
}

function parseCsv(input: string): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];
    if (char === '"' && input[index + 1] === '"' && quoted) { cell += '"'; index += 1; }
    else if (char === '"') quoted = !quoted;
    else if (char === "," && !quoted) { row.push(cell); cell = ""; }
    else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && input[index + 1] === "\n") index += 1;
      row.push(cell); if (row.some((value) => value.trim())) rows.push(row); row = []; cell = "";
    } else cell += char;
  }
  row.push(cell); if (row.some((value) => value.trim())) rows.push(row);
  const [headers, ...values] = rows;
  if (!headers) return [];
  return values.map((cells) => Object.fromEntries(headers.map((header, index) => [header.trim().toLowerCase(), (cells[index] ?? "").trim()])));
}

function isRoute(value: string): value is MedicationRoute {
  return ["tablet", "injection", "patch", "gel", "spray", "implant", "cream", "blocker", "other"].includes(value);
}

export default function DataSettingsPage() {
  const router = useRouter();
  const jsonInput = useRef<HTMLInputElement>(null);
  const csvInput = useRef<HTMLInputElement>(null);
  const [selection, setSelection] = useState<DataExportSelection>(DEFAULT_DATA_EXPORT_SELECTION);
  const [generating, setGenerating] = useState<"pdf" | "json" | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [importPayload, setImportPayload] = useState<Record<string, unknown> | null>(null);
  const [importPreview, setImportPreview] = useState<BlossomImportPreview | null>(null);
  const [selectedImportSections, setSelectedImportSections] = useState<BlossomImportSection[]>([]);
  const [importing, setImporting] = useState(false);
  const [csvKind, setCsvKind] = useState<CsvKind>("medication");
  const [csvRows, setCsvRows] = useState<Record<string, string>[] | null>(null);

  const selectedCount = useMemo(() => Object.values(selection).filter(Boolean).length, [selection]);

  function toggleExport(key: DataExportSection) {
    setSelection((current) => ({ ...current, [key]: !current[key] }));
  }

  async function makeExport(kind: "pdf" | "json") {
    setGenerating(kind);
    setMessage(null);
    try {
      const data = await exportSelectedData(selection);
      if (kind === "json") {
        download(`blossom-backup-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(data, null, 2), "application/json");
      } else {
        const { buildDataExportPdf } = await import("@/lib/pdfExport");
        buildDataExportPdf(data as unknown as Parameters<typeof buildDataExportPdf>[0]).save(`blossom-export-${new Date().toISOString().slice(0, 10)}.pdf`);
      }
      setMessage(kind === "pdf" ? "Your Blossom PDF is ready." : "Your Blossom backup is ready.");
    } catch {
      setMessage("Blossom couldn’t prepare that export just now. Nothing was sent anywhere.");
    } finally {
      setGenerating(null);
    }
  }

  async function chooseJson(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setMessage(null);
    try {
      const parsed = JSON.parse(await file.text()) as unknown;
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("invalid");
      const payload = parsed as Record<string, unknown>;
      if (payload.format && payload.format !== "blossom-backup") throw new Error("wrong-format");
      const preview = await previewBlossomImport(payload);
      if (preview.sections.length === 0) throw new Error("empty");
      setImportPayload(payload);
      setImportPreview(preview);
      setSelectedImportSections(preview.sections.map((section) => section.section));
    } catch {
      setMessage("That doesn’t look like a usable Blossom backup. No data was changed.");
    }
  }

  async function mergeJson() {
    if (!importPayload || selectedImportSections.length === 0) return;
    setImporting(true);
    const result = await mergeBlossomImport(importPayload, selectedImportSections);
    setImporting(false);
    setImportPayload(null);
    setImportPreview(null);
    setSelectedImportSections([]);
    setMessage(`${result.imported} item${result.imported === 1 ? "" : "s"} added. ${result.skipped ? `${result.skipped} existing item${result.skipped === 1 ? " was" : "s were"} left untouched.` : "Nothing was overwritten."}`);
  }

  async function chooseCsv(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      const rows = parseCsv(await file.text());
      if (rows.length === 0) throw new Error("empty");
      setCsvRows(rows);
      setMessage(null);
    } catch {
      setMessage("That CSV couldn’t be read. Nothing was changed.");
    }
  }

  async function mergeCsv() {
    if (!csvRows) return;
    setImporting(true);
    let imported = 0;
    for (const row of csvRows) {
      if (csvKind === "medication" && row.name) {
        const times = (row.times || "").split(/[|;]/).map((value) => value.trim()).filter(Boolean);
        const days = (row.days || "").split(/[|;]/).map(Number).filter((value) => Number.isInteger(value) && value >= 0 && value <= 6);
        const intervalDays = Number(row.interval_days);
        await addMedication({ name: row.name, route: isRoute(row.route) ? row.route : null, unit: row.unit || null, frequency: times.length ? { times, days: Number.isFinite(intervalDays) && intervalDays > 0 ? null : (days.length ? days : null), intervalDays: Number.isFinite(intervalDays) && intervalDays > 0 ? intervalDays : null, anchorDate: null } : null });
        imported += 1;
      }
      if (csvKind === "appointment" && row.title && row.appointment_at && !Number.isNaN(new Date(row.appointment_at).getTime())) {
        await addAppointment({ title: row.title, appointmentAt: new Date(row.appointment_at).toISOString(), location: row.location || null, preparationNote: row.preparation_note || null });
        imported += 1;
      }
      if (csvKind === "weight" && row.date && Number.isFinite(Number(row.weight_kg)) && Number(row.weight_kg) > 0) {
        await addWeightEntry({ date: row.date, weightGrams: Math.round(Number(row.weight_kg) * 1000), note: row.note || null });
        imported += 1;
      }
      if (csvKind === "journal" && row.body_text) { await addJournalEntry(row.body_text); imported += 1; }
    }
    setImporting(false);
    setCsvRows(null);
    setMessage(`${imported} item${imported === 1 ? "" : "s"} added from CSV. Existing data was not edited.`);
  }

  async function handleDelete() {
    setDeleting(true);
    await deleteAllData();
    setDeleting(false);
    setConfirmOpen(false);
    router.replace(`/data-deleted?at=${encodeURIComponent(new Date().toISOString())}`);
  }

  return (
    <div className={styles.screen}>
      <ScreenHeader title="Data controls" backHref="/settings" />
      {message && <p className={styles.hint} role="status">{message}</p>}

      <div className={styles.field}>
        <span className={styles.label}>Take your data with you</span>
        <p className={styles.hint}>Choose exactly what to include. Exports are created on this device. Once downloaded, they are normal files, so keep them somewhere private.</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {EXPORT_SECTIONS.map((section) => <label key={section.key} className={styles.toggleRow} style={{ cursor: "pointer" }}>
            <div className={styles.toggleText}><span className={styles.toggleTitle}>{section.title}{section.sensitive ? " · sensitive" : ""}</span><span className={styles.toggleDesc}>{section.desc}</span></div>
            <input type="checkbox" checked={selection[section.key]} onChange={() => toggleExport(section.key)} aria-label={`Include ${section.title}`} />
          </label>)}
        </div>
        <p className={styles.hint}>{selectedCount} section{selectedCount === 1 ? "" : "s"} selected. Photos and recordings remain on this device and are never put into these exports.</p>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button type="button" className={styles.primaryButton} disabled={generating !== null || selectedCount === 0} onClick={() => void makeExport("pdf")}>{generating === "pdf" ? "Preparing Blossom PDF…" : "Export Blossom PDF"}</button>
          <button type="button" className={styles.tertiaryButton} disabled={generating !== null || selectedCount === 0} onClick={() => void makeExport("json")}>{generating === "json" ? "Preparing backup…" : "Export backup JSON"}</button>
        </div>
      </div>

      <div className={styles.field}>
        <span className={styles.label}>Bring data into Blossom</span>
        <p className={styles.hint}>Files are read in your browser, not uploaded. Blossom previews a backup before it adds anything and never replaces existing records.</p>
        <input ref={jsonInput} type="file" accept="application/json,.json" hidden onChange={(event) => void chooseJson(event)} />
        <button type="button" className={styles.primaryButton} onClick={() => jsonInput.current?.click()}>Choose a Blossom backup</button>
        {importPreview && <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
          {importPreview.sections.map((section) => <label key={section.section} className={styles.toggleRow} style={{ cursor: "pointer" }}><div className={styles.toggleText}><span className={styles.toggleTitle}>{section.label}</span><span className={styles.toggleDesc}>{section.incoming} found{section.likelyDuplicates ? ` · ${section.likelyDuplicates} may already be here` : ""}</span></div><input type="checkbox" checked={selectedImportSections.includes(section.section)} onChange={() => setSelectedImportSections((current) => current.includes(section.section) ? current.filter((item) => item !== section.section) : [...current, section.section])} /></label>)}
          {importPreview.invalidRows > 0 && <p className={styles.hint}>{importPreview.invalidRows} malformed row{importPreview.invalidRows === 1 ? "" : "s"} will be ignored.</p>}
          <button type="button" className={styles.primaryButton} disabled={importing || selectedImportSections.length === 0} onClick={() => void mergeJson()}>{importing ? "Adding safely…" : "Add selected data"}</button>
          <button type="button" className={styles.tertiaryButton} onClick={() => { setImportPayload(null); setImportPreview(null); setSelectedImportSections([]); }}>Cancel import</button>
        </div>}
      </div>

      <div className={styles.field}>
        <span className={styles.label}>Simple CSV import</span>
        <p className={styles.hint}>For medication, appointments, weight or journal entries. Download the template first so Blossom doesn&apos;t have to guess at columns.</p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{(Object.keys(CSV_TEMPLATES) as CsvKind[]).map((kind) => <button key={kind} type="button" className={styles.tertiaryButton} style={csvKind === kind ? { border: "1px solid var(--lavender)" } : undefined} onClick={() => setCsvKind(kind)}>{CSV_TEMPLATES[kind].label}</button>)}</div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button type="button" className={styles.tertiaryButton} onClick={() => download(CSV_TEMPLATES[csvKind].filename, CSV_TEMPLATES[csvKind].body, "text/csv")}>Download template</button>
          <input ref={csvInput} type="file" accept="text/csv,.csv" hidden onChange={(event) => void chooseCsv(event)} />
          <button type="button" className={styles.primaryButton} onClick={() => csvInput.current?.click()}>Choose CSV</button>
        </div>
        {csvRows && <div style={{ display: "flex", flexDirection: "column", gap: 8 }}><p className={styles.hint}>{csvRows.length} row{csvRows.length === 1 ? "" : "s"} ready to add. This only adds new rows and will not edit existing data.</p><button type="button" className={styles.primaryButton} disabled={importing} onClick={() => void mergeCsv()}>{importing ? "Adding…" : `Add ${csvRows.length} row${csvRows.length === 1 ? "" : "s"}`}</button><button type="button" className={styles.tertiaryButton} onClick={() => setCsvRows(null)}>Cancel CSV import</button></div>}
      </div>

      <div className={styles.field}>
        <span className={styles.label}>Delete everything</span>
        <p className={styles.hint}>Permanently erases data stored in this browser on this device. Downloads, external backups and data someone has already seen through sharing are separate.</p>
        <button type="button" className={styles.dangerButton} onClick={() => setConfirmOpen(true)}>Delete all data</button>
      </div>

      {confirmOpen && <div className={sheetStyles.backdrop} onClick={() => setConfirmOpen(false)}><div className={sheetStyles.sheet} onClick={(event) => event.stopPropagation()}><div className={sheetStyles.grabber} /><h2 className={sheetStyles.title}>Delete this device&apos;s Blossom data?</h2><p style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.5 }}>This permanently removes this device&apos;s Blossom records, including private entries. Download a backup first if you may need anything later. Type DELETE to confirm.</p><input className={sheetStyles.input} value={confirmText} onChange={(event) => setConfirmText(event.target.value)} placeholder="DELETE" /><div className={sheetStyles.actions}><button type="button" className={sheetStyles.tertiaryButton} onClick={() => setConfirmOpen(false)}>Cancel</button><button type="button" className={sheetStyles.primaryButton} style={{ background: "var(--pink)", color: "var(--plum)" }} disabled={confirmText !== "DELETE" || deleting} onClick={() => void handleDelete}>{deleting ? "Deleting…" : "Delete everything"}</button></div></div></div>}
    </div>
  );
}

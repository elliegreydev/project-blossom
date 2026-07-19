import { jsPDF, GState } from "jspdf";
import type {
  Appointment,
  BloodTestEntry,
  BodyEntry,
  CareSupply,
  CheckIn,
  Goal,
  JournalEntry,
  JourneyEvent,
  Medication,
  MedicationLog,
  MedicationSupply,
  Milestone,
  PresentationEntry,
  PrivateLink,
  Profile,
  VoiceGoal,
  VoiceSession,
} from "./db";

const HRT_STATUS_LABEL: Record<string, string> = {
  on: "Currently on HRT",
  considering: "Considering HRT",
  not_tracking: "Not tracked",
};

// Photos are deliberately left out here, same as exportAllData()'s JSON
// export - they're private, local-only, and a PDF full of embedded images
// is a very different (and much riskier) thing to build than a readable
// text document. A note stands in where a photo exists.

interface ExportShape {
  exportedAt: string;
  profile: Partial<Profile>;
  milestones: Milestone[];
  journeyEvents: JourneyEvent[];
  medications: Medication[];
  medicationLogs: MedicationLog[];
  medicationSupplies: MedicationSupply[];
  careSupplies: CareSupply[];
  appointments: Appointment[];
  journalEntries: JournalEntry[];
  checkIns: CheckIn[];
  goals: Goal[];
  privateLinks: PrivateLink[];
  bloodTestEntries: BloodTestEntry[];
  voiceGoals: VoiceGoal[];
  voiceSessions: Array<Omit<VoiceSession, "recording"> & { hasRecording: boolean }>;
  presentationEntries: Array<Omit<PresentationEntry, "photo"> & { hasPhoto: boolean }>;
  bodyEntries: Array<Omit<BodyEntry, "photo"> & { hasPhoto: boolean }>;
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function fmtDateTime(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

// Pulled from src/app/globals.css's light-mode palette, so the export
// actually looks like Blossom rather than a generic document.
const BRAND = {
  plum: [43, 31, 51] as [number, number, number],
  pink: [247, 180, 200] as [number, number, number],
  lavender: [196, 182, 246] as [number, number, number],
  mint: [189, 234, 214] as [number, number, number],
  textSecondary: [107, 93, 116] as [number, number, number],
  textMuted: [117, 106, 125] as [number, number, number],
  border: [236, 229, 238] as [number, number, number],
  // A soft lilac-pink page tint (pink + lavender blended lightly into
  // white) - a visible wash of colour rather than a stark white page,
  // still gentle enough not to fight with the text sitting on top of it.
  pageTint: [245, 232, 246] as [number, number, number],
};

// A simplified vector redraw of the app's own three-petal ".petals" flourish
// (see home.module.css) - three overlapping rounded blobs in pink, lavender,
// and mint, rather than an embedded image.
function drawPetals(doc: jsPDF, cx: number, cy: number, scale = 1) {
  doc.saveGraphicsState();
  doc.setGState(new GState({ opacity: 0.8 }));
  doc.setFillColor(...BRAND.pink);
  doc.ellipse(cx - 4 * scale, cy, 7 * scale, 10 * scale, "F");
  doc.setFillColor(...BRAND.lavender);
  doc.ellipse(cx + 6 * scale, cy - 2 * scale, 7 * scale, 10 * scale, "F");
  doc.setFillColor(...BRAND.mint);
  doc.ellipse(cx - 1 * scale, cy + 7 * scale, 7 * scale, 10 * scale, "F");
  doc.restoreGraphicsState();
}

export class DocBuilder {
  doc: jsPDF;
  margin = 48;
  y: number;
  pageWidth: number;
  pageHeight: number;
  contentWidth: number;

  constructor() {
    this.doc = new jsPDF({ unit: "pt", format: "a4" });
    this.pageWidth = this.doc.internal.pageSize.getWidth();
    this.pageHeight = this.doc.internal.pageSize.getHeight();
    this.contentWidth = this.pageWidth - this.margin * 2;
    this.y = this.margin;
    this.fillPageBackground();
  }

  private fillPageBackground() {
    this.doc.setFillColor(...BRAND.pageTint);
    this.doc.rect(0, 0, this.pageWidth, this.pageHeight, "F");
  }

  private ensureSpace(lineHeight: number) {
    if (this.y + lineHeight > this.pageHeight - this.margin) {
      this.doc.addPage();
      this.fillPageBackground();
      this.y = this.margin;
    }
  }

  // A cover header echoing the app's own greeting/eyebrow layout: the
  // petal flourish, the wordmark, a soft tagline, and the export details -
  // rather than a plain document title.
  coverHeader(subtitle: string) {
    drawPetals(this.doc, this.margin + 10, this.y + 8, 1.3);
    this.doc.setFont("helvetica", "bold");
    this.doc.setFontSize(23);
    this.doc.setTextColor(...BRAND.plum);
    this.doc.text("Blossom", this.margin + 34, this.y + 14);
    this.y += 34;

    this.doc.setFont("helvetica", "normal");
    this.doc.setFontSize(9.5);
    this.doc.setTextColor(...BRAND.textSecondary);
    this.doc.text(subtitle, this.margin, this.y);
    this.y += 18;

    this.doc.setDrawColor(...BRAND.pink);
    this.doc.setLineWidth(1.4);
    this.doc.line(this.margin, this.y, this.pageWidth - this.margin, this.y);
    this.doc.setLineWidth(0.5);
    this.y += 22;
    this.doc.setTextColor(...BRAND.plum);
  }

  heading(text: string) {
    this.y += 10;
    this.ensureSpace(28);
    this.doc.setFont("helvetica", "bold");
    this.doc.setFontSize(15);
    this.doc.setTextColor(...BRAND.plum);
    this.doc.text(text, this.margin, this.y);
    this.y += 9;
    this.doc.setDrawColor(...BRAND.pink);
    this.doc.setLineWidth(1.2);
    this.doc.line(this.margin, this.y, this.margin + 34, this.y);
    this.doc.setLineWidth(0.5);
    this.y += 15;
  }

  subheading(text: string) {
    this.ensureSpace(18);
    this.doc.setFont("helvetica", "bold");
    this.doc.setFontSize(11.5);
    this.doc.setTextColor(...BRAND.plum);
    this.doc.text(text, this.margin, this.y);
    this.y += 15;
  }

  meta(text: string) {
    if (!text) return;
    this.ensureSpace(14);
    this.doc.setFont("helvetica", "normal");
    this.doc.setFontSize(9.5);
    this.doc.setTextColor(...BRAND.textSecondary);
    this.doc.text(text, this.margin, this.y);
    this.y += 13;
  }

  body(text: string) {
    if (!text) return;
    this.doc.setFont("helvetica", "normal");
    this.doc.setFontSize(10.5);
    this.doc.setTextColor(...BRAND.plum);
    const lines = this.doc.splitTextToSize(text, this.contentWidth) as string[];
    for (const line of lines) {
      this.ensureSpace(14);
      this.doc.text(line, this.margin, this.y);
      this.y += 14;
    }
  }

  spacer(amount = 10) {
    this.y += amount;
  }

  emptyNote(text: string) {
    this.doc.setFont("helvetica", "italic");
    this.doc.setFontSize(10);
    this.doc.setTextColor(...BRAND.textMuted);
    this.ensureSpace(14);
    this.doc.text(text, this.margin, this.y);
    this.y += 18;
  }

  // Small "Blossom" mark + page number on every page, drawn last since the
  // final page count isn't known until all content has been laid out.
  finish() {
    const pageCount = this.doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      this.doc.setPage(i);
      this.doc.setDrawColor(...BRAND.border);
      this.doc.setLineWidth(0.5);
      this.doc.line(this.margin, this.pageHeight - this.margin + 14, this.pageWidth - this.margin, this.pageHeight - this.margin + 14);
      this.doc.setFont("helvetica", "normal");
      this.doc.setFontSize(8.5);
      this.doc.setTextColor(...BRAND.textMuted);
      this.doc.text("Blossom", this.margin, this.pageHeight - this.margin + 26);
      this.doc.text(`${i} / ${pageCount}`, this.pageWidth - this.margin, this.pageHeight - this.margin + 26, { align: "right" });
    }
    return this.doc;
  }
}

export function buildDataExportPdf(data: ExportShape): jsPDF {
  const d = new DocBuilder();

  d.coverHeader(
    `Your data, exported ${fmtDateTime(data.exportedAt)}${data.profile.displayName ? ` for ${data.profile.displayName}` : ""}`
  );
  d.body("This is a plain-language copy of everything you've added to Blossom. Photos aren't included here - they stay local-only and never leave your device, including in this export.");

  const medNameById = new Map(data.medications.map((m) => [m.id, m.name]));

  // Journey
  const journeyItems = [...data.milestones, ...data.journeyEvents].sort((a, b) => (b.eventDate ?? "").localeCompare(a.eventDate ?? ""));
  d.heading("Journey");
  if (journeyItems.length === 0) d.emptyNote("Nothing recorded.");
  for (const item of journeyItems) {
    d.subheading(item.title);
    d.meta([item.category ?? "", item.eventDate ?? ""].filter(Boolean).join(" · "));
    d.body(item.note ?? "");
    d.spacer(6);
  }

  // Medications
  d.heading("Medications");
  if (data.medications.length === 0) d.emptyNote("None added.");
  for (const med of data.medications) {
    d.subheading(med.name + (med.active ? "" : " (inactive)"));
    const scheduleText = med.frequency
      ? `${med.frequency.times.join(", ")}${
          med.frequency.intervalDays ? ` every ${med.frequency.intervalDays} days` : med.frequency.days ? " on set days" : " daily"
        }`
      : "No schedule set";
    d.meta([med.route ?? "", med.unit ?? "", scheduleText].filter(Boolean).join(" · "));
    d.spacer(4);
  }

  // Medication supplies
  d.heading("Medication supplies");
  if (data.medicationSupplies.length === 0) d.emptyNote("None tracked.");
  for (const supply of data.medicationSupplies) {
    d.subheading(medNameById.get(supply.medicationId) ?? "Medication");
    d.meta(`${supply.quantity} ${supply.supplyUnit}`);
    d.meta(
      [
        supply.pharmacy ? `Pharmacy: ${supply.pharmacy}` : "",
        supply.renewalDate ? `Renewal: ${fmtDate(supply.renewalDate)}` : "",
        supply.expiryDate ? `Expiry: ${fmtDate(supply.expiryDate)}` : "",
      ]
        .filter(Boolean)
        .join(" · ")
    );
    d.body(supply.note ?? "");
    d.spacer(6);
  }

  // Care supplies
  d.heading("Other supplies");
  if (data.careSupplies.length === 0) d.emptyNote("None tracked.");
  for (const supply of data.careSupplies) {
    d.subheading(supply.name);
    d.meta(`${supply.quantity} ${supply.supplyUnit}`);
    d.meta(
      [
        supply.provider ? `Provider: ${supply.provider}` : "",
        supply.renewalDate ? `Renewal: ${fmtDate(supply.renewalDate)}` : "",
        supply.deliveryDate ? `Delivery: ${fmtDate(supply.deliveryDate)}` : "",
        supply.expiryDate ? `Expiry: ${fmtDate(supply.expiryDate)}` : "",
      ]
        .filter(Boolean)
        .join(" · ")
    );
    d.body(supply.note ?? "");
    d.spacer(6);
  }

  // Recent dose history
  d.heading("Medication log");
  const sortedLogs = [...data.medicationLogs].sort((a, b) => b.loggedAt.localeCompare(a.loggedAt));
  if (sortedLogs.length === 0) d.emptyNote("No doses logged.");
  for (const log of sortedLogs) {
    d.meta(`${fmtDateTime(log.scheduledTime ?? log.loggedAt)} · ${medNameById.get(log.medicationId) ?? "Medication"} · ${log.status}`);
  }

  // Appointments
  d.heading("Appointments");
  const sortedAppts = [...data.appointments].sort((a, b) => b.appointmentAt.localeCompare(a.appointmentAt));
  if (sortedAppts.length === 0) d.emptyNote("None added.");
  for (const appt of sortedAppts) {
    d.subheading(appt.title);
    d.meta([fmtDateTime(appt.appointmentAt), appt.location ?? ""].filter(Boolean).join(" · "));
    if (appt.preparationNote) d.body(`Before: ${appt.preparationNote}`);
    if (appt.outcomeNote) d.body(`After: ${appt.outcomeNote}`);
    d.spacer(6);
  }

  // Journal
  d.heading("Journal");
  const sortedJournal = [...data.journalEntries].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  if (sortedJournal.length === 0) d.emptyNote("Nothing written.");
  for (const entry of sortedJournal) {
    d.meta(fmtDate(entry.createdAt));
    d.body(entry.bodyText);
    d.spacer(8);
  }

  // Check-ins
  d.heading("Check-ins");
  const sortedCheckIns = [...data.checkIns].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  if (sortedCheckIns.length === 0) d.emptyNote("None logged.");
  for (const ci of sortedCheckIns) {
    const scales = [
      ci.mood !== null ? `Mood ${ci.mood}/5` : "",
      ci.energy !== null ? `Energy ${ci.energy}/5` : "",
      ci.confidence !== null ? `Confidence ${ci.confidence}/5` : "",
      ci.stress !== null ? `Stress ${ci.stress}/5` : "",
      ci.comfort !== null ? `Comfort ${ci.comfort}/5` : "",
    ]
      .filter(Boolean)
      .join(" · ");
    d.meta(`${fmtDate(ci.createdAt)}${scales ? " · " + scales : ""}`);
    d.body(ci.note ?? "");
    d.spacer(4);
  }

  // Goals
  d.heading("Goals");
  if (data.goals.length === 0) d.emptyNote("None added.");
  for (const goal of data.goals) {
    d.subheading(goal.title);
    d.meta([goal.status, goal.category ?? "", goal.target ?? ""].filter(Boolean).join(" · "));
    d.spacer(4);
  }

  // Blood tests, grouped by test name
  d.heading("Blood tests");
  if (data.bloodTestEntries.length === 0) {
    d.emptyNote("None added.");
  } else {
    const byTest = new Map<string, BloodTestEntry[]>();
    for (const entry of data.bloodTestEntries) {
      const list = byTest.get(entry.testName) ?? [];
      list.push(entry);
      byTest.set(entry.testName, list);
    }
    for (const [testName, entries] of byTest) {
      d.subheading(testName);
      for (const entry of [...entries].sort((a, b) => b.date.localeCompare(a.date))) {
        d.meta(`${fmtDate(entry.date)} · ${entry.value}${entry.unit ? ` ${entry.unit}` : ""}${entry.labSource ? ` · ${entry.labSource}` : ""}`);
      }
      d.spacer(6);
    }
  }

  // Voice practice, grouped by goal
  d.heading("Voice practice");
  if (data.voiceGoals.length === 0 && data.voiceSessions.length === 0) {
    d.emptyNote("None added.");
  } else {
    const voiceGoalById = new Map(data.voiceGoals.map((g) => [g.id, g.title]));
    const sessionsByGoal = new Map<string, ExportShape["voiceSessions"]>();
    for (const session of data.voiceSessions) {
      const list = sessionsByGoal.get(session.goalId) ?? [];
      list.push(session);
      sessionsByGoal.set(session.goalId, list);
    }
    for (const goal of data.voiceGoals) {
      d.subheading(goal.title);
      const goalSessions = (sessionsByGoal.get(goal.id) ?? []).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      if (goalSessions.length === 0) d.meta("No sessions logged.");
      for (const session of goalSessions) {
        d.meta(
          `${fmtDate(session.createdAt)}${session.sessionDuration ? ` · ${session.sessionDuration}` : ""}${session.comfortRating ? ` · Comfort ${session.comfortRating}/5` : ""}${session.hasRecording ? " · (recording attached, listen in app)" : ""}`
        );
      }
      d.spacer(6);
    }
    for (const [goalId, orphanSessions] of sessionsByGoal) {
      if (voiceGoalById.has(goalId)) continue;
      d.subheading("Deleted goal");
      for (const session of orphanSessions) d.meta(fmtDate(session.createdAt));
      d.spacer(6);
    }
  }

  // Presentation
  d.heading("Presentation");
  if (data.presentationEntries.length === 0) d.emptyNote("None added.");
  for (const entry of data.presentationEntries) {
    d.meta(`${fmtDate(entry.date)} · ${entry.category}${entry.hasPhoto ? " · (photo attached, view in app)" : ""}`);
    d.body(entry.note ?? "");
  }

  // Body & progress
  d.heading("Body & progress");
  if (data.bodyEntries.length === 0) d.emptyNote("None added.");
  for (const entry of data.bodyEntries) {
    d.meta(`${fmtDate(entry.date)}${entry.hasPhoto ? " · (photo attached, view in app)" : ""}`);
    for (const m of entry.measurements) d.meta(`  ${m.label}: ${m.value}`);
    d.body(entry.note ?? "");
    d.spacer(4);
  }

  // Private links
  d.heading("Saved links");
  if (data.privateLinks.length === 0) d.emptyNote("None saved.");
  for (const link of data.privateLinks) {
    d.subheading(link.label);
    d.meta(link.url);
    d.body(link.note ?? "");
    d.spacer(4);
  }

  return d.finish();
}

// Blossom Passport ------------------------------------------------------------
// Unlike buildDataExportPdf above (a complete backup of everything), a
// Passport is a short, user-curated document meant to leave the house - to
// hand to a doctor, an HR contact, or bring to a legal appointment. Every
// section is opt-in per export; journal entries, blood tests, photos, and
// check-in mood data are never available here at all, regardless of purpose,
// since this document is designed to be read by someone else.

export type PassportPurpose = "doctor" | "legal" | "work" | "personal";

export interface PassportSections {
  identity: boolean;
  hrtStatus: boolean;
  journey: boolean;
  medications: boolean;
  note: string;
}

export interface PassportData {
  purpose: PassportPurpose;
  sections: PassportSections;
  profile: Pick<Profile, "displayName" | "pronouns" | "hrtStatus">;
  journeyItems: Array<Pick<Milestone, "title" | "category" | "eventDate" | "note">>;
  medications: Medication[];
}

export const PASSPORT_PURPOSE_SUBTITLE: Record<PassportPurpose, string> = {
  doctor: "Prepared for a medical appointment",
  legal: "Prepared for a legal or documentation purpose",
  work: "Prepared for work or HR",
  personal: "A personal record",
};

export function buildPassportPdf(data: PassportData): jsPDF {
  const d = new DocBuilder();
  d.coverHeader(`${PASSPORT_PURPOSE_SUBTITLE[data.purpose]} · ${fmtDate(new Date().toISOString())}`);

  if (data.sections.identity || data.sections.hrtStatus) {
    d.heading("About");
    if (data.sections.identity && data.profile.displayName) d.meta(`Name: ${data.profile.displayName}`);
    if (data.sections.identity && data.profile.pronouns) d.meta(`Pronouns: ${data.profile.pronouns}`);
    if (data.sections.hrtStatus && data.profile.hrtStatus) {
      d.meta(`HRT: ${HRT_STATUS_LABEL[data.profile.hrtStatus] ?? data.profile.hrtStatus}`);
    }
    d.spacer(6);
  }

  if (data.sections.journey) {
    d.heading("Journey timeline");
    const sorted = [...data.journeyItems].sort((a, b) => (b.eventDate ?? "").localeCompare(a.eventDate ?? ""));
    if (sorted.length === 0) d.emptyNote("Nothing recorded.");
    for (const item of sorted) {
      d.subheading(item.title);
      d.meta([item.category ?? "", item.eventDate ?? ""].filter(Boolean).join(" · "));
      if (item.note) d.body(item.note);
      d.spacer(6);
    }
  }

  if (data.sections.medications) {
    d.heading("Current medications");
    const active = data.medications.filter((m) => m.active);
    if (active.length === 0) d.emptyNote("None currently active.");
    for (const med of active) {
      d.subheading(med.name);
      const scheduleText = med.frequency
        ? `${med.frequency.times.join(", ")}${
            med.frequency.intervalDays ? ` every ${med.frequency.intervalDays} days` : med.frequency.days ? " on set days" : " daily"
          }`
        : "No schedule set";
      d.meta([med.route ?? "", med.unit ?? "", scheduleText].filter(Boolean).join(" · "));
      d.spacer(4);
    }
  }

  if (data.sections.note.trim()) {
    d.heading("Note");
    d.body(data.sections.note.trim());
  }

  return d.finish();
}

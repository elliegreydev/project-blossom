"use client";

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import ScreenHeader from "@/components/ScreenHeader";
import Toggle from "@/components/Toggle";
import { db, LOCAL_PROFILE_ID } from "@/lib/db";
import type { PassportPurpose, PassportSections } from "@/lib/pdfExport";
import styles from "@/components/settingsForm.module.css";
import sheetStyles from "@/components/Sheet.module.css";

const PURPOSES: { key: PassportPurpose; title: string; desc: string }[] = [
  { key: "doctor", title: "Doctor / clinical appointment", desc: "Identity, HRT status and current medications" },
  { key: "legal", title: "Legal / documentation", desc: "Identity and your journey timeline" },
  { key: "work", title: "Work / HR", desc: "Just name and pronouns" },
  { key: "personal", title: "Personal / just for me", desc: "Nothing pre-selected - pick what you want" },
];

const PRESET_SECTIONS: Record<PassportPurpose, Omit<PassportSections, "note">> = {
  doctor: { identity: true, hrtStatus: true, journey: false, medications: true },
  legal: { identity: true, hrtStatus: false, journey: true, medications: false },
  work: { identity: true, hrtStatus: false, journey: false, medications: false },
  personal: { identity: false, hrtStatus: false, journey: false, medications: false },
};

export default function PassportPage() {
  const profile = useLiveQuery(() => db.profiles.get(LOCAL_PROFILE_ID));
  const [purpose, setPurpose] = useState<PassportPurpose | null>(null);
  const [sections, setSections] = useState<Omit<PassportSections, "note">>(PRESET_SECTIONS.personal);
  const [note, setNote] = useState("");
  const [confirming, setConfirming] = useState<"pdf" | "json" | null>(null);
  const [working, setWorking] = useState(false);

  function pickPurpose(p: PassportPurpose) {
    setPurpose(p);
    setSections(PRESET_SECTIONS[p]);
  }

  const anythingIncluded = sections.identity || sections.hrtStatus || sections.journey || sections.medications || note.trim().length > 0;

  async function gatherData() {
    const [milestones, journeyEvents, medications] = await Promise.all([
      sections.journey ? db.milestones.toArray() : Promise.resolve([]),
      sections.journey ? db.journeyEvents.toArray() : Promise.resolve([]),
      sections.medications ? db.medications.toArray() : Promise.resolve([]),
    ]);
    return {
      purpose: purpose ?? "personal",
      sections: { ...sections, note },
      profile: {
        displayName: profile?.displayName ?? null,
        pronouns: profile?.pronouns ?? null,
        hrtStatus: profile?.hrtStatus ?? null,
      },
      journeyItems: [...milestones, ...journeyEvents].map((m) => ({
        title: m.title,
        category: m.category,
        eventDate: m.eventDate,
        note: m.note,
      })),
      medications,
    };
  }

  async function download() {
    setWorking(true);
    try {
      const data = await gatherData();
      if (confirming === "pdf") {
        const { buildPassportPdf } = await import("@/lib/pdfExport");
        const doc = buildPassportPdf(data);
        doc.save(`blossom-passport-${new Date().toISOString().slice(0, 10)}.pdf`);
      } else {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `blossom-passport-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } finally {
      setWorking(false);
      setConfirming(null);
    }
  }

  if (!profile) return null;

  return (
    <div className={styles.screen}>
      <ScreenHeader title="Blossom Passport" backHref="/settings" />
      <p className={styles.hint}>
        A short document you choose the contents of, meant to leave the house - to hand to a
        doctor, bring to a legal appointment, or share with work. Journal entries, blood tests,
        photos and mood check-ins are never available here, whatever you&apos;re preparing it for.
      </p>

      <div className={styles.field}>
        <span className={styles.label}>What&apos;s this for?</span>
        <div className={styles.optionGrid}>
          {PURPOSES.map((p) => (
            <button
              key={p.key}
              type="button"
              className={`${styles.optionCard} ${purpose === p.key ? styles.selected : ""}`}
              onClick={() => pickPurpose(p.key)}
            >
              <span className={styles.optionTitle}>{p.title}</span>
              <span className={styles.optionDesc}>{p.desc}</span>
            </button>
          ))}
        </div>
      </div>

      {purpose && (
        <>
          <div className={styles.field}>
            <span className={styles.label}>Include</span>
            <div className={styles.toggleRow}>
              <div className={styles.toggleText}>
                <span className={styles.toggleTitle}>Name & pronouns</span>
              </div>
              <Toggle checked={sections.identity} onChange={(v) => setSections((s) => ({ ...s, identity: v }))} label="Name & pronouns" />
            </div>
            <div className={styles.toggleRow}>
              <div className={styles.toggleText}>
                <span className={styles.toggleTitle}>HRT status</span>
              </div>
              <Toggle checked={sections.hrtStatus} onChange={(v) => setSections((s) => ({ ...s, hrtStatus: v }))} label="HRT status" />
            </div>
            <div className={styles.toggleRow}>
              <div className={styles.toggleText}>
                <span className={styles.toggleTitle}>Journey timeline</span>
              </div>
              <Toggle checked={sections.journey} onChange={(v) => setSections((s) => ({ ...s, journey: v }))} label="Journey timeline" />
            </div>
            <div className={styles.toggleRow}>
              <div className={styles.toggleText}>
                <span className={styles.toggleTitle}>Current medications</span>
                <span className={styles.toggleDesc}>Active only - no dose history</span>
              </div>
              <Toggle checked={sections.medications} onChange={(v) => setSections((s) => ({ ...s, medications: v }))} label="Current medications" />
            </div>
          </div>

          <div className={styles.field}>
            <span className={styles.label}>A note for this document (optional)</span>
            <textarea
              className={sheetStyles.textarea}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Anything you want to add just for this one"
              rows={3}
            />
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button
              type="button"
              className={styles.primaryButton}
              disabled={!anythingIncluded}
              onClick={() => setConfirming("pdf")}
            >
              Generate PDF
            </button>
            <button
              type="button"
              className={styles.tertiaryButton}
              disabled={!anythingIncluded}
              onClick={() => setConfirming("json")}
            >
              Download as structured data
            </button>
          </div>
        </>
      )}

      {confirming && (
        <div className={sheetStyles.backdrop} onClick={() => !working && setConfirming(null)}>
          <div className={sheetStyles.sheet} onClick={(e) => e.stopPropagation()}>
            <div className={sheetStyles.grabber} />
            <h2 className={sheetStyles.title}>Before this leaves Blossom</h2>
            <p className={sheetStyles.helpText}>
              Once this downloads, it&apos;s a file on this device like any other - Blossom
              can&apos;t protect it anymore. Anyone who gets a copy can read everything
              you&apos;ve included above. Make sure that&apos;s what you want before continuing.
            </p>
            <div className={sheetStyles.actions}>
              <button type="button" className={sheetStyles.tertiaryButton} onClick={() => setConfirming(null)} disabled={working}>
                Cancel
              </button>
              <button type="button" className={sheetStyles.primaryButton} onClick={download} disabled={working}>
                {working ? "Preparing…" : "I understand, download"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

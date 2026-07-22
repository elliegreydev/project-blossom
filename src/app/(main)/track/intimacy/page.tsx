"use client";

import Link from "next/link";
import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import ScreenHeader from "@/components/ScreenHeader";
import SensitiveModuleGate from "@/components/SensitiveModuleGate";
import IntimacyEntrySheet from "@/components/IntimacyEntrySheet";
import UndoRemovalNotice from "@/components/UndoRemovalNotice";
import { useUndoableRemoval } from "@/components/useUndoableRemoval";
import { db, deleteIntimacyEntry, LOCAL_PROFILE_ID, type IntimacyEntry, type IntimacyFeeling } from "@/lib/db";
import feature from "@/components/feature.module.css";
import styles from "./intimacy.module.css";

const FEELING_LABELS: Record<IntimacyFeeling, string> = {
  good: "Felt good",
  mixed: "Felt mixed",
  unsure: "Felt unsure",
  "not-good": "Didn’t feel good",
};

function dateLabel(entry: IntimacyEntry): string {
  const date = new Date(`${entry.date}T12:00:00`).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
  if (entry.datePrecision === "approximate") return `Around ${date}`;
  return entry.time ? `${date} · ${entry.time}` : date;
}

export default function IntimacyPage() {
  const profile = useLiveQuery(() => db.profiles.get(LOCAL_PROFILE_ID));
  const entries = useLiveQuery(() => db.intimacyEntries.orderBy("date").reverse().toArray(), []);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<IntimacyEntry | null>(null);
  const { pendingRemoval, stageRemoval, undoRemoval, isPendingRemoval } = useUndoableRemoval();

  if (!profile || entries === undefined) return null;
  const visibleEntries = entries.filter((entry) => !isPendingRemoval(entry.id));

  if (!profile.enabledModules.includes("intimacy")) {
    return <div className={feature.screen}><ScreenHeader title="Intimacy & wellbeing" backHref="/track" /><div className={feature.empty}><div className={feature.emptyTitle}>This space is turned off</div><div className={feature.emptySubtitle}>You can enable it whenever it feels useful. Nothing is assumed.</div><Link href="/settings/modules" className={feature.addButton}>Choose modules</Link></div></div>;
  }

  return (
    <SensitiveModuleGate>
      <div className={feature.screen}>
        <ScreenHeader title="Intimacy & wellbeing" backHref="/track" />
        <p className={feature.pageSubtitle} style={{ marginTop: -10 }}>A private place to keep only what feels useful to remember. No counts, streaks, reminders or judgement.</p>

        <div className={styles.privacyNote}>Stored only on this device. It stays out of sync, Home, search and notifications.</div>

        <div className={feature.section}>
          {visibleEntries.length === 0 ? <div className={feature.empty}><div className={feature.emptyTitle}>Nothing needs recording to be real</div><div className={feature.emptySubtitle}>If you ever want a private note for yourself, this space is here.</div></div> : <div className={feature.list}>{visibleEntries.map((entry) => <article key={entry.id} className={feature.item}><button type="button" className={styles.entryButton} onClick={() => setEditing(entry)}><div className={feature.itemRow}><span className={feature.itemTitle}>{entry.label ?? "Private entry"}</span><span className={feature.itemMeta}>{dateLabel(entry)}</span></div>{entry.feeling && <span className={styles.feeling}>{FEELING_LABELS[entry.feeling]}</span>}{entry.tags.length > 0 && <span className={feature.itemMeta}>{entry.tags.join(" · ")}</span>}{entry.privateNote && <span className={styles.preview}>{entry.privateNote}</span>}</button>{(entry.feeling === "unsure" || entry.feeling === "not-good") && <Link href="/crisis-support" className={styles.supportLink}>Need support right now?</Link>}<div className={styles.actions}><button type="button" className={feature.linkButton} onClick={() => setEditing(entry)}>Edit</button><button type="button" className={feature.linkButton} onClick={() => stageRemoval(entry.id, "This private entry", () => deleteIntimacyEntry(entry.id))}>Remove</button></div></article>)}</div>}
          <button type="button" className={feature.addButton} onClick={() => setSheetOpen(true)}>+ Add private entry</button>
        </div>

        {(sheetOpen || editing) && <IntimacyEntrySheet entry={editing} onClose={() => { setSheetOpen(false); setEditing(null); }} />}
        {pendingRemoval && <UndoRemovalNotice label={pendingRemoval.label} onUndo={undoRemoval} />}
      </div>
    </SensitiveModuleGate>
  );
}

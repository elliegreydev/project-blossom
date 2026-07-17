"use client";

import { useState } from "react";
import styles from "./Sheet.module.css";
import { useSheetDialog } from "./useSheetDialog";
import {
  addSocialTransitionPerson,
  addSocialTransitionPlan,
  addSocialTransitionTask,
  type SocialPersonStatus,
  type SocialPlanKind,
  type SocialPlanStatus,
  type SocialTaskCategory,
  type SocialTaskStatus,
} from "@/lib/db";

type EntryType = "person" | "plan" | "task";

const PERSON_STATUSES: Array<[SocialPersonStatus, string]> = [
  ["considering", "Considering"],
  ["preparing", "Preparing"],
  ["told", "Told"],
  ["not-right-now", "Not right now"],
];

const PLAN_KINDS: Array<[SocialPlanKind, string]> = [
  ["conversation", "Conversation"],
  ["work", "Work"],
  ["education", "Education"],
  ["online", "Online"],
  ["other", "Something else"],
];

const PLAN_STATUSES: Array<[SocialPlanStatus, string]> = [
  ["considering", "Considering"],
  ["preparing", "Preparing"],
  ["done", "Done"],
  ["paused", "Paused"],
  ["not-for-me", "Not for me"],
];

const TASK_CATEGORIES: Array<[SocialTaskCategory, string]> = [
  ["name", "Name"],
  ["documents", "Documents"],
  ["healthcare", "Healthcare"],
  ["money", "Money"],
  ["work-education", "Work / education"],
  ["online", "Online"],
  ["other", "Other"],
];

export default function SocialTransitionEntrySheet({ type, onClose }: { type: EntryType; onClose: () => void }) {
  const dialogRef = useSheetDialog(onClose);
  const [label, setLabel] = useState("");
  const [personStatus, setPersonStatus] = useState<SocialPersonStatus>("considering");
  const [planKind, setPlanKind] = useState<SocialPlanKind>("conversation");
  const [planStatus, setPlanStatus] = useState<SocialPlanStatus>("considering");
  const [taskCategory, setTaskCategory] = useState<SocialTaskCategory>("name");
  const [taskStatus, setTaskStatus] = useState<SocialTaskStatus>("not-started");
  const [script, setScript] = useState("");
  const [safetyNote, setSafetyNote] = useState("");
  const [privateNote, setPrivateNote] = useState("");
  const [saving, setSaving] = useState(false);

  const title = type === "person" ? "Add a person or group" : type === "plan" ? "Add a plan" : "Add a life-admin task";
  const labelCopy = type === "person" ? "A private label" : type === "plan" ? "What are you planning?" : "What would you like to keep track of?";
  const placeholder = type === "person" ? "e.g. A close friend, my manager, family" : type === "plan" ? "e.g. A conversation at work" : "e.g. Review my passport details";

  async function save() {
    if (!label.trim()) return;
    setSaving(true);
    if (type === "person") {
      await addSocialTransitionPerson({
        label: label.trim(),
        status: personStatus,
        script: script.trim() || null,
        safetyNote: safetyNote.trim() || null,
        privateNote: privateNote.trim() || null,
      });
    } else if (type === "plan") {
      await addSocialTransitionPlan({
        title: label.trim(),
        kind: planKind,
        status: planStatus,
        privateNote: privateNote.trim() || null,
      });
    } else {
      await addSocialTransitionTask({
        title: label.trim(),
        category: taskCategory,
        status: taskStatus,
        privateNote: privateNote.trim() || null,
      });
    }
    setSaving(false);
    onClose();
  }

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div ref={dialogRef} className={styles.sheet} onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="social-transition-sheet-title">
        <div className={styles.grabber} />
        <h2 id="social-transition-sheet-title" className={styles.title}>{title}</h2>
        <p className={styles.helpText}>This stays only on this device. You can pause, change, or remove it whenever you want.</p>

        <label className={styles.field}>
          <span className={styles.label}>{labelCopy}</span>
          <input className={styles.input} value={label} onChange={(event) => setLabel(event.target.value)} placeholder={placeholder} autoFocus />
        </label>

        {type === "person" && (
          <>
            <ChoiceField label="Where does this feel right now?" value={personStatus} choices={PERSON_STATUSES} onChange={setPersonStatus} />
            <TextField label="Words you might want to use (optional)" value={script} onChange={setScript} placeholder="A few words, a full script, or nothing at all." />
            <TextField label="Safety considerations (optional)" value={safetyNote} onChange={setSafetyNote} placeholder="Anything that helps you feel more prepared or safe." />
          </>
        )}

        {type === "plan" && (
          <>
            <ChoiceField label="This plan is for" value={planKind} choices={PLAN_KINDS} onChange={setPlanKind} />
            <ChoiceField label="Where does it feel right now?" value={planStatus} choices={PLAN_STATUSES} onChange={setPlanStatus} />
          </>
        )}

        {type === "task" && (
          <>
            <ChoiceField label="Area" value={taskCategory} choices={TASK_CATEGORIES} onChange={setTaskCategory} />
            <ChoiceField label="Status" value={taskStatus} choices={[["not-started", "Not started"], ["done", "Done"], ["paused", "Paused"]] as Array<[SocialTaskStatus, string]>} onChange={setTaskStatus} />
          </>
        )}

        <TextField label="Private note (optional)" value={privateNote} onChange={setPrivateNote} placeholder="Anything useful to remember. No one else can see this." />

        <div className={styles.actions}>
          <button type="button" className={styles.tertiaryButton} onClick={onClose}>Cancel</button>
          <button type="button" className={styles.primaryButton} disabled={!label.trim() || saving} onClick={save}>Save</button>
        </div>
      </div>
    </div>
  );
}

function ChoiceField<T extends string>({ label, value, choices, onChange }: { label: string; value: T; choices: Array<[T, string]>; onChange: (value: T) => void }) {
  return (
    <div className={styles.field}>
      <span className={styles.label}>{label}</span>
      <div className={styles.chipRow}>
        {choices.map(([key, title]) => <button key={key} type="button" className={`${styles.chip} ${value === key ? styles.selected : ""}`} onClick={() => onChange(key)}>{title}</button>)}
      </div>
    </div>
  );
}

function TextField({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder: string }) {
  return (
    <label className={styles.field}>
      <span className={styles.label}>{label}</span>
      <textarea className={styles.textarea} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
    </label>
  );
}

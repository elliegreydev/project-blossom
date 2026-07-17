"use client";

import { useState } from "react";
import Link from "next/link";
import {
  emptyAppointmentBuilderData,
  updateAppointment,
  type Appointment,
  type AppointmentBuilderData,
  type AppointmentBuilderItem,
} from "@/lib/db";
import styles from "./AppointmentBuilder.module.css";

type ListKey = "questions" | "bringList" | "documentsReceived" | "followUps";

const LIST_COPY: Record<ListKey, { title: string; hint: string; addLabel: string; empty: string }> = {
  questions: {
    title: "Questions to ask",
    hint: "Add anything you do not want to forget in the room.",
    addLabel: "Add question",
    empty: "No questions saved yet.",
  },
  bringList: {
    title: "Things to bring",
    hint: "A quiet checklist for documents, medication or anything else that helps.",
    addLabel: "Add item",
    empty: "Nothing on the checklist yet.",
  },
  documentsReceived: {
    title: "Documents received",
    hint: "A simple record of anything you were given. Files are not stored in Blossom.",
    addLabel: "Add document",
    empty: "Nothing noted yet.",
  },
  followUps: {
    title: "Follow-ups",
    hint: "Small next steps, at your own pace.",
    addLabel: "Add follow-up",
    empty: "No follow-ups yet.",
  },
};

function copyBuilderData(data: AppointmentBuilderData | undefined): AppointmentBuilderData {
  const empty = emptyAppointmentBuilderData();
  return {
    ...empty,
    ...data,
    questions: data?.questions ?? [],
    bringList: data?.bringList ?? [],
    documentsReceived: data?.documentsReceived ?? [],
    followUps: data?.followUps ?? [],
  };
}

function itemId(): string {
  return typeof crypto?.randomUUID === "function"
    ? crypto.randomUUID()
    : `appointment-item-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function formatAppointment(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function BuilderList({
  listKey,
  items,
  onChange,
}: {
  listKey: ListKey;
  items: AppointmentBuilderItem[];
  onChange: (items: AppointmentBuilderItem[]) => void;
}) {
  const [draft, setDraft] = useState("");
  const copy = LIST_COPY[listKey];

  function addItem() {
    const text = draft.trim();
    if (!text) return;
    onChange([...items, { id: itemId(), text, done: false }]);
    setDraft("");
  }

  return (
    <section className={styles.card} aria-labelledby={`${listKey}-title`}>
      <div className={styles.cardHeading}>
        <h2 id={`${listKey}-title`}>{copy.title}</h2>
        <p>{copy.hint}</p>
      </div>
      {items.length === 0 ? (
        <p className={styles.empty}>{copy.empty}</p>
      ) : (
        <ul className={styles.checklist}>
          {items.map((item) => (
            <li key={item.id}>
              <label>
                <input
                  type="checkbox"
                  checked={item.done}
                  onChange={() => onChange(items.map((entry) => entry.id === item.id ? { ...entry, done: !entry.done } : entry))}
                />
                <span>{item.text}</span>
              </label>
              <button type="button" className={styles.removeButton} onClick={() => onChange(items.filter((entry) => entry.id !== item.id))}>
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className={styles.addLine}>
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              addItem();
            }
          }}
          placeholder={copy.addLabel}
          aria-label={copy.addLabel}
        />
        <button type="button" onClick={addItem} disabled={!draft.trim()}>{copy.addLabel}</button>
      </div>
    </section>
  );
}

export default function AppointmentBuilder({ appointment }: { appointment: Appointment }) {
  const [builder, setBuilder] = useState(() => copyBuilderData(appointment.builderData));
  const [preparationNote, setPreparationNote] = useState(appointment.preparationNote ?? "");
  const [outcomeNote, setOutcomeNote] = useState(appointment.outcomeNote ?? "");
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");

  function setList(key: ListKey, items: AppointmentBuilderItem[]) {
    setBuilder((current) => ({ ...current, [key]: items }));
    setSaveMessage("");
  }

  function setText(key: Exclude<keyof AppointmentBuilderData, ListKey>, value: string) {
    setBuilder((current) => ({ ...current, [key]: value.trim() || null }));
    setSaveMessage("");
  }

  async function save() {
    setSaving(true);
    await updateAppointment(appointment.id, {
      preparationNote: preparationNote.trim() || null,
      outcomeNote: outcomeNote.trim() || null,
      builderData: builder,
    });
    setSaveMessage("Saved privately to this appointment.");
    setSaving(false);
  }

  const completed = Boolean(builder.completedAt);

  return (
    <div className={styles.screen}>
      <header className={styles.hero}>
        <Link href="/calendar" className={styles.backLink}>← Calendar</Link>
        <span className={styles.eyebrow}>Appointment space</span>
        <h1>{appointment.title}</h1>
        <p>{formatAppointment(appointment.appointmentAt)}{appointment.location ? ` · ${appointment.location}` : ""}</p>
      </header>

      <aside className={styles.privacyNote}>
        <strong>Just for you</strong>
        <span>Nothing here is shared automatically. Blossom helps you organise, not decide what care you need.</span>
      </aside>

      <section className={styles.section} aria-labelledby="before-title">
        <div className={styles.sectionHeading}>
          <span>Before</span>
          <h2 id="before-title">Prepare in your own words</h2>
        </div>

        <section className={styles.card}>
          <div className={styles.cardHeading}>
            <h2>Things I want to mention</h2>
            <p>Use this however it helps: changes, worries, a small reminder, or nothing at all.</p>
          </div>
          <textarea value={preparationNote} onChange={(event) => { setPreparationNote(event.target.value); setSaveMessage(""); }} placeholder="Anything useful to have with you" />
        </section>

        <BuilderList listKey="questions" items={builder.questions} onChange={(items) => setList("questions", items)} />
        <BuilderList listKey="bringList" items={builder.bringList} onChange={(items) => setList("bringList", items)} />

        <section className={styles.card}>
          <div className={styles.cardHeading}>
            <h2>Access and communication</h2>
            <p>Only include what you want to have ready. You never need to explain more than feels safe.</p>
          </div>
          <label className={styles.fieldLabel}>
            Accessibility needs
            <textarea value={builder.accessibilityNeeds ?? ""} onChange={(event) => setText("accessibilityNeeds", event.target.value)} placeholder="Anything that would make the appointment easier" />
          </label>
          <label className={styles.fieldLabel}>
            Communication preferences
            <textarea value={builder.communicationPreferences ?? ""} onChange={(event) => setText("communicationPreferences", event.target.value)} placeholder="For example, time to process, written information, or a name to use" />
          </label>
          <label className={styles.fieldLabel}>
            Travel or location notes
            <textarea value={builder.travelNote ?? ""} onChange={(event) => setText("travelNote", event.target.value)} placeholder="Directions, transport, or anything useful" />
          </label>
        </section>
      </section>

      <section className={styles.section} aria-labelledby="after-title">
        <div className={styles.sectionHeading}>
          <span>After</span>
          <h2 id="after-title">Keep only what is useful</h2>
        </div>
        <section className={styles.card}>
          <div className={styles.cardHeading}>
            <h2>What was discussed</h2>
            <p>There is no right amount to write down.</p>
          </div>
          <textarea value={outcomeNote} onChange={(event) => { setOutcomeNote(event.target.value); setSaveMessage(""); }} placeholder="Outcomes, answers, or anything you want to remember" />
        </section>
        <BuilderList listKey="followUps" items={builder.followUps} onChange={(items) => setList("followUps", items)} />
        <BuilderList listKey="documentsReceived" items={builder.documentsReceived} onChange={(items) => setList("documentsReceived", items)} />
        <section className={styles.card}>
          <div className={styles.cardHeading}>
            <h2>Medication changes I want to note</h2>
            <p>This is your record only. Blossom will never change a schedule from this note.</p>
          </div>
          <textarea value={builder.medicationChangesNote ?? ""} onChange={(event) => setText("medicationChangesNote", event.target.value)} placeholder="Write this in your own words, if it is useful" />
        </section>
        <section className={styles.card}>
          <div className={styles.cardHeading}>
            <h2>Private notes</h2>
            <p>A place for thoughts that do not fit anywhere else.</p>
          </div>
          <textarea value={builder.privateNotes ?? ""} onChange={(event) => setText("privateNotes", event.target.value)} placeholder="Only for you" />
        </section>
      </section>

      <section className={styles.finishCard}>
        <div>
          <strong>{completed ? "Appointment marked complete" : "When you are ready"}</strong>
          <p>Marking this complete is optional. It only changes how this appointment feels in Blossom.</p>
        </div>
        <button type="button" className={styles.secondaryButton} onClick={() => { setBuilder((current) => ({ ...current, completedAt: current.completedAt ? null : new Date().toISOString() })); setSaveMessage(""); }}>
          {completed ? "Mark as ongoing" : "Mark complete"}
        </button>
        <Link href={`/calendar?add=1&from=${appointment.id}`} className={styles.secondaryButton}>Plan a follow-up</Link>
      </section>

      <div className={styles.saveBar}>
        <span aria-live="polite">{saveMessage}</span>
        <button type="button" className={styles.saveButton} disabled={saving} onClick={() => void save()}>{saving ? "Saving…" : "Save appointment notes"}</button>
      </div>
    </div>
  );
}

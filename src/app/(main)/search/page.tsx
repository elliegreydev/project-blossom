"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import ScreenHeader from "@/components/ScreenHeader";
import { db, LOCAL_PROFILE_ID, type ModuleKey } from "@/lib/db";
import styles from "./search.module.css";
import feature from "@/components/feature.module.css";

// Same session key as SensitiveModuleGate - search must never surface a
// match from a locked module, since even a snippet would leak that
// something matching the query exists in there.
const SESSION_KEY = "blossom_sensitive_unlocked";

interface SearchResult {
  id: string;
  group: string;
  title: string;
  snippet: string | null;
  href: string;
}

function dateLabel(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function truncate(text: string, max = 90): string {
  const trimmed = text.trim();
  return trimmed.length > max ? `${trimmed.slice(0, max).trimEnd()}…` : trimmed;
}

function matches(query: string, ...fields: (string | null | undefined)[]): boolean {
  const q = query.toLowerCase();
  return fields.some((f) => f && f.toLowerCase().includes(q));
}

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [sensitiveUnlocked, setSensitiveUnlocked] = useState<boolean | null>(null);

  useEffect(() => {
    setSensitiveUnlocked(sessionStorage.getItem(SESSION_KEY) === "1");
  }, []);

  const profile = useLiveQuery(() => db.profiles.get(LOCAL_PROFILE_ID));
  const milestones = useLiveQuery(() => db.milestones.toArray(), []);
  const journeyEvents = useLiveQuery(() => db.journeyEvents.toArray(), []);
  const medications = useLiveQuery(() => db.medications.toArray(), []);
  const appointments = useLiveQuery(() => db.appointments.toArray(), []);
  const journalEntries = useLiveQuery(() => db.journalEntries.toArray(), []);
  const euphoriaEntries = useLiveQuery(() => db.euphoriaEntries.toArray(), []);
  const checkIns = useLiveQuery(() => db.checkIns.toArray(), []);
  const goals = useLiveQuery(() => db.goals.toArray(), []);
  const bloodTestEntries = useLiveQuery(() => db.bloodTestEntries.toArray(), []);
  const voiceGoals = useLiveQuery(() => db.voiceGoals.toArray(), []);
  const voiceSessions = useLiveQuery(() => db.voiceSessions.toArray(), []);
  const presentationEntries = useLiveQuery(() => db.presentationEntries.toArray(), []);
  const bodyEntries = useLiveQuery(() => db.bodyEntries.toArray(), []);
  const budgetEntries = useLiveQuery(() => db.budgetEntries.toArray(), []);
  const budgetGoals = useLiveQuery(() => db.budgetGoals.toArray(), []);
  const privateLinks = useLiveQuery(() => db.privateLinks.toArray(), []);

  if (
    !profile ||
    sensitiveUnlocked === null ||
    milestones === undefined ||
    journeyEvents === undefined ||
    medications === undefined ||
    appointments === undefined ||
    journalEntries === undefined ||
    euphoriaEntries === undefined ||
    checkIns === undefined ||
    goals === undefined ||
    bloodTestEntries === undefined ||
    voiceGoals === undefined ||
    voiceSessions === undefined ||
    presentationEntries === undefined ||
    bodyEntries === undefined ||
    budgetEntries === undefined ||
    budgetGoals === undefined ||
    privateLinks === undefined
  )
    return null;

  const enabled = (key: ModuleKey) => profile.enabledModules.includes(key);
  const requiresUnlock = profile.appLockEnabled && profile.sensitiveModulesLocked && Boolean(profile.appLockPinHash);
  const sensitiveLocked = requiresUnlock && !sensitiveUnlocked;

  const q = query.trim();
  const results: SearchResult[] = [];

  if (q.length >= 2) {
    if (enabled("journey")) {
      for (const m of milestones) {
        if (matches(q, m.title, m.note)) {
          results.push({ id: `milestone-${m.id}`, group: "Journey", title: m.title, snippet: m.note && truncate(m.note), href: "/journey" });
        }
      }
      for (const e of journeyEvents) {
        if (matches(q, e.title, e.note)) {
          results.push({ id: `journeyEvent-${e.id}`, group: "Journey", title: e.title, snippet: e.note && truncate(e.note), href: "/journey" });
        }
      }
    }

    if (enabled("medication") && !sensitiveLocked) {
      for (const med of medications) {
        if (matches(q, med.name, med.route)) {
          results.push({ id: `medication-${med.id}`, group: "Medication", title: med.name, snippet: med.route, href: "/track/medication" });
        }
      }
    }

    if (enabled("appointments")) {
      for (const a of appointments) {
        if (matches(q, a.title, a.location, a.preparationNote, a.outcomeNote)) {
          results.push({
            id: `appointment-${a.id}`,
            group: "Appointments",
            title: a.title,
            snippet: [a.location, dateLabel(a.appointmentAt)].filter(Boolean).join(" · "),
            href: "/calendar",
          });
        }
      }
    }

    if (enabled("journal") && !sensitiveLocked) {
      for (const j of journalEntries) {
        if (matches(q, j.bodyText)) {
          results.push({ id: `journal-${j.id}`, group: "Journal & check-ins", title: "Journal entry", snippet: truncate(j.bodyText), href: "/track/journal" });
        }
      }
      for (const e of euphoriaEntries) {
        if (matches(q, e.title, e.bodyText)) {
          results.push({
            id: `euphoria-${e.id}`,
            group: "Journal & check-ins",
            title: e.title || "Euphoria moment",
            snippet: e.bodyText && truncate(e.bodyText),
            href: "/track/journal",
          });
        }
      }
      for (const c of checkIns) {
        if (matches(q, c.note)) {
          results.push({
            id: `checkin-${c.id}`,
            group: "Journal & check-ins",
            title: `Check-in · ${dateLabel(c.createdAt)}`,
            snippet: c.note && truncate(c.note),
            href: "/track/journal",
          });
        }
      }
    }

    if (enabled("goals")) {
      for (const g of goals) {
        if (matches(q, g.title, g.target)) {
          results.push({ id: `goal-${g.id}`, group: "Goals", title: g.title, snippet: g.target, href: "/track/goals" });
        }
      }
    }

    if (enabled("bloodTests")) {
      for (const b of bloodTestEntries) {
        if (matches(q, b.testName, b.labSource, b.referenceRangeRaw, b.note)) {
          results.push({
            id: `bloodTest-${b.id}`,
            group: "Blood tests",
            title: b.testName,
            snippet: [b.value, b.unit].filter(Boolean).join(" ") || null,
            href: "/track/blood-tests",
          });
        }
      }
    }

    if (enabled("voicePractice")) {
      for (const v of voiceGoals) {
        if (matches(q, v.title, v.category)) {
          results.push({ id: `voiceGoal-${v.id}`, group: "Voice practice", title: v.title, snippet: v.category, href: "/track/voice" });
        }
      }
      for (const s of voiceSessions) {
        if (matches(q, s.note)) {
          results.push({
            id: `voiceSession-${s.id}`,
            group: "Voice practice",
            title: `Practice session · ${dateLabel(s.createdAt)}`,
            snippet: s.note && truncate(s.note),
            href: "/track/voice",
          });
        }
      }
    }

    if (enabled("presentation")) {
      for (const p of presentationEntries) {
        if (matches(q, p.note, p.category)) {
          results.push({
            id: `presentation-${p.id}`,
            group: "Presentation",
            title: `${p.category.charAt(0).toUpperCase()}${p.category.slice(1)} · ${dateLabel(p.date)}`,
            snippet: p.note && truncate(p.note),
            href: "/track/presentation",
          });
        }
      }
    }

    if (enabled("bodyProgress") && !sensitiveLocked) {
      for (const b of bodyEntries) {
        const measurementsText = b.measurements.map((m) => `${m.label} ${m.value}`).join(" ");
        if (matches(q, b.note, measurementsText)) {
          results.push({
            id: `body-${b.id}`,
            group: "Body & progress",
            title: `Body note · ${dateLabel(b.date)}`,
            snippet: b.note && truncate(b.note),
            href: "/track/body",
          });
        }
      }
    }

    if (enabled("budget")) {
      for (const e of budgetEntries) {
        if (matches(q, e.description, e.category)) {
          results.push({
            id: `budgetEntry-${e.id}`,
            group: "Budget",
            title: e.description || `${e.category.toUpperCase()} expense`,
            snippet: dateLabel(e.date),
            href: "/track/budget",
          });
        }
      }
      for (const g of budgetGoals) {
        if (matches(q, g.label)) {
          results.push({ id: `budgetGoal-${g.id}`, group: "Budget", title: g.label, snippet: "Savings goal", href: "/track/budget" });
        }
      }
    }

    for (const link of privateLinks) {
      if (matches(q, link.label, link.note, link.url)) {
        results.push({ id: `privateLink-${link.id}`, group: "Saved links", title: link.label, snippet: link.url, href: "/settings/support" });
      }
    }
  }

  return (
    <div className={styles.screen}>
      <ScreenHeader title="Search" backHref="/" />
      <input
        className={styles.searchBox}
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search everything you've added…"
        autoFocus
      />

      {q.length > 0 && q.length < 2 && <p className={styles.hint}>Keep typing…</p>}

      {q.length >= 2 && results.length === 0 && (
        <div className={feature.empty}>
          <div className={feature.emptyTitle}>No matches</div>
          <div className={feature.emptySubtitle}>
            Nothing found for &quot;{q}&quot;. Locked modules aren&apos;t searched until you unlock them.
          </div>
        </div>
      )}

      {q.length === 0 && (
        <p className={styles.hint}>
          Search across your journey, medications, appointments, journal, goals, blood tests, voice
          practice, presentation, body notes, budget, and saved links - all found locally on your device.
        </p>
      )}

      {results.length > 0 && (
        <div className={styles.list}>
          {results.map((r) => (
            <Link key={r.id} href={r.href} className={feature.item}>
              <span className={styles.groupLabel}>{r.group}</span>
              <div className={feature.itemTitle}>{r.title}</div>
              {r.snippet && <div className={feature.itemMeta}>{r.snippet}</div>}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

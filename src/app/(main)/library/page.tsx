"use client";

import { useState } from "react";
import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import { db, LOCAL_PROFILE_ID } from "@/lib/db";
import { CATEGORY_LABELS } from "@/lib/regionResources";
import {
  INFO_GROUPS,
  matchesQuery,
  searchInfo,
  visibleEntries,
  type InfoEntry,
} from "@/lib/infoIndex";
import { sectionLabel } from "@/lib/selfDirected";
import feature from "@/components/feature.module.css";
import styles from "./info.module.css";

/**
 * Everything Blossom knows, in one place you can search.
 *
 * The reference material had ended up in six unrelated corners of the app and
 * none of them was somewhere you would think to look. This is the door.
 *
 * The search covers the written pages, the regional support resources, and the
 * legal notes together, because somebody typing "helpline" does not know or
 * care which of those three things holds the answer.
 */
const LIB_TOPICS: { label: string; term: string; tint: string; icon: React.ReactNode }[] = [
  { label: "HRT", term: "HRT", tint: "var(--pink)", icon: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round"><rect x="8" y="3" width="8" height="18" rx="3"/><path d="M8 9h8"/><path d="M12 13v3"/></svg>) },
  { label: "Legal", term: "legal", tint: "var(--pink)", icon: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v18"/><path d="M5 7h14"/><path d="M7 7l-2.5 6a3 3 0 0 0 5 0z"/><path d="M17 7l-2.5 6a3 3 0 0 0 5 0z"/></svg>) },
  { label: "Coming out", term: "coming out", tint: "var(--secondary)", icon: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round"><path d="M5 21V5a1 1 0 0 1 1-1h9l-1.5 3L15 10H6"/></svg>) },
  { label: "Clothing", term: "clothing", tint: "var(--pink)", icon: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round"><path d="M8 3l4 3 4-3 4 4-3 3v11H7V10L4 7z"/></svg>) },
  { label: "Voice", term: "voice", tint: "var(--pink)", icon: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round"><path d="M5 10v4M9 6v12M12 3v18M15 8v8M19 11v2"/></svg>) },
  { label: "Mental wellbeing", term: "mental health", tint: "var(--secondary)", icon: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round"><path d="M15 4a5 5 0 0 1 4 8 6 6 0 0 1-6 6H8a3 3 0 0 1 0-6"/><path d="M11.5 11.5a2 2 0 1 1 3-2.6 2 2 0 1 1 3 2.6L14 15z"/></svg>) },
];

export default function InfoPage() {
  const profile = useLiveQuery(() => db.profiles.get(LOCAL_PROFILE_ID), []);
  const resources = useLiveQuery(() => db.cachedRegionResources.toArray(), []);
  const legalNotes = useLiveQuery(() => db.cachedLegalContextNotes.toArray(), []);
  const selfDirected = useLiveQuery(async () => (await db.selfDirected.get("local")) ?? null, []);
  const [query, setQuery] = useState("");

  if (!profile) return null;

  const modules = profile.enabledModules ?? [];
  const trimmed = query.trim();
  const searching = trimmed.length > 0;

  // Renamed sections keep their chosen name here too. Somebody who called it
  // "Admin" should not find "Self-directed care" written in the Info tab.
  const label = (entry: InfoEntry) =>
    entry.module === "selfDirected" ? `${sectionLabel(selfDirected?.label)}: ${entry.title}` : entry.title;

  const pageHits = searching ? searchInfo(trimmed, modules) : [];
  const resourceHits = searching
    ? (resources ?? []).filter((r) =>
        matchesQuery(trimmed, r.orgName, r.contactInfo, r.note, r.cityName, r.subregion, r.country, CATEGORY_LABELS[r.category])
      ).slice(0, 25)
    : [];
  const legalHits = searching
    ? (legalNotes ?? []).filter((n) => matchesQuery(trimmed, n.note, n.subregion, n.country)).slice(0, 10)
    : [];
  const nothing = searching && pageHits.length === 0 && resourceHits.length === 0 && legalHits.length === 0;

  return (
    <div className={feature.screen}>
      <header>
        <h1 className={feature.pageTitle}>Library</h1>
        <p className={feature.pageSubtitle}>
          Guides, support services and the practical stuff, all searchable.
        </p>
      </header>

      <input
        className={styles.search}
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search for anything"
        aria-label="Search information"
      />

      {searching ? (
        <>
          {nothing && (
            <div className={feature.empty}>
              <div className={feature.emptyTitle}>Nothing found</div>
              <div className={feature.emptySubtitle}>
                Try a shorter search. If it&apos;s something you think should be
                here, tell us and we&apos;ll look at adding it.
              </div>
            </div>
          )}

          {pageHits.length > 0 && (
            <div className={feature.section}>
              <div className={feature.sectionTitle}>Guides</div>
              <div className={styles.list}>
                {pageHits.map((entry) => (
                  <Link key={entry.key} href={entry.href} className={styles.row}>
                    <span className={styles.rowTitle}>{label(entry)}</span>
                    <span className={styles.rowMeta}>{entry.summary}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {resourceHits.length > 0 && (
            <div className={feature.section}>
              <div className={feature.sectionTitle}>Services</div>
              <div className={styles.list}>
                {resourceHits.map((resource) => (
                  <div key={resource.id} className={styles.row}>
                    <span className={styles.rowTitle}>{resource.orgName}</span>
                    <span className={styles.rowMeta}>
                      {[CATEGORY_LABELS[resource.category], resource.cityName, resource.subregion, resource.country]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                    <span className={styles.rowMeta}>{resource.contactInfo}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {legalHits.length > 0 && (
            <div className={feature.section}>
              <div className={feature.sectionTitle}>Legal context</div>
              <div className={styles.list}>
                {legalHits.map((note) => (
                  <div key={note.id} className={styles.row}>
                    <span className={styles.rowTitle}>
                      {note.subregion}, {note.country}
                    </span>
                    <span className={styles.rowMeta}>{note.note}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      ) : (
        <>
          <div className={styles.topicHead}>Browse by topic</div>
          <div className={styles.topicGrid}>
            {LIB_TOPICS.map((topic) => (
              <button key={topic.label} type="button" className={styles.topicCard} onClick={() => setQuery(topic.term)}>
                <span className={styles.topicIcon} style={{ color: topic.tint }}>{topic.icon}</span>
                <span className={styles.topicLabel}>{topic.label}</span>
              </button>
            ))}
          </div>
          <Link href="/settings/support-map" className={styles.supportBanner}>
            <span className={styles.supportPin} aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round"><path d="M12 21s7-5.5 7-11a7 7 0 1 0-14 0c0 5.5 7 11 7 11z"/><circle cx="12" cy="10" r="2.5"/></svg></span>
            <span className={styles.supportText}><strong>Support near you</strong><span>Find services and groups in your area.</span></span>
            <span className={styles.supportFind} aria-hidden="true">Find</span>
          </Link>
          {INFO_GROUPS.map((group) => {
          const entries = visibleEntries(modules).filter((entry) => entry.group === group.key);
          if (entries.length === 0) return null;
          return (
            <div key={group.key} className={feature.section}>
              <div className={feature.sectionTitle}>{group.label}</div>
              <p className={feature.sectionNote}>{group.blurb}</p>
              <div className={styles.list}>
                {entries.map((entry) => (
                  <Link key={entry.key} href={entry.href} className={styles.row}>
                    <span className={styles.rowTitle}>{label(entry)}</span>
                    <span className={styles.rowMeta}>{entry.summary}</span>
                  </Link>
                ))}
              </div>
            </div>
          );
        })}
        </>
      )}
    </div>
  );
}

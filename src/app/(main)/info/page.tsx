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
        <h1 className={feature.pageTitle}>Info</h1>
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
        INFO_GROUPS.map((group) => {
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
        })
      )}
    </div>
  );
}

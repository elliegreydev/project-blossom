// Curated support resources for transgender, nonbinary, and questioning people,
// organized country -> state/province/nation (subregion) -> city. Per the Project
// Blossom spec these are informational only, never replace professional advice,
// always show what they apply to and a last-reviewed date, and link to the
// original source. NOT an external directory API by design - avoids drift,
// tracking, or unreviewed info creeping in.
//
// IMPORTANT: this list has NOT been fully reviewed by Ellie. It is real,
// sourced research (each entry links where it came from) but treat the
// last-reviewed dates as placeholders until she confirms them, especially
// the legal-context notes for US states, which change fast. A handful of
// states came back with no named community org in this research pass and
// are deliberately left with only national-level fallback resources rather
// than shipping something invented.
//
// As of the staff resource-management build, Supabase's region_resources /
// legal_context_notes tables are the real source of truth - staff edit
// those via /admin/resources. The arrays in this file are only the
// bundled fallback for a device that's never had network access.

import { db } from "./db";

export type ResourceCategory =
  | "emergency"
  | "crisis"
  | "peer"
  | "legal"
  | "housing"
  | "general";

export interface RegionResource {
  id: string;
  country: string;
  subregion: string | null;
  cityName: string | null;
  orgName: string;
  category: ResourceCategory;
  contactInfo: string;
  availability: string | null;
  lastReviewedAt: string;
  sourceUrl: string;
  note: string | null;
}

export interface LegalContextNote {
  country: string;
  subregion: string;
  note: string;
  sourceUrl: string;
  lastReviewedAt: string;
}

export const COUNTRIES = [
  "Ireland",
  "New Zealand",
  "United Kingdom",
  "Canada",
  "Australia",
  "United States",
] as const;

export type Country = (typeof COUNTRIES)[number];

export const SUBREGIONS: Partial<Record<Country, string[]>> = {
  "United Kingdom": ["England", "Scotland", "Wales", "Northern Ireland"],
  "Canada": ["Alberta", "British Columbia", "Manitoba", "New Brunswick", "Newfoundland and Labrador", "Nova Scotia", "Ontario", "Prince Edward Island", "Quebec", "Saskatchewan", "Northwest Territories", "Nunavut", "Yukon"],
  "Australia": ["New South Wales", "Victoria", "Queensland", "Western Australia", "South Australia", "Tasmania", "Australian Capital Territory", "Northern Territory"],
  "United States": ["Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado", "Connecticut", "Delaware", "Florida", "Georgia", "Hawaii", "Idaho", "Illinois", "Indiana", "Iowa", "Kansas", "Kentucky", "Louisiana", "Maine", "Maryland", "Massachusetts", "Michigan", "Minnesota", "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada", "New Hampshire", "New Jersey", "New Mexico", "New York", "North Carolina", "North Dakota", "Ohio", "Oklahoma", "Oregon", "Pennsylvania", "Rhode Island", "South Carolina", "South Dakota", "Tennessee", "Texas", "Utah", "Vermont", "Virginia", "Washington", "West Virginia", "Wisconsin", "Wyoming"],
};

const CATEGORY_ORDER: ResourceCategory[] = [
  "crisis",
  "emergency",
  "peer",
  "legal",
  "housing",
  "general",
];

// Bundled offline/never-synced fallback - staff now edit the live copy in
// Supabase via /admin/resources. This array only matters for a device that
// has never had network access to fetch the live data (see
// syncRegionResourcesCache below), so it doesn't need to stay perfectly in
// sync with the DB - just reasonably current.
export function resourcesForRegion(
  resources: RegionResource[],
  country: string | null,
  subregion: string | null
): RegionResource[] {
  if (!country) return [];
  return resources
    .filter((r) => r.country === country && (r.subregion === null || r.subregion === subregion))
    .sort((a, b) => CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category));
}

export function legalContextFor(
  notes: LegalContextNote[],
  country: string | null,
  subregion: string | null
): LegalContextNote | null {
  if (!country || !subregion) return null;
  return notes.find((n) => n.country === country && n.subregion === subregion) ?? null;
}

export const CATEGORY_LABELS: Record<ResourceCategory, string> = {
  emergency: "Emergency",
  crisis: "Crisis support",
  peer: "Peer & community",
  legal: "Legal",
  housing: "Housing",
  general: "General information",
};

function legalNoteId(country: string, subregion: string): string {
  return `${country}|${subregion}`;
}

type RegionResourceRow = {
  id: string;
  country: string;
  subregion: string | null;
  city_name: string | null;
  org_name: string;
  category: ResourceCategory;
  contact_info: string;
  availability: string | null;
  source_url: string;
  note: string | null;
  last_reviewed_at: string;
};

type LegalContextNoteRow = {
  country: string;
  subregion: string;
  note: string;
  source_url: string;
  last_reviewed_at: string;
};

function fromResourceRow(row: RegionResourceRow): CachedRegionResourceInput {
  return {
    id: row.id,
    country: row.country,
    subregion: row.subregion,
    cityName: row.city_name,
    orgName: row.org_name,
    category: row.category,
    contactInfo: row.contact_info,
    availability: row.availability,
    sourceUrl: row.source_url,
    note: row.note,
    lastReviewedAt: row.last_reviewed_at,
  };
}

function fromLegalNoteRow(row: LegalContextNoteRow): CachedLegalContextNoteInput {
  return {
    id: legalNoteId(row.country, row.subregion),
    country: row.country,
    subregion: row.subregion,
    note: row.note,
    sourceUrl: row.source_url,
    lastReviewedAt: row.last_reviewed_at,
  };
}

type CachedRegionResourceInput = RegionResource;
type CachedLegalContextNoteInput = LegalContextNote & { id: string };

// Called on every app load (see (main)/layout.tsx). Seeds the local cache
// from the bundled fallback the first time a device ever opens Blossom (so
// there's always something to show immediately, even offline), then tries a
// live fetch from Supabase to replace it with whatever staff have published
// - resources are public data, so this works with no account and no sign-in.
export async function syncRegionResourcesCache(): Promise<void> {
  const cachedCount = await db.cachedRegionResources.count();
  if (cachedCount === 0) {
    // Fetched here rather than imported at the top of the file. This is 100KB
    // of listings, it is only needed on a device that has never opened Blossom
    // before, and a static import put every byte of it in front of the app's
    // first paint for everybody else.
    const { FALLBACK_REGION_RESOURCES, FALLBACK_LEGAL_CONTEXT_NOTES } = await import(
      "./regionResourcesData"
    );
    await db.cachedRegionResources.bulkPut(FALLBACK_REGION_RESOURCES);
    await db.cachedLegalContextNotes.bulkPut(
      FALLBACK_LEGAL_CONTEXT_NOTES.map((n) => ({ ...n, id: legalNoteId(n.country, n.subregion) }))
    );
  }

  try {
    // Imported here rather than at the top of the file. The app layout
    // calls this on every open, so a static import dragged the whole
    // Supabase client into the boot chunk of every page for the sake of a
    // refresh that is not urgent and is not even reached until after the
    // bundled copy below has already filled the cache.
    const { createClient } = await import("./supabase/client");
    const supabase = createClient();
    const [resourcesRes, notesRes] = await Promise.all([
      supabase.from("region_resources").select("*"),
      supabase.from("legal_context_notes").select("*"),
    ]);
    if (resourcesRes.error || notesRes.error || !resourcesRes.data || !notesRes.data) return;

    const resources = resourcesRes.data.map((row) => fromResourceRow(row as RegionResourceRow));
    const notes = notesRes.data.map((row) => fromLegalNoteRow(row as LegalContextNoteRow));

    // An empty table is never a legitimate state for this data, so refuse to
    // treat it as one. The line below clears the cache before refilling it,
    // and an empty response would therefore leave somebody with no crisis
    // numbers at all - including offline, where this cache is the only copy
    // they have.
    //
    // Every realistic cause of an empty read is a fault at our end: a project
    // that was never seeded, row-level security refusing the select, a key
    // pointing at the wrong project. None of those are reasons to take a
    // person's helpline list away. Found on the Blossom dev project, whose
    // table was empty, which meant its crisis page showed nothing whatsoever.
    if (resources.length === 0) return;

    await db.transaction("rw", db.cachedRegionResources, db.cachedLegalContextNotes, async () => {
      await db.cachedRegionResources.clear();
      await db.cachedRegionResources.bulkPut(resources);
      if (notes.length > 0) {
        await db.cachedLegalContextNotes.clear();
        await db.cachedLegalContextNotes.bulkPut(notes);
      }
    });
  } catch {
    // Offline or the request failed - the cache (fallback or last-fetched)
    // stays as-is, which is the right behavior rather than clearing it.
  }
}

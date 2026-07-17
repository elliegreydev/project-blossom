// One-off: seeds region_resources + legal_context_notes in Supabase from the
// current (already fact-checked) src/lib/regionResources.ts data. Run again
// any time the static file changes and needs to be pushed to the DB - after
// this, the DB is the source of truth and staff edit it via /admin/resources
// instead of editing this file.
import { existsSync, readFileSync } from "fs";
import pg from "pg";
import { REGION_RESOURCES, LEGAL_CONTEXT_NOTES } from "../src/lib/regionResources.ts";

const env = existsSync(".env.local")
  ? Object.fromEntries(
      readFileSync(".env.local", "utf8").split(/\r?\n/)
        .filter((l) => l && !l.startsWith("#") && l.includes("="))
        .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, "")]; })
    )
  : {};
const url = process.env.SUPABASE_DB_URL ?? env.SUPABASE_DB_URL;
if (!url) { console.error("Missing SUPABASE_DB_URL"); process.exit(1); }

const client = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
await client.connect();

let resourceCount = 0;
for (const r of REGION_RESOURCES) {
  await client.query(
    `insert into public.region_resources
      (id, country, subregion, city_name, org_name, category, contact_info, availability, source_url, note, last_reviewed_at, reviewed_by_staff)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,false)
     on conflict (id) do update set
       country = excluded.country, subregion = excluded.subregion, city_name = excluded.city_name,
       org_name = excluded.org_name, category = excluded.category, contact_info = excluded.contact_info,
       availability = excluded.availability, source_url = excluded.source_url, note = excluded.note,
       last_reviewed_at = excluded.last_reviewed_at`,
    [r.id, r.country, r.subregion, r.cityName, r.orgName, r.category, r.contactInfo, r.availability, r.sourceUrl, r.note, r.lastReviewedAt]
  );
  resourceCount++;
}

let legalCount = 0;
for (const n of LEGAL_CONTEXT_NOTES) {
  await client.query(
    `insert into public.legal_context_notes (country, subregion, note, source_url, last_reviewed_at)
     values ($1,$2,$3,$4,$5)
     on conflict (country, subregion) do update set
       note = excluded.note, source_url = excluded.source_url, last_reviewed_at = excluded.last_reviewed_at`,
    [n.country, n.subregion, n.note, n.sourceUrl, n.lastReviewedAt]
  );
  legalCount++;
}

console.log(`Seeded ${resourceCount} resources, ${legalCount} legal-context notes`);
await client.end();

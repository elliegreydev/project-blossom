// Run a .sql migration file (or all of supabase/*.sql) against the database using the direct
// connection string in .env.local (SUPABASE_DB_URL). Migrations are written idempotent
// (create ... if not exists / add column if not exists), so re-running is safe.
//
//   node scripts/migrate.mjs supabase/schema.sql   # one file
//   node scripts/migrate.mjs --all                 # every supabase/*.sql
import { readFileSync, readdirSync } from "fs";
import path from "path";
import pg from "pg";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8").split(/\r?\n/)
    .filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, "")]; })
);
const url = env.SUPABASE_DB_URL;
if (!url) { console.error("Missing SUPABASE_DB_URL in .env.local"); process.exit(1); }

const arg = process.argv[2];
if (!arg) { console.error("Usage: node scripts/migrate.mjs <file.sql | --all>"); process.exit(1); }
const files = arg === "--all"
  ? readdirSync("supabase").filter((f) => f.endsWith(".sql")).map((f) => path.join("supabase", f))
  : [arg];

const client = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
await client.connect();
for (const f of files) {
  const sql = readFileSync(f, "utf8");
  try { await client.query(sql); console.log("✅", f); }
  catch (e) { console.error("❌", f, "-", e.message); }
}
await client.end();

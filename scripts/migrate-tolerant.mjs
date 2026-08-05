// Statement-level migration runner, for rebuilding a database from scratch.
//
// scripts/migrate.mjs sends each .sql file as ONE query, which is right for
// normal use: a file either applies or it doesn't. But some of Blossom's older
// migrations are no longer replayable - admin_operations.sql, for instance,
// alters public.support_cases, a table that was dropped when the ticket system
// replaced it. That file still holds the only CREATE TABLE for app_notices, so
// on a fresh database the stale ALTER kills the file and app_notices never gets
// created.
//
// This runner splits a file into statements and keeps going when one fails, so
// the still-valid parts land. It reports every skip rather than hiding them.
//
//   node scripts/migrate-tolerant.mjs .env.dev.local supabase/admin_operations.sql [...]
import { readFileSync } from "fs";
import pg from "pg";

const [envFile, ...files] = process.argv.slice(2);
if (!envFile || files.length === 0) {
  console.error("usage: node scripts/migrate-tolerant.mjs <env-file> <file.sql> [...]");
  process.exit(1);
}

const url = readFileSync(envFile, "utf8").match(/^SUPABASE_DB_URL=(.*)$/m)?.[1]?.trim();
if (!url) { console.error(`no SUPABASE_DB_URL in ${envFile}`); process.exit(1); }

// Split on semicolons at depth zero, respecting $$-quoted function bodies and
// ordinary string literals - a naive split mangles every plpgsql function.
function splitStatements(sql) {
  const out = [];
  let buf = "";
  let i = 0;
  let dollarTag = null;
  let inSingle = false;
  let inLineComment = false;

  while (i < sql.length) {
    const ch = sql[i];
    const rest = sql.slice(i);

    if (inLineComment) {
      buf += ch;
      if (ch === "\n") inLineComment = false;
      i++;
      continue;
    }
    if (!dollarTag && !inSingle && rest.startsWith("--")) {
      inLineComment = true; buf += ch; i++; continue;
    }
    if (dollarTag) {
      if (rest.startsWith(dollarTag)) { buf += dollarTag; i += dollarTag.length; dollarTag = null; continue; }
      buf += ch; i++; continue;
    }
    if (inSingle) {
      buf += ch;
      if (ch === "'") inSingle = false;
      i++; continue;
    }
    const dollarMatch = rest.match(/^\$[A-Za-z_]*\$/);
    if (dollarMatch) { dollarTag = dollarMatch[0]; buf += dollarTag; i += dollarTag.length; continue; }
    if (ch === "'") { inSingle = true; buf += ch; i++; continue; }
    if (ch === ";") { if (buf.trim()) out.push(buf.trim()); buf = ""; i++; continue; }
    buf += ch; i++;
  }
  if (buf.trim()) out.push(buf.trim());
  return out;
}

const client = new pg.Client({ connectionString: url });
await client.connect();

let applied = 0;
let skipped = 0;

for (const file of files) {
  const statements = splitStatements(readFileSync(file, "utf8"));
  const failures = [];
  for (const statement of statements) {
    try {
      await client.query(statement);
      applied++;
    } catch (error) {
      skipped++;
      failures.push(`${error.message} :: ${statement.replace(/\s+/g, " ").slice(0, 70)}`);
    }
  }
  const label = failures.length === 0 ? "OK  " : "PART";
  console.log(`${label} ${file}  (${statements.length - failures.length}/${statements.length} statements)`);
  for (const f of failures) console.log(`       skipped: ${f}`);
}

console.log(`\napplied ${applied}, skipped ${skipped}`);
await client.end();

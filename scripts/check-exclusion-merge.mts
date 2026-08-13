/**
 * The "what syncs" merge, checked against the sequence that broke it.
 *
 * Worth keeping because the failure is silent and it is the one field in this
 * app where losing a race means private data starts leaving somebody's device.
 * Nothing throws, nothing logs, the journal just quietly starts syncing again.
 *
 * Run with:  npx tsx scripts/check-exclusion-merge.mts
 */
import { readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const libDir = join(import.meta.dirname, "..", "src", "lib");
const scratch = join(libDir, "sync.undertest.mts");

// sync.ts pulls in the browser Supabase client and Dexie, neither of which
// loads under plain node. Only the merge is wanted, so it is lifted out with
// its two helpers rather than the module being stubbed into submission.
const src = readFileSync(join(libDir, "sync.ts"), "utf8");
const grab = (name: string) => {
  const m = src.match(new RegExp(`\\n(?:export )?function ${name}\\([^]*?\\n\\}`, ""));
  if (!m) throw new Error(`could not find ${name} in sync.ts`);
  return m[0];
};

writeFileSync(
  scratch,
  ["type RemoteRow = Record<string, unknown>;", grab("nullableString"), grab("stringArray"), grab("pickExclusions")].join(
    "\n",
  ),
  "utf8",
);

let pickExclusions: (
  local: { syncExcludedCategories: string[]; syncExcludedCategoriesAt: string | null },
  row: Record<string, unknown>,
) => { syncExcludedCategories: string[]; syncExcludedCategoriesAt: string | null };
try {
  ({ pickExclusions } = await import(`file:///${scratch.replace(/\\/g, "/")}`));
} finally {
  rmSync(scratch, { force: true });
}

const T1 = "2026-08-08T10:00:00.000Z";
const T2 = "2026-08-08T11:00:00.000Z";

let failures = 0;
function check(name: string, got: string[], want: string[]) {
  const ok = JSON.stringify([...got].sort()) === JSON.stringify([...want].sort());
  if (!ok) failures += 1;
  console.log(`  ${ok ? "pass" : "FAIL"}  ${name}`);
  if (!ok) console.log(`        got ${JSON.stringify(got)}, wanted ${JSON.stringify(want)}`);
}

// The bug, end to end. Her phone excludes the journal at T2. Her laptop has
// been offline since T1 and still thinks nothing is excluded. The laptop's
// stale row must not win.
check(
  "stale device cannot revert a newer exclusion",
  pickExclusions(
    { syncExcludedCategories: ["journal"], syncExcludedCategoriesAt: T2 },
    { sync_excluded_categories: [], sync_excluded_categories_at: T1 },
  ).syncExcludedCategories,
  ["journal"],
);

// And the other direction, so the feature still works: a genuinely newer
// decision from another device does apply.
check(
  "a newer decision from elsewhere does apply",
  pickExclusions(
    { syncExcludedCategories: [], syncExcludedCategoriesAt: T1 },
    { sync_excluded_categories: ["journal", "intimacy"], sync_excluded_categories_at: T2 },
  ).syncExcludedCategories,
  ["journal", "intimacy"],
);

// The reason a union was rejected: turning a category back on has to stick.
check(
  "re-enabling a category is not undone by the server's older copy",
  pickExclusions(
    { syncExcludedCategories: [], syncExcludedCategoriesAt: T2 },
    { sync_excluded_categories: ["journal"], sync_excluded_categories_at: T1 },
  ).syncExcludedCategories,
  [],
);

check(
  "a device that has never chosen cannot overwrite one that has",
  pickExclusions(
    { syncExcludedCategories: ["journal"], syncExcludedCategoriesAt: T1 },
    { sync_excluded_categories: [], sync_excluded_categories_at: null },
  ).syncExcludedCategories,
  ["journal"],
);

check(
  "a real remote choice beats a local null",
  pickExclusions(
    { syncExcludedCategories: [], syncExcludedCategoriesAt: null },
    { sync_excluded_categories: ["budget"], sync_excluded_categories_at: T1 },
  ).syncExcludedCategories,
  ["budget"],
);

check(
  "both unset keeps local",
  pickExclusions(
    { syncExcludedCategories: [], syncExcludedCategoriesAt: null },
    { sync_excluded_categories: [], sync_excluded_categories_at: null },
  ).syncExcludedCategories,
  [],
);

check(
  "an equal timestamp keeps local, since nothing has changed",
  pickExclusions(
    { syncExcludedCategories: ["journal"], syncExcludedCategoriesAt: T1 },
    { sync_excluded_categories: [], sync_excluded_categories_at: T1 },
  ).syncExcludedCategories,
  ["journal"],
);

// A malformed row must not be read as "nothing is excluded".
check(
  "junk in the remote timestamp does not clear the local choice",
  pickExclusions(
    { syncExcludedCategories: ["journal"], syncExcludedCategoriesAt: T1 },
    { sync_excluded_categories: null, sync_excluded_categories_at: 12345 },
  ).syncExcludedCategories,
  ["journal"],
);

console.log(failures === 0 ? "\nPASS: the merge holds" : `\nFAIL: ${failures} case(s) wrong`);

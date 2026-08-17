import type { ModuleKey } from "./db";

/**
 * The Info tab's search index.
 *
 * Blossom's reference material had accumulated in six unrelated places:
 * support resources two levels into Settings, the crisis page outside the main
 * app entirely, the HRT checklist filed under Settings as though it were a
 * preference, regional legal notes only reachable through Travel Mode, the
 * blog, and now the self-directed pages. Every one of them is something
 * somebody would go looking for, and none of them had a door.
 *
 * This is the index behind that door. It covers the written pages; the 171
 * regional support resources and the legal notes are searched straight from
 * Dexie alongside it, because those change without a deploy.
 *
 * ONE RULE. An entry carrying `module` is only ever searchable when that
 * module is switched on. Self-directed care is renameable and lockable
 * precisely so it does not announce itself, and a global search that surfaces
 * "bridging prescriptions" to somebody who never enabled it would undo all of
 * that in one keystroke.
 */

export interface InfoEntry {
  key: string;
  title: string;
  /** What it covers, in the words somebody would actually type. Never shown
   *  in full; it exists to be matched against. */
  keywords: string;
  summary: string;
  href: string;
  group: InfoGroup;
  /** Only searchable and only listed when this module is enabled. */
  module?: ModuleKey;
}

export type InfoGroup = "support" | "sharing" | "health" | "legal" | "about";

export const INFO_GROUPS: { key: InfoGroup; label: string; blurb: string }[] = [
  { key: "support", label: "Getting support", blurb: "People you can talk to, and services near you" },
  { key: "sharing", label: "Sharing and safety", blurb: "Letting the right person see the right thing, and being noticed if you go quiet" },
  { key: "health", label: "Health and treatment", blurb: "Starting out, staying safe, looking after it yourself" },
  { key: "legal", label: "Rights and paperwork", blurb: "Where the law is, and what you're entitled to" },
  { key: "about", label: "About Blossom", blurb: "How it works, what it holds, and who builds it" },
];

export const INFO_ENTRIES: InfoEntry[] = [
  {
    key: "support-resources",
    title: "Help and support near you",
    keywords: "helpline support group peer counselling therapy local services charity organisation region country",
    summary: "Checked services for your region, from crisis lines to peer groups.",
    href: "/settings/support",
    group: "support",
  },
  {
    key: "crisis",
    title: "Support right now",
    keywords: "crisis emergency suicide self harm urgent tonight samaritans 999 111 helpline immediate danger",
    summary: "Crisis lines you can reach today. Works without an account and without finishing setup.",
    href: "/crisis-support",
    group: "support",
  },
  {
    key: "getting-started",
    title: "Starting HRT safely",
    keywords: "hrt hormones start beginning baseline bloods injection site rotation first time checklist prescribed self directed",
    summary: "Practical things worth having in place at the beginning, prescribed or self-directed.",
    href: "/settings/getting-started",
    group: "health",
  },
  {
    key: "self-directed-info",
    title: "Practical things",
    keywords:
      "diy self directed bridging prescription gmc gp bloods private test storage vials expiry sharps needles disposal seizure customs border harm reduction",
    summary: "Bridging prescriptions, bloods without a GP, storage, sharps, and where people get their information.",
    href: "/care/self-directed/info",
    group: "health",
    module: "selfDirected",
  },
  {
    key: "trusted-circle",
    title: "Trusted Circle",
    keywords: "share sharing partner friend family show someone trusted person access permission specific details revoke",
    summary: "Show one person you trust exactly the parts of Blossom you choose, and take it back whenever.",
    href: "/settings/circle",
    group: "sharing",
  },
  {
    key: "bridge",
    title: "Blossom Bridge",
    keywords: "share link read only someone without an account doctor clinician send temporary revoke",
    summary: "Send a read-only link to someone who doesn't use Blossom. Works without them signing up for anything.",
    href: "/settings/bridge",
    group: "sharing",
  },
  {
    key: "passport",
    title: "Blossom Passport",
    keywords: "doctor appointment gp clinic summary show hand over medications hrt status identity pronouns print",
    summary: "Turn your own records into something clear to hand to a doctor, with only the parts you pick.",
    href: "/settings/passport",
    group: "sharing",
  },
  {
    key: "safety-checkins",
    title: "Safety check-ins",
    keywords: "safety check in go quiet nobody notices alone risk trusted contact welfare worried",
    summary: "A gentle recurring check-in, so somebody notices if you go quiet. Blossom never contacts anyone on your behalf.",
    href: "/settings/safety-checkins",
    group: "sharing",
  },
  {
    key: "support-map",
    title: "Personal Support Map",
    keywords: "my people contacts places safe spaces who can i call private list favourites",
    summary: "Your own private list of people, places and organisations that make life easier.",
    href: "/settings/support-map",
    group: "sharing",
  },
  {
    key: "travel-legal",
    title: "Where you're travelling",
    keywords: "travel abroad holiday flight border legal context laws country safety trip passport",
    summary: "Legal context for the place you're going, kept on your device.",
    href: "/travel",
    group: "legal",
  },
  {
    key: "privacy",
    title: "What Blossom holds",
    keywords: "privacy data gdpr sync device local storage delete export what do you keep",
    summary: "Exactly what stays on your device, what can sync, and what we can never see.",
    href: "/legal/privacy",
    group: "about",
  },
  {
    key: "terms",
    title: "Terms of service",
    keywords: "terms conditions rules legal agreement",
    summary: "The rules, in plain English.",
    href: "/legal/terms",
    group: "about",
  },
  {
    key: "about",
    title: "About Blossom",
    keywords: "about who builds team grey studios contact support version changelog blog roadmap",
    summary: "Who makes this, how to reach us, and what's changed lately.",
    href: "/settings/about",
    group: "about",
  },
];

/**
 * Words that never carry meaning in this index.
 *
 * Every typed word has to match, which is right for precision and wrong for
 * how people actually type. Testing with real phrasing rather than
 * keyword-shaped queries found it immediately: "share with my partner" and
 * "show my doctor" both returned nothing, because "with" and "my" appear in no
 * keyword list anywhere. Somebody asking a question in their own words should
 * not be punished for it.
 *
 * Stripped from the query only, never from the text being searched, so a page
 * that genuinely says "my" is unaffected.
 */
const STOP_WORDS = new Set([
  "a", "an", "the", "and", "or", "but", "if", "of", "to", "for", "with", "on",
  "at", "in", "by", "from", "is", "are", "was", "be", "been", "am", "do",
  "does", "did", "i", "me", "my", "mine", "we", "our", "you", "your", "yours",
  "it", "its", "this", "that", "these", "those", "there", "here", "how",
  "what", "when", "where", "who", "can", "could", "should", "would", "will",
  "get", "getting", "some", "any", "about",
]);

function queryTerms(query: string): string[] {
  const all = normalise(query).split(" ").filter(Boolean);
  const meaningful = all.filter((word) => !STOP_WORDS.has(word));
  // A query made entirely of filler finds nothing rather than everything.
  return meaningful.length > 0 ? meaningful : [];
}

function normalise(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Entries this person can actually see. A module that is off hides its
 *  entries completely rather than showing them locked, because the existence
 *  of the entry is itself the disclosure. */
export function visibleEntries(enabledModules: ModuleKey[]): InfoEntry[] {
  return INFO_ENTRIES.filter((entry) => !entry.module || enabledModules.includes(entry.module));
}

/**
 * Every word first, then a graceful fall back.
 *
 * Requiring every word is right when it works: somebody searching "sharps"
 * wants the sharps section, and a fuzzy match returning everything is worse
 * than nothing when the thing being looked for is a crisis line.
 *
 * But it fails on real phrasing in a way stop words alone cannot fix. "where
 * do I put my needles" strips down to "put" and "needles", and "put" appears
 * in no keyword list anywhere, so the strict pass finds nothing at all.
 * Chasing that with an ever longer stop word list is whack-a-mole.
 *
 * So: strict first, and only when that returns nothing, accept entries
 * matching at least one word, ordered by how many matched. The fallback can
 * only ever fire when the alternative was an empty screen, so it never
 * degrades a search that was already working.
 */
export function searchInfo(query: string, enabledModules: ModuleKey[]): InfoEntry[] {
  const terms = queryTerms(query);
  if (terms.length === 0) return [];

  const scored = visibleEntries(enabledModules).map((entry) => {
    const haystack = normalise(`${entry.title} ${entry.summary} ${entry.keywords}`);
    return { entry, matched: terms.filter((term) => haystack.includes(term)).length };
  });

  const exact = scored.filter((row) => row.matched === terms.length);
  if (exact.length > 0) return exact.map((row) => row.entry);

  return scored
    .filter((row) => row.matched > 0)
    .sort((a, b) => b.matched - a.matched)
    .map((row) => row.entry);
}

/** Shared with the resource and legal-note matching in the page, so one typed
 *  query behaves the same way against everything it searches. */
export function matchesQuery(query: string, ...fields: (string | null | undefined)[]): boolean {
  const terms = queryTerms(query);
  if (terms.length === 0) return false;
  const haystack = normalise(fields.filter(Boolean).join(" "));
  return terms.every((term) => haystack.includes(term));
}

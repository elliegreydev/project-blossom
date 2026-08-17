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

export type InfoGroup = "support" | "health" | "legal" | "about";

export const INFO_GROUPS: { key: InfoGroup; label: string; blurb: string }[] = [
  { key: "support", label: "Getting support", blurb: "People you can talk to, and services near you" },
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
    href: "/track/self-directed/info",
    group: "health",
    module: "selfDirected",
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
 * Match on every word typed, in any order, across title, summary and
 * keywords. Deliberately not fuzzy: somebody searching "sharps" wants the
 * sharps section, and a near-miss that returns everything is worse than
 * nothing when the thing being looked for is a crisis line.
 */
export function searchInfo(query: string, enabledModules: ModuleKey[]): InfoEntry[] {
  const terms = normalise(query).split(" ").filter(Boolean);
  if (terms.length === 0) return [];
  return visibleEntries(enabledModules).filter((entry) => {
    const haystack = normalise(`${entry.title} ${entry.summary} ${entry.keywords}`);
    return terms.every((term) => haystack.includes(term));
  });
}

/** Shared with the resource and legal-note matching in the page, so one typed
 *  query behaves the same way against everything it searches. */
export function matchesQuery(query: string, ...fields: (string | null | undefined)[]): boolean {
  const terms = normalise(query).split(" ").filter(Boolean);
  if (terms.length === 0) return false;
  const haystack = normalise(fields.filter(Boolean).join(" "));
  return terms.every((term) => haystack.includes(term));
}

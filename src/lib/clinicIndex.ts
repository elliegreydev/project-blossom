/**
 * Clinic waiting-time context, from Trans Clinic Index.
 *
 * https://transclinicindex.org.uk - an independent project that reads waiting
 * list figures out of FOI responses and clinics' own published pages, and
 * serves them as a free read-only API. Their usage policy welcomes public
 * information tools, asks for attribution and a link back, and asks that
 * projections aren't passed off as official NHS figures. All three are
 * honoured below.
 *
 * Three deliberate decisions, each of which is a bug if you get it wrong.
 *
 * ONE: THE LIST ENDPOINT'S DATES ARE POISONED. /api/clinics returns
 * referral_month as "2021-01-31T23:00:00.000Z". /api/clinics/1 returns
 * "2021-02-01" for the same clinic, same field. Their server sits on a UTC+1
 * timezone, so every date-only value leaves the list endpoint as 23:00 on the
 * last day of the *previous* month. Parse that in UTC and every clinic reads a
 * month early. That's the number somebody uses to decide whether to ring, so
 * being a month out is a real harm, not a cosmetic one. This module reads
 * dates only from the per-clinic endpoint, and only from its date-only
 * strings, and never constructs a Date from them at all - the month label is
 * produced by slicing the string. A bug that can't reach the code can't ship.
 *
 * TWO: NO PROJECTIONS. The API also returns an `estimations` object holding
 * clearance_years, which at the time of writing reads 18.2 for London and
 * 605.7 for one other clinic. Six hundred years is an artefact of a queue that
 * has effectively stopped moving, and "18 years" in somebody's pocket the week
 * they get referred is not information. The raw facts do the work: how many
 * people are ahead, which month the clinic is on, and when that was last
 * checked. `estimations` is never read.
 *
 * THREE: THE DEVICE NEVER TALKS TO THEM. Everything goes through Blossom's own
 * /api/clinic-index route. A direct fetch from the browser would hand a third
 * party the IP address of somebody looking up gender clinic waiting times,
 * which is precisely the kind of thing this app exists not to do. Going
 * through the server also means one cached call for everybody instead of one
 * per user, which is the polite way to use somebody's free API.
 */

export interface ClinicSnapshot {
  clinicId: number;
  name: string;
  shortName: string | null;
  region: string;
  provider: string | null;
  website: string | null;
  /** People on the list at the time of the snapshot. */
  waitlistSize: number | null;
  /** "YYYY-MM-01" - the month of referral the clinic was working through. */
  referralMonth: string | null;
  /** "YYYY-MM-01" - when the above was true. Always shown alongside, never
   *  quietly dropped: an undated waiting time is a rumour. */
  snapshotMonth: string | null;
  /** Usually a Wayback capture of the clinic's own page, so every figure can
   *  be traced back to where it came from. */
  sourceUrl: string | null;
  sourceNote: string | null;
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/**
 * "2021-02-01" to "February 2021", by slicing the string.
 *
 * Deliberately no Date involved. Every timezone bug in this area comes from
 * turning a date-only string into a moment and reading it back somewhere else,
 * so the conversion simply never happens.
 */
export function monthLabel(value: string | null | undefined): string | null {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})/.exec(value);
  if (!match) return null;
  const monthIndex = Number(match[2]) - 1;
  if (monthIndex < 0 || monthIndex > 11) return null;
  return `${MONTH_NAMES[monthIndex]} ${match[1]}`;
}

function asNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() !== "" ? value.trim() : null;
}

/** Only http(s), and only their host or the Wayback Machine. A source link is
 *  rendered as a tappable link, so it doesn't get to be arbitrary. */
export function isAllowedSourceUrl(url: string | null): boolean {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return false;
    const host = parsed.hostname.toLowerCase();
    return (
      host === "web.archive.org" ||
      host === "transclinicindex.org.uk" ||
      host.endsWith(".nhs.uk") ||
      host.endsWith(".scot") ||
      host.endsWith(".wales.nhs.uk")
    );
  } catch {
    return false;
  }
}

/**
 * Turn one /api/clinics/{id} payload into the handful of facts worth showing.
 *
 * Picks the newest waitlist_history row by snapshot_month rather than trusting
 * array order, and tolerates every field being missing - three of their
 * eighteen clinics publish nothing at all, so "we don't know" is a normal
 * outcome rather than a failure.
 */
export function parseClinicDetail(payload: unknown): ClinicSnapshot | null {
  if (!payload || typeof payload !== "object") return null;
  const raw = payload as Record<string, unknown>;
  const clinicId = asNumber(raw.clinic_id);
  const name = asString(raw.name);
  if (clinicId === null || !name) return null;

  const history = Array.isArray(raw.waitlist_history) ? raw.waitlist_history : [];
  let latest: Record<string, unknown> | null = null;
  for (const item of history) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const month = asString(row.snapshot_month);
    if (!month) continue;
    const bestMonth = latest ? asString(latest.snapshot_month) : null;
    if (!bestMonth || month > bestMonth) latest = row;
  }

  const sourceUrl = latest ? asString(latest.source_url) : null;

  return {
    clinicId,
    name,
    shortName: asString(raw.short_name),
    region: asString(raw.region) ?? "United Kingdom",
    provider: asString(raw.provider),
    website: asString(raw.website),
    waitlistSize: latest ? asNumber(latest.waitlist_size) : null,
    referralMonth: latest ? asString(latest.referral_month) : null,
    snapshotMonth: latest ? asString(latest.snapshot_month) : null,
    sourceUrl: isAllowedSourceUrl(sourceUrl) ? sourceUrl : null,
    sourceNote: latest ? asString(latest.source_note) : null,
  };
}

/** Names and ids for the clinic picker. Every date on this endpoint is
 *  discarded on purpose - see the note at the top of the file. */
export function parseClinicList(payload: unknown): { clinicId: number; name: string; region: string }[] {
  if (!Array.isArray(payload)) return [];
  const out: { clinicId: number; name: string; region: string }[] = [];
  for (const item of payload) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const clinicId = asNumber(row.clinic_id);
    const name = asString(row.name);
    if (clinicId === null || !name) continue;
    out.push({ clinicId, name, region: asString(row.region) ?? "United Kingdom" });
  }
  return out.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * How stale a snapshot is, in whole months.
 *
 * Their own coverage runs several months behind for most clinics, which is not
 * a criticism of them - it's how often the clinics publish. It does mean the
 * age has to be on screen. Somebody reading "seeing June 2023 referrals"
 * without "as of February 2026" next to it will assume it's today's number.
 */
export function snapshotAgeMonths(snapshotMonth: string | null, today: string): number | null {
  if (!snapshotMonth) return null;
  const snap = /^(\d{4})-(\d{2})/.exec(snapshotMonth);
  const now = /^(\d{4})-(\d{2})/.exec(today);
  if (!snap || !now) return null;
  const months =
    (Number(now[1]) - Number(snap[1])) * 12 + (Number(now[2]) - Number(snap[2]));
  return months < 0 ? 0 : months;
}

/** The one-line caveat under a figure. Always rendered, never conditional on
 *  the number being old - a fresh figure still needs its date. */
export function freshnessLabel(snapshotMonth: string | null, today: string): string | null {
  const label = monthLabel(snapshotMonth);
  if (!label) return null;
  const age = snapshotAgeMonths(snapshotMonth, today);
  if (age !== null && age >= 12) return `As published in ${label}, so over a year old now.`;
  return `As published in ${label}.`;
}

export const CLINIC_INDEX_HOME = "https://transclinicindex.org.uk";
export const CLINIC_INDEX_NAME = "Trans Clinic Index";

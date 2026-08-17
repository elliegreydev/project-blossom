import { NextResponse } from "next/server";
import { parseClinicDetail, parseClinicList } from "@/lib/clinicIndex";
import { reportError } from "@/lib/errorReport";

/**
 * Waiting-time context from Trans Clinic Index, fetched by Blossom's server
 * rather than by the person's phone.
 *
 * That indirection is the entire reason this route exists. A fetch straight
 * from the browser would hand a third party the IP address of somebody looking
 * up gender clinic waiting times, along with the timing of when they looked.
 * Blossom's pitch is that it doesn't leak things like that, and "we only leak
 * it to a nice project" is not a meaningfully different promise. Going through
 * here means their logs see this server and nothing else.
 *
 * It's also the polite way to use somebody's free API. One warm instance
 * asking once an hour is a rounding error for them; every install asking on
 * every page view would not be.
 *
 * Nothing is stored. No record of which clinic was asked about, by whom, or
 * when - the cache below is keyed by clinic id and holds only their public
 * figures, which is exactly what it would hold if it were a static file.
 */

export const dynamic = "force-dynamic";

const ORIGIN = "https://transclinicindex.org.uk";

/** An hour. Their figures move when a clinic publishes, which is monthly at
 *  best, so this is already far more often than the data changes. */
const CACHE_MS = 60 * 60 * 1000;

/** Their own usage note says there's no uptime guarantee, so a failure here is
 *  expected behaviour rather than an incident. It's cached briefly too, so an
 *  outage at their end doesn't turn into a retry storm from ours. */
const FAILURE_CACHE_MS = 5 * 60 * 1000;

const cache = new Map<string, { at: number; body: unknown; ok: boolean }>();

async function fetchJson(path: string): Promise<unknown> {
  const response = await fetch(`${ORIGIN}${path}`, {
    headers: {
      accept: "application/json",
      // Identifying ourselves so they can see who the traffic is, and block us
      // if they ever want to. An anonymous scraper is a worse neighbour.
      "user-agent": "Blossom/1.0 (+https://projectblossom.net; trans support app)",
    },
    signal: AbortSignal.timeout(8000),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`clinic index responded ${response.status}`);
  return response.json();
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const idParam = searchParams.get("id");

  // Only a positive integer id, or the list. Whatever arrives in the query
  // string is never interpolated into a URL without passing through Number()
  // first, so this can't be pointed at another path on their host.
  let path = "/api/clinics";
  let key = "list";
  if (idParam !== null) {
    const id = Number(idParam);
    if (!Number.isInteger(id) || id <= 0 || id > 100_000) {
      return NextResponse.json({ available: false }, { status: 400 });
    }
    path = `/api/clinics/${id}`;
    key = `clinic:${id}`;
  }

  const now = Date.now();
  const hit = cache.get(key);
  if (hit && now - hit.at < (hit.ok ? CACHE_MS : FAILURE_CACHE_MS)) {
    return NextResponse.json(hit.body);
  }

  try {
    const raw = await fetchJson(path);
    // Parsed here, not in the browser. The client only ever receives the
    // handful of fields it's allowed to show - in particular the `estimations`
    // object, which holds projections like "18.2 years to clear the queue",
    // never crosses this boundary at all. See src/lib/clinicIndex.ts.
    const body =
      idParam === null
        ? { available: true, clinics: parseClinicList(raw) }
        : { available: true, clinic: parseClinicDetail(raw) };
    cache.set(key, { at: now, body, ok: true });
    return NextResponse.json(body);
  } catch {
    const body = { available: false };
    cache.set(key, { at: now, body, ok: false });
    // Deliberately not reported as an error when it's just them being down -
    // that's their documented normal. Reported at a low level so a permanent
    // breakage (a schema change, a moved endpoint) is still visible to us.
    reportError({
      operation: "reading clinic waiting-time context",
      errorClass: "clinic_index_unavailable",
      detail: `GET ${path}`,
      accountRef: null,
      context: { route: "/api/clinic-index", method: "GET" },
    });
    return NextResponse.json(body);
  }
}

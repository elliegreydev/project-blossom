"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import ScreenHeader from "@/components/ScreenHeader";
import { db, addTrip, deleteTrip, toggleTripStep, type Trip } from "@/lib/db";
import { todayLocalDateKey } from "@/lib/dates";
import { COUNTRIES, resourcesForRegion, legalContextFor, CATEGORY_LABELS, SUBREGIONS } from "@/lib/regionResources";
import { TRAVEL_CHECKLIST, describeOffset, shiftTime, tripStage, zoneLabel } from "@/lib/travel";
import styles from "./travel.module.css";

/** Only offered for destinations we hold verified resources for. Everywhere
 *  else still gets a trip and a checklist - just no local support section,
 *  rather than an empty box that looks broken. */
const COVERED = new Set<string>(COUNTRIES);

/** Every zone the platform knows, so anywhere is reachable - not just the six
 *  countries we hold verified resources for. Older engines lack
 *  supportedValuesOf, in which case the field is simply not offered. */
const TIME_ZONES: string[] = (() => {
  try {
    return (Intl as unknown as { supportedValuesOf?: (key: string) => string[] }).supportedValuesOf?.("timeZone") ?? [];
  } catch {
    return [];
  }
})();

function formatRange(start: string, end: string): string {
  const fmt = (d: string) =>
    new Date(`${d}T12:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  return start === end ? fmt(start) : `${fmt(start)} - ${fmt(end)}`;
}

export default function TravelPage() {
  const profile = useLiveQuery(() => db.profiles.get("local"));
  const trips = useLiveQuery(() => db.trips.toArray(), []);
  const resources = useLiveQuery(() => db.cachedRegionResources.toArray(), []);
  const legalNotes = useLiveQuery(() => db.cachedLegalContextNotes.toArray(), []);
  const [adding, setAdding] = useState(false);

  const today = todayLocalDateKey();

  const sorted = useMemo(
    () => [...(trips ?? [])].sort((a, b) => a.startDate.localeCompare(b.startDate)),
    [trips]
  );
  // All of them, not the first: overlapping trips are perfectly ordinary (a
  // stopover, a trip inside a longer one) and using find() here made every
  // active trip after the first vanish from the screen with no way back to it.
  const active = sorted.filter((t) => tripStage(t.startDate, t.endDate, today) === "active");
  const upcoming = sorted.filter((t) => tripStage(t.startDate, t.endDate, today) === "upcoming");
  const past = sorted.filter((t) => tripStage(t.startDate, t.endDate, today) === "past").reverse();

  if (!profile || trips === undefined) return null;

  return (
    <div className={styles.screen}>
      <ScreenHeader title="Travel" backHref="/track" />

      <p className={styles.intro}>
        Somewhere to keep the practical bits of a trip: what to pack, what your reminders will do,
        and where to find help if you want it. Everything here stays on this device.
      </p>

      {active.map((trip) => (
        <TripCard
          key={trip.id}
          trip={trip}
          stage="active"
          homeZone={profile.timezone}
          resources={resources ?? []}
          legalNotes={legalNotes ?? []}
        />
      ))}

      {upcoming.map((trip) => (
        <TripCard
          key={trip.id}
          trip={trip}
          stage="upcoming"
          homeZone={profile.timezone}
          resources={resources ?? []}
          legalNotes={legalNotes ?? []}
        />
      ))}

      {adding ? (
        <AddTripForm onDone={() => setAdding(false)} />
      ) : (
        <button type="button" className={styles.addButton} onClick={() => setAdding(true)}>
          Plan a trip
        </button>
      )}

      {past.length > 0 && (
        <details className={styles.pastTrips}>
          <summary>Past trips ({past.length})</summary>
          {past.map((trip) => (
            <div key={trip.id} className={styles.pastRow}>
              <div>
                <strong>{trip.destinationLabel}</strong>
                <span>{formatRange(trip.startDate, trip.endDate)}</span>
              </div>
              <button type="button" onClick={() => void deleteTrip(trip.id)} aria-label={`Delete trip to ${trip.destinationLabel}`}>
                Delete
              </button>
            </div>
          ))}
        </details>
      )}

      {sorted.length === 0 && !adding && (
        <p className={styles.empty}>No trips planned. You don&rsquo;t need one to use Blossom - this is here if it helps.</p>
      )}
    </div>
  );
}

function TripCard({
  trip,
  stage,
  homeZone,
  resources,
  legalNotes,
}: {
  trip: Trip;
  stage: "active" | "upcoming";
  homeZone: string | null;
  resources: Parameters<typeof resourcesForRegion>[0];
  legalNotes: Parameters<typeof legalContextFor>[0];
}) {
  const localResources = trip.destinationCountry
    ? resourcesForRegion(resources, trip.destinationCountry, trip.destinationSubregion)
    : [];
  const legal = trip.destinationCountry
    ? legalContextFor(legalNotes, trip.destinationCountry, trip.destinationSubregion)
    : null;

  const done = trip.completedSteps.length;
  const total = TRAVEL_CHECKLIST.length;

  return (
    <section className={styles.trip}>
      <div className={styles.tripHead}>
        <div>
          <span className={styles.stage}>{stage === "active" ? "You're there now" : "Coming up"}</span>
          <h2>{trip.destinationLabel}</h2>
          <p className={styles.dates}>{formatRange(trip.startDate, trip.endDate)}</p>
        </div>
        <button
          type="button"
          className={styles.deleteTrip}
          onClick={() => void deleteTrip(trip.id)}
          aria-label={`Delete trip to ${trip.destinationLabel}`}
        >
          Delete
        </button>
      </div>

      {trip.destinationTimezone && homeZone && trip.destinationTimezone !== homeZone && (
        <p className={styles.tzNote}>
          {zoneLabel(trip.destinationTimezone)} is {describeOffset(homeZone, trip.destinationTimezone)}{" "}
          {zoneLabel(homeZone)}. A dose set for 09:00 here would be{" "}
          <strong>{shiftTime("09:00", homeZone, trip.destinationTimezone).time}</strong> there if you keep
          your current schedule. Blossom will ask you which you want when you arrive.
        </p>
      )}

      <div className={styles.checklist}>
        <div className={styles.checklistHead}>
          <h3>Before you go</h3>
          <span>{done} of {total}</span>
        </div>
        {TRAVEL_CHECKLIST.map((item) => {
          const checked = trip.completedSteps.includes(item.key);
          return (
            <label key={item.key} className={`${styles.step} ${checked ? styles.stepDone : ""}`}>
              <input type="checkbox" checked={checked} onChange={() => void toggleTripStep(trip.id, item.key)} />
              <span>
                <strong>{item.label}</strong>
                <em>{item.detail}</em>
              </span>
            </label>
          );
        })}
      </div>

      {legal && (
        <div className={styles.legal}>
          <h3>Worth knowing about {trip.destinationSubregion ?? trip.destinationCountry}</h3>
          <p>{legal.note}</p>
          <p className={styles.source}>
            <a href={legal.sourceUrl} target="_blank" rel="noopener noreferrer">Source</a>
            {" · "}reviewed {new Date(legal.lastReviewedAt).toLocaleDateString("en-GB", { month: "long", year: "numeric" })}
          </p>
        </div>
      )}

      {localResources.length > 0 ? (
        <div className={styles.resources}>
          <h3>If you need someone there</h3>
          {localResources.slice(0, 5).map((r) => (
            <div key={r.id} className={styles.resource}>
              <div>
                <strong>{r.orgName}</strong>
                <span className={styles.category}>{CATEGORY_LABELS[r.category]}</span>
              </div>
              <span className={styles.contact}>{r.contactInfo}</span>
              {r.availability && <span className={styles.availability}>{r.availability}</span>}
            </div>
          ))}
          <Link href="/settings/support" className={styles.moreLink}>All support options</Link>
        </div>
      ) : (
        <p className={styles.noResources}>
          Blossom doesn&rsquo;t have checked local support for {trip.destinationLabel} yet. We only list
          places we&rsquo;ve verified, rather than guessing.
        </p>
      )}
    </section>
  );
}

function AddTripForm({ onDone }: { onDone: () => void }) {
  const [label, setLabel] = useState("");
  const [country, setCountry] = useState("");
  const [subregion, setSubregion] = useState("");
  const [timezone, setTimezone] = useState("");
  const [start, setStart] = useState(todayLocalDateKey());
  const [end, setEnd] = useState(todayLocalDateKey());
  const [saving, setSaving] = useState(false);

  const subregions = country && country in SUBREGIONS ? SUBREGIONS[country as keyof typeof SUBREGIONS] ?? [] : [];
  const valid = label.trim().length > 0 && start <= end;

  async function save() {
    if (!valid) return;
    setSaving(true);
    await addTrip({
      destinationLabel: label.trim(),
      destinationCountry: COVERED.has(country) ? country : null,
      destinationSubregion: subregion || null,
      destinationTimezone: timezone || null,
      startDate: start,
      endDate: end,
      note: null,
    });
    setSaving(false);
    onDone();
  }

  return (
    <section className={styles.form}>
      <h2>Plan a trip</h2>

      <label className={styles.field}>
        <span>Where are you going?</span>
        <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Berlin, my sister's, anywhere" autoFocus />
      </label>

      <div className={styles.row}>
        <label className={styles.field}>
          <span>From</span>
          <input type="date" value={start} onChange={(e) => setStart(e.target.value)} />
        </label>
        <label className={styles.field}>
          <span>To</span>
          <input type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
        </label>
      </div>
      {start > end && <p className={styles.warn}>The end date is before the start date.</p>}

      <label className={styles.field}>
        <span>Country (optional)</span>
        <select
          value={country}
          onChange={(e) => {
            setCountry(e.target.value);
            setSubregion("");
          }}
        >
          <option value="">Not listed / rather not say</option>
          {COUNTRIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <em>Only these have support information we&rsquo;ve checked. Leaving it blank still gives you the checklist.</em>
      </label>

      {subregions.length > 0 && (
        <label className={styles.field}>
          <span>Area (optional)</span>
          <select value={subregion} onChange={(e) => setSubregion(e.target.value)}>
            <option value="">Anywhere in {country}</option>
            {subregions.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </label>
      )}

      {TIME_ZONES.length > 0 && (
        <label className={styles.field}>
          <span>Timezone there (optional)</span>
          <select value={timezone} onChange={(e) => setTimezone(e.target.value)}>
            <option value="">Don&rsquo;t work out time differences</option>
            {TIME_ZONES.map((z) => (
              <option key={z} value={z}>{z.replace(/_/g, " ")}</option>
            ))}
          </select>
        </label>
      )}

      <div className={styles.formActions}>
        <button type="button" className={styles.cancel} onClick={onDone}>Cancel</button>
        <button type="button" className={styles.save} disabled={!valid || saving} onClick={() => void save()}>
          {saving ? "Saving…" : "Save trip"}
        </button>
      </div>
    </section>
  );
}

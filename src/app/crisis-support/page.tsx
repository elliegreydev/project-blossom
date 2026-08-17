"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { db, LOCAL_PROFILE_ID } from "@/lib/db";
import {
  COUNTRIES,
  SUBREGIONS,
  CATEGORY_LABELS,
  resourcesForRegion,
  syncRegionResourcesCache,
  type RegionResource,
} from "@/lib/regionResources";
import styles from "./crisis-support.module.css";

// Deliberately outside the (main) route group, so it works before onboarding
// is finished and without signing in - see the "Crisis-resource quick
// access" roadmap item. Doesn't require or create a saved profile; a region
// picked here only lives in this page's own state unless it already matches
// what's saved.
/** A contactInfo that gives you a person, rather than something to read.
 *  Matches a phone number in any of the formats the list uses (0300 330 0630,
 *  1-833-247-7683, (808) 521-2437, 116 123) or a shortcode text service. */
const CONTACTABLE = /\d{3}[\d\s().-]{3,}|\btext\b/i;

export default function CrisisSupportPage() {
  const [country, setCountry] = useState<string>("");
  const [subregion, setSubregion] = useState<string>("");
  const [resources, setResources] = useState<RegionResource[] | null>(null);
  const [otherLines, setOtherLines] = useState<RegionResource[]>([]);
  // How much is sitting behind the region picker. The US has 88 resources
  // scoped to a state, so somebody on "Whole country" sees three of ninety-one
  // and has no way of knowing the rest exist.
  const [hiddenLocal, setHiddenLocal] = useState(0);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    void (async () => {
      await syncRegionResourcesCache();
      const profile = await db.profiles.get(LOCAL_PROFILE_ID);
      if (profile?.region) {
        setCountry(profile.region);
        setSubregion(profile.subregion ?? "");
      }
      setReady(true);
    })();
  }, []);

  useEffect(() => {
    if (!country) return;
    void db.cachedRegionResources.toArray().then((all) => {
      const inRegion = resourcesForRegion(all, country, subregion || null);
      const crisis = inRegion.filter((r) => r.category === "crisis" || r.category === "emergency");

      // Anything else in the region you can actually ring or text right now.
      //
      // The category tags were written to describe what an organisation is,
      // not what it can do for you at 3am, and the two came apart. Switchboard
      // runs an LGBT+ helpline until 10pm every night and is tagged "peer", so
      // this page refused to show it - somebody in the UK opening this at
      // midnight got one general number and nothing else. Ireland had three
      // lines hidden the same way.
      //
      // Sorting by tag was the wrong question. The right one is "does this
      // give me a human to talk to", so that's what's asked here. They're
      // shown separately and below, because they're support lines rather than
      // crisis lines and the page shouldn't blur that.
      const reachable = inRegion.filter(
        (r) => !crisis.includes(r) && CONTACTABLE.test(r.contactInfo)
      );

      setResources(crisis);
      setOtherLines(reachable);
      setHiddenLocal(
        subregion ? 0 : all.filter((r) => r.country === country && r.subregion !== null).length
      );
    });
  }, [country, subregion]);

  const subregionOptions = country ? SUBREGIONS[country as keyof typeof SUBREGIONS] : undefined;

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <Link href="/" className={styles.back}>← Back to Blossom</Link>

        <header className={styles.header}>
          <span className={styles.eyebrow}>Support</span>
          <h1>Need support right now?</h1>
          <p className={styles.subtitle}>
            This works whether or not you&apos;ve finished setting up Blossom, and
            without signing in. Nothing you do on this page is saved anywhere.
          </p>
        </header>

        <div className={styles.emergencyBanner}>
          If you&apos;re in immediate danger, please contact your local emergency
          services. Blossom can&apos;t monitor you or contact anyone on your
          behalf.
        </div>

        {ready && (
          <>
            <div className={styles.field}>
              <span className={styles.label}>Where are you?</span>
              <select
                className={styles.select}
                value={country}
                onChange={(e) => {
                  setCountry(e.target.value);
                  setSubregion("");
                }}
              >
                <option value="">Choose a country</option>
                {COUNTRIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {subregionOptions && (
              <div className={styles.field}>
                <span className={styles.label}>
                  {country === "United States" ? "State" : country === "Canada" ? "Province or territory" : country === "Australia" ? "State or territory" : "Nation"}
                </span>
                <select
                  className={styles.select}
                  value={subregion}
                  onChange={(e) => setSubregion(e.target.value)}
                >
                  <option value="">Whole country</option>
                  {subregionOptions.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            )}

            {hiddenLocal > 0 && (
              <p className={styles.hint}>
                Choosing your{" "}
                {country === "United States" ? "state" : country === "Canada" ? "province" : country === "Australia" ? "state" : "nation"}{" "}
                above shows {hiddenLocal} more {hiddenLocal === 1 ? "service" : "services"} near you.
              </p>
            )}

            {country && (
              <div className={styles.list}>
                {resources === null ? (
                  <p className={styles.hint}>Loading…</p>
                ) : resources.length === 0 ? (
                  <p className={styles.hint}>
                    We don&apos;t have a crisis-specific resource for this area yet -
                    please use your local emergency number if you need help right
                    now.
                  </p>
                ) : (
                  resources.map((r) => (
                    <div key={r.id} className={styles.resourceItem}>
                      <span className={styles.resourceCategory}>{CATEGORY_LABELS[r.category]}</span>
                      <span className={styles.resourceName}>
                        {r.cityName && `${r.cityName} · `}
                        {r.orgName}
                      </span>
                      <span className={styles.resourceMeta}>{r.contactInfo}</span>
                      {r.availability && <span className={styles.resourceMeta}>{r.availability}</span>}
                    </div>
                  ))
                )}
              </div>
            )}

            {country && otherLines.length > 0 && (
              <div className={styles.list}>
                <h2 className={styles.otherLinesTitle}>Other lines you can reach today</h2>
                <p className={styles.hint}>
                  Not crisis lines, but real people you can ring or text. Check the
                  hours before you call.
                </p>
                {otherLines.map((r) => (
                  <div key={r.id} className={styles.resourceItem}>
                    <span className={styles.resourceCategory}>{CATEGORY_LABELS[r.category]}</span>
                    <span className={styles.resourceName}>
                      {r.cityName && `${r.cityName} · `}
                      {r.orgName}
                    </span>
                    <span className={styles.resourceMeta}>{r.contactInfo}</span>
                    {r.availability && <span className={styles.resourceMeta}>{r.availability}</span>}
                  </div>
                ))}
              </div>
            )}

            <Link href="/settings/support" className={styles.moreLink}>
              See all support resources for your region
            </Link>
          </>
        )}
      </div>
    </main>
  );
}

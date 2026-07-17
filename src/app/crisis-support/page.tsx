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
export default function CrisisSupportPage() {
  const [country, setCountry] = useState<string>("");
  const [subregion, setSubregion] = useState<string>("");
  const [resources, setResources] = useState<RegionResource[] | null>(null);
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
      const matched = resourcesForRegion(all, country, subregion || null).filter(
        (r) => r.category === "crisis" || r.category === "emergency"
      );
      setResources(matched);
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

            <Link href="/settings/support" className={styles.moreLink}>
              See all support resources for your region
            </Link>
          </>
        )}
      </div>
    </main>
  );
}

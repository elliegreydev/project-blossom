"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { db, getOrCreateProfile, LOCAL_PROFILE_ID, syncDeviceTimezone } from "@/lib/db";
import { seedDevDataIfNeeded } from "@/lib/devSeed";
import { syncRegionResourcesCache } from "@/lib/regionResources";
import { reportClientError } from "@/lib/clientErrorReport";
import BottomNav from "@/components/BottomNav";
import QuickAdd from "@/components/QuickAdd";
import AppLockGate from "@/components/AppLockGate";
import LocalReminderService from "@/components/LocalReminderService";
import WhatsNew from "@/components/WhatsNew";
import UpdatePrompt from "@/components/UpdatePrompt";
import TimezoneChangeNotice from "@/components/TimezoneChangeNotice";
import SyncStatus from "@/components/SyncStatus";
import TestBuildBanner from "@/components/TestBuildBanner";
import StorageUnavailable from "@/components/StorageUnavailable";
import styles from "./layout.module.css";

// Reading from Dexie is usually instant, so a naive loader would flash for a
// frame and read as a glitch. The old fix was a 5s floor on *every* open,
// which meant waiting five seconds to log a dose on a phone that was ready in
// fifty milliseconds.
//
// Instead: don't show the loader at all unless loading is actually taking a
// moment, and once it is on screen keep it there long enough to be read. Fast
// opens now show nothing and go straight to Home; slow ones get a stable
// screen rather than a flicker.
const LOADER_DELAY_MS = 150;
const LOADER_MIN_VISIBLE_MS = 500;

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [checkedOnboarding, setCheckedOnboarding] = useState(false);
  // Set when the local database refuses to open. Until this existed, that
  // failure had no path out of the loading state at all.
  const [storageFailed, setStorageFailed] = useState(false);
  const [loaderVisible, setLoaderVisible] = useState(false);
  const [loaderMinElapsed, setLoaderMinElapsed] = useState(false);
  const profile = useLiveQuery(() => db.profiles.get(LOCAL_PROFILE_ID));

  useEffect(() => {
    (async () => {
      try {
        // Make sure the profile row exists, then, on the dev build only, fill an
        // empty app with demo data before we decide whether to run onboarding.
        // The seed marks onboarding complete, so a fresh dev device lands on a
        // populated Home instead of the setup flow. On production the seed is a
        // no-op, so this is just getOrCreateProfile as before.
        await getOrCreateProfile();
        await seedDevDataIfNeeded();
        const p = await getOrCreateProfile();
        if (!p.onboardingCompletedAt) {
          router.replace("/onboarding");
          return;
        }
        setCheckedOnboarding(true);
      } catch (error) {
        // Blossom is local-first, so a database that will not open is not a
        // degraded app, it is no app. Without this the rejection was silent and
        // the loading screen ran forever, which is what somebody actually sat
        // through rather than being told what was wrong. The seed is inside the
        // try for the same reason: it opens the database too, so if it is going
        // to fail it should land here rather than as an unhandled rejection.
        //
        // Reported as well as shown, because somebody who cannot open Blossom
        // at all has no way to tell us and no reason to try twice. The report
        // carries the shape of the failure and nothing about them.
        reportClientError("storing data on this device", error);
        setStorageFailed(true);
      }
    })();
    void syncDeviceTimezone();
    void syncRegionResourcesCache();
  }, [router]);

  const ready = checkedOnboarding && Boolean(profile);

  useEffect(() => {
    if (ready) return;
    const timer = setTimeout(() => setLoaderVisible(true), LOADER_DELAY_MS);
    return () => clearTimeout(timer);
  }, [ready]);

  useEffect(() => {
    if (!loaderVisible) return;
    const timer = setTimeout(() => setLoaderMinElapsed(true), LOADER_MIN_VISIBLE_MS);
    return () => clearTimeout(timer);
  }, [loaderVisible]);

  // Checked before the loading state, so a device that cannot store anything
  // gets an explanation instead of a spinner that never stops.
  if (storageFailed) {
    return <StorageUnavailable onRetry={() => window.location.reload()} />;
  }

  // Checks profile directly rather than via `ready` so it narrows below.
  if (!checkedOnboarding || !profile || (loaderVisible && !loaderMinElapsed)) {
    // Still within the delay window - blank rather than a frame of loader that
    // would be gone before it registered.
    if (!loaderVisible) return null;
    return (
      <main className={styles.loadingScreen} aria-live="polite" aria-label="Opening Blossom">
        <div className={styles.loadingMarkWrap}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icon-512.png" alt="" width={72} height={72} />
        </div>
        <p className={styles.loadingWordmark}>Blossom</p>
        <p className={styles.loadingStatus}>
          Opening your space
          <span className={styles.loadingDots} aria-hidden="true">
            <span />
            <span />
            <span />
          </span>
        </p>
      </main>
    );
  }

  const shell = (
    <div className={styles.shell}>
      <LocalReminderService />
      <UpdatePrompt />
      <TimezoneChangeNotice />
      <SyncStatus />
      <WhatsNew />
      <BottomNav />
      <main className={styles.content}>{children}</main>
      <QuickAdd />
    </div>
  );

  return (
    <>
      <TestBuildBanner />
      {profile.appLockEnabled ? <AppLockGate>{shell}</AppLockGate> : shell}
    </>
  );
}

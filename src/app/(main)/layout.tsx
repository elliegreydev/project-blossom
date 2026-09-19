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
import OpeningScreen from "@/components/OpeningScreen";
import { startActivityClock } from "@/lib/welcomeBack";
import styles from "./layout.module.css";

// The one thing this layout renders on the server is OpeningScreen, which
// means it is in the HTML the phone receives and paints before a single line
// of JavaScript has run.
//
// It used to render null until a 150ms client timer had fired, and a client
// timer cannot start until the bundle has hydrated. On a phone that is
// seconds, and what it was covering was plain white, so the one moment the
// loader existed for was the exact moment it could not appear. Every page
// under (main) shipped an empty <body>.
//
// There is deliberately no minimum-visible floor any more either. The old one
// existed because the loader appeared late and could otherwise vanish before
// it was read. Arriving with the HTML solves that on its own, and keeping the
// floor measured as Home landing a quarter of a second later than before.

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [checkedOnboarding, setCheckedOnboarding] = useState(false);
  // Set when the local database refuses to open. Until this existed, that
  // failure had no path out of the loading state at all.
  const [storageFailed, setStorageFailed] = useState(false);
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

  // Keeps "last here" current on this device, for the welcome-back card.
  useEffect(() => startActivityClock(), []);

  // Checked before the loading state, so a device that cannot store anything
  // gets an explanation instead of a spinner that never stops.
  if (storageFailed) {
    return <StorageUnavailable onRetry={() => window.location.reload()} />;
  }

  // Checks profile directly rather than through a derived flag so it narrows
  // below. On the server both are always false, which is the point: this
  // branch is what gets prerendered into the HTML.
  if (!checkedOnboarding || !profile) {
    return <OpeningScreen />;
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

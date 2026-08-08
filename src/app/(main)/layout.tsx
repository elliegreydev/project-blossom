"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { db, getOrCreateProfile, LOCAL_PROFILE_ID, syncDeviceTimezone } from "@/lib/db";
import { syncRegionResourcesCache } from "@/lib/regionResources";
import BottomNav from "@/components/BottomNav";
import QuickAdd from "@/components/QuickAdd";
import AppLockGate from "@/components/AppLockGate";
import LocalReminderService from "@/components/LocalReminderService";
import WhatsNew from "@/components/WhatsNew";
import UpdatePrompt from "@/components/UpdatePrompt";
import SyncStatus from "@/components/SyncStatus";
import styles from "./layout.module.css";

// Local Dexie reads resolve almost instantly, which made the loading
// animation flash by unseen - this floor keeps it on screen long enough to
// actually register as a moment, not a glitch.
const MIN_LOADING_SCREEN_MS = 5000;

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [checkedOnboarding, setCheckedOnboarding] = useState(false);
  const [minDurationElapsed, setMinDurationElapsed] = useState(false);
  const profile = useLiveQuery(() => db.profiles.get(LOCAL_PROFILE_ID));

  useEffect(() => {
    getOrCreateProfile().then((p) => {
      if (!p.onboardingCompletedAt) {
        router.replace("/onboarding");
        return;
      }
      setCheckedOnboarding(true);
    });
    void syncDeviceTimezone();
    void syncRegionResourcesCache();
  }, [router]);

  useEffect(() => {
    const timer = setTimeout(() => setMinDurationElapsed(true), MIN_LOADING_SCREEN_MS);
    return () => clearTimeout(timer);
  }, []);

  if (!checkedOnboarding || !profile || !minDurationElapsed) {
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
      <SyncStatus />
      <WhatsNew />
      <BottomNav />
      <main className={styles.content}>{children}</main>
      <QuickAdd />
    </div>
  );

  return profile.appLockEnabled ? <AppLockGate>{shell}</AppLockGate> : shell;
}

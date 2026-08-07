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
  const [loaderVisible, setLoaderVisible] = useState(false);
  const [loaderMinElapsed, setLoaderMinElapsed] = useState(false);
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
      <WhatsNew />
      <BottomNav />
      <main className={styles.content}>{children}</main>
      <QuickAdd />
    </div>
  );

  return profile.appLockEnabled ? <AppLockGate>{shell}</AppLockGate> : shell;
}

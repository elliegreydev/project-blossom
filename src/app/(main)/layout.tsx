"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { db, getOrCreateProfile, LOCAL_PROFILE_ID } from "@/lib/db";
import BottomNav from "@/components/BottomNav";
import QuickAdd from "@/components/QuickAdd";
import AppLockGate from "@/components/AppLockGate";
import styles from "./layout.module.css";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [checkedOnboarding, setCheckedOnboarding] = useState(false);
  const profile = useLiveQuery(() => db.profiles.get(LOCAL_PROFILE_ID));

  useEffect(() => {
    getOrCreateProfile().then((p) => {
      if (!p.onboardingCompletedAt) {
        router.replace("/onboarding");
        return;
      }
      setCheckedOnboarding(true);
    });
  }, [router]);

  if (!checkedOnboarding || !profile) {
    return (
      <main className={styles.loadingScreen} aria-live="polite" aria-label="Opening Blossom">
        <div className={styles.loadingMark} aria-hidden="true">
          <span />
          <span />
          <span />
          <span />
        </div>
        <p>Opening your space…</p>
      </main>
    );
  }

  const shell = (
    <div className={styles.shell}>
      <BottomNav />
      <main className={styles.content}>{children}</main>
      <QuickAdd />
    </div>
  );

  return profile.appLockEnabled ? <AppLockGate>{shell}</AppLockGate> : shell;
}

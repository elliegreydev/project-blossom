"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { db, getOrCreateProfile, LOCAL_PROFILE_ID } from "@/lib/db";
import styles from "./home.module.css";

export default function HomePage() {
  const router = useRouter();
  const profile = useLiveQuery(() => db.profiles.get(LOCAL_PROFILE_ID));

  useEffect(() => {
    getOrCreateProfile().then((p) => {
      if (!p.onboardingCompletedAt) router.replace("/onboarding");
    });
  }, [router]);

  if (!profile) return null;
  if (!profile.onboardingCompletedAt) return null;

  const name = profile.displayName || "there";

  return (
    <div className={styles.screen}>
      <div className={styles.greeting}>Hi {name} 🌸</div>
      <p className={styles.subtitle}>
        This is the beginning of Home. Today, Coming up, and your Aurora suggestion
        will live here next.
      </p>
    </div>
  );
}

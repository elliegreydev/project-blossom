"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getOrCreateProfile } from "@/lib/db";
import BottomNav from "@/components/BottomNav";
import QuickAdd from "@/components/QuickAdd";
import styles from "./layout.module.css";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    getOrCreateProfile().then((p) => {
      if (!p.onboardingCompletedAt) {
        router.replace("/onboarding");
        return;
      }
      setReady(true);
    });
  }, [router]);

  if (!ready) return null;

  return (
    <>
      <div className={styles.content}>{children}</div>
      <QuickAdd />
      <BottomNav />
    </>
  );
}

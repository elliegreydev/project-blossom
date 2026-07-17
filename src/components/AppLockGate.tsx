"use client";

import { useEffect, useState } from "react";
import PinEntry from "./PinEntry";
import styles from "./AppLockGate.module.css";

const SESSION_KEY = "blossom_unlocked";

export default function AppLockGate({ children }: { children: React.ReactNode }) {
  const [unlocked, setUnlocked] = useState<boolean | null>(null);

  useEffect(() => {
    setUnlocked(sessionStorage.getItem(SESSION_KEY) === "1");
  }, []);

  if (unlocked === null) return null;
  if (unlocked) return <>{children}</>;

  return (
    <div className={styles.screen}>
      <PinEntry
        title="Welcome back"
        onSuccess={() => {
          sessionStorage.setItem(SESSION_KEY, "1");
          setUnlocked(true);
        }}
      />
    </div>
  );
}

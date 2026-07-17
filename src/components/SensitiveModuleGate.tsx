"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import { db, LOCAL_PROFILE_ID } from "@/lib/db";
import PinEntry from "./PinEntry";
import styles from "./AppLockGate.module.css";
import local from "./SensitiveModuleGate.module.css";

// Separate from AppLockGate's session key - unlocking the whole app and
// unlocking sensitive modules are different steps, per Settings > Privacy &
// security's "Lock sensitive modules" toggle.
const SESSION_KEY = "blossom_sensitive_unlocked";

export default function SensitiveModuleGate({ children }: { children: React.ReactNode }) {
  const profile = useLiveQuery(() => db.profiles.get(LOCAL_PROFILE_ID));
  const [unlocked, setUnlocked] = useState<boolean | null>(null);

  useEffect(() => {
    setUnlocked(sessionStorage.getItem(SESSION_KEY) === "1");
  }, []);

  if (!profile || unlocked === null) return null;

  // Only enforce the extra step if a PIN actually exists to check against -
  // otherwise the toggle would be locking something with no way to unlock it.
  const requiresUnlock = profile.appLockEnabled && profile.sensitiveModulesLocked && Boolean(profile.appLockPinHash);
  if (!requiresUnlock || unlocked) return <>{children}</>;

  return (
    <div className={styles.screen}>
      <PinEntry
        title="This area is locked"
        onSuccess={() => {
          sessionStorage.setItem(SESSION_KEY, "1");
          setUnlocked(true);
        }}
      />
      <Link href="/" className={local.backLink}>Back to Home</Link>
    </div>
  );
}

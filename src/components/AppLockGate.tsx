"use client";

import { useEffect, useState } from "react";
import { needsLocalPinSetup } from "@/lib/db";
import PinEntry from "./PinEntry";
import PinSetupSheet from "./PinSetupSheet";
import styles from "./AppLockGate.module.css";
import { readSessionFlag, writeSessionFlag } from "@/lib/sessionFlag";

const SESSION_KEY = "blossom_unlocked";

export default function AppLockGate({ children }: { children: React.ReactNode }) {
  const [unlocked, setUnlocked] = useState<boolean | null>(null);
  // The account says "keep this locked" but this device has never had a PIN
  // set - i.e. someone just signed in somewhere new. The PIN hash never
  // leaves the device it was made on, so this device needs its own.
  const [needsSetup, setNeedsSetup] = useState(false);

  useEffect(() => {
    let live = true;
    (async () => {
      const setupNeeded = await needsLocalPinSetup();
      if (!live) return;
      setNeedsSetup(setupNeeded);
      setUnlocked(!setupNeeded && readSessionFlag(SESSION_KEY));
    })();
    return () => {
      live = false;
    };
  }, []);

  if (unlocked === null) return null;
  if (unlocked) return <>{children}</>;

  if (needsSetup) {
    return (
      <div className={styles.screen}>
        <PinSetupSheet
          onClose={() => {
            // Nothing to fall back to - without a PIN this device can't show
            // the data, so re-check rather than letting them dismiss past it.
            void needsLocalPinSetup().then((still) => {
              setNeedsSetup(still);
              if (!still) {
                writeSessionFlag(SESSION_KEY);
                setUnlocked(true);
              }
            });
          }}
        />
      </div>
    );
  }

  return (
    <div className={styles.screen}>
      <PinEntry
        title="Welcome back"
        onSuccess={() => {
          writeSessionFlag(SESSION_KEY);
          setUnlocked(true);
        }}
      />
    </div>
  );
}

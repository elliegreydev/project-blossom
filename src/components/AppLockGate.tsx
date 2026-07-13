"use client";

import { useEffect, useState } from "react";
import { verifyAppLockPin } from "@/lib/db";
import styles from "./AppLockGate.module.css";

const SESSION_KEY = "blossom_unlocked";
const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "back"];

export default function AppLockGate({ children }: { children: React.ReactNode }) {
  const [unlocked, setUnlocked] = useState<boolean | null>(null);
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);

  useEffect(() => {
    setUnlocked(sessionStorage.getItem(SESSION_KEY) === "1");
  }, []);

  useEffect(() => {
    if (pin.length !== 4) return;
    verifyAppLockPin(pin).then((ok) => {
      if (ok) {
        sessionStorage.setItem(SESSION_KEY, "1");
        setUnlocked(true);
      } else {
        setError(true);
        setPin("");
      }
    });
  }, [pin]);

  function press(key: string) {
    setError(false);
    if (key === "back") return setPin((p) => p.slice(0, -1));
    if (key === "" || pin.length >= 4) return;
    setPin((p) => p + key);
  }

  if (unlocked === null) return null;
  if (unlocked) return <>{children}</>;

  return (
    <div className={styles.screen}>
      <div className={styles.title}>Welcome back</div>
      <div className={styles.dots}>
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={`${styles.dot} ${i < pin.length ? (error ? styles.error : styles.filled) : ""}`}
          />
        ))}
      </div>
      <div className={styles.error}>{error ? "That didn't match. Try again." : ""}</div>
      <div className={styles.keypad}>
        {KEYS.map((key, i) =>
          key === "" ? (
            <div key={i} />
          ) : (
            <button
              key={i}
              type="button"
              className={key === "back" ? `${styles.key} ${styles.ghost}` : styles.key}
              onClick={() => press(key)}
            >
              {key === "back" ? "⌫" : key}
            </button>
          )
        )}
      </div>
    </div>
  );
}

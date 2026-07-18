"use client";

import { useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, LOCAL_PROFILE_ID, verifyAppLockPin } from "@/lib/db";
import { isPlatformAuthenticatorAvailable, verifyBiometricUnlock } from "@/lib/webauthn";
import styles from "./AppLockGate.module.css";

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "back"];

export default function PinEntry({ title, onSuccess }: { title: string; onSuccess: () => void }) {
  const profile = useLiveQuery(() => db.profiles.get(LOCAL_PROFILE_ID));
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);
  const [biometricSupported, setBiometricSupported] = useState(false);
  const [biometricPending, setBiometricPending] = useState(false);
  const [biometricFailed, setBiometricFailed] = useState(false);

  const credentialId = profile?.webauthnCredentialId ?? null;

  useEffect(() => {
    if (!credentialId) return;
    let cancelled = false;
    void isPlatformAuthenticatorAvailable().then((available) => {
      if (!cancelled) setBiometricSupported(available);
    });
    return () => {
      cancelled = true;
    };
  }, [credentialId]);

  async function tryBiometric(id: string) {
    setBiometricPending(true);
    setBiometricFailed(false);
    const ok = await verifyBiometricUnlock(id);
    setBiometricPending(false);
    if (ok) onSuccess();
    else setBiometricFailed(true);
  }

  // Offers biometric unlock the moment it's ready, so most opens need no
  // tap at all - a cancel or failure just leaves the PIN pad below as the
  // fallback, same as tapping the button again would.
  useEffect(() => {
    if (biometricSupported && credentialId) void tryBiometric(credentialId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [biometricSupported]);

  useEffect(() => {
    if (pin.length !== 4) return;
    verifyAppLockPin(pin).then((ok) => {
      if (ok) {
        onSuccess();
      } else {
        setError(true);
        setPin("");
      }
    });
    // onSuccess is expected to be stable enough per mount - re-running this
    // effect on every parent re-render would re-verify a pin that already
    // resolved.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pin]);

  function press(key: string) {
    setError(false);
    if (key === "back") return setPin((p) => p.slice(0, -1));
    if (key === "" || pin.length >= 4) return;
    setPin((p) => p + key);
  }

  return (
    <>
      <div className={styles.title}>{title}</div>
      {credentialId && biometricSupported && (
        <button
          type="button"
          className={styles.biometricButton}
          disabled={biometricPending}
          onClick={() => void tryBiometric(credentialId)}
        >
          {biometricPending ? "Waiting…" : biometricFailed ? "Try again" : "Unlock with Face ID / Touch ID"}
        </button>
      )}
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
    </>
  );
}

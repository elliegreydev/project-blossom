"use client";

import { useState } from "react";
import styles from "./Sheet.module.css";
import { useSheetDialog } from "./useSheetDialog";
import { setAppLockPin } from "@/lib/db";

type Stage = "enter" | "confirm";

export default function PinSetupSheet({ onClose }: { onClose: () => void }) {
  const dialogRef = useSheetDialog(onClose);
  const [stage, setStage] = useState<Stage>("enter");
  const [first, setFirst] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);
  const [saving, setSaving] = useState(false);

  function press(digit: string) {
    setError(false);
    if (pin.length >= 4) return;
    const next = pin + digit;
    setPin(next);
    if (next.length === 4) {
      if (stage === "enter") {
        setFirst(next);
        setPin("");
        setStage("confirm");
      } else {
        if (next === first) {
          finish(next);
        } else {
          setError(true);
          setPin("");
          setStage("enter");
          setFirst("");
        }
      }
    }
  }

  async function finish(finalPin: string) {
    setSaving(true);
    await setAppLockPin(finalPin);
    setSaving(false);
    onClose();
  }

  function backspace() {
    setPin((p) => p.slice(0, -1));
  }

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div
        ref={dialogRef}
        className={styles.sheet}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="pin-setup-sheet-title"
      >
        <div className={styles.grabber} />
        <h2 id="pin-setup-sheet-title" className={styles.title}>
          {stage === "enter" ? "Choose a 4-digit PIN" : "Enter it again to confirm"}
        </h2>
        {error && (
          <p style={{ fontSize: 13, color: "var(--pink)" }}>
            Those didn&apos;t match. Let&apos;s try again.
          </p>
        )}
        <p style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.5 }}>
          Because everything stays on this device, there&apos;s no way to recover a
          forgotten PIN. If you lose it, you&apos;d need to reset the app and lose
          your local data.
        </p>

        <div style={{ display: "flex", justifyContent: "center", gap: 14, margin: "8px 0" }}>
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              style={{
                width: 14,
                height: 14,
                borderRadius: "50%",
                border: "1.5px solid var(--border)",
                background: i < pin.length ? "var(--plum)" : "transparent",
              }}
            />
          ))}
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 10,
            justifyItems: "center",
          }}
        >
          {["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "back"].map((k, i) =>
            k === "" ? (
              <div key={i} />
            ) : (
              <button
                key={i}
                type="button"
                disabled={saving}
                onClick={() => (k === "back" ? backspace() : press(k))}
                className={styles.chip}
                style={{ width: 56, height: 56, borderRadius: "50%", fontSize: 18 }}
              >
                {k === "back" ? "⌫" : k}
              </button>
            )
          )}
        </div>

        <button type="button" className={styles.tertiaryButton} onClick={onClose}>
          Cancel
        </button>
      </div>
    </div>
  );
}

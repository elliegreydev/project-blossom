"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import sheetStyles from "./Sheet.module.css";
import styles from "./InstallAppNudge.module.css";
import { useSheetDialog } from "./useSheetDialog";

type Guide = "ios" | "android" | "other";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISSED_UNTIL_KEY = "blossom-install-nudge-dismissed-until";
const RESURFACE_AFTER_MS = 14 * 24 * 60 * 60 * 1000;

export default function InstallAppNudge() {
  const installPrompt = useRef<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [guide, setGuide] = useState<Guide>("other");
  const [isIOSSafari, setIsIOSSafari] = useState(false);
  const [instructionsOpen, setInstructionsOpen] = useState(false);

  const closeInstructions = useCallback(() => setInstructionsOpen(false), []);
  const dialogRef = useSheetDialog(closeInstructions, instructionsOpen);

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;
    const narrowScreen = window.matchMedia("(max-width: 719px)").matches;
    const phoneBrowser =
      narrowScreen &&
      (window.matchMedia("(pointer: coarse)").matches || process.env.NODE_ENV === "development");

    let dismissedUntil = 0;
    try {
      dismissedUntil = Number(window.localStorage.getItem(DISMISSED_UNTIL_KEY)) || 0;
    } catch {
      // The nudge still works when browser storage is unavailable.
    }

    if (standalone || !phoneBrowser || dismissedUntil > Date.now()) return;

    const userAgent = navigator.userAgent;
    const isiOS =
      /iPad|iPhone|iPod/.test(userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    const isAndroid = /Android/.test(userAgent);
    const safari = isiOS && /Safari/.test(userAgent) && !/CriOS|FxiOS|EdgiOS|OPiOS/.test(userAgent);

    function captureInstallPrompt(event: Event) {
      event.preventDefault();
      installPrompt.current = event as BeforeInstallPromptEvent;
    }

    function hideAfterInstall() {
      installPrompt.current = null;
      setInstructionsOpen(false);
      setVisible(false);
    }

    window.addEventListener("beforeinstallprompt", captureInstallPrompt);
    window.addEventListener("appinstalled", hideAfterInstall);
    const revealTimer = window.setTimeout(() => {
      setGuide(isiOS ? "ios" : isAndroid ? "android" : "other");
      setIsIOSSafari(safari);
      setVisible(true);
    }, 0);

    return () => {
      window.clearTimeout(revealTimer);
      window.removeEventListener("beforeinstallprompt", captureInstallPrompt);
      window.removeEventListener("appinstalled", hideAfterInstall);
    };
  }, []);

  function hideForLater() {
    try {
      window.localStorage.setItem(
        DISMISSED_UNTIL_KEY,
        String(Date.now() + RESURFACE_AFTER_MS)
      );
    } catch {
      // Dismissing still hides the current nudge without browser storage.
    }
    setInstructionsOpen(false);
    setVisible(false);
  }

  async function handleInstall() {
    if (!installPrompt.current) {
      setInstructionsOpen(true);
      return;
    }

    const prompt = installPrompt.current;
    installPrompt.current = null;
    await prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === "accepted") {
      setVisible(false);
    } else {
      hideForLater();
    }
  }

  if (!visible) return null;

  const steps =
    guide === "ios"
      ? [
          ...(!isIOSSafari ? ["Open this page in Safari."] : []),
          "Tap the Share or More button in Safari.",
          "Choose Add to Home Screen.",
          "Turn on Open as Web App, then tap Add.",
        ]
      : guide === "android"
        ? [
            "Open your browser menu, usually the three dots.",
            "Choose Add to Home screen or Install app.",
            "Follow the browser's confirmation steps.",
          ]
        : [
            "Open your browser menu.",
            "Choose Add to Home Screen or Install app.",
            "Follow the browser's confirmation steps.",
          ];

  return (
    <>
      <aside className={styles.nudge} aria-label="Add Blossom to your Home Screen">
        <div className={styles.icon} aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="m4 10 8-6 8 6v9a1 1 0 0 1-1 1h-5v-6h-4v6H5a1 1 0 0 1-1-1Z" />
            <path d="M18 3v5M15.5 5.5h5" />
          </svg>
        </div>
        <div className={styles.content}>
          <span className={styles.label}>Blossom on your phone</span>
          <strong className={styles.title}>Keep Blossom close</strong>
          <p className={styles.copy}>Add it to your Home Screen for quicker, app-like access.</p>
          <button type="button" className={styles.installButton} onClick={handleInstall}>
            Add to Home Screen
          </button>
        </div>
        <button
          type="button"
          className={styles.dismissButton}
          onClick={hideForLater}
          aria-label="Dismiss Home Screen tip"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="m6 6 12 12M18 6 6 18" />
          </svg>
        </button>
      </aside>

      {instructionsOpen && (
        <div
          className={sheetStyles.backdrop}
          onClick={(event) => {
            if (event.target === event.currentTarget) closeInstructions();
          }}
        >
          <div
            ref={dialogRef}
            className={sheetStyles.sheet}
            role="dialog"
            aria-modal="true"
            aria-labelledby="install-app-title"
            aria-describedby="install-app-description"
          >
            <div className={sheetStyles.grabber} aria-hidden="true" />
            <h2 id="install-app-title" className={sheetStyles.title}>
              Add Blossom to your Home Screen
            </h2>
            <p id="install-app-description" className={styles.intro}>
              It only takes a moment and gives Blossom its own icon and app-like window.
            </p>
            <ol className={styles.steps}>
              {steps.map((step, index) => (
                <li key={step} className={styles.step}>
                  <span className={styles.stepNumber} aria-hidden="true">
                    {index + 1}
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
            <p className={styles.note}>This does not enable offline access or change your data.</p>
            <div className={sheetStyles.actions}>
              <button type="button" className={sheetStyles.tertiaryButton} onClick={hideForLater}>
                Not now
              </button>
              <button type="button" className={sheetStyles.primaryButton} onClick={closeInstructions}>
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

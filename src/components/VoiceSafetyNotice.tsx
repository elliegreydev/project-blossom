"use client";

import Link from "next/link";
import { VOICE_SAFETY_POINTS } from "@/lib/voicePractice";
import sheetStyles from "./Sheet.module.css";
import { useSheetDialog } from "./useSheetDialog";
import styles from "./VoiceSafetyNotice.module.css";

// Voice safety, in two shapes.
//
// "inline" is one quiet line that lives permanently on the practice screen,
// where somebody can actually see it mid-session. It is the part that matters
// most: a note dismissed once in March does nobody any good in September.
//
// "sheet" is the fuller read, shown the first time somebody practises and
// again the first time they put a reference range on screen. It has one
// button and it says "got it", not "I agree". Nothing here is a gate, and
// nothing here is consent: it is information, offered at the two moments it
// is most likely to be worth reading.
//
// Everything in it is general vocal health that clinicians publish openly.
// Blossom does not say what your voice should do, does not set a target, and
// does not assess how you sound.

export default function VoiceSafetyNotice({
  variant,
  reason = "first",
  onClose,
  onOpen,
}: {
  variant: "inline" | "sheet";
  reason?: "first" | "ranges";
  onClose?: () => void;
  onOpen?: () => void;
}) {
  // Only the sheet is a dialog. Passing active=false keeps the inline line
  // from stealing focus and swallowing Escape on the practice screen.
  const dialogRef = useSheetDialog(onClose ?? (() => {}), variant === "sheet");

  if (variant === "inline") {
    return (
      <button type="button" className={styles.inline} onClick={onOpen}>
        <span className={styles.inlineIcon} aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 9v4M12 17h.01" />
            <path d="M10.3 3.9 2 18a2 2 0 0 0 1.7 3h16.6a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
          </svg>
        </span>
        <span className={styles.inlineText}>
          <strong>Stop if it hurts.</strong> Hoarseness, throat pain, or a voice that tires
          quickly all mean stop for today. Reaching a pitch by pushing is how voices get hurt.
        </span>
      </button>
    );
  }

  return (
    <div className={sheetStyles.backdrop} onClick={onClose}>
      <div
        ref={dialogRef}
        className={sheetStyles.sheet}
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="voice-safety-title"
      >
        <div className={sheetStyles.grabber} />
        <h2 id="voice-safety-title" className={sheetStyles.title}>
          {reason === "ranges" ? "About those ranges" : "Before you start"}
        </h2>
        <p className={sheetStyles.helpText}>
          {reason === "ranges"
            ? "You've put a reference range on screen, so this is worth a minute. A line to aim at is exactly the thing that tempts people to push."
            : "A couple of minutes now, then this stays out of your way."}
        </p>

        <ul className={styles.points}>
          {VOICE_SAFETY_POINTS.map((point) => (
            <li key={point.title}>
              <strong>{point.title}</strong>
              <span>{point.body}</span>
            </li>
          ))}
        </ul>

        <p className={styles.evidence}>
          In some studies up to 30% of trans women arriving for voice therapy already had a
          voice injury, usually from practising alone without support. That isn&apos;t here to
          put you off. It&apos;s why this screen exists, and why there&apos;s a line about it
          on the practice screen too.
        </p>

        <div className={sheetStyles.actions}>
          <Link href="/care/voice/learning" className={sheetStyles.tertiaryButton} onClick={onClose}>
            Where to learn properly
          </Link>
          <button type="button" className={sheetStyles.primaryButton} onClick={onClose}>
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}

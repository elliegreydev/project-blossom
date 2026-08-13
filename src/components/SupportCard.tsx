"use client";

import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import { db, LOCAL_PROFILE_ID, dismissSupportPromptForever, snoozeSupportPrompt } from "@/lib/db";
import { shouldOfferSupport } from "@/lib/support";
import styles from "./SupportCard.module.css";

/**
 * The chip-in card on Home.
 *
 * Rendered after the day's blocks rather than as one of them, so it can't be
 * dragged to the top of someone's Home and can't be the first thing they see.
 * It doesn't appear at all in the first week, and it stays gone once someone
 * says it should - see src/lib/support.ts for the rules and why.
 *
 * The copy names the actual thing money pays for. "Support us" asks for a
 * favour; "this is what keeps the crisis numbers correct" asks for something.
 */
export default function SupportCard() {
  const profile = useLiveQuery(() => db.profiles.get(LOCAL_PROFILE_ID));
  if (!profile) return null;

  const show = shouldOfferSupport({
    onboardingCompletedAt: profile.onboardingCompletedAt,
    hiddenUntil: profile.supportPromptHiddenUntil,
    dismissedForever: profile.supportPromptDismissedForever,
  });
  if (!show) return null;

  return (
    <aside className={styles.card} aria-labelledby="support-title">
      <p className={styles.eyebrow}>Keeping Blossom going</p>
      <h2 id="support-title" className={styles.title}>Blossom is free, and we&rsquo;d like to keep it that way</h2>
      <p className={styles.body}>
        The app costs almost nothing to run. What costs is the checking: every support service
        listed in Blossom was verified by a person, and the notes on your rights get rewritten
        when the law changes. If you can spare something, that&rsquo;s what it pays for.
      </p>

      <div className={styles.actions}>
        <Link href="/support-blossom" className={styles.primary}>Chip in what you like</Link>
        {/* "Maybe later" rather than "Not now": the Aurora nudge on this same
            screen already uses "Not now", and two identical controls on one
            page is confusing to hear read out. */}
        <button type="button" className={styles.secondary} onClick={() => void snoozeSupportPrompt()}>
          Maybe later
        </button>
      </div>

      <button type="button" className={styles.forever} onClick={() => void dismissSupportPromptForever()}>
        I&rsquo;ve already chipped in, or I&rsquo;d rather not be asked
      </button>
    </aside>
  );
}

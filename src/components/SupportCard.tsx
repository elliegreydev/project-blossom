"use client";

import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import { db, LOCAL_PROFILE_ID, dismissSupportPromptForever, snoozeSupportPrompt } from "@/lib/db";
import { shouldOfferSupport, supportConfigured } from "@/lib/support";
import styles from "./SupportCard.module.css";

/**
 * Blossom's two ways of mentioning money on Home, and they are not the same
 * thing.
 *
 * The **card** is the ask. It's rendered after the day's blocks rather than as
 * one of them, so it can't be dragged to the top of someone's Home and can't be
 * the first thing they see. It stays away for the first week and goes quiet for
 * a month and a half when snoozed - see src/lib/support.ts for the rules.
 *
 * The **link** is a doorway, and it's always there. Somebody who wants to chip
 * in shouldn't have to wait a week or go hunting through Settings to find out
 * how, and a line of muted text is not an ask. Being findable and being asked
 * are different dials; this component turns the first one up without touching
 * the second.
 *
 * The one person who gets neither is somebody who pressed "I'd rather not be
 * asked". A standing link on their Home would be ignoring what they told us,
 * quiet or not. Settings still has it if they change their mind.
 *
 * The card's copy names the actual thing money pays for. "Support us" asks for
 * a favour; "this is what keeps the crisis numbers correct" asks for something.
 */
export default function SupportCard() {
  const profile = useLiveQuery(() => db.profiles.get(LOCAL_PROFILE_ID));
  if (!profile) return null;

  // Nothing to point at until there's somewhere to give.
  if (!supportConfigured()) return null;
  if (profile.supportPromptDismissedForever) return null;

  const show = shouldOfferSupport({
    onboardingCompletedAt: profile.onboardingCompletedAt,
    hiddenUntil: profile.supportPromptHiddenUntil,
    dismissedForever: profile.supportPromptDismissedForever,
  });

  if (!show) {
    return (
      <Link href="/support-blossom" className={styles.quietLink}>
        Keep Blossom running
      </Link>
    );
  }

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

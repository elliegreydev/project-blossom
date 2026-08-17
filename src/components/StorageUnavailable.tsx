"use client";

import styles from "./StorageUnavailable.module.css";

/**
 * What to show when the device won't let Blossom store anything.
 *
 * Blossom is local-first, so if IndexedDB will not open there is no app: no
 * profile, no entries, nothing to show. Until this existed, that failure had
 * no screen at all. getOrCreateProfile rejected, nothing caught it, the flag
 * that ends the loading state was never set, and the person sat on "Opening
 * your space" with three animating dots until they gave up and closed the tab.
 * Somebody did exactly that on the night Blossom was first posted publicly.
 *
 * The overwhelmingly likely cause is a private window. That matters more here
 * than it would in most apps: the people most drawn to an app that promises to
 * keep their transition on their own device are the same people who open a new
 * thing in private browsing first. The failure was hitting precisely the users
 * the app is for, and telling them nothing.
 *
 * So the copy leads with the explanation rather than the apology, does not
 * blame the browser or the person, and gives the one move that actually fixes
 * it. It also says plainly that nothing was lost, because somebody who has
 * been using Blossom for months and suddenly sees this needs to know that
 * before anything else.
 */
export default function StorageUnavailable({ onRetry }: { onRetry?: () => void }) {
  return (
    <main className={styles.page}>
      <div className={styles.card}>
        <div className={styles.mark} aria-hidden="true">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icon-192.png" alt="" width={54} height={54} />
        </div>

        <h1>Blossom can&apos;t save anything on this device</h1>

        <p>
          Blossom keeps what you write on your own device rather than on a server. That&apos;s
          rather the point of it. Right now this browser isn&apos;t letting it store anything,
          so there&apos;s nowhere for your things to go and the app can&apos;t open.
        </p>

        <div className={styles.likely}>
          <strong>Usually this is a private window.</strong>
          <p>
            Private and incognito windows block the storage Blossom needs, or empty it the
            moment you close them. Opening Blossom in a normal window is almost always the
            fix.
          </p>
        </div>

        <p className={styles.alsoLabel}>If you&apos;re not in a private window:</p>
        <ul className={styles.list}>
          <li>Check whether your browser is set to block site data or cookies for this site.</li>
          <li>
            Some content blockers and privacy extensions block storage too. Allowing
            projectblossom.net usually sorts it.
          </li>
          <li>If your device is very low on space, free a little up and reload.</li>
        </ul>

        <p className={styles.reassure}>
          If you&apos;ve used Blossom on this device before, nothing has been deleted. Blossom
          simply can&apos;t reach it at the moment, and it&apos;ll be there when it can.
        </p>

        {onRetry && (
          <button type="button" className={styles.button} onClick={onRetry}>
            Try again
          </button>
        )}

        <p className={styles.footnote}>
          Still stuck? Email <a href="mailto:support@projectblossom.net">support@projectblossom.net</a>{" "}
          and tell us which browser you&apos;re using. It genuinely helps.
        </p>
      </div>
    </main>
  );
}

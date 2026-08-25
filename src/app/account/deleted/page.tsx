import type { Metadata } from "next";
import Link from "next/link";
import styles from "../account.module.css";

export const metadata: Metadata = {
  title: "Account deleted",
  robots: { index: false, follow: false },
};

/**
 * Where somebody lands the moment their account is gone.
 *
 * Deliberately dull. It says what happened, it says what it did not touch, and
 * it gives them a name to email if any of that looks wrong. It does not ask
 * why they left, it does not offer to bring anything back, and the only way on
 * from here is an ordinary link back into an empty Blossom.
 *
 * Nothing on this page reads the database or the session, because by the time
 * it renders there is neither. It is safe to reload, and safe to screenshot.
 */
export default async function AccountDeletedPage({
  searchParams,
}: {
  searchParams: Promise<{ at?: string; device?: string }>;
}) {
  const { at, device } = await searchParams;
  // Set only when this device's local Blossom data belonged to a different
  // account and was therefore left alone. Saying "everything on this device is
  // gone" to somebody whose device still holds a housemate's journal would be
  // a comfortable sentence and a false one.
  const deviceKept = device === "kept";
  const parsed = at ? new Date(at) : null;
  // Rendered on the server, which runs in UTC while most of Blossom's people
  // are in the UK, so a bare local-looking time would be an hour out half the
  // year. Pinned to London and named, so for almost everybody reading it, it
  // matches the clock in their hand, and for anybody else it says which clock
  // it is. Somebody checking a receipt to see whether this really just
  // happened should not have to do arithmetic on it.
  const deletedAt =
    parsed && !Number.isNaN(parsed.getTime())
      ? parsed.toLocaleString("en-GB", {
          day: "numeric",
          month: "long",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          timeZone: "Europe/London",
          timeZoneName: "short",
        })
      : null;

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.header}>
          <span className={styles.eyebrow}>Deletion receipt</span>
          <h1>Your Blossom account has been deleted.</h1>
          <p>{deletedAt ? `Completed ${deletedAt}.` : "Completed just now."}</p>
        </header>

        <section className={`${styles.card} ${styles.cardText}`}>
          <p>
            {deviceKept
              ? "Your account and everything that was synced to it has been removed from Blossom’s servers, and you’re signed out. This device’s own Blossom data belongs to a different account, so it hasn’t been touched."
              : "Your account and everything that was synced to it has been removed from Blossom’s servers, and Blossom’s data on this device has been cleared. You’re signed out."}
          </p>
          <p>
            Anything you exported and downloaded yourself is yours, and it hasn&rsquo;t been
            touched. Blossom on any other device still has its own copy there until you clear it.
          </p>
          <p>
            If something about this doesn&rsquo;t look right, email{" "}
            <a href="mailto:support@projectblossom.net">support@projectblossom.net</a>.
          </p>
          {/* Said here because the link below leads there. Blossom with no
              local profile sends you into setup, and being dropped into
              "welcome, what shall we call you" unwarned, seconds after
              deleting your account, would read as the app not having
              listened. */}
          {deviceKept ? null : (
            <p>
              If you ever want to begin again, Blossom will take you through a fresh, private setup.
            </p>
          )}
        </section>

        <Link href="/" className={styles.back}>
          {deviceKept ? "Open Blossom" : "Start fresh"}
        </Link>
      </div>
    </main>
  );
}

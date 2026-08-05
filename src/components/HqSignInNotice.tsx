import styles from "@/app/account/account.module.css";

// Shown in place of the email code sign-in on the dev deployment only, where
// Grey Studios HQ is the way in. Never rendered on production: the pages that
// use it guard on isHqDevEntry(), which is false everywhere but dev.

export default function HqSignInNotice({ purpose }: { purpose: "account" | "beta" }) {
  return (
    <section className={styles.card}>
      <div className={styles.cardHeading}>
        <div className={styles.icon} aria-hidden="true">HQ</div>
        <div>
          <h2>Sign in from Grey Studios HQ</h2>
          <p>
            {purpose === "beta"
              ? "This is the dev build of Blossom, so beta access is opened from HQ rather than by email."
              : "This is the dev build of Blossom, so sign-in is opened from HQ rather than by email."}
          </p>
        </div>
      </div>
      <p>
        Open HQ, find Blossom, and use the dev entry link there. It signs you in
        on this device and hands you full staff access straight away. Email
        codes are switched off here, and the link only works for a minute or so,
        so open a fresh one if it goes stale.
      </p>
      <p className={styles.syncMeta}>
        Nothing on this screen affects the live app at projectblossom.net, where
        email sign-in works exactly as it always has.
      </p>
    </section>
  );
}

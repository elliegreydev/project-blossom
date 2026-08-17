import styles from "@/app/account/account.module.css";

/**
 * What somebody sees where the email sign-in would be, on the test build.
 *
 * This used to be written for staff: it told the reader to open Grey Studios
 * HQ and use the dev entry link, which "hands you full staff access straight
 * away". That was correct when the only people here were Ellie and Sarah. Now
 * outside testers are being invited in with a code, and a tester from Reddit
 * has no HQ, so the old wording read as a locked door with instructions they
 * could not follow.
 *
 * Written for the tester now, because they are who actually reaches it. Staff
 * arrive already signed in through /api/hq-enter, so they see the signed-in
 * screen rather than this one; the line for them is a footnote for the case
 * where somebody signed out.
 *
 * The important thing this has to get across is that there is nothing wrong.
 * No account is not a broken feature, it is how the test build is meant to
 * work, and Blossom is local-first anyway so almost everything still does.
 */
export default function DevSignInNotice({ purpose }: { purpose: "account" | "beta" }) {
  return (
    <section className={styles.card}>
      <div className={styles.cardHeading}>
        <div className={styles.icon} aria-hidden="true">✳</div>
        <div>
          <h2>
            {purpose === "beta"
              ? "The beta isn't part of the test version"
              : "No accounts in the test version"}
          </h2>
          <p>
            {purpose === "beta"
              ? "Beta access lives on the real app, not here."
              : "Nothing to sign up for, and nothing to sign in to."}
          </p>
        </div>
      </div>
      <p>
        This build doesn&apos;t do accounts on purpose, so there&apos;s no email to give and
        nothing of yours ends up on a server. Everything you do here stays on this device,
        which is how Blossom works by default anyway, so you can still try more or less all
        of it.
      </p>
      <p>
        The parts you can&apos;t try here are the ones that need an account: syncing between
        devices, and Aurora AI. Those live on the real app at{" "}
        <a href="https://projectblossom.net">projectblossom.net</a>, where syncing is still
        off until you switch it on yourself.
      </p>
      <p className={styles.syncMeta}>
        Staff: come in through the dev entry link in HQ, which signs you in on this device.
        Nothing on this screen affects the live app.
      </p>
    </section>
  );
}

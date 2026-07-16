import Link from "next/link";
import styles from "../legal.module.css";

export const metadata = { title: "Privacy Policy - Blossom" };

export default function PrivacyPolicyPage() {
  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <Link href="/" className={styles.back}>← Back to Blossom</Link>

        <header className={styles.header}>
          <span className={styles.eyebrow}>Legal</span>
          <h1>Privacy Policy</h1>
          <p className={styles.updated}>Draft - last updated 16 July 2026</p>
        </header>

        <div className={styles.draftNotice}>
          This is a draft, written to accurately describe how Blossom actually
          works today. It hasn&apos;t been reviewed by a lawyer yet, and
          shouldn&apos;t be treated as final until it has.
        </div>

        <div className={styles.body}>
          <section>
            <h2>The short version</h2>
            <p>
              Blossom is built local-first: everything works fully without an
              account, and your data lives on your own device unless you
              choose to sign in. We never sell your data. We don&apos;t show
              ads or use tracking analytics. You can export or delete
              everything at any time from Settings.
            </p>
          </section>

          <section>
            <h2>Who this applies to</h2>
            <p>
              Blossom is for transgender, nonbinary, and questioning adults
              aged 18 and over. We ask you to confirm your age when you set
              up the app; we don&apos;t verify it with ID, and we don&apos;t
              ask for your legal name, sex assigned at birth, or any
              diagnosis.
            </p>
          </section>

          <section>
            <h2>What stays on your device only</h2>
            <p>
              Some things never leave your device, whether or not you sign
              in: journal entries and check-in notes, any photos you add to
              presentation or body &amp; progress tracking, your app lock
              PIN, and accessibility preferences. We can&apos;t see this data
              and it isn&apos;t included if you turn on sync.
            </p>
          </section>

          <section>
            <h2>What can sync, if you choose to sign in</h2>
            <p>
              Signing in is entirely optional. If you turn on sync, the
              following can be stored on our server (hosted on Supabase) so
              it follows you between devices: your profile (display name,
              pronouns, region, preferences), medication schedules and
              logs, appointments, goals, milestones, and check-in ratings
              (not the written notes). If you enable background reminders,
              we also store a push notification subscription for your
              device - just the technical address needed to deliver a
              notification, not any message content beyond what&apos;s sent
              at the moment of delivery.
            </p>
          </section>

          <section>
            <h2>Your account</h2>
            <p>
              We use email sign-in codes (no passwords) via Supabase Auth.
              Your email only proves you own that address - it doesn&apos;t
              need to match your real name, and we don&apos;t require any
              other identity information to create an account.
            </p>
          </section>

          <section>
            <h2>How your data is protected</h2>
            <p>
              Synced data is protected by row-level security, meaning the
              database itself enforces that only your own signed-in account
              can read or write your rows. Data is encrypted at rest by our
              hosting provider. Being fully honest about where we are today:
              this is not yet full end-to-end encryption, so it&apos;s
              theoretically possible for someone with direct database
              administrator access to see synced records, in the same way
              that&apos;s true of most apps at this stage. We consider this a
              real limitation, not a footnote, and stronger encryption for
              synced data is something we want to build toward.
            </p>
          </section>

          <section>
            <h2>Notifications</h2>
            <p>
              By default, reminders are discreet and never mention
              medication names, appointment types, or journal content - they
              just say something like &ldquo;you have something
              scheduled.&rdquo; You can opt into more detailed reminder text
              if you&apos;d prefer that instead.
            </p>
          </section>

          <section>
            <h2>Aurora</h2>
            <p>
              Aurora, Blossom&apos;s in-app guide, is rule-based rather than
              a conversational AI. It doesn&apos;t hold conversations, and we
              don&apos;t store any chat-style content from it - only minimal
              state needed to avoid repeating the same suggestion (which
              nudge was shown, and when).
            </p>
          </section>

          <section>
            <h2>Support resources</h2>
            <p>
              The regional support resources shown in the app are a static,
              human-curated list. Viewing them doesn&apos;t share any data
              with those organisations, and Blossom isn&apos;t affiliated
              with them.
            </p>
          </section>

          <section>
            <h2>Who we share data with</h2>
            <p>
              We do not sell your data, to anyone, ever. We don&apos;t share
              it with advertisers. We use a small number of infrastructure
              providers to run the service - currently Supabase (database and
              authentication) and Vercel (hosting) - who process data only to
              provide those services to us, under their own security
              commitments, and are not permitted to use your data for their
              own purposes.
            </p>
          </section>

          <section>
            <h2>Your controls</h2>
            <ul>
              <li>Export all of your data at any time (Settings &gt; Data controls).</li>
              <li>Delete all of your data at any time, whether or not you&apos;ve signed in.</li>
              <li>Pause sync without losing anything stored locally.</li>
              <li>Sign out while keeping your data on that device.</li>
            </ul>
          </section>

          <section>
            <h2>Changes to this policy</h2>
            <p>
              If this policy changes in a meaningful way, we&apos;ll update
              the date at the top of this page.
            </p>
          </section>

          <section>
            <h2>Contact</h2>
            <p>[contact email to be added]</p>
          </section>
        </div>

        <p className={styles.crossLink}>
          Also see our <Link href="/legal/terms">Terms of Service</Link>.
        </p>
      </div>
    </main>
  );
}

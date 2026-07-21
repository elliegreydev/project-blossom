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
          <p className={styles.updated}>Beta draft - last updated 21 July 2026</p>
        </header>

        <div className={styles.draftNotice}>
          This is Blossom&apos;s current beta privacy policy. It describes the app as it works today,
          but it is still being reviewed before any wider public release. We&apos;ll clearly publish a
          final version, with our legal contact details and retention periods, before that happens.
        </div>

        <div className={styles.body}>
          <section>
            <h2>The short version</h2>
            <p>
              Blossom is local-first. You can use it without an account, and most of the more
              sensitive things you write stay on your own device. Signing in and sync are optional.
              We do not sell your data, show ads, or use third-party behavioural tracking.
            </p>
          </section>

          <section>
            <h2>Who this applies to</h2>
            <p>
              Blossom is for transgender, nonbinary, and questioning adults aged 18 and over. We ask
              you to confirm your age during setup. We do not ask for ID, a legal name, sex assigned
              at birth, or a diagnosis.
            </p>
          </section>

          <section>
            <h2>Who is responsible for your data</h2>
            <p>
              Project Blossom is responsible for the personal data handled through the app. Our legal
              contact details are being finalised for beta and will be added here before wider public
              release. Until then, use the support route in the app for privacy questions or requests.
            </p>
          </section>

          <section>
            <h2>What stays on your device</h2>
            <p>
              The following stays on the device where you create it and is not included in sync:
              journal entries and written check-in notes; Aurora AI conversation history; gender-euphoria entries and Time Capsule
              entries; photos; blood-test records; voice recordings and practice notes; body and
              presentation tracking; weight entries, weight preferences and food/calorie logs;
              social-transition plans and private contact notes; budget entries; Intimacy &amp; wellbeing entries;
              safety check-ins and trusted-contact details; saved private links; your app lock, PIN,
              biometric credential reference, accessibility choices, and Home layout choices.
            </p>
            <p>
              Blossom does not receive your biometric data. Your device handles that itself; Blossom
              only keeps a local reference that lets it ask the device to unlock the app.
            </p>
          </section>

          <section>
            <h2>What can sync when you choose it</h2>
            <p>
              If you sign in and turn on sync, we store selected data in Supabase so it can follow you
              between your signed-in devices. This can include your profile and preferences; journey
              milestones and timeline; medications, schedules, dose logs, medication supplies and care
              supplies; appointments, including appointment-builder details and private appointment
              notes; numeric check-in ratings; goals; and the minimal Aurora state needed to avoid
              repeating the same nudge.
            </p>
            <p>
              Written journal and check-in notes, Intimacy &amp; wellbeing entries, photos, blood tests, voice recordings, social plans,
              budget data, safety contacts, and the other device-only categories above do not sync.
            </p>
          </section>

          <section>
            <h2>Your account and device storage</h2>
            <p>
              We use Supabase Auth for passwordless email sign-in. Your email address is used to create
              and secure your account. Blossom also uses essential browser storage, such as IndexedDB,
              local storage and authentication cookies, to keep your local data, session and settings
              working. We do not use advertising cookies.
            </p>
          </section>

          <section>
            <h2>Notifications and reminders</h2>
            <p>
              If you enable notifications, we store a technical push subscription for that device and
              process the synced reminder schedule needed to send a reminder. By default notifications
              are discreet. If you choose detailed notifications, a medication name or appointment title
              may be included in the notification sent through your browser or operating system&apos;s push
              service. You can turn notifications off in Blossom or in your device settings.
            </p>
          </section>

          <section>
            <h2>Sharing you choose</h2>
            <p>
              Blossom never shares your information automatically. Trusted Circle lets you grant a
              signed-in person read-only access to only the categories you choose. Blossom Bridge lets
              you create a temporary, read-only link for someone without an account. Both are optional,
              category-by-category, and revocable. We keep an in-app access history for these shares.
            </p>
            <p>
              A Bridge recipient needs the link itself, so treat it like sensitive information. Revoking
              a link or Trusted Circle grant stops future Blossom access, but cannot remove something a
              recipient has already read, copied, saved or screenshotted.
            </p>
          </section>

          <section>
            <h2>Exports</h2>
            <p>
              You can create exports, including selected Blossom Passport PDFs and structured data
              files. These are created for you to download and share. Once an export has left Blossom,
              you control where it goes and who receives it.
            </p>
          </section>

          <section>
            <h2>Support access</h2>
            <p>
              If you ask for help with a synced account, a staff member may open a time-limited support
              case. While that case is open, authorised staff can see the synced profile, medication,
              appointment, goal and journey information needed to help. Each normal in-app access is
              logged. Journal text, written check-in notes and device-only categories cannot be reached
              through support access because they never sync.
            </p>
          </section>

          <section>
            <h2>Beta chat, feedback and applications</h2>
            <p>
              Beta chat is a shared space, not a private journal. Messages and the display name you use
              there are visible to other beta testers and Blossom staff. Feature requests submitted to
              the public ideas board are visible publicly. Bug reports, contact emails and staff
              applications are visible only to authorised Blossom staff. Please do not put medical or
              other highly sensitive information into public ideas or beta chat.
            </p>
          </section>

          <section>
            <h2>How we use information</h2>
            <p>
              We use information to provide the features you choose, keep your account and data secure,
              deliver reminders you enable, respond to support requests, run beta features, and improve
              the service. Staff can view aggregate operational statistics for synced accounts, such as
              total account numbers, broad regions and module uptake. These statistics are not used for
              advertising, and local-only use leaves no server-side analytics trail.
            </p>
          </section>

          <section>
            <h2>How we protect synced data</h2>
            <p>
              Synced data is protected by row-level security so a signed-in account can access its own
              records, with the limited sharing and support exceptions described above. Our providers
              encrypt stored data. Synced data is not currently end-to-end encrypted, so authorised
              service administrators could theoretically access it where necessary to operate or secure
              the service. We treat that as a real limitation, not a hidden footnote.
            </p>
          </section>

          <section>
            <h2>Providers and external links</h2>
            <p>
              We currently use Supabase for authentication and synced data, Vercel to host Blossom, and
              your browser or operating system&apos;s push service if you enable notifications. Those
              services process data only to provide their services to us. Their infrastructure may
              involve processing outside the UK; the final public policy will list the current locations
              and safeguards after legal review.
            </p>
            <p>
              Regional resources are curated by Blossom&apos;s team. Opening a resource may take you to an
              external organisation&apos;s website, which has its own privacy policy. Blossom is not
              affiliated with every organisation listed.
            </p>
          </section>

          <section>
            <h2>Retention and deletion</h2>
            <p>
              You can delete local Blossom data from your device and request deletion of a synced account
              from Settings. Deleting an account removes the associated live synced data, subject to
              short technical backup retention where needed for security and recovery. We are still
              setting the precise retention periods for support cases, access logs, beta chat, feedback,
              applications and backups. Those periods will be published before wider public release.
            </p>
          </section>

          <section>
            <h2>Your rights and choices</h2>
            <p>
              Depending on the law that applies to you, you may have rights to access, correct, erase,
              restrict, object to, or receive a copy of your personal data, and to complain to the UK
              Information Commissioner&apos;s Office. You can already export, pause sync, sign out, manage
              sharing and delete data through Blossom&apos;s settings. A final reviewed policy will state the
              legal bases and special-category health-data condition used for each processing purpose.
            </p>
          </section>

          <section>
            <h2>Aurora</h2>
            <p>
              Aurora&apos;s ordinary Home suggestions are rule-based. Aurora AI is an optional, signed-in beta
              feature. Before someone sends their first AI message, Blossom explains that the typed message
              is sent to Anthropic to generate a reply. Blossom does not automatically send journal entries,
              medication records, weight or food logs, photos, voice notes, private plans, or other device-only
              information to Aurora AI.
            </p>
            <p>
              Aurora AI conversation history stays on the person&apos;s device by default and can be deleted there.
              Blossom keeps only aggregate usage information needed to apply safety, rate and spending limits;
              it does not keep AI prompts or replies in its own database. Aurora AI does not make decisions with
              legal or similarly significant effects, and it cannot diagnose, prescribe, monitor emergencies, or
              contact anyone on a person&apos;s behalf.
            </p>
          </section>

          <section>
            <h2>Changes to this policy</h2>
            <p>
              If we make a meaningful change, we will update the date on this page and, where
              appropriate, tell signed-in users in the app.
            </p>
          </section>

          <section>
            <h2>Contact</h2>
            <p>Legal contact details will be added before Blossom&apos;s wider public release.</p>
          </section>
        </div>

        <p className={styles.crossLink}>
          Also see our <Link href="/legal/terms">Terms of Service</Link>.
        </p>
      </div>
    </main>
  );
}

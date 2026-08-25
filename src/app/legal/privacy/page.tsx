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
          <p className={styles.updated}>Last updated 25 August 2026</p>
        </header>

        <div className={styles.draftNotice}>
          This describes Blossom exactly as it works today. One thing is still outstanding and is
          marked where it appears: the exact retention periods for support cases, logs and backups.
          This policy has not yet been reviewed by a solicitor.
        </div>

        <div className={styles.body}>
          <section>
            <h2>The short version</h2>
            <p>
              Blossom is local-first. You can use it without an account, and most of the more
              sensitive things you write stay on your own device. Signing in and sync are optional.
              We do not sell your data, show ads, or use third-party behavioural tracking. There is
              no analytics or advertising code in Blossom at all - not a reduced amount, none.
            </p>
          </section>

          <section>
            <h2>Who this applies to</h2>
            <p>
              Blossom is for transgender, nonbinary, and questioning adults aged 18 and over. We ask
              you to confirm your age during setup, and that confirmation is all we keep - we never
              ask for or store a date of birth. We do not ask for ID, a legal name, sex assigned at
              birth, or a diagnosis.
            </p>
          </section>

          <section>
            <h2>Who is responsible for your data</h2>
            <p>
              Blossom is a project of Grey Studios, and Grey Studios is responsible for the personal
              data handled through the app. Where this policy says &ldquo;we&rdquo;, that means Grey
              Studios. It is also why some of what follows describes data being handled by Grey
              Studios rather than by Blossom itself: the people who run Blossom and the people who
              would see a support message or a crash report are the same small team, working in the
              same company.
            </p>
            <p>
              For anything to do with your data, including asking for a copy of it, correcting it,
              or asking us to delete it, email{" "}
              <a href="mailto:support@projectblossom.net">support@projectblossom.net</a>. You can
              also use the support route inside the app, which reaches the same people. You do not
              need an account to email us, and you do not have to explain why you are asking.
            </p>
            <p>
              Grey Studios does not yet have a published postal address. If you need one, for a
              complaint or a formal request, ask at the address above and we will provide it
              directly.
            </p>
          </section>

          <section>
            <h2>What stays on your device</h2>
            <p>
              The following never syncs and is never sent to Blossom&apos;s servers, no exceptions,
              whether you&apos;re signed out, signed in, or have sync turned on: <strong>all photos</strong>
              (presentation and body/progress tracking) and <strong>all voice recordings</strong> (voice
              practice sessions). These only ever exist on the device you took or recorded them on.
            </p>
            <p>
              The following also stays on the device where you create it: your gender-euphoria
              entries, including any you have sealed as a Time Capsule to reopen later; any trips
              you plan in Travel Mode, including where you are going
              and when; unsaved drafts of journal entries and check-in notes, which Blossom keeps as
              you type so a crash or a restart can&apos;t lose them; your app lock PIN, biometric
              credential reference, accessibility choices, and Home layout choices. To be exact
              about the app lock: the PIN itself and the biometric reference never leave the
              device, but the fact that you have an app lock switched on does travel with your
              account, so a new device knows to ask for it.
            </p>
            <p>
              Because Blossom is built to work without a signal, your device also keeps a copy of the
              app itself - its pages, images and fonts - so it can open on a train or anywhere else
              offline. That cache holds the app, not your entries, and clearing your browser or app
              storage removes it.
            </p>
            <p>
              Blossom does not receive your biometric data. Your device handles that itself; Blossom
              only keeps a local reference that lets it ask the device to unlock the app.
            </p>
            <p>
              If you use Blossom without signing in, or sign in but leave sync off, nothing you
              record in the app is sent to Blossom&apos;s servers - everything above stays local,
              and so does everything listed as syncable below. The one exception is anything you
              deliberately send us: if you open a support ticket or post feedback, that is stored
              on our servers whether or not sync is on, because there is no other way for it to
              reach us.
            </p>
          </section>

          <section>
            <h2>What can sync when you choose it</h2>
            <p>
              If you sign in and turn on sync, we store selected data in Supabase so it can follow you
              between your signed-in devices. This can include your profile and preferences; journey
              milestones and timeline; medications, schedules, dose logs, medication supplies and care
              supplies; appointments, including the questions and details you prepare for an appointment in
              advance and any private notes you add afterwards; check-in ratings and notes; goals;
              the minimal Aurora state needed to avoid
              repeating the same nudge; journal entries; blood-test records; voice practice goals and
              session notes (never the recording itself); presentation and body/progress tracking data
              such as category, rating and measurements (never the photo itself); weight and
              food/calorie logs; budget entries and goals; Intimacy &amp; wellbeing entries; safety
              check-ins; your saved private links; your Personal Support Map (private contacts and
              approximate locations you&apos;ve saved); your waiting list referrals and the updates
              you log against them, including the service, your reference number and what you were
              told when you chased; and your self-directed care record, which includes whether
              anyone is monitoring you, when you started and how often you mean to check bloods.
              The last two were missing from this list until 25 August 2026, which was an error on
              our part rather than a change in what syncs.
            </p>
            <p>
              None of this is currently visible to Blossom staff through the support-access system
              described below, even while synced - staff support access only reaches the smaller set
              of categories it already covered before this list expanded. Photos, voice recordings,
              gender-euphoria and Time Capsule entries, and Travel Mode trips never sync at all, as
              described above.
            </p>
            <p>
              You control this category by category. In Account &amp; sync, &ldquo;Choose what
              syncs&rdquo; lets you keep any of the groups above on your devices only while the rest
              still syncs. Turning a category off stops it being uploaded from then on, and offers to
              delete what was already uploaded. Nothing is ever removed from your own devices when you
              do that.
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
            <p>
              The access history records that a link was opened and when. It deliberately does not
              record who opened it - no name, no IP address, nothing about their device - so it can
              tell you your link has been used without turning into a log of the person you shared
              it with.
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
              If you ask for help with a synced account, you can give a staff member a code that
              grants them time-limited access. While that access is live, authorised staff can see
              the synced profile, medication, appointment, goal, journey and check-in information
              needed to help. Being straight about the extent of it: that access can also change
              and delete those records, not only read them, because fixing something usually means
              editing it. Each normal in-app access is logged. It expires on its own, and if you
              want it stopped sooner, ask us and we will end it, since at present only staff can
              end it from their side. We are changing that so you can revoke it yourself. Journal text, blood-test records, voice practice notes, presentation and
              body/progress tracking, weight and food/calorie logs, budget entries, Intimacy &amp;
              wellbeing entries, safety check-ins, private links, and your Personal Support Map cannot
              currently be reached through support access - not because they don&apos;t sync, but
              because we have deliberately not extended staff access to reach them. Photos, voice
              recordings, and gender-euphoria and Time Capsule entries cannot be reached either way,
              since they never sync at all.
            </p>
          </section>

          <section>
            <h2>When you write to support</h2>
            <p>
              A support message is not covered by any of the choices above. When you open a support
              ticket, the category you pick and everything you type into it are stored on our servers
              as ordinary text, and they stay there whether or not you use sync and whether or not a
              support case is ever opened on your account. Authorised Blossom staff can read them.
              This is the one place in Blossom where something you write is visible to us by default,
              so it is worth knowing before you write it.
            </p>
            <p>
              Staff read and reply to tickets through Grey Studios&apos; own internal system rather
              than through Blossom, so your message and the display name and email on your account
              are visible there too. It is the same company and the same small team described at the
              top of this policy, and tickets are not shared outside it.
            </p>
            <p>
              You do not have to put anything sensitive in a ticket for us to help. If something is
              easier to describe without the detail, describe it without the detail.
            </p>
          </section>

          <section>
            <h2>Feedback and applications</h2>
            <p>
              Feature requests submitted to the public ideas board are visible publicly. Bug reports,
              contact emails and staff applications are visible only to authorised Blossom staff.
              Please do not put medical or other highly sensitive information into a public idea.
            </p>
          </section>

          <section>
            <h2>When Blossom breaks</h2>
            <p>
              When something in Blossom fails, the app sends a report to Grey Studios so we find out
              rather than waiting for someone to tell us. A report carries the shape of the failure and
              nothing else: which part of the app was doing what, a short code for the kind of error,
              and whether it happened on the live site or our test one.
            </p>
            <p>
              It never carries anything you have written. Not journal text, notes, moods, search terms
              or email addresses. It also never carries the raw error message, because databases
              sometimes quote the offending record back inside one, and a message about a journal entry
              could otherwise contain the entry.
            </p>
            <p>
              If you are signed in, the report includes your account reference so we can tell one
              person hitting a problem repeatedly from a hundred people hitting it once. That reference
              is the same identifier your account uses, so we can connect a report back to an account
              if we need to. It is not published, and it is not shared outside Grey Studios.
            </p>
          </section>

          <section>
            <h2>Donations</h2>
            <p>
              Blossom is free. If you choose to give something, payment happens entirely on Stripe&apos;s
              own page. Blossom never sees or stores your card details, and we deliberately keep no
              record of who has donated: there is no supporter marker on your account and no donor list.
            </p>
            <p>
              Stripe holds the payment information and sends you a receipt, under its own privacy
              policy. If you set up a monthly donation you can stop it at any time from that receipt.
              Because we hold no link between a donation and a Blossom account, we cannot look up your
              payments for you, and you would need to contact Stripe or use your receipt.
            </p>
            <p>
              Where Blossom shows how much a month has raised towards its running costs, our server
              works that out by asking Stripe for the payments made through Blossom&apos;s donation
              link that month and adding them up. Stripe&apos;s reply is read for two things only:
              what each payment was worth, and which payment it was, so a refund can be matched to
              the payment it reverses. Nothing about the person who paid is read or kept, and the
              only thing that survives is the monthly total. That is what lets the paragraph above
              stay true.
            </p>
          </section>

          <section>
            <h2>How we use information</h2>
            <p>
              We use information to provide the features you choose, keep your account and data secure,
              deliver reminders you enable, respond to support requests, and improve
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
              We currently use Supabase for authentication and synced data, Vercel to host Blossom,
              Stripe if you choose to donate, and your browser or operating system&apos;s push
              service if you enable notifications. Those services process data only to provide their
              services to us.
            </p>
            <p>
              Where this happens today: synced data is stored in Ireland, and as of 13 August 2026
              the server code that reads and writes it runs in Ireland as well. Until that date the
              server code ran in the United States, so synced data crossed the Atlantic in the course
              of ordinary use. It no longer does.
            </p>
            <p>
              There is no longer an exception to that. Blossom used to have an optional AI chat,
              and what you typed into it was sent to a provider outside the UK and EU. That feature
              has been removed. Nothing you write in Blossom now leaves Europe.
            </p>
            <p>
              Supabase and Vercel keep their own short-term technical logs of the requests made to
              Blossom, and those logs include IP addresses, the same as they would for any website.
              We do not use our providers&apos; logs to work out who you are or what you looked at.
              They exist so the service can be kept running and secure.
            </p>
            <p>
              Blossom&apos;s own code touches two things about your device, and this paragraph used
              to say it touched neither. When you make a request that we rate-limit, the server
              reads the forwarded IP address to count requests against; it is used as a counter in
              memory and is not written to a database. When something goes wrong and an error is
              reported to us, that report includes a broad browser and platform name worked out
              from your browser&apos;s user agent, for example a browser family and whether you are
              on Android, so we can tell whether a bug affects everybody or only one kind of
              device. Neither is used to identify you, and neither is combined with your account.
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
              You can delete all Blossom data from your device in Settings, and that is thorough: it
              clears every local table.
            </p>
            <p>
              What that does not yet do, stated plainly because this page previously implied
              otherwise. Deleting local data does not remove anything already synced to your
              account, and there is at present no button anywhere in Blossom that deletes a synced
              account. Until there is, email{" "}
              <a href="mailto:support@projectblossom.net">support@projectblossom.net</a> and we will
              do it by hand. Switching sync off also leaves whatever was already uploaded in place;
              the one route that genuinely removes data from the server today is turning off an
              individual category under Choose what syncs, which offers to purge that category and
              really does delete those rows. When a record is deleted while sync is on, the server
              currently marks it deleted and stops serving it rather than erasing the text
              immediately.
            </p>
            <p>
              We are fixing all of that, and we would rather say so here than let this page describe
              a version of Blossom that does not exist. We are also still setting the precise
              retention periods for support cases, access logs, feedback, applications
              and backups. Those periods will be published before wider public release.
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
              Aurora is the gentle suggestion on your Home screen, and it is not AI. Its suggestions
              are rule-based and worked out on your own device from what you have already recorded
              in Blossom. Nothing you have written is sent anywhere to produce one. All that syncs,
              if you have sync on, is the minimal state needed to stop the same nudge repeating at
              you across your devices, as listed further up this policy.
            </p>
            <p>
              Blossom used to have a second, optional feature under the same name, an AI chat that
              sent what you typed to a provider outside the UK and EU. It has been removed, along
              with the usage counts it kept. Aurora as it exists now sends nothing you have written
              anywhere, beyond the minimal nudge state described above, makes no decision with legal
              or similarly significant effects, and cannot diagnose, prescribe, monitor emergencies,
              or contact anyone on your behalf.
            </p>
            <p>
              Separately from the above, most of Blossom&apos;s code is written with the help of AI.
              That is a fact about how the app is built rather than about your data, so it is not
              part of this policy, but it is declared in full on{" "}
              <Link href="/ai">How Blossom is made</Link>.
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
            <p>
              Email <a href="mailto:support@projectblossom.net">support@projectblossom.net</a> for
              anything at all, including data requests, complaints, or just to ask what we hold.
              Inside the app, Settings then Contact support reaches the same inbox.
            </p>
            <p>
              If you are in the UK and you are not happy with how we have handled something, you can
              complain to the Information Commissioner&apos;s Office at{" "}
              <a href="https://ico.org.uk/make-a-complaint/" target="_blank" rel="noreferrer noopener">ico.org.uk</a>.
              You are welcome to go to them directly, though we would rather have the chance to put
              it right first.
            </p>
          </section>
        </div>

        <p className={styles.crossLink}>
          Also see our <Link href="/legal/terms">Terms of Service</Link>.
        </p>
      </div>
    </main>
  );
}

import Link from "next/link";
import styles from "../legal.module.css";

export const metadata = { title: "Terms of Service - Blossom" };

export default function TermsPage() {
  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <Link href="/" className={styles.back}>← Back to Blossom</Link>

        <header className={styles.header}>
          <span className={styles.eyebrow}>Legal</span>
          <h1>Terms of Service</h1>
          <p className={styles.updated}>Beta draft - last updated 20 July 2026</p>
        </header>

        <div className={styles.draftNotice}>
          These are Blossom&apos;s current beta terms. They describe the service as it works today, but
          they are still being reviewed before any wider public release.
        </div>

        <div className={styles.body}>
          <section>
            <h2>Agreement</h2>
            <p>
              By using Blossom, you agree to these terms and the <Link href="/legal/privacy">Privacy
              Policy</Link>. If they do not work for you, please do not use the app.
            </p>
          </section>

          <section>
            <h2>Who can use Blossom</h2>
            <p>
              Blossom is for transgender, nonbinary, and questioning adults aged 18 and over. We ask
              you to self-confirm your age; we do not independently verify it.
            </p>
          </section>

          <section>
            <h2>What Blossom is, and is not</h2>
            <p>
              Blossom is a personal organising, tracking and journaling tool. It is not a medical
              device and does not provide medical advice, diagnosis, treatment recommendations or dose
              changes. Medication reminders, countdowns, supply estimates and appointment tools are
              organisational aids only. Always confirm your own schedule and do not rely on Blossom for
              urgent, time-critical or emergency medication decisions.
            </p>
            <p>
              Blossom is not a crisis or emergency service. Aurora cannot monitor you, assess an
              emergency, or contact anyone on your behalf. If you are in immediate danger, contact local
              emergency services or an appropriate crisis service directly.
            </p>
            <p>
              Aurora AI is an optional beta feature. It can help explain Blossom and organise information,
              but it can make mistakes and is not medical, legal, therapeutic or emergency advice. Do not use it
              to decide on medication doses or changes, or instead of an appropriate professional or urgent service.
            </p>
            <p>
              Regional resources are provided for information. We work to keep them useful, but cannot
              guarantee availability, eligibility, accuracy or outcomes. An external link is not an
              endorsement, and the organisation&apos;s own terms and privacy policy apply when you leave
              Blossom.
            </p>
          </section>

          <section>
            <h2>Your account</h2>
            <p>
              An account is optional. If you create one, you are responsible for keeping access to your
              sign-in email secure. Accounts are for individual personal use, not shared logins.
            </p>
          </section>

          <section>
            <h2>Your content</h2>
            <p>
              The information you enter into Blossom is yours. We do not claim ownership of it. You give
              us only the limited permission needed to store, synchronise and display it to provide the
              features you choose.
            </p>
          </section>

          <section>
            <h2>Sharing and exports</h2>
            <p>
              You choose whether to use Trusted Circle, Blossom Bridge, Passport documents, or other
              exports. Check exactly what you have selected before sharing. Revoking a Trusted Circle
              grant or Bridge link prevents future access through Blossom, but cannot remove information
              another person has already seen, copied, downloaded or screenshotted.
            </p>
            <p>
              You are responsible for choosing people you trust and for keeping exported files and share
              links safe. Blossom does not grant anyone access to your whole account by default.
            </p>
          </section>

          <section>
            <h2>Beta chat and feedback</h2>
            <p>
              Beta chat is shared with the beta group and Blossom staff. Public feature requests can be
              seen by other visitors. Do not post medical details, passwords, personal contact details or
              anything else you would not want other people to see. We may remove chat or public-feedback
              content that is abusive, unlawful, unsafe, spammy or breaks these terms.
            </p>
          </section>

          <section>
            <h2>Acceptable use</h2>
            <p>
              Please do not try to access anyone else&apos;s data, bypass security controls, disrupt the
              service, misuse sharing links, impersonate someone else, or use Blossom for anything
              illegal. We may suspend or remove access where that is necessary to protect people or the
              service.
            </p>
          </section>

          <section>
            <h2>Availability and changes</h2>
            <p>
              Blossom is a beta service and may change, pause or contain bugs. We aim to keep it useful,
              but cannot promise uninterrupted availability, successful notification delivery, or that a
              feature will always remain available. Local-only features can still work offline, subject to
              your device and browser.
            </p>
          </section>

          <section>
            <h2>Ending your use of Blossom</h2>
            <p>
              You can stop using Blossom at any time and can use Settings to manage local data, sync and
              account deletion. We may suspend or terminate access where an account seriously or
              repeatedly breaks these terms, or where this is needed for security or legal reasons.
            </p>
          </section>

          <section>
            <h2>Liability</h2>
            <p>
              Blossom is provided as-is and as-available. To the fullest extent allowed by law, we are
              not responsible for decisions made using information tracked or shown in the app, or for
              indirect or consequential loss arising from its use. Nothing in these terms limits liability
              where the law does not allow it to be limited.
            </p>
          </section>

          <section>
            <h2>Changes to these terms</h2>
            <p>
              If we make a meaningful change, we will update the date at the top of this page and, where
              appropriate, tell signed-in users in the app.
            </p>
          </section>

          <section>
            <h2>Governing law and contact</h2>
            <p>
              These terms are intended to be governed by the laws of England and Wales. The final legal
              entity and contact details will be added after review and before wider public release.
            </p>
          </section>
        </div>

        <p className={styles.crossLink}>
          Also see our <Link href="/legal/privacy">Privacy Policy</Link>.
        </p>
      </div>
    </main>
  );
}

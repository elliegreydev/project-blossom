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
          <p className={styles.updated}>Draft - last updated 16 July 2026</p>
        </header>

        <div className={styles.draftNotice}>
          This is a draft, written to accurately describe how Blossom
          actually works today. It hasn&apos;t been reviewed by a lawyer
          yet, and shouldn&apos;t be treated as final until it has.
        </div>

        <div className={styles.body}>
          <section>
            <h2>Agreement</h2>
            <p>
              By using Blossom, you&apos;re agreeing to these terms. If
              something here doesn&apos;t sit right with you, please don&apos;t
              use the app, and let us know.
            </p>
          </section>

          <section>
            <h2>Who can use Blossom</h2>
            <p>
              Blossom is for transgender, nonbinary, and questioning adults
              aged 18 and over. We ask you to self-confirm your age; we
              don&apos;t independently verify it.
            </p>
          </section>

          <section>
            <h2>What Blossom is, and isn&apos;t</h2>
            <p>
              Blossom is a personal tracking and journaling tool. It is not
              a medical device, does not give medical advice, and never
              recommends medications, doses, or treatment decisions. Nothing
              in the app - including anything from Aurora, our in-app guide -
              should replace advice from a qualified healthcare
              professional.
            </p>
            <p>
              Blossom is not a crisis or emergency service, and Aurora
              cannot monitor you or contact anyone on your behalf. If
              you&apos;re in immediate danger, please contact your local
              emergency services directly.
            </p>
            <p>
              Regional support resources shown in the app are provided for
              information only. We do our best to keep them accurate, but we
              can&apos;t guarantee availability, eligibility, or outcomes for
              any organisation listed, and inclusion isn&apos;t an
              endorsement of any kind.
            </p>
          </section>

          <section>
            <h2>Your account</h2>
            <p>
              Creating an account is entirely optional - the app is fully
              usable without one. If you do sign in, you&apos;re responsible
              for keeping access to your email secure, since that&apos;s how
              sign-in works. Accounts are intended for personal, individual
              use.
            </p>
          </section>

          <section>
            <h2>Your content</h2>
            <p>
              Whatever you enter into Blossom - journal entries, tracked
              data, photos, notes - is yours. We don&apos;t claim any
              ownership over it, and we only process it to provide the app
              to you.
            </p>
          </section>

          <section>
            <h2>Acceptable use</h2>
            <p>
              Please don&apos;t use Blossom to try to access anyone else&apos;s
              data, attempt to disrupt or abuse the service, or use it for
              anything illegal. We may suspend or remove access for accounts
              that do.
            </p>
          </section>

          <section>
            <h2>Availability</h2>
            <p>
              We try to keep Blossom running reliably, but it&apos;s provided
              as-is, without guarantees of uninterrupted availability.
              Local-only features keep working offline regardless of the
              state of our servers.
            </p>
          </section>

          <section>
            <h2>Ending your use of Blossom</h2>
            <p>
              You can delete your account and all of your data at any time,
              from Settings. We may suspend or terminate access for accounts
              that violate these terms.
            </p>
          </section>

          <section>
            <h2>Limitation of liability</h2>
            <p>
              Blossom is provided as-is and as-available. To the fullest
              extent the law allows, we aren&apos;t liable for decisions made
              based on information tracked or shown in the app, or for any
              indirect or consequential losses arising from your use of it.
            </p>
          </section>

          <section>
            <h2>Changes to these terms</h2>
            <p>
              If these terms change in a meaningful way, we&apos;ll update
              the date at the top of this page.
            </p>
          </section>

          <section>
            <h2>Governing law</h2>
            <p>
              These terms are intended to be governed by the laws of England
              and Wales. [placeholder - confirm with a legal reviewer before
              this goes live.]
            </p>
          </section>

          <section>
            <h2>Contact</h2>
            <p>[contact email to be added]</p>
          </section>
        </div>

        <p className={styles.crossLink}>
          Also see our <Link href="/legal/privacy">Privacy Policy</Link>.
        </p>
      </div>
    </main>
  );
}

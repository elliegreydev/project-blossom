import Link from "next/link";
import styles from "../legal/legal.module.css";

export const metadata = {
  title: "How Blossom is made - AI",
  description:
    "An honest account of where AI is used in Blossom: to write the code, and nowhere inside the app itself.",
};

/**
 * The AI declaration.
 *
 * Deliberately its own page, at a URL short enough to paste into a comment,
 * for two reasons. It is a thing people ask directly and should be able to be
 * pointed at, and it lives in the repo rather than in the about_page database
 * row, so it cannot quietly be edited away and an auditor reading the source
 * finds it where they would look.
 *
 * Two different questions get folded into "do you use AI", and answering only
 * one of them reads as a dodge, so both are here: AI wrote the code, and AI is
 * not in the product. The second used to be a longer answer, because Blossom
 * had an optional AI chat that sent what you typed to Anthropic. That feature
 * has been removed, so the honest answer is now the short one, and saying so
 * plainly is worth more than quietly dropping the section.
 *
 * The tone is the point. This was written after three separate people asked
 * for a declaration within two hours of Blossom first being shown publicly,
 * and a defensive answer would have been worse than no answer.
 */
export default function AiPage() {
  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <Link href="/" className={styles.back}>← Back to Blossom</Link>

        <header className={styles.header}>
          <span className={styles.eyebrow}>About</span>
          <h1>How Blossom is made</h1>
          <p className={styles.updated}>Last updated 25 August 2026</p>
        </header>

        <div className={styles.body}>
          <section>
            <h2>The short version</h2>
            <p>
              Yes, AI is involved, but only in one way, and it is probably not the one you are
              asking about. AI writes most of Blossom&apos;s code. Nothing inside the app sends
              what you write to an AI service. Blossom is ordinary code doing ordinary things.
            </p>
            <p>
              That is explained properly below, along with what happened to the one feature that
              did use AI. If you would rather check than read, the code is public at{" "}
              <a href="https://github.com/elliegreydev/project-blossom" target="_blank" rel="noreferrer noopener">
                github.com/elliegreydev/project-blossom
              </a>.
            </p>
          </section>

          <section>
            <h2>AI writes most of the code</h2>
            <p>
              I use AI heavily to write Blossom. I am one person, I am not a developer by trade,
              and this app would not exist without it.
            </p>
            <p>
              Being straight rather than letting you find out from the source: I do not read every
              line. What I do is decide what goes in and what stays out, and I have said no to
              plenty. The judgement about what Blossom should be, what it refuses to do, and where
              your data is allowed to go is mine.
            </p>
              <p>
                That is easy to say, so here are three you can go and check. The waiting list has
                no progress bar, because a bar that fills up would be a lie about a queue that is
                not moving. Blossom keeps no waiting times of its own, only what you were told and
                when, because a number typed in during August is wrong by Christmas, and being
                wrong about a queue means somebody decides not to ring. Photo backup was designed
                in full and then not built, because doing it safely without a password meant
                inventing key management from scratch, and getting that wrong loses somebody their
                photos for good.
              </p>
              <p>
                Each of those is written into the code with the reasoning beside it, so the
                decision cannot quietly get undone later. That is what the long comments are for.
              </p>
            <p>
              What that means in practice is that you should not take my word for how it behaves,
              and you do not have to. The repository is public specifically so the privacy claims
              can be checked rather than believed. The parts that matter most have tests you can
              run yourself without a database or an account. Code written badly still cannot send
              somewhere it was never told to send.
            </p>
            <p>
              If you read it and find something wrong, especially anything touching privacy, I
              would genuinely rather know. Open an issue on the repository, or email us.
            </p>
          </section>

          <section>
            <h2>Aurora is not AI</h2>
            <p>
              Aurora is the gentle nudge on your Home screen, and the name confuses people, so it is
              worth saying outright: it is not AI. Those suggestions are plain rules, worked out on
              your own device from what you have already told Blossom. Nothing you have written is
              sent anywhere to work one out, and they need no connection at all. If you turn sync
              on, the only thing that travels is a note of which nudge you have already seen, so the
              same one does not repeat on your other devices.
            </p>
            <p>
              There used to be a second feature sharing that name, an optional chat that sent what
              you typed to Anthropic. It has been removed. It was the only part of Blossom that sent
              anything you wrote outside the UK, and that is no longer true of any part of the app.
            </p>
            <p>
              What Blossom does with your data, now that this is the whole picture, is set out in
              the <Link href="/legal/privacy">Privacy Policy</Link>, which is the complete version
              if this summary and that document ever disagree.
            </p>
          </section>

          <section>
            <h2>What Blossom is never allowed to do here</h2>
            <p>
              Blossom gives no dosing guidance, no information about where to buy anything, and
              never interprets a blood test result. Those are clinical, they are not ours to give,
              and no amount of asking changes it.
            </p>
            <p>
              Blossom cannot diagnose, prescribe, monitor an emergency, or contact anyone on your
              behalf. Nothing in Blossom decides anything about you at all.
            </p>
          </section>

          <section>
            <h2>Why this page exists</h2>
            <p>
              Because people asked, and they were right to. An app that holds this kind of
              information about people who often have very good reasons to be careful should say
              plainly how it was built and what it does with what you write. A declaration you have
              to go digging for is not really a declaration.
            </p>
          </section>

          <section>
            <h2>Contact</h2>
            <p>
              Email <a href="mailto:support@projectblossom.net">support@projectblossom.net</a> with
              anything about this, including if you think something here is wrong. Inside the app,
              Settings then Contact support reaches the same inbox.
            </p>
          </section>
        </div>

        <p className={styles.crossLink}>
          Also see our <Link href="/legal/privacy">Privacy Policy</Link> and{" "}
          <Link href="/legal/terms">Terms of Service</Link>.
        </p>
      </div>
    </main>
  );
}

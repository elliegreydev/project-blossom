import Link from "next/link";
import styles from "../legal/legal.module.css";

export const metadata = {
  title: "How Blossom is made - AI",
  description:
    "An honest account of where AI is used in Blossom: to write the code, and optionally inside the app as Aurora AI.",
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
 * optionally in the product. The detail on the second lives in the privacy
 * policy, which is the document that has to be complete; this page summarises
 * it and links across rather than keeping a second copy that can drift.
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
          <p className={styles.updated}>Last updated 17 August 2026</p>
        </header>

        <div className={styles.body}>
          <section>
            <h2>The short version</h2>
            <p>
              Yes, AI is involved, in two separate ways that often get muddled together.
              AI writes most of Blossom&apos;s code. And there is one optional feature inside the
              app, Aurora AI, that sends what you type in that chat to an AI service. Everything
              else in Blossom is ordinary code doing ordinary things.
            </p>
            <p>
              Both are explained properly below. If you would rather check than read, the code is
              public at{" "}
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
            <h2>Aurora AI, inside the app</h2>
            <p>
              Aurora is the gentle nudge on your Home screen. Ordinarily it is not AI at all: those
              suggestions are plain rules, worked out on your own device from what you have already
              told Blossom.
            </p>
            <p>
              Aurora AI is a separate, optional feature, currently limited to signed-in beta
              testers. Before anyone sends their first message, Blossom explains that the message
              goes to Anthropic to generate a reply. What travels is the conversation itself, and
              nothing else. Blossom does not send your journal entries, medication records, blood
              tests, photos, voice notes or anything else along with it.
            </p>
            <p>
              That conversation is processed outside the UK and EU. If you use Aurora AI, and only
              then, what you type in that chat leaves Europe. Your conversation history stays on
              your device and you can delete it there. Blossom keeps only the counts it needs to
              apply safety and spending limits, not your prompts or the replies.
            </p>
            <p>
              The full detail, including the legal basis and the safeguards, is in the{" "}
              <Link href="/legal/privacy">Privacy Policy</Link>, which is the complete version if
              this summary and that document ever disagree.
            </p>
          </section>

          <section>
            <h2>What AI is never allowed to do here</h2>
            <p>
              Blossom gives no dosing guidance, no information about where to buy anything, and
              never interprets a blood test result. Those are clinical, they are not ours to give,
              and no amount of asking changes it. That rule applies to Aurora AI exactly as it
              applies to everything else.
            </p>
            <p>
              Aurora AI cannot diagnose, prescribe, monitor an emergency, or contact anyone on your
              behalf. It makes no decision about you that has legal or similarly significant
              effects. Nothing in Blossom decides anything about you at all.
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

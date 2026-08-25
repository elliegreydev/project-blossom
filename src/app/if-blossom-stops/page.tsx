import Link from "next/link";
import styles from "../blog/blog.module.css";

/**
 * What happens to somebody's data if Blossom ends.
 *
 * Almost nobody writes this page, which is why it is worth having. Anyone
 * sensible enough to be careful about a health app run by one person has
 * already thought "and what happens when she gets bored, or ill, or hit by a
 * bus". Leaving that unanswered does not make it unasked, it just means the
 * answer they invent is worse than the real one.
 *
 * The real answer here is unusually good, and only because of decisions made
 * long before this page existed: the data is already on their device, the
 * export already works, and nothing about it needs Blossom to be running. That
 * is worth saying plainly rather than leaving somebody to guess.
 *
 * No promises about the future. Promises are what this page is for avoiding.
 */
export const metadata = {
  title: "If Blossom stops",
  description: "What happens to your data if Blossom ever shuts down.",
};

export default function IfBlossomStopsPage() {
  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <Link href="/" className={styles.back}>← Back to Blossom</Link>

        <header className={styles.header}>
          <span className={styles.eyebrow}>Honest answers</span>
          <h1>If Blossom stops</h1>
        </header>

        <div className={styles.body}>
          <p>
            Blossom is made by one person. It is fair to wonder what happens to
            everything you have put into it if that person gets ill, gets bored, runs
            out of money, or stops for any of the ordinary reasons things stop.
            Most apps leave you to guess. Here is the actual answer.
          </p>

          <h2>Your data is already yours, today</h2>
          <p>
            It is not on a server that gets switched off. It is in your browser&apos;s
            own storage, on your device, and that is where it has been the whole time.
            If projectblossom.net went dark this afternoon, the app already installed
            on your phone would keep opening and everything in it would still be there,
            because none of it needs anything of mine to be running.
          </p>
          <p>
            Sync, if you turned it on, is a copy for moving between devices. It is
            never the only copy.
          </p>

          <h2>You can take it with you whenever you like</h2>
          <p>
            Settings, then Your data, exports everything as a file you keep. It works
            offline, needs no account, and does not ask why. You do not have to wait
            for bad news to use it, and it is worth doing occasionally regardless,
            because phones get lost and browsers clear storage for their own reasons.
          </p>

          <h2>What I would do</h2>
          <p>
            If I were winding Blossom down deliberately, you would get notice inside
            the app before anything changed, a reminder of how to export, and the code
            would stay public so somebody could run it themselves. That is the plan,
            written down now rather than improvised later.
          </p>
          <p>
            If it stopped suddenly instead, and nobody was around to announce anything,
            the first two paragraphs on this page are still true. That is the point of
            building it this way round.
          </p>

          <h2>What I will not promise</h2>
          <p>
            That it will be here forever. Nobody honest can promise that, and a page
            reassuring you otherwise would be worth less than this one. What I can say
            is that Blossom is built so that its ending is not your problem, and that
            was deliberate from the start.
          </p>

          <p className={styles.updated}>
            Related: <Link href="/legal/privacy">where your data lives</Link>.
          </p>
        </div>
      </div>
    </main>
  );
}

import Link from "next/link";
import { CHANGELOG, APP_VERSION } from "@/lib/changelog";
import styles from "../blog/blog.module.css";

/**
 * The changelog, in public.
 *
 * It already existed, but only inside the app, behind onboarding. That meant
 * the one page proving Blossom is worked on steadily was invisible to everybody
 * still deciding whether to trust it. "Is this abandoned?" is a fair question
 * about a health app run by one person, and forty-odd dated entries answer it
 * better than any promise.
 *
 * A server component reading the same array the in-app popup does, so the two
 * can never drift apart.
 */
export const metadata = {
  title: "Changelog",
  description: "Everything that has changed in Blossom, newest first.",
};

const TAG_LABEL: Record<string, string> = {
  new: "New",
  improved: "Improved",
  fix: "Fixed",
};

function humanDate(iso: string): string {
  // Sliced rather than parsed. A date-only string turned into a moment is one
  // timezone away from showing the day before.
  const [y, m, d] = iso.split("-").map(Number);
  const months = ["January","February","March","April","May","June",
                  "July","August","September","October","November","December"];
  return `${d} ${months[m - 1]} ${y}`;
}

export default function ChangelogPage() {
  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <Link href="/" className={styles.back}>← Back to Blossom</Link>

        <header className={styles.header}>
          <span className={styles.eyebrow}>Changelog</span>
          <h1>What&apos;s changed</h1>
          <p className={styles.updated}>Currently on v{APP_VERSION}</p>
        </header>

        <div className={styles.body}>
          <p>
            Everything that has shipped, newest first. Small fixes included, because
            a list of only the big things tells you less than the honest one.
          </p>

          {CHANGELOG.map((entry) => (
            <section key={entry.version} style={{ marginTop: "2rem" }}>
              <h2>{entry.title}</h2>
              <p className={styles.updated}>
                v{entry.version} · {humanDate(entry.date)}
              </p>
              <ul>
                {entry.items.map((item, i) => (
                  <li key={i}>
                    <strong>{TAG_LABEL[item.tag] ?? item.tag}.</strong> {item.text}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}

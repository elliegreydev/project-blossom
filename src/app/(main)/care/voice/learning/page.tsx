"use client";

import ScreenHeader from "@/components/ScreenHeader";
import { LEARNING_RESOURCES, VOICE_SAFETY_POINTS } from "@/lib/voicePractice";
import styles from "./learning.module.css";

// Blossom does not teach voice technique, and this page is where it says so
// out loud rather than just staying quiet about it. Everything here is
// somebody else's work, free, and checked by hand.
export default function LearningPage() {
  return (
    <div className={styles.screen}>
      <ScreenHeader title="Learning properly" backHref="/care/voice" />

      <p className={styles.intro}>
        Blossom doesn&apos;t teach technique. It holds your practice and shows you your
        pitch, and that is genuinely the limit of what it is qualified to do. These are
        the people who do know how this works.
      </p>

      <ul className={styles.list}>
        {LEARNING_RESOURCES.map((resource) => (
          <li key={resource.id}>
            <a className={styles.item} href={resource.url} target="_blank" rel="noreferrer noopener">
              <span className={styles.itemTop}>
                <span className={styles.name}>{resource.name}</span>
                <svg className={styles.out} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14 21 3" />
                </svg>
              </span>
              <span className={styles.what}>{resource.what}</span>
              <span className={styles.who}>{resource.who}</span>
            </a>
          </li>
        ))}
      </ul>

      <section className={styles.safety}>
        <h2 className={styles.safetyTitle}>Keeping your voice in one piece</h2>
        {VOICE_SAFETY_POINTS.map((point) => (
          <div key={point.title} className={styles.point}>
            <strong>{point.title}</strong>
            <p>{point.body}</p>
          </div>
        ))}
      </section>

      <p className={styles.footnote}>
        Links open outside Blossom. They were checked by hand, but they belong to other
        people and can change. If one is broken or has become something else, tell us and
        we&apos;ll check it.
      </p>
    </div>
  );
}

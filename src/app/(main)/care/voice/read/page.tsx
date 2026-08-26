"use client";

import { useState } from "react";
import ScreenHeader from "@/components/ScreenHeader";
import { READING_PASSAGES, type ReadingPassage } from "@/lib/voicePractice";
import styles from "./read.module.css";

const KIND_LABELS: Record<ReadingPassage["kind"], string> = {
  prose: "Prose",
  poem: "Poem",
  practical: "Practical",
  sentences: "Sentences",
};

// The shelf, and one passage filling the screen in big type.
//
// The shelf is deliberately flat: no ordering by difficulty, no "start here",
// no progress through it. Blossom hands over something worth reading and gets
// out of the way. Nothing on this screen records anything or knows whether
// somebody read a word of it.
export default function ReadAloudPage() {
  const [open, setOpen] = useState<ReadingPassage | null>(null);

  if (open) {
    return (
      <div className={styles.screen}>
        <ScreenHeader title={open.title} backHref="/care/voice" />
        <button type="button" className={styles.backToShelf} onClick={() => setOpen(null)}>
          All of them
        </button>
        <article className={styles.reader}>
          {open.text.split("\n").map((line, index) =>
            line.trim() === "" ? (
              <span key={index} className={styles.gap} aria-hidden="true" />
            ) : (
              <p key={index}>{line}</p>
            )
          )}
        </article>
        {open.source && <p className={styles.source}>{open.source}</p>}
      </div>
    );
  }

  return (
    <div className={styles.screen}>
      <ScreenHeader title="Something to say" backHref="/care/voice" />
      <p className={styles.intro}>
        Things to read out loud. Pick whichever one appeals. They&apos;re not in any
        order, and nothing here is marked as being for anything in particular.
      </p>

      <ul className={styles.shelf}>
        {READING_PASSAGES.map((passage) => (
          <li key={passage.id}>
            <button type="button" className={styles.item} onClick={() => setOpen(passage)}>
              <span className={styles.itemTop}>
                <span className={styles.itemTitle}>{passage.title}</span>
                <span className={styles.itemMeta}>{passage.minutes} min</span>
              </span>
              <span className={styles.itemBlurb}>{passage.blurb}</span>
              <span className={styles.kind}>{KIND_LABELS[passage.kind]}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

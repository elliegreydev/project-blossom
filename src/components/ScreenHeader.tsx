"use client";

import { useRouter } from "next/navigation";
import styles from "./ScreenHeader.module.css";

export default function ScreenHeader({ title, backHref }: { title: string; backHref?: string }) {
  const router = useRouter();
  return (
    <div className={styles.header}>
      <button
        type="button"
        className={styles.back}
        aria-label="Back"
        onClick={() => (backHref ? router.push(backHref) : router.back())}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M15 5l-7 7 7 7" />
        </svg>
      </button>
      <h1 className={styles.title}>{title}</h1>
    </div>
  );
}

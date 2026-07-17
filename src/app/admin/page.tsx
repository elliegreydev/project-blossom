import Link from "next/link";
import styles from "./admin.module.css";

export default function AdminOverviewPage() {
  return (
    <>
      <h1 className={styles.title}>Staff</h1>
      <p className={styles.subtitle}>
        Internal tools. Support access is case-gated and logged - see the Support tab before
        opening anyone&apos;s account data.
      </p>
      <div className={styles.grid}>
        <Link href="/admin/resources" className={styles.card}>
          <span className={styles.cardTitle}>Support resources</span>
          <span className={styles.cardDesc}>
            Add, edit, and mark region resources and legal-context notes as reviewed.
          </span>
        </Link>
        <Link href="/admin/support" className={styles.card}>
          <span className={styles.cardTitle}>Support lookup</span>
          <span className={styles.cardDesc}>
            Open a case to help someone with their account. Every access is logged.
          </span>
        </Link>
        <Link href="/admin/analytics" className={styles.card}>
          <span className={styles.cardTitle}>Analytics</span>
          <span className={styles.cardDesc}>
            Aggregate, anonymous usage - signups, module adoption, regions. No individual data.
          </span>
        </Link>
        <Link href="/admin/operations" className={styles.card}>
          <span className={styles.cardTitle}>Operations</span>
          <span className={styles.cardDesc}>
            App health, resource review, open-case attention, privacy audit and feature availability.
          </span>
        </Link>
        <Link href="/admin/roadmap" className={styles.card}>
          <span className={styles.cardTitle}>Roadmap</span>
          <span className={styles.cardDesc}>
            Keep Blossom&apos;s in-app roadmap clear, honest and free from made-up dates.
          </span>
        </Link>
      </div>
    </>
  );
}

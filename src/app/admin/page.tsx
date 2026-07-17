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
      </div>
    </>
  );
}

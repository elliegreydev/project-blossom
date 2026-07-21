import Link from "next/link";
import styles from "../blog/blog.module.css";

export default async function DataDeletedPage({ searchParams }: { searchParams: Promise<{ at?: string }> }) {
  const { at } = await searchParams;
  const parsed = at ? new Date(at) : null;
  const deletedAt = parsed && !Number.isNaN(parsed.getTime())
    ? parsed.toLocaleString("en-GB", { dateStyle: "long", timeStyle: "short" })
    : null;

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.header}>
          <span className={styles.eyebrow}>Deletion receipt</span>
          <h1>This device&apos;s Blossom data has been deleted.</h1>
          <p>{deletedAt ? `Completed ${deletedAt}.` : "Completed on this device."}</p>
        </header>
        <div className={styles.body}>
          <p>This removed the records stored in Blossom on this browser and device. It cannot remove files you previously downloaded, information someone already saw through sharing, or data held in a separately synced account.</p>
          <p>If you want to begin again, Blossom will take you through a fresh, private setup.</p>
        </div>
        <Link href="/onboarding" className={styles.primaryButton}>Start fresh</Link>
      </div>
    </main>
  );
}

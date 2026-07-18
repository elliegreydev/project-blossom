"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import styles from "./admin.module.css";

const ADMINISTRATOR_RANK = 80;

export default function AdminOverviewPage() {
  const [rank, setRank] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();
    supabase.rpc("my_staff_rank").then(({ data }) => {
      if (!cancelled && typeof data === "number") setRank(data);
    });
    return () => {
      cancelled = true;
    };
  }, []);

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
        {rank >= ADMINISTRATOR_RANK && (
          <>
            <Link href="/admin/team" className={styles.card}>
              <span className={styles.cardTitle}>Team</span>
              <span className={styles.cardDesc}>
                See who&apos;s on staff, add or remove people, and change roles.
              </span>
            </Link>
            <Link href="/admin/applications" className={styles.card}>
              <span className={styles.cardTitle}>Applications</span>
              <span className={styles.cardDesc}>
                Review people who&apos;ve applied to join the team and accept or decline them.
              </span>
            </Link>
          </>
        )}
      </div>
    </>
  );
}

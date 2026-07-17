"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { FEATURE_AVAILABILITY } from "@/lib/featureAvailability";
import styles from "../admin.module.css";

type Health = "checking" | "ready" | "needs-attention";

interface OperationsSnapshot {
  resources: { unreviewed: number; overdue: number };
  cases: { open: number; olderThanThreeDays: number };
  auditEntries: number;
}

function ageInDays(value: string): number {
  return (Date.now() - new Date(value).getTime()) / 86_400_000;
}

export default function OperationsPage() {
  const [health, setHealth] = useState<Health>("checking");
  const [snapshot, setSnapshot] = useState<OperationsSnapshot | null>(null);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();

    async function load() {
      const [{ data: staff, error: staffError }, { data: resources, error: resourceError }, { data: cases, error: caseError }, { count: auditEntries, error: auditError }] = await Promise.all([
        supabase.rpc("is_staff"),
        supabase.from("region_resources").select("reviewed_by_staff,last_reviewed_at"),
        supabase.from("support_cases").select("status,created_at"),
        supabase.from("support_case_access_log").select("id", { count: "exact", head: true }),
      ]);

      if (cancelled) return;

      const ready = !staffError && staff === true && !resourceError && !caseError && !auditError;
      setHealth(ready ? "ready" : "needs-attention");
      setSnapshot({
        resources: {
          unreviewed: (resources ?? []).filter((resource) => !resource.reviewed_by_staff).length,
          overdue: (resources ?? []).filter((resource) => ageInDays(resource.last_reviewed_at) > 180).length,
        },
        cases: {
          open: (cases ?? []).filter((supportCase) => supportCase.status === "open").length,
          olderThanThreeDays: (cases ?? []).filter((supportCase) => supportCase.status === "open" && ageInDays(supportCase.created_at) > 3).length,
        },
        auditEntries: auditEntries ?? 0,
      });
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <>
      <h1 className={styles.title}>Operations</h1>
      <p className={styles.subtitle}>
        A small, privacy-bounded overview of the things that need a staff eye. It never shows member content.
      </p>

      <section className={styles.card}>
        <span className={styles.cardTitle}>App health</span>
        <span className={styles.cardDesc}>
          {health === "checking" && "Checking the staff connection and core admin reads…"}
          {health === "ready" && "Admin access, support resources, case records and the audit log are responding."}
          {health === "needs-attention" && "One of the admin checks could not be confirmed. Try refreshing, then check your staff account and Supabase connection."}
        </span>
      </section>

      <div className={styles.grid}>
        <Link href="/admin/resources" className={styles.card}>
          <span className={styles.cardTitle}>Resource review</span>
          <span className={styles.cardDesc}>
            {snapshot ? `${snapshot.resources.unreviewed} unreviewed · ${snapshot.resources.overdue} older than six months` : "Loading review status…"}
          </span>
        </Link>
        <Link href="/admin/support" className={styles.card}>
          <span className={styles.cardTitle}>Support cases</span>
          <span className={styles.cardDesc}>
            {snapshot ? `${snapshot.cases.open} open · ${snapshot.cases.olderThanThreeDays} open for more than three days` : "Loading case status…"}
          </span>
        </Link>
        <Link href="/admin/audit" className={styles.card}>
          <span className={styles.cardTitle}>Privacy & access audit</span>
          <span className={styles.cardDesc}>
            {snapshot ? `${snapshot.auditEntries} recorded account-access events` : "Loading audit status…"}
          </span>
        </Link>
        <Link href="/admin/notices" className={styles.card}>
          <span className={styles.cardTitle}>App notices</span>
          <span className={styles.cardDesc}>Draft a short, expiry-bound maintenance or service notice.</span>
        </Link>
        <Link href="/admin/roadmap" className={styles.card}>
          <span className={styles.cardTitle}>Roadmap</span>
          <span className={styles.cardDesc}>Manage the calm, member-facing view of Blossom&apos;s direction.</span>
        </Link>
      </div>

      <h2 className={styles.cardTitle} style={{ marginTop: 20 }}>Feature availability</h2>
      <div className={styles.card}>
        {FEATURE_AVAILABILITY.map((feature) => (
          <div key={feature.name} className={styles.operationRow}>
            <div>
              <strong>{feature.name}</strong>
              <span>{feature.detail}</span>
            </div>
            <span className={`${styles.badge} ${feature.status === "Available" ? styles.badgeReviewed : styles.badgeClosed}`}>
              {feature.status}
            </span>
          </div>
        ))}
      </div>
    </>
  );
}

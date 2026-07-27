"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import styles from "../admin.module.css";

interface CountRow {
  label: string;
  desc: string;
  count: number | null;
}

interface InfraUsageCounts {
  profiles: number;
  appointments: number;
  medications: number;
  goals: number;
  checkIns: number;
  pushSubscriptions: number;
  auroraAiUsage: number;
  supportCases: number;
  feedbackItems: number;
  staffIssues: number;
}

const VERCEL_USAGE_URL = "https://vercel.com/filthyrichtycoon/project-blossom/usage";
const SUPABASE_USAGE_URL = "https://supabase.com/dashboard/project/_/settings/billing/usage";

export default function AdminInfraPage() {
  const [rows, setRows] = useState<CountRow[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();

    async function load() {
      // Most of these tables are owner-only RLS (or client-inaccessible
      // entirely, like aurora_ai_usage) - a normal staff session querying
      // them directly would only see its own rows, not the real total. This
      // security-definer RPC (same pattern as get_staff_analytics) returns
      // aggregate counts only.
      const { data, error } = await supabase.rpc("get_infra_usage_counts");
      if (cancelled) return;
      if (error || !data) {
        setRows([]);
        return;
      }
      const counts = data as InfraUsageCounts;
      setRows([
        { label: "Signed-in, synced accounts", desc: "Rows in profiles - people with sync turned on", count: counts.profiles },
        { label: "Synced appointments", desc: "Rows in appointments", count: counts.appointments },
        { label: "Synced medications", desc: "Rows in medications", count: counts.medications },
        { label: "Synced goals", desc: "Rows in goals", count: counts.goals },
        { label: "Synced check-ins", desc: "Rows in check_ins", count: counts.checkIns },
        { label: "Push subscriptions", desc: "Devices with background reminders turned on", count: counts.pushSubscriptions },
        { label: "Aurora AI requests logged", desc: "Rows in aurora_ai_usage - a rough proxy for AI spend, not the real figure", count: counts.auroraAiUsage },
        { label: "Support cases", desc: "Rows in support_cases, open and closed", count: counts.supportCases },
        { label: "Feedback & bug reports", desc: "Rows in feedback_items", count: counts.feedbackItems },
        { label: "Known issues", desc: "Rows in staff_issues", count: counts.staffIssues },
      ]);
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <>
      <h1 className={styles.title}>Infra & usage</h1>
      <p className={styles.subtitle}>
        A rough, directional sense of how much is stored and how fast it&apos;s growing - not real cost
        or billing figures. Getting those needs a Vercel and a Supabase API token that aren&apos;t
        configured yet; until then, the dashboards below have the real numbers.
      </p>

      <div className={styles.grid}>
        <a href={VERCEL_USAGE_URL} target="_blank" rel="noopener noreferrer" className={styles.card}>
          <span className={styles.cardTitle}>Vercel usage & billing</span>
          <span className={styles.cardDesc}>Real bandwidth, function usage and cost - opens the Vercel dashboard.</span>
        </a>
        <a href={SUPABASE_USAGE_URL} target="_blank" rel="noopener noreferrer" className={styles.card}>
          <span className={styles.cardTitle}>Supabase usage & billing</span>
          <span className={styles.cardDesc}>Real database size, bandwidth and cost - opens the Supabase dashboard.</span>
        </a>
      </div>

      <h2 className={styles.title} style={{ fontSize: 18, marginTop: 8 }}>Data volume</h2>
      {rows === null ? (
        <p className={styles.subtitle}>Loading…</p>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <tbody>
              {rows.map((row) => (
                <tr key={row.label}>
                  <td>
                    {row.label}
                    <div className={styles.mutedCell}>{row.desc}</div>
                  </td>
                  <td style={{ textAlign: "right", fontWeight: 700 }}>{row.count ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

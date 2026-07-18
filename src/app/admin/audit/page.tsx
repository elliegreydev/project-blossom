"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import styles from "../admin.module.css";

interface AuditEntry {
  id: string;
  accessed_at: string;
  case_id: string;
  support_cases: { subject: string; status: "open" | "closed" } | null;
}

interface ActivityEntry {
  id: string;
  staff_email: string | null;
  action: string;
  table_name: string;
  record_id: string | null;
  created_at: string;
}

const TABLE_LABELS: Record<string, string> = {
  region_resources: "Support resources",
  legal_context_notes: "Legal context notes",
  product_roadmap: "Roadmap",
  app_notices: "Notices",
  staff_emails: "Team roster",
};

const ACTION_LABELS: Record<string, string> = {
  INSERT: "Created",
  UPDATE: "Edited",
  DELETE: "Removed",
};

export default function AuditPage() {
  const [tab, setTab] = useState<"access" | "activity">("access");
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [activity, setActivity] = useState<ActivityEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();

    async function load() {
      const [{ data: accessData }, { data: activityData }] = await Promise.all([
        supabase
          .from("support_case_access_log")
          .select("id,accessed_at,case_id,support_cases(subject,status)")
          .order("accessed_at", { ascending: false })
          .limit(100),
        supabase
          .from("staff_activity_log")
          .select("id,staff_email,action,table_name,record_id,created_at")
          .order("created_at", { ascending: false })
          .limit(100),
      ]);
      if (cancelled) return;
      setEntries(
        ((accessData ?? []).map((entry) => ({
          ...entry,
          support_cases: Array.isArray(entry.support_cases)
            ? (entry.support_cases[0] as AuditEntry["support_cases"])
            : (entry.support_cases as AuditEntry["support_cases"]),
        })) as AuditEntry[]) ?? []
      );
      setActivity((activityData as ActivityEntry[]) ?? []);
      setLoading(false);
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) return <p className={styles.subtitle}>Loading…</p>;

  return (
    <>
      <h1 className={styles.title}>Privacy & access audit</h1>
      <p className={styles.subtitle}>
        Account-data access is deliberately anonymous below - no member names, emails or account
        contents. Staff activity on shared content (resources, notices, roadmap, the team roster)
        is tracked separately and visible to every tier.
      </p>

      <div className={styles.nav} style={{ borderBottom: "none", paddingBottom: 0 }}>
        <button
          type="button"
          className={`${styles.navLink} ${tab === "access" ? styles.active : ""}`}
          onClick={() => setTab("access")}
        >
          Account-data access
        </button>
        <button
          type="button"
          className={`${styles.navLink} ${tab === "activity" ? styles.active : ""}`}
          onClick={() => setTab("activity")}
        >
          Staff activity
        </button>
      </div>

      {tab === "access" ? (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>When</th>
                <th>Case</th>
                <th>Status now</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.id}>
                  <td>{new Date(entry.accessed_at).toLocaleString("en-GB")}</td>
                  <td>{entry.support_cases?.subject ?? "Case no longer available"}</td>
                  <td>{entry.support_cases?.status ?? "Removed"}</td>
                </tr>
              ))}
              {entries.length === 0 && (
                <tr><td colSpan={3} className={styles.subtitle}>No account-data access has been recorded.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>When</th>
                <th>Who</th>
                <th>Area</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {activity.map((entry) => (
                <tr key={entry.id}>
                  <td>{new Date(entry.created_at).toLocaleString("en-GB")}</td>
                  <td>{entry.staff_email ?? "Unknown"}</td>
                  <td>{TABLE_LABELS[entry.table_name] ?? entry.table_name}</td>
                  <td>{ACTION_LABELS[entry.action] ?? entry.action}</td>
                </tr>
              ))}
              {activity.length === 0 && (
                <tr><td colSpan={4} className={styles.subtitle}>No staff activity has been recorded yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

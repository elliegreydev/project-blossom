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

export default function AuditPage() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();

    async function load() {
      const { data } = await supabase
        .from("support_case_access_log")
        .select("id,accessed_at,case_id,support_cases(subject,status)")
        .order("accessed_at", { ascending: false })
        .limit(100);
      if (!cancelled) {
        setEntries(
          ((data ?? []).map((entry) => ({
            ...entry,
            support_cases: Array.isArray(entry.support_cases)
              ? (entry.support_cases[0] as AuditEntry["support_cases"])
              : (entry.support_cases as AuditEntry["support_cases"]),
          })) as AuditEntry[]) ?? []
        );
        setLoading(false);
      }
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
        The last 100 account-data access events. This deliberately shows no member names, emails or account contents.
      </p>
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
    </>
  );
}

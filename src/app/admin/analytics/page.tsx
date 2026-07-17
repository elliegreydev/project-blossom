"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import styles from "../admin.module.css";

interface Analytics {
  totalAccounts: number;
  signupsByWeek: { week: string; count: number }[];
  moduleAdoption: Record<string, number>;
  regions: Record<string, number>;
  auroraModes: Record<string, number>;
}

export default function AdminAnalyticsPage() {
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    void supabase.rpc("get_staff_analytics").then(({ data: result, error: rpcError }) => {
      if (rpcError) setError(rpcError.message);
      else setData(result as Analytics);
      setLoading(false);
    });
  }, []);

  if (loading) return <p className={styles.subtitle}>Loading…</p>;
  if (error) return <p className={styles.subtitle}>Couldn&apos;t load analytics: {error}</p>;
  if (!data) return null;

  const maxWeekCount = Math.max(1, ...data.signupsByWeek.map((w) => w.count));

  return (
    <>
      <h1 className={styles.title}>Analytics</h1>
      <p className={styles.subtitle}>
        Aggregate and anonymous only - this can only ever reflect signed-in, synced accounts.
        Local-only usage leaves no trace on our servers at all, by design, so there&apos;s no
        way to know overall app usage beyond this.
      </p>

      <div className={styles.grid}>
        <div className={styles.card}>
          <span className={styles.cardTitle}>{data.totalAccounts}</span>
          <span className={styles.cardDesc}>Signed-in accounts (all time)</span>
        </div>
      </div>

      <h2 className={styles.cardTitle} style={{ marginTop: 20 }}>Signups, last 12 weeks</h2>
      <div className={styles.card}>
        {data.signupsByWeek.length === 0 ? (
          <span className={styles.cardDesc}>No signups in this window.</span>
        ) : (
          <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 100 }}>
            {data.signupsByWeek.map((w) => (
              <div key={w.week} title={`${w.week}: ${w.count}`} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, flex: 1 }}>
                <div
                  style={{
                    width: "100%",
                    height: `${Math.max(4, (w.count / maxWeekCount) * 80)}px`,
                    background: "var(--lavender)",
                    borderRadius: 3,
                  }}
                />
                <span style={{ fontSize: 10, color: "var(--text-muted)" }}>{w.count}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <h2 className={styles.cardTitle} style={{ marginTop: 20 }}>Module adoption</h2>
      <div className={styles.card}>
        {Object.entries(data.moduleAdoption)
          .sort((a, b) => b[1] - a[1])
          .map(([module, count]) => (
            <div key={module} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "4px 0" }}>
              <span>{module}</span>
              <span style={{ color: "var(--text-secondary)" }}>
                {count} ({Math.round((count / data.totalAccounts) * 100)}%)
              </span>
            </div>
          ))}
      </div>

      <h2 className={styles.cardTitle} style={{ marginTop: 20 }}>Regions represented</h2>
      <div className={styles.card}>
        {Object.entries(data.regions)
          .sort((a, b) => b[1] - a[1])
          .map(([region, count]) => (
            <div key={region} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "4px 0" }}>
              <span>{region}</span>
              <span style={{ color: "var(--text-secondary)" }}>{count}</span>
            </div>
          ))}
      </div>

      <h2 className={styles.cardTitle} style={{ marginTop: 20 }}>Aurora mode</h2>
      <div className={styles.card}>
        {Object.entries(data.auroraModes)
          .sort((a, b) => b[1] - a[1])
          .map(([mode, count]) => (
            <div key={mode} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "4px 0" }}>
              <span>{mode}</span>
              <span style={{ color: "var(--text-secondary)" }}>{count}</span>
            </div>
          ))}
      </div>
    </>
  );
}

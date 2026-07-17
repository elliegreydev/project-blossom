"use client";

import { use, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import styles from "../../admin.module.css";

interface SupportCase {
  id: string;
  user_id: string;
  subject: string;
  status: "open" | "closed";
  created_at: string;
  closed_at: string | null;
}

interface CaseData {
  profile: Record<string, unknown> | null;
  medications: Record<string, unknown>[];
  appointments: Record<string, unknown>[];
  goals: Record<string, unknown>[];
  milestones: Record<string, unknown>[];
}

export default function SupportCaseDetailPage({ params }: { params: Promise<{ caseId: string }> }) {
  const { caseId } = use(params);
  const [supportCase, setSupportCase] = useState<SupportCase | null>(null);
  const [data, setData] = useState<CaseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    void loadCase();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseId]);

  async function loadCase() {
    setLoading(true);
    const supabase = createClient();
    const { data: caseRow } = await supabase.from("support_cases").select("*").eq("id", caseId).single();
    const currentCase = caseRow as SupportCase | null;
    setSupportCase(currentCase);

    if (!currentCase) {
      setLoading(false);
      return;
    }

    if (currentCase.status === "open") {
      const [profile, medications, appointments, goals, milestones] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", currentCase.user_id).maybeSingle(),
        supabase.from("medications").select("*").eq("user_id", currentCase.user_id),
        supabase.from("appointments").select("*").eq("user_id", currentCase.user_id),
        supabase.from("goals").select("*").eq("user_id", currentCase.user_id),
        supabase.from("milestones").select("*").eq("user_id", currentCase.user_id),
      ]);
      setData({
        profile: profile.data,
        medications: medications.data ?? [],
        appointments: appointments.data ?? [],
        goals: goals.data ?? [],
        milestones: milestones.data ?? [],
      });

      const { data: session } = await supabase.auth.getSession();
      const staffId = session.session?.user.id;
      if (staffId) {
        await supabase.from("support_case_access_log").insert({ case_id: caseId, staff_user_id: staffId });
      }
    }

    setLoading(false);
  }

  async function closeCase() {
    setClosing(true);
    const supabase = createClient();
    await supabase
      .from("support_cases")
      .update({ status: "closed", closed_at: new Date().toISOString() })
      .eq("id", caseId);
    setClosing(false);
    void loadCase();
  }

  if (loading) return <p className={styles.subtitle}>Loading…</p>;
  if (!supportCase) return <p className={styles.subtitle}>Case not found.</p>;

  return (
    <>
      <h1 className={styles.title}>{supportCase.subject}</h1>
      <p className={styles.subtitle}>
        <span className={`${styles.badge} ${supportCase.status === "open" ? styles.badgeOpen : styles.badgeClosed}`}>
          {supportCase.status === "open" ? "Open" : "Closed"}
        </span>
        {" "}Opened {new Date(supportCase.created_at).toLocaleString()}
        {supportCase.closed_at && ` · Closed ${new Date(supportCase.closed_at).toLocaleString()}`}
      </p>

      {supportCase.status === "open" && (
        <button type="button" className={styles.dangerButton} style={{ width: "fit-content" }} onClick={closeCase} disabled={closing}>
          {closing ? "Closing…" : "Close case"}
        </button>
      )}

      {supportCase.status === "closed" ? (
        <p className={styles.subtitle}>
          This case is closed, so account data is no longer accessible here - that access was
          scoped to the open period only, not open-ended.
        </p>
      ) : (
        <>
          <h2 className={styles.cardTitle}>Profile</h2>
          <pre className={styles.card} style={{ overflowX: "auto", fontSize: 12 }}>
            {JSON.stringify(data?.profile, null, 2)}
          </pre>

          <h2 className={styles.cardTitle}>Medications ({data?.medications.length ?? 0})</h2>
          <pre className={styles.card} style={{ overflowX: "auto", fontSize: 12 }}>
            {JSON.stringify(data?.medications, null, 2)}
          </pre>

          <h2 className={styles.cardTitle}>Appointments ({data?.appointments.length ?? 0})</h2>
          <pre className={styles.card} style={{ overflowX: "auto", fontSize: 12 }}>
            {JSON.stringify(data?.appointments, null, 2)}
          </pre>

          <h2 className={styles.cardTitle}>Goals ({data?.goals.length ?? 0})</h2>
          <pre className={styles.card} style={{ overflowX: "auto", fontSize: 12 }}>
            {JSON.stringify(data?.goals, null, 2)}
          </pre>

          <h2 className={styles.cardTitle}>Milestones ({data?.milestones.length ?? 0})</h2>
          <pre className={styles.card} style={{ overflowX: "auto", fontSize: 12 }}>
            {JSON.stringify(data?.milestones, null, 2)}
          </pre>

          <p className={styles.subtitle}>
            Journal entries, check-in notes, and v1.5 tracking (blood tests, voice practice,
            presentation, body/progress) never sync to the server, so they aren&apos;t shown here
            regardless of case status - that data only ever exists on the person&apos;s own device.
          </p>
        </>
      )}
    </>
  );
}

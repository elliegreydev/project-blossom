"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import styles from "../admin.module.css";

interface Application {
  id: string;
  name: string;
  email: string;
  message: string;
  area_of_interest: string | null;
  status: "pending" | "accepted" | "rejected";
  review_note: string | null;
  created_at: string;
}

export default function AdminApplicationsPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"pending" | "reviewed">("pending");
  const [message, setMessage] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectNote, setRejectNote] = useState("");

  async function load() {
    const supabase = createClient();
    const { data } = await supabase
      .from("staff_applications")
      .select("id,name,email,message,area_of_interest,status,review_note,created_at")
      .order("created_at", { ascending: false });
    setApplications((data as Application[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  async function accept(application: Application) {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { error: staffError } = await supabase
      .from("staff_emails")
      .insert({ email: application.email, role: "trial_moderator" });
    if (staffError && !staffError.message.includes("duplicate")) {
      setMessage(staffError.message);
      return;
    }
    const { error } = await supabase
      .from("staff_applications")
      .update({ status: "accepted", reviewed_by: user?.id ?? null, reviewed_at: new Date().toISOString() })
      .eq("id", application.id);
    if (error) {
      setMessage(error.message);
      return;
    }
    void load();
  }

  async function reject(id: string) {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("staff_applications")
      .update({
        status: "rejected",
        review_note: rejectNote.trim() || null,
        reviewed_by: user?.id ?? null,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", id);
    if (error) {
      setMessage(error.message);
      return;
    }
    setRejectingId(null);
    setRejectNote("");
    void load();
  }

  if (loading) return <p className={styles.subtitle}>Loading…</p>;

  const pending = applications.filter((a) => a.status === "pending");
  const reviewed = applications.filter((a) => a.status !== "pending");
  const visible = tab === "pending" ? pending : reviewed;

  return (
    <>
      <h1 className={styles.title}>Applications</h1>
      <p className={styles.subtitle}>
        {pending.length} pending, {reviewed.length} reviewed. Accepting adds them to staff as a Trial
        Moderator - you can change their role from the Team tab afterwards.
      </p>
      {message && <p className={styles.subtitle}>{message}</p>}

      <div className={styles.nav} style={{ borderBottom: "none", paddingBottom: 0 }}>
        <button
          type="button"
          className={`${styles.navLink} ${tab === "pending" ? styles.active : ""}`}
          onClick={() => setTab("pending")}
        >
          Pending ({pending.length})
        </button>
        <button
          type="button"
          className={`${styles.navLink} ${tab === "reviewed" ? styles.active : ""}`}
          onClick={() => setTab("reviewed")}
        >
          Reviewed
        </button>
      </div>

      {visible.length === 0 ? (
        <p className={styles.subtitle}>{tab === "pending" ? "Nothing waiting right now." : "Nothing reviewed yet."}</p>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Applicant</th>
                <th>Interested in</th>
                <th>Message</th>
                <th>Applied</th>
                {tab === "pending" && <th></th>}
                {tab === "reviewed" && <th>Status</th>}
              </tr>
            </thead>
            <tbody>
              {visible.map((application) => (
                <tr key={application.id}>
                  <td>
                    <div>{application.name}</div>
                    <div className={styles.subtitle} style={{ margin: 0 }}>{application.email}</div>
                  </td>
                  <td>{application.area_of_interest || "—"}</td>
                  <td style={{ maxWidth: 320 }}>{application.message}</td>
                  <td>{new Date(application.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</td>
                  {tab === "pending" ? (
                    <td style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      <button type="button" className={styles.secondaryButton} onClick={() => accept(application)}>
                        Accept
                      </button>
                      {rejectingId === application.id ? (
                        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                          <input
                            className={styles.input}
                            style={{ minHeight: 34, width: 160 }}
                            value={rejectNote}
                            onChange={(e) => setRejectNote(e.target.value)}
                            placeholder="Note (optional)"
                          />
                          <button type="button" className={styles.dangerButton} onClick={() => reject(application.id)}>
                            Confirm
                          </button>
                        </div>
                      ) : (
                        <button type="button" className={styles.dangerButton} onClick={() => setRejectingId(application.id)}>
                          Decline
                        </button>
                      )}
                    </td>
                  ) : (
                    <td>
                      <span className={`${styles.badge} ${application.status === "accepted" ? styles.badgeReviewed : styles.badgeUnreviewed}`}>
                        {application.status === "accepted" ? "Accepted" : "Declined"}
                      </span>
                      {application.review_note && (
                        <div className={styles.subtitle} style={{ margin: "2px 0 0" }}>{application.review_note}</div>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

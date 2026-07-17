"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import styles from "../admin.module.css";

interface SupportCase {
  id: string;
  user_id: string;
  subject: string;
  status: "open" | "closed";
  created_at: string;
  closed_at: string | null;
  access_expires_at: string | null;
}

export default function AdminSupportPage() {
  const [cases, setCases] = useState<SupportCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [opening, setOpening] = useState(false);

  useEffect(() => {
    void fetchCases().then((rows) => {
      setCases(rows);
      setLoading(false);
    });
  }, []);

  async function fetchCases(): Promise<SupportCase[]> {
    const supabase = createClient();
    const { data } = await supabase
      .from("support_cases")
      .select("*")
      .order("created_at", { ascending: false });
    return (data as SupportCase[]) ?? [];
  }

  async function openCase() {
    setLookupError(null);
    if (!email.trim() || !subject.trim()) return;
    setOpening(true);
    const supabase = createClient();

    const { data: found, error: lookupErr } = await supabase.rpc("find_user_by_email", {
      lookup_email: email.trim().toLowerCase(),
    });
    if (lookupErr || !found || found.length === 0) {
      setLookupError("No account found with that email.");
      setOpening(false);
      return;
    }

    const { data: session } = await supabase.auth.getSession();
    const openedBy = session.session?.user.id;
    if (!openedBy) {
      setLookupError("You need to be signed in.");
      setOpening(false);
      return;
    }

    const { error: insertErr } = await supabase.from("support_cases").insert({
      user_id: found[0].user_id,
      subject: subject.trim(),
      opened_by: openedBy,
    });
    if (insertErr) {
      setLookupError(insertErr.message);
      setOpening(false);
      return;
    }

    setEmail("");
    setSubject("");
    setOpening(false);
    setCases(await fetchCases());
  }

  if (loading) return <p className={styles.subtitle}>Loading…</p>;

  const openCases = cases.filter((c) => c.status === "open");
  const closedCases = cases.filter((c) => c.status === "closed");

  return (
    <>
      <h1 className={styles.title}>Support</h1>
      <p className={styles.subtitle}>
        Full account data is only visible while a case is open, and every view is logged. Close
        the case when you&apos;re done helping.
      </p>

      <div className={styles.card}>
        <span className={styles.cardTitle}>Open a case</span>
        <div className={styles.formGrid}>
          <div className={styles.field}>
            <span className={styles.label}>Account email</span>
            <input
              className={styles.input}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="person@example.com"
            />
          </div>
          <div className={styles.field}>
            <span className={styles.label}>What are you helping with?</span>
            <input
              className={styles.input}
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. sync not working"
            />
          </div>
        </div>
        {lookupError && <p className={styles.subtitle} style={{ color: "var(--pink)" }}>{lookupError}</p>}
        <button
          type="button"
          className={styles.primaryButton}
          style={{ width: "fit-content" }}
          disabled={opening || !email.trim() || !subject.trim()}
          onClick={openCase}
        >
          {opening ? "Opening…" : "Open case"}
        </button>
      </div>

      <h2 className={styles.cardTitle}>Open cases ({openCases.length})</h2>
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Subject</th>
              <th>Opened</th>
              <th>Access until</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {openCases.map((c) => (
              <tr key={c.id}>
                <td>{c.subject}</td>
                <td>{new Date(c.created_at).toLocaleString()}</td>
                <td>{c.access_expires_at ? new Date(c.access_expires_at).toLocaleString("en-GB") : "Set when admin operations is enabled"}</td>
                <td>
                  <Link href={`/admin/support/${c.id}`} className={styles.secondaryButton}>
                    Open
                  </Link>
                </td>
              </tr>
            ))}
            {openCases.length === 0 && (
              <tr>
                <td colSpan={3} className={styles.subtitle}>No open cases.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <h2 className={styles.cardTitle} style={{ marginTop: 20 }}>Closed cases ({closedCases.length})</h2>
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Subject</th>
              <th>Opened</th>
              <th>Closed</th>
              <th>Access ended</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {closedCases.map((c) => (
              <tr key={c.id}>
                <td>{c.subject}</td>
                <td>{new Date(c.created_at).toLocaleDateString()}</td>
                <td>{c.closed_at ? new Date(c.closed_at).toLocaleDateString() : "-"}</td>
                <td>{c.access_expires_at ? new Date(c.access_expires_at).toLocaleDateString("en-GB") : "-"}</td>
                <td>
                  <Link href={`/admin/support/${c.id}`} className={styles.secondaryButton}>
                    View
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

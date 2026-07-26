"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import styles from "../admin.module.css";

interface MyCase {
  id: string;
  subject: string;
  created_at: string;
  access_expires_at: string;
}

interface MyIssue {
  id: string;
  title: string;
  severity: string;
  status: string;
}

interface MyNote {
  id: string;
  body: string;
  pinned: boolean;
  created_at: string;
}

export default function MineePage() {
  const [cases, setCases] = useState<MyCase[]>([]);
  const [issues, setIssues] = useState<MyIssue[]>([]);
  const [notes, setNotes] = useState<MyNote[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();

    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        if (!cancelled) setLoading(false);
        return;
      }

      const [{ data: caseData }, { data: issueData }, { data: noteData }] = await Promise.all([
        supabase
          .from("support_cases")
          .select("id,subject,created_at,access_expires_at")
          .eq("opened_by", user.id)
          .eq("status", "open")
          .order("created_at", { ascending: false }),
        supabase
          .from("staff_issues")
          .select("id,title,severity,status")
          .eq("assigned_to", user.id)
          .in("status", ["open", "in_progress"])
          .order("created_at", { ascending: false }),
        supabase
          .from("staff_handoff_notes")
          .select("id,body,pinned,created_at")
          .eq("created_by", user.id)
          .is("resolved_at", null)
          .order("created_at", { ascending: false }),
      ]);

      if (cancelled) return;
      setCases((caseData as MyCase[]) ?? []);
      setIssues((issueData as MyIssue[]) ?? []);
      setNotes((noteData as MyNote[]) ?? []);
      setLoading(false);
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) return <p className={styles.subtitle}>Loading…</p>;

  const nothingAtAll = cases.length === 0 && issues.length === 0 && notes.length === 0;

  return (
    <>
      <h1 className={styles.title}>My open items</h1>
      <p className={styles.subtitle}>
        Everything currently on your plate, in one place, instead of checking each tool separately.
      </p>

      {nothingAtAll && <p className={styles.subtitle}>Nothing open right now.</p>}

      {cases.length > 0 && (
        <>
          <h2 className={styles.title} style={{ fontSize: 18, marginTop: 8 }}>Your open support cases</h2>
          <div className={styles.feedbackList}>
            {cases.map((item) => (
              <Link key={item.id} href={`/admin/support/${item.id}`} className={styles.feedbackCard}>
                <span className={styles.cardTitle} style={{ fontSize: 15 }}>{item.subject}</span>
                <span className={styles.subtitle} style={{ margin: 0 }}>
                  Access expires {new Date(item.access_expires_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                </span>
              </Link>
            ))}
          </div>
        </>
      )}

      {issues.length > 0 && (
        <>
          <h2 className={styles.title} style={{ fontSize: 18, marginTop: 8 }}>Your assigned issues</h2>
          <div className={styles.feedbackList}>
            {issues.map((item) => (
              <Link key={item.id} href="/admin/issues" className={styles.feedbackCard}>
                <span className={styles.cardTitle} style={{ fontSize: 15 }}>{item.title}</span>
                <span className={styles.subtitle} style={{ margin: 0 }}>{item.severity} · {item.status}</span>
              </Link>
            ))}
          </div>
        </>
      )}

      {notes.length > 0 && (
        <>
          <h2 className={styles.title} style={{ fontSize: 18, marginTop: 8 }}>Your active notes</h2>
          <div className={styles.feedbackList}>
            {notes.map((note) => (
              <Link key={note.id} href="/admin/notes" className={styles.feedbackCard}>
                {note.pinned && <span className={`${styles.badge} ${styles.badgeUnreviewed}`}>Pinned</span>}
                <span className={styles.subtitle} style={{ margin: 0, whiteSpace: "pre-wrap" }}>{note.body}</span>
              </Link>
            ))}
          </div>
        </>
      )}
    </>
  );
}

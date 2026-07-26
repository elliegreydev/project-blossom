"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import styles from "./admin.module.css";

const ADMINISTRATOR_RANK = 80;

interface HandoffNote {
  id: string;
  body: string;
  pinned: boolean;
  created_at: string;
}

export default function AdminOverviewPage() {
  const [rank, setRank] = useState(0);
  const [notes, setNotes] = useState<HandoffNote[]>([]);
  const [draft, setDraft] = useState("");

  async function loadNotes() {
    const supabase = createClient();
    const { data } = await supabase
      .from("staff_handoff_notes")
      .select("id,body,pinned,created_at")
      .is("resolved_at", null)
      .order("pinned", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(4);
    setNotes((data as HandoffNote[]) ?? []);
  }

  async function quickAddNote() {
    if (!draft.trim()) return;
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    await supabase.from("staff_handoff_notes").insert({ body: draft.trim(), created_by: user?.id ?? null });
    setDraft("");
    void loadNotes();
  }

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();
    supabase.rpc("my_staff_rank").then(({ data }) => {
      if (!cancelled && typeof data === "number") setRank(data);
    });
    void loadNotes();
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
        <Link href="/admin/ideas" className={styles.card}>
          <span className={styles.cardTitle}>Ideas & bug reports</span>
          <span className={styles.cardDesc}>
            Triage feature ideas from the public board and bug reports sent in by users.
          </span>
        </Link>
        <Link href="/admin/issues" className={styles.card}>
          <span className={styles.cardTitle}>Known issues</span>
          <span className={styles.cardDesc}>
            Internal-only bug tracker for things staff notice, before or instead of a public report.
          </span>
        </Link>
        <Link href="/admin/notes" className={styles.card}>
          <span className={styles.cardTitle}>Handoff notes</span>
          <span className={styles.cardDesc}>
            Quick context for the team that doesn&apos;t belong to any one tool.
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
            <Link href="/admin/beta" className={styles.card}>
              <span className={styles.cardTitle}>Beta</span>
              <span className={styles.cardDesc}>
                Generate single-use invite codes for beta testers and manage who&apos;s redeemed one.
              </span>
            </Link>
          </>
        )}
      </div>

      <h2 className={styles.title} style={{ fontSize: 18, marginTop: 8 }}>Team notes</h2>
      <div className={styles.field}>
        <textarea
          className={styles.textarea}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Leave a quick note for the team"
        />
        <button type="button" className={styles.primaryButton} style={{ width: "fit-content" }} disabled={!draft.trim()} onClick={quickAddNote}>
          Add note
        </button>
      </div>
      {notes.length === 0 ? (
        <p className={styles.subtitle}>Nothing active right now.</p>
      ) : (
        <div className={styles.feedbackList}>
          {notes.map((note) => (
            <div key={note.id} className={styles.feedbackCard}>
              {note.pinned && <span className={`${styles.badge} ${styles.badgeUnreviewed}`}>Pinned</span>}
              <span className={styles.subtitle} style={{ margin: 0, whiteSpace: "pre-wrap" }}>{note.body}</span>
            </div>
          ))}
        </div>
      )}
      <Link href="/admin/notes" className={styles.secondaryButton} style={{ width: "fit-content" }}>
        View all notes
      </Link>
    </>
  );
}

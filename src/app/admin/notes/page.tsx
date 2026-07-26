"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import styles from "../admin.module.css";

interface HandoffNote {
  id: string;
  body: string;
  pinned: boolean;
  created_by: string | null;
  created_at: string;
  resolved_at: string | null;
}

export default function AdminNotesPage() {
  const [notes, setNotes] = useState<HandoffNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [showResolved, setShowResolved] = useState(false);
  const [draft, setDraft] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  async function load() {
    const supabase = createClient();
    const { data } = await supabase
      .from("staff_handoff_notes")
      .select("id,body,pinned,created_by,created_at,resolved_at")
      .order("pinned", { ascending: false })
      .order("created_at", { ascending: false });
    setNotes((data as HandoffNote[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  async function addNote() {
    if (!draft.trim()) return;
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { error } = await supabase.from("staff_handoff_notes").insert({ body: draft.trim(), created_by: user?.id ?? null });
    if (error) {
      setMessage(error.message);
      return;
    }
    setDraft("");
    void load();
  }

  async function togglePin(note: HandoffNote) {
    const supabase = createClient();
    await supabase.from("staff_handoff_notes").update({ pinned: !note.pinned }).eq("id", note.id);
    void load();
  }

  async function markDone(note: HandoffNote) {
    const supabase = createClient();
    await supabase.from("staff_handoff_notes").update({ resolved_at: new Date().toISOString() }).eq("id", note.id);
    void load();
  }

  async function reopen(note: HandoffNote) {
    const supabase = createClient();
    await supabase.from("staff_handoff_notes").update({ resolved_at: null }).eq("id", note.id);
    void load();
  }

  if (loading) return <p className={styles.subtitle}>Loading…</p>;

  const active = notes.filter((n) => !n.resolved_at);
  const resolved = notes.filter((n) => n.resolved_at);
  const visible = showResolved ? resolved : active;

  return (
    <>
      <h1 className={styles.title}>Handoff notes</h1>
      <p className={styles.subtitle}>
        Quick context that doesn&apos;t belong to any one tool - a case worth watching, a resource that
        needs re-checking soon, anything worth another staff member knowing.
      </p>
      {message && <p className={styles.subtitle}>{message}</p>}

      <div className={styles.field}>
        <span className={styles.label}>New note</span>
        <textarea className={styles.textarea} value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Leave a note for the team" />
        <button type="button" className={styles.primaryButton} style={{ width: "fit-content" }} disabled={!draft.trim()} onClick={addNote}>
          Add note
        </button>
      </div>

      <div className={styles.nav} style={{ borderBottom: "none", paddingBottom: 0 }}>
        <button type="button" className={`${styles.navLink} ${!showResolved ? styles.active : ""}`} onClick={() => setShowResolved(false)}>
          Active ({active.length})
        </button>
        <button type="button" className={`${styles.navLink} ${showResolved ? styles.active : ""}`} onClick={() => setShowResolved(true)}>
          Done ({resolved.length})
        </button>
      </div>

      {visible.length === 0 ? (
        <p className={styles.subtitle}>Nothing here.</p>
      ) : (
        <div className={styles.feedbackList}>
          {visible.map((note) => (
            <div key={note.id} className={styles.feedbackCard}>
              <div className={styles.feedbackHeader}>
                {note.pinned && <span className={`${styles.badge} ${styles.badgeUnreviewed}`}>Pinned</span>}
                <span className={styles.subtitle} style={{ margin: 0 }}>
                  {new Date(note.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                </span>
              </div>
              <div className={styles.subtitle} style={{ margin: 0, whiteSpace: "pre-wrap" }}>{note.body}</div>
              <div className={styles.feedbackControls}>
                {!note.resolved_at ? (
                  <>
                    <button type="button" className={styles.secondaryButton} onClick={() => togglePin(note)}>
                      {note.pinned ? "Unpin" : "Pin"}
                    </button>
                    <button type="button" className={styles.primaryButton} onClick={() => markDone(note)}>Mark done</button>
                  </>
                ) : (
                  <button type="button" className={styles.secondaryButton} onClick={() => reopen(note)}>Reopen</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

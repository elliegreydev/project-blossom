"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import styles from "../admin.module.css";

interface CodeRow {
  code: string;
  created_at: string;
  redeemed_by: string | null;
  redeemed_email: string | null;
  redeemed_at: string | null;
}

interface KnownIssue {
  id: string;
  title: string;
  note: string | null;
  resolved: boolean;
  created_at: string;
}

function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I
  let out = "";
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  for (const b of bytes) out += chars[b % chars.length];
  return out;
}

function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-GB", {
    day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
  });
}

export default function AdminBetaPage() {
  const [codes, setCodes] = useState<CodeRow[]>([]);
  const [issues, setIssues] = useState<KnownIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [batchSize, setBatchSize] = useState(1);
  const [message, setMessage] = useState<string | null>(null);
  const [newIssueTitle, setNewIssueTitle] = useState("");
  const [newIssueNote, setNewIssueNote] = useState("");
  const [addingIssue, setAddingIssue] = useState(false);
  const [snapshot, setSnapshot] = useState<{ active_testers: number; messages_last_7_days: number } | null>(null);
  const [focusNote, setFocusNote] = useState("");
  const [savingFocus, setSavingFocus] = useState(false);

  async function load() {
    const supabase = createClient();
    const [{ data, error }, { data: issueRows }, { data: snapshotRows }, { data: focusRow }] = await Promise.all([
      supabase.rpc("list_beta_codes"),
      supabase.from("beta_known_issues").select("id,title,note,resolved,created_at").order("created_at", { ascending: false }),
      supabase.rpc("beta_engagement_snapshot"),
      supabase.from("beta_focus_note").select("note").eq("id", "current").maybeSingle(),
    ]);
    if (!error) setCodes((data as CodeRow[]) ?? []);
    setIssues((issueRows as KnownIssue[]) ?? []);
    const snap = (snapshotRows as { active_testers: number; messages_last_7_days: number }[] | null)?.[0];
    setSnapshot(snap ?? null);
    setFocusNote(focusRow?.note ?? "");
    setLoading(false);
  }

  async function saveFocusNote() {
    setSavingFocus(true);
    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();
    await supabase.from("beta_focus_note").upsert({
      id: "current",
      note: focusNote.trim(),
      updated_at: new Date().toISOString(),
      updated_by: userData.user?.id,
    });
    setSavingFocus(false);
  }

  async function addIssue() {
    if (!newIssueTitle.trim()) return;
    setAddingIssue(true);
    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();
    const { error } = await supabase.from("beta_known_issues").insert({
      title: newIssueTitle.trim(),
      note: newIssueNote.trim() || null,
      created_by: userData.user?.id,
    });
    setAddingIssue(false);
    if (error) {
      setMessage(error.message);
      return;
    }
    setNewIssueTitle("");
    setNewIssueNote("");
    void load();
  }

  async function toggleResolved(id: string, resolved: boolean) {
    await createClient().from("beta_known_issues").update({ resolved }).eq("id", id);
    void load();
  }

  async function deleteIssue(id: string) {
    if (!window.confirm("Delete this known issue?")) return;
    await createClient().from("beta_known_issues").delete().eq("id", id);
    void load();
  }

  useEffect(() => {
    void load();
  }, []);

  async function addCode() {
    setGenerating(true);
    setMessage(null);
    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();
    const count = Math.min(Math.max(batchSize, 1), 50);
    const rows = Array.from({ length: count }, () => ({ code: generateCode(), created_by: userData.user?.id }));
    const { error } = await supabase.from("beta_invite_codes").insert(rows);
    setGenerating(false);
    if (error) {
      setMessage(error.message);
      return;
    }
    void load();
  }

  async function deleteCode(code: string) {
    if (!window.confirm(`Delete unused code ${code}? It won't work if someone still has it.`)) return;
    const supabase = createClient();
    const { error } = await supabase.from("beta_invite_codes").delete().eq("code", code);
    if (error) {
      setMessage(error.message);
      return;
    }
    void load();
  }

  async function revoke(userId: string, email: string | null) {
    if (!window.confirm(`Revoke beta access for ${email ?? "this person"}? Their invite code stays used either way.`)) return;
    const supabase = createClient();
    const { error } = await supabase.rpc("revoke_beta_access", { target_user_id: userId });
    if (error) {
      setMessage(error.message);
      return;
    }
    void load();
  }

  if (loading) return <p className={styles.subtitle}>Loading…</p>;

  const unredeemed = codes.filter((c) => !c.redeemed_by);
  const redeemed = codes.filter((c) => c.redeemed_by);

  return (
    <>
      <h1 className={styles.title}>Beta</h1>
      <p className={styles.subtitle}>
        Single-use invite codes for beta testers. Each code works once and is tied to whoever
        redeems it, so a leaked or shared code traces back to exactly one person. Testers get
        access to the beta chat and a small in-app badge.
      </p>

      {message && <p className={styles.subtitle}>{message}</p>}

      {snapshot && (
        <div className={styles.grid}>
          <div className={styles.card}>
            <span className={styles.cardTitle}>{snapshot.active_testers}</span>
            <span className={styles.cardDesc}>Active testers</span>
          </div>
          <div className={styles.card}>
            <span className={styles.cardTitle}>{snapshot.messages_last_7_days}</span>
            <span className={styles.cardDesc}>Beta chat messages, last 7 days</span>
          </div>
        </div>
      )}

      <div className={styles.card}>
        <span className={styles.cardTitle}>Currently focused on</span>
        <p className={styles.cardDesc}>Shown on the beta hub, so testers have direction instead of just waiting for something to break.</p>
        <textarea
          className={styles.textarea}
          value={focusNote}
          onChange={(e) => setFocusNote(e.target.value)}
          placeholder="e.g. This week we're especially looking for feedback on Trusted Circle"
        />
        <button type="button" className={styles.secondaryButton} style={{ width: "fit-content" }} disabled={savingFocus} onClick={saveFocusNote}>
          {savingFocus ? "Saving…" : "Save"}
        </button>
      </div>

      <div className={styles.card}>
        <span className={styles.cardTitle}>{unredeemed.length} unused code{unredeemed.length === 1 ? "" : "s"}</span>
        <div className={styles.formGrid} style={{ maxWidth: 200 }}>
          <div className={styles.field}>
            <span className={styles.label}>How many</span>
            <input
              className={styles.input}
              type="number"
              min={1}
              max={50}
              value={batchSize}
              onChange={(e) => setBatchSize(Number(e.target.value) || 1)}
            />
          </div>
        </div>
        <button
          type="button"
          className={styles.primaryButton}
          style={{ width: "fit-content" }}
          disabled={generating}
          onClick={addCode}
        >
          {generating ? "Generating…" : batchSize > 1 ? `+ Generate ${batchSize} codes` : "+ Generate a code"}
        </button>
        {unredeemed.length > 0 && (
          <div className={styles.tableWrap} style={{ marginTop: 8 }}>
            <table className={styles.table}>
              <thead>
                <tr><th>Code</th><th>Created</th><th></th></tr>
              </thead>
              <tbody>
                {unredeemed.map((c) => (
                  <tr key={c.code}>
                    <td style={{ fontFamily: "monospace", fontWeight: 600 }}>{c.code}</td>
                    <td>{formatDate(c.created_at)}</td>
                    <td>
                      <button type="button" className={styles.dangerButton} onClick={() => deleteCode(c.code)}>
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Code</th>
              <th>Redeemed by</th>
              <th>Redeemed at</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {redeemed.map((c) => (
              <tr key={c.code}>
                <td style={{ fontFamily: "monospace" }}>{c.code}</td>
                <td>{c.redeemed_email ?? c.redeemed_by}</td>
                <td>{formatDate(c.redeemed_at)}</td>
                <td>
                  {c.redeemed_by && (
                    <button
                      type="button"
                      className={styles.dangerButton}
                      onClick={() => revoke(c.redeemed_by as string, c.redeemed_email)}
                    >
                      Revoke access
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {redeemed.length === 0 && (
              <tr><td colSpan={4} className={styles.mutedCell}>No codes redeemed yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <h1 className={styles.title} style={{ marginTop: 20 }}>Known issues</h1>
      <p className={styles.subtitle}>
        Shown to testers on the beta hub, so they can check before filing a duplicate report.
      </p>

      <div className={styles.card}>
        <div className={styles.formGrid}>
          <div className={styles.field}>
            <span className={styles.label}>Title</span>
            <input
              className={styles.input}
              value={newIssueTitle}
              onChange={(e) => setNewIssueTitle(e.target.value)}
              placeholder="e.g. Voice recording playback stutters on iOS"
            />
          </div>
          <div className={styles.field}>
            <span className={styles.label}>Note (optional)</span>
            <input
              className={styles.input}
              value={newIssueNote}
              onChange={(e) => setNewIssueNote(e.target.value)}
              placeholder="Anything worth adding"
            />
          </div>
        </div>
        <button
          type="button"
          className={styles.primaryButton}
          style={{ width: "fit-content" }}
          disabled={addingIssue || !newIssueTitle.trim()}
          onClick={addIssue}
        >
          {addingIssue ? "Adding…" : "+ Add known issue"}
        </button>
      </div>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr><th>Title</th><th>Status</th><th></th></tr>
          </thead>
          <tbody>
            {issues.map((issue) => (
              <tr key={issue.id}>
                <td>
                  {issue.title}
                  {issue.note && <div className={styles.mutedCell}>{issue.note}</div>}
                </td>
                <td>
                  <span className={issue.resolved ? styles.badgeClosed : styles.badgeOpen}>
                    {issue.resolved ? "Resolved" : "Open"}
                  </span>
                </td>
                <td className={styles.actionCell}>
                  <button type="button" className={styles.secondaryButton} onClick={() => toggleResolved(issue.id, !issue.resolved)}>
                    {issue.resolved ? "Reopen" : "Mark resolved"}
                  </button>
                  <button type="button" className={styles.dangerButton} onClick={() => deleteIssue(issue.id)}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {issues.length === 0 && (
              <tr><td colSpan={3} className={styles.mutedCell}>No known issues logged.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

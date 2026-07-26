"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import styles from "../admin.module.css";

type Severity = "low" | "medium" | "high" | "critical";
type Status = "open" | "in_progress" | "resolved" | "wont_fix";

interface StaffIssue {
  id: string;
  title: string;
  description: string | null;
  severity: Severity;
  status: Status;
  reported_by: string | null;
  assigned_to: string | null;
  created_at: string;
}

interface IssueComment {
  id: string;
  issue_id: string;
  body: string;
  created_at: string;
}

const SEVERITIES: Severity[] = ["low", "medium", "high", "critical"];
const STATUSES: Status[] = ["open", "in_progress", "resolved", "wont_fix"];
const STATUS_LABELS: Record<Status, string> = {
  open: "Open",
  in_progress: "In progress",
  resolved: "Resolved",
  wont_fix: "Won't fix",
};
const SEVERITY_LABELS: Record<Severity, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  critical: "Critical",
};

export default function AdminIssuesPage() {
  const [items, setItems] = useState<StaffIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<"active" | "all">("active");
  const [userId, setUserId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newSeverity, setNewSeverity] = useState<Severity>("medium");
  const [comments, setComments] = useState<Record<string, IssueComment[]>>({});
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});

  async function load() {
    const supabase = createClient();
    const [{ data }, { data: userData }, { data: commentData }] = await Promise.all([
      supabase
        .from("staff_issues")
        .select("id,title,description,severity,status,reported_by,assigned_to,created_at")
        .order("created_at", { ascending: false }),
      supabase.auth.getUser(),
      supabase.from("staff_issue_comments").select("id,issue_id,body,created_at").order("created_at", { ascending: true }),
    ]);
    setItems((data as StaffIssue[]) ?? []);
    setUserId(userData.user?.id ?? null);
    const grouped: Record<string, IssueComment[]> = {};
    for (const comment of (commentData as IssueComment[]) ?? []) {
      (grouped[comment.issue_id] ??= []).push(comment);
    }
    setComments(grouped);
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  async function createIssue() {
    if (!newTitle.trim()) return;
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { error } = await supabase.from("staff_issues").insert({
      title: newTitle.trim(),
      description: newDescription.trim() || null,
      severity: newSeverity,
      reported_by: user?.id ?? null,
    });
    if (error) {
      setMessage(error.message);
      return;
    }
    setNewTitle("");
    setNewDescription("");
    setNewSeverity("medium");
    setCreating(false);
    void load();
  }

  async function updateIssue(item: StaffIssue, patch: Partial<Pick<StaffIssue, "status" | "severity" | "assigned_to">>) {
    const supabase = createClient();
    const nextStatus = patch.status ?? item.status;
    const { error } = await supabase
      .from("staff_issues")
      .update({
        ...patch,
        updated_at: new Date().toISOString(),
        resolved_at: nextStatus === "resolved" || nextStatus === "wont_fix" ? new Date().toISOString() : null,
      })
      .eq("id", item.id);
    if (error) {
      setMessage(error.message);
      return;
    }
    void load();
  }

  function toggleExpanded(issueId: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(issueId)) next.delete(issueId);
      else next.add(issueId);
      return next;
    });
  }

  async function addComment(issueId: string) {
    const body = (commentDrafts[issueId] ?? "").trim();
    if (!body) return;
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { error } = await supabase.from("staff_issue_comments").insert({ issue_id: issueId, body, created_by: user?.id ?? null });
    if (error) {
      setMessage(error.message);
      return;
    }
    setCommentDrafts((prev) => ({ ...prev, [issueId]: "" }));
    void load();
  }

  if (loading) return <p className={styles.subtitle}>Loading…</p>;

  const visible = items.filter((item) => statusFilter === "all" || (item.status !== "resolved" && item.status !== "wont_fix"));
  const openCount = items.filter((item) => item.status === "open").length;

  return (
    <>
      <h1 className={styles.title}>Known issues</h1>
      <p className={styles.subtitle}>
        {items.length} total, {openCount} open. Internal only - things staff notice, before or instead of a
        public bug report.
      </p>
      {message && <p className={styles.subtitle}>{message}</p>}

      <button type="button" className={styles.primaryButton} style={{ width: "fit-content" }} onClick={() => setCreating((v) => !v)}>
        {creating ? "Cancel" : "+ New issue"}
      </button>

      {creating && (
        <div className={styles.formGrid}>
          <div className={styles.field}>
            <span className={styles.label}>Title</span>
            <input className={styles.input} value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="What's wrong?" autoFocus />
          </div>
          <div className={styles.field}>
            <span className={styles.label}>Description (optional)</span>
            <textarea className={styles.textarea} value={newDescription} onChange={(e) => setNewDescription(e.target.value)} placeholder="Steps to reproduce, where you saw it, anything useful" />
          </div>
          <div className={styles.field}>
            <span className={styles.label}>Severity</span>
            <select className={styles.select} value={newSeverity} onChange={(e) => setNewSeverity(e.target.value as Severity)}>
              {SEVERITIES.map((s) => <option key={s} value={s}>{SEVERITY_LABELS[s]}</option>)}
            </select>
          </div>
          <button type="button" className={styles.primaryButton} style={{ width: "fit-content" }} disabled={!newTitle.trim()} onClick={createIssue}>
            Add issue
          </button>
        </div>
      )}

      <div className={styles.nav} style={{ borderBottom: "none", paddingBottom: 0 }}>
        <button type="button" className={`${styles.navLink} ${statusFilter === "active" ? styles.active : ""}`} onClick={() => setStatusFilter("active")}>
          Active
        </button>
        <button type="button" className={`${styles.navLink} ${statusFilter === "all" ? styles.active : ""}`} onClick={() => setStatusFilter("all")}>
          All
        </button>
      </div>

      {visible.length === 0 ? (
        <p className={styles.subtitle}>Nothing here.</p>
      ) : (
        <div className={styles.feedbackList}>
          {visible.map((item) => (
            <div key={item.id} className={styles.feedbackCard}>
              <div className={styles.feedbackHeader}>
                <span className={`${styles.badge} ${item.severity === "critical" || item.severity === "high" ? styles.badgeUnreviewed : styles.badgeReviewed}`}>
                  {SEVERITY_LABELS[item.severity]}
                </span>
                <span className={styles.subtitle} style={{ margin: 0 }}>
                  {new Date(item.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                </span>
              </div>
              <div className={styles.cardTitle} style={{ fontSize: 15 }}>{item.title}</div>
              {item.description && <div className={styles.subtitle} style={{ margin: 0 }}>{item.description}</div>}

              <div className={styles.feedbackControls}>
                <div className={styles.field}>
                  <span className={styles.label}>Status</span>
                  <select className={styles.select} value={item.status} onChange={(e) => updateIssue(item, { status: e.target.value as Status })}>
                    {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
                  </select>
                </div>
                <div className={styles.field}>
                  <span className={styles.label}>Assigned</span>
                  {item.assigned_to === userId ? (
                    <button type="button" className={styles.secondaryButton} onClick={() => updateIssue(item, { assigned_to: null })}>Unassign me</button>
                  ) : (
                    <button type="button" className={styles.secondaryButton} onClick={() => updateIssue(item, { assigned_to: userId })}>Assign to me</button>
                  )}
                </div>
              </div>

              <button type="button" className={styles.secondaryButton} style={{ width: "fit-content" }} onClick={() => toggleExpanded(item.id)}>
                {expanded.has(item.id) ? "Hide" : "Show"} comments ({(comments[item.id] ?? []).length})
              </button>

              {expanded.has(item.id) && (
                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 4 }}>
                  {(comments[item.id] ?? []).map((comment) => (
                    <div key={comment.id} style={{ borderTop: "1px solid var(--border)", paddingTop: 8 }}>
                      <span className={styles.subtitle} style={{ margin: 0, whiteSpace: "pre-wrap" }}>{comment.body}</span>
                      <div className={styles.mutedCell}>
                        {new Date(comment.created_at).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </div>
                    </div>
                  ))}
                  <textarea
                    className={styles.textarea}
                    value={commentDrafts[item.id] ?? ""}
                    onChange={(e) => setCommentDrafts((prev) => ({ ...prev, [item.id]: e.target.value }))}
                    placeholder="Add a comment"
                  />
                  <button
                    type="button"
                    className={styles.primaryButton}
                    style={{ width: "fit-content" }}
                    disabled={!(commentDrafts[item.id] ?? "").trim()}
                    onClick={() => addComment(item.id)}
                  >
                    Add comment
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );
}

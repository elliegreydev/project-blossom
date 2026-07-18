"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import styles from "./ideas.module.css";
import sheetStyles from "@/components/Sheet.module.css";

type FeatureStatus = "submitted" | "planned" | "in_progress" | "shipped" | "declined";

interface FeatureItem {
  id: string;
  title: string;
  description: string;
  status: FeatureStatus;
  vote_count: number;
  created_at: string;
  reviewed_at: string | null;
}

const STATUS_LABELS: Record<FeatureStatus, string> = {
  submitted: "Submitted",
  planned: "Planned",
  in_progress: "In progress",
  shipped: "Shipped",
  declined: "Declined",
};

const STATUS_CLASS: Partial<Record<FeatureStatus, string>> = {
  shipped: "statusShipped",
  in_progress: "statusInProgress",
  planned: "statusPlanned",
};

const VOTER_TOKEN_KEY = "blossom_feedback_voter_token";
const VOTED_IDS_KEY = "blossom_feedback_voted_ids";

function getVoterToken(): string {
  let token = localStorage.getItem(VOTER_TOKEN_KEY);
  if (!token) {
    token = crypto.randomUUID();
    localStorage.setItem(VOTER_TOKEN_KEY, token);
  }
  return token;
}

function getVotedIds(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(VOTED_IDS_KEY) ?? "[]"));
  } catch {
    return new Set();
  }
}

function saveVotedIds(ids: Set<string>) {
  localStorage.setItem(VOTED_IDS_KEY, JSON.stringify([...ids]));
}

export default function IdeasPage() {
  const [tab, setTab] = useState<"board" | "bug">("board");
  const [items, setItems] = useState<FeatureItem[]>([]);
  const [boardLoading, setBoardLoading] = useState(true);
  const [sort, setSort] = useState<"popular" | "newest">("popular");
  const [votedIds, setVotedIds] = useState<Set<string>>(new Set());
  const [showSubmit, setShowSubmit] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [website, setWebsite] = useState(""); // honeypot
  const [submitStatus, setSubmitStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  async function loadBoard() {
    setBoardLoading(true);
    const supabase = createClient();
    const { data } = await supabase
      // A view, not the base table - only ever exposes feature-type rows
      // and public-safe columns (no review_note/reviewed_by), so a raw
      // request can't reach staff-internal commentary or bug reports even
      // if it asks for more than the app requests.
      .from("feedback_items_public")
      .select("id,title,description,status,vote_count,created_at,reviewed_at")
      .order(sort === "popular" ? "vote_count" : "created_at", { ascending: false });
    setItems((data as FeatureItem[]) ?? []);
    setBoardLoading(false);
  }

  useEffect(() => {
    setVotedIds(getVotedIds());
  }, []);

  useEffect(() => {
    void loadBoard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sort]);

  async function toggleVote(id: string) {
    const supabase = createClient();
    const token = getVoterToken();
    const hasVoted = votedIds.has(id);
    const next = new Set(votedIds);

    if (hasVoted) {
      await supabase.from("feedback_votes").delete().eq("feedback_id", id).eq("voter_token", token);
      next.delete(id);
      setItems((prev) => prev.map((it) => (it.id === id ? { ...it, vote_count: Math.max(0, it.vote_count - 1) } : it)));
    } else {
      const { error } = await supabase.from("feedback_votes").insert({ feedback_id: id, voter_token: token });
      if (!error) {
        next.add(id);
        setItems((prev) => prev.map((it) => (it.id === id ? { ...it, vote_count: it.vote_count + 1 } : it)));
      }
    }
    setVotedIds(next);
    saveVotedIds(next);
  }

  async function submit() {
    if (!title.trim() || !description.trim()) return;
    setSubmitStatus("sending");
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: tab === "board" ? "feature" : "bug",
          title: title.trim(),
          description: description.trim(),
          contactEmail: contactEmail.trim(),
          website,
        }),
      });
      setSubmitStatus(res.ok ? "sent" : "error");
      if (res.ok) {
        setTitle("");
        setDescription("");
        setContactEmail("");
        if (tab === "board") void loadBoard();
      }
    } catch {
      setSubmitStatus("error");
    }
  }

  function resetSubmitForm() {
    setTitle("");
    setDescription("");
    setContactEmail("");
    setSubmitStatus("idle");
    setShowSubmit(false);
  }

  const recentlyShipped = items
    .filter((item) => item.status === "shipped")
    .sort((a, b) => (b.reviewed_at ?? b.created_at).localeCompare(a.reviewed_at ?? a.created_at))
    .slice(0, 5);

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <Link href="/" className={styles.back}>← Back to Blossom</Link>

        <header className={styles.header}>
          <span className={styles.eyebrow}>Feedback</span>
          <h1>Ideas & bug reports</h1>
          <p className={styles.intro}>
            Suggest a feature, vote on what matters to you, or let us know something&apos;s not working.
            Feature ideas are public - please don&apos;t include anything personal or medical in one. Bug
            reports go straight to the team and are never shown publicly.
          </p>
        </header>

        <div className={styles.segmented}>
          <button
            type="button"
            className={`${styles.segment} ${tab === "board" ? styles.active : ""}`}
            onClick={() => {
              setTab("board");
              resetSubmitForm();
            }}
          >
            Ideas board
          </button>
          <button
            type="button"
            className={`${styles.segment} ${tab === "bug" ? styles.active : ""}`}
            onClick={() => {
              setTab("bug");
              resetSubmitForm();
            }}
          >
            Report a bug
          </button>
        </div>

        {tab === "board" ? (
          <>
            {!boardLoading && recentlyShipped.length > 0 && (
              <div className={styles.shippedSection}>
                <span className={styles.shippedLabel}>Recently shipped</span>
                <div className={styles.shippedList}>
                  {recentlyShipped.map((item) => (
                    <div key={item.id} className={styles.shippedItem}>
                      <span className={styles.shippedTitle}>{item.title}</span>
                      <span className={styles.shippedDate}>
                        {new Date(item.reviewed_at ?? item.created_at).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                        })}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className={styles.sortRow}>
              <button
                type="button"
                className={`${styles.sortChip} ${sort === "popular" ? styles.active : ""}`}
                onClick={() => setSort("popular")}
              >
                Most votes
              </button>
              <button
                type="button"
                className={`${styles.sortChip} ${sort === "newest" ? styles.active : ""}`}
                onClick={() => setSort("newest")}
              >
                Newest
              </button>
            </div>

            {!boardLoading && (
              <div className={styles.list}>
                {items.length === 0 && (
                  <p className={sheetStyles.helpText}>No ideas yet - be the first to suggest one.</p>
                )}
                {items.map((item) => {
                  const voted = votedIds.has(item.id);
                  const statusClass = STATUS_CLASS[item.status];
                  return (
                    <div key={item.id} className={styles.item}>
                      <button
                        type="button"
                        className={`${styles.voteButton} ${voted ? styles.voted : ""}`}
                        onClick={() => toggleVote(item.id)}
                        aria-pressed={voted}
                      >
                        <span>{item.vote_count}</span>
                        <span className={styles.voteButtonLabel}>{voted ? "Voted" : "Vote"}</span>
                      </button>
                      <div className={styles.itemBody}>
                        {item.status !== "submitted" && (
                          <span className={`${styles.statusBadge} ${statusClass ? styles[statusClass] : ""}`}>
                            {STATUS_LABELS[item.status]}
                          </span>
                        )}
                        <span className={styles.itemTitle}>{item.title}</span>
                        <span className={styles.itemDescription}>{item.description}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        ) : (
          <p className={sheetStyles.helpText}>
            Tell us what happened and we&apos;ll look into it. Bug reports are only visible to the team.
          </p>
        )}

        {submitStatus === "sent" ? (
          <div className={styles.confirmation}>
            <span className={styles.confirmationTitle}>Thank you</span>
            <p className={sheetStyles.helpText} style={{ margin: 0 }}>
              {tab === "board"
                ? "Your idea has been added to the board."
                : "Your bug report has been sent to the team."}
            </p>
            <button type="button" className={sheetStyles.tertiaryButton} style={{ alignSelf: "flex-start" }} onClick={resetSubmitForm}>
              {tab === "board" ? "Suggest another" : "Report another"}
            </button>
          </div>
        ) : showSubmit ? (
          <div className={styles.form}>
            <div className={sheetStyles.field}>
              <span className={sheetStyles.label}>{tab === "board" ? "What's the idea?" : "What's the title?"}</span>
              <input
                className={sheetStyles.input}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={tab === "board" ? "e.g. Dark mode for the widgets" : "e.g. Voice practice won't save a recording"}
                autoFocus
              />
            </div>
            <div className={sheetStyles.field}>
              <span className={sheetStyles.label}>
                {tab === "board" ? "Tell us more (no personal details needed)" : "What happened?"}
              </span>
              <textarea
                className={sheetStyles.textarea}
                style={{ minHeight: 120 }}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={tab === "board" ? "What would this let you do?" : "What did you expect, and what happened instead?"}
              />
            </div>
            {tab === "bug" && (
              <div className={sheetStyles.field}>
                <span className={sheetStyles.label}>Email (optional, if you'd like a reply)</span>
                <input
                  className={sheetStyles.input}
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="you@example.com"
                />
              </div>
            )}
            <label className={styles.honeypot} aria-hidden="true">
              Leave this field blank
              <input tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
            </label>

            {submitStatus === "error" && (
              <p className={styles.error}>Something went wrong sending that. Please try again in a moment.</p>
            )}

            <div style={{ display: "flex", gap: 8 }}>
              <button type="button" className={sheetStyles.tertiaryButton} onClick={resetSubmitForm}>
                Cancel
              </button>
              <button
                type="button"
                className={sheetStyles.primaryButton}
                disabled={!title.trim() || !description.trim() || submitStatus === "sending"}
                onClick={submit}
              >
                {submitStatus === "sending" ? "Sending…" : tab === "board" ? "Suggest idea" : "Send report"}
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            className={sheetStyles.primaryButton}
            style={{ alignSelf: "flex-start" }}
            onClick={() => setShowSubmit(true)}
          >
            {tab === "board" ? "+ Suggest an idea" : "+ Report a bug"}
          </button>
        )}
      </div>
    </main>
  );
}

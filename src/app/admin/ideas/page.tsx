"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import styles from "../admin.module.css";

type ItemType = "feature" | "bug";
type Status = "submitted" | "planned" | "in_progress" | "shipped" | "declined" | "investigating" | "fixed" | "wont_fix";

interface FeedbackItem {
  id: string;
  type: ItemType;
  title: string;
  description: string;
  contact_email: string | null;
  status: Status;
  vote_count: number;
  review_note: string | null;
  created_at: string;
}

const FEATURE_STATUSES: Status[] = ["submitted", "planned", "in_progress", "shipped", "declined"];
const BUG_STATUSES: Status[] = ["submitted", "investigating", "fixed", "wont_fix"];

const STATUS_LABELS: Record<Status, string> = {
  submitted: "Submitted",
  planned: "Planned",
  in_progress: "In progress",
  shipped: "Shipped",
  declined: "Declined",
  investigating: "Investigating",
  fixed: "Fixed",
  wont_fix: "Won't fix",
};

export default function AdminIdeasPage() {
  const [items, setItems] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<"all" | ItemType>("all");
  const [message, setMessage] = useState<string | null>(null);
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});

  async function load() {
    const supabase = createClient();
    const { data } = await supabase
      .from("feedback_items")
      .select("id,type,title,description,contact_email,status,vote_count,review_note,created_at")
      .order("created_at", { ascending: false });
    setItems((data as FeedbackItem[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  async function updateStatus(item: FeedbackItem, status: Status) {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("feedback_items")
      .update({
        status,
        review_note: noteDrafts[item.id] ?? item.review_note,
        reviewed_by: user?.id ?? null,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", item.id);
    if (error) {
      setMessage(error.message);
      return;
    }
    void load();
  }

  if (loading) return <p className={styles.subtitle}>Loading…</p>;

  const visible = items.filter((item) => typeFilter === "all" || item.type === typeFilter);
  const openCount = items.filter((item) => item.status === "submitted").length;

  return (
    <>
      <h1 className={styles.title}>Ideas & bug reports</h1>
      <p className={styles.subtitle}>
        {items.length} total, {openCount} not yet reviewed. Feature ideas are public on the board; bug
        reports are only ever visible here.
      </p>
      {message && <p className={styles.subtitle}>{message}</p>}

      <div className={styles.nav} style={{ borderBottom: "none", paddingBottom: 0 }}>
        <button
          type="button"
          className={`${styles.navLink} ${typeFilter === "all" ? styles.active : ""}`}
          onClick={() => setTypeFilter("all")}
        >
          All
        </button>
        <button
          type="button"
          className={`${styles.navLink} ${typeFilter === "feature" ? styles.active : ""}`}
          onClick={() => setTypeFilter("feature")}
        >
          Feature ideas
        </button>
        <button
          type="button"
          className={`${styles.navLink} ${typeFilter === "bug" ? styles.active : ""}`}
          onClick={() => setTypeFilter("bug")}
        >
          Bug reports
        </button>
      </div>

      {visible.length === 0 ? (
        <p className={styles.subtitle}>Nothing here.</p>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Details</th>
                <th>Submitted</th>
                <th>Votes</th>
                <th>Status</th>
                <th>Note</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((item) => {
                const statusOptions = item.type === "feature" ? FEATURE_STATUSES : BUG_STATUSES;
                return (
                  <tr key={item.id}>
                    <td>
                      <span className={`${styles.badge} ${item.type === "feature" ? styles.badgeReviewed : styles.badgeUnreviewed}`}>
                        {item.type === "feature" ? "Idea" : "Bug"}
                      </span>
                      <div className={styles.cardTitle} style={{ fontSize: 14, marginTop: 4 }}>{item.title}</div>
                      <div className={styles.subtitle} style={{ margin: "2px 0 0", maxWidth: 320 }}>{item.description}</div>
                      {item.contact_email && (
                        <div className={styles.subtitle} style={{ margin: "2px 0 0" }}>{item.contact_email}</div>
                      )}
                    </td>
                    <td>{new Date(item.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</td>
                    <td>{item.type === "feature" ? item.vote_count : "—"}</td>
                    <td>
                      <select
                        className={styles.select}
                        value={item.status}
                        onChange={(e) => updateStatus(item, e.target.value as Status)}
                      >
                        {statusOptions.map((status) => (
                          <option key={status} value={status}>{STATUS_LABELS[status]}</option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <input
                        className={styles.input}
                        style={{ minHeight: 34, width: 160 }}
                        defaultValue={item.review_note ?? ""}
                        onChange={(e) => setNoteDrafts((prev) => ({ ...prev, [item.id]: e.target.value }))}
                        placeholder="Internal note"
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

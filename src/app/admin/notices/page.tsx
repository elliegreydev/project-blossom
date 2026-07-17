"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import styles from "../admin.module.css";

interface Notice {
  id: string;
  title: string;
  body: string;
  tone: "info" | "care";
  status: "draft" | "published" | "archived";
  starts_at: string;
  ends_at: string | null;
  published_at: string | null;
}

const emptyDraft: { title: string; body: string; tone: "info" | "care"; endsAt: string } = {
  title: "",
  body: "",
  tone: "info",
  endsAt: "",
};

async function fetchNotices() {
  return createClient()
    .from("app_notices")
    .select("id,title,body,tone,status,starts_at,ends_at,published_at")
    .order("created_at", { ascending: false });
}

export default function NoticesPage() {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [draft, setDraft] = useState(emptyDraft);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function load() {
    const { data, error } = await fetchNotices();
    if (error) setMessage("Notices are not ready yet. Run the admin operations SQL once, then refresh this page.");
    else setNotices((data as Notice[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    let cancelled = false;
    void fetchNotices().then(({ data, error }) => {
      if (cancelled) return;
      if (error) setMessage("Notices are not ready yet. Run the admin operations SQL once, then refresh this page.");
      else setNotices((data as Notice[]) ?? []);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  async function saveDraft() {
    if (!draft.title.trim() || !draft.body.trim()) return;
    setSaving(true);
    setMessage(null);
    const supabase = createClient();
    const { data: session } = await supabase.auth.getSession();
    const userId = session.session?.user.id;
    if (!userId) {
      setMessage("You need to be signed in to create a notice.");
      setSaving(false);
      return;
    }
    const { error } = await supabase.from("app_notices").insert({
      title: draft.title.trim(),
      body: draft.body.trim(),
      tone: draft.tone,
      created_by: userId,
      ends_at: draft.endsAt ? new Date(`${draft.endsAt}T23:59:59`).toISOString() : null,
    });
    if (error) setMessage(error.message);
    else {
      setDraft(emptyDraft);
      setMessage("Draft saved. Publish it only when the wording is ready for everyone.");
      await load();
    }
    setSaving(false);
  }

  async function publish(notice: Notice) {
    const supabase = createClient();
    const { data: session } = await supabase.auth.getSession();
    const userId = session.session?.user.id;
    if (!userId) return;
    const { error } = await supabase
      .from("app_notices")
      .update({ status: "published", starts_at: new Date().toISOString(), published_at: new Date().toISOString(), published_by: userId })
      .eq("id", notice.id);
    setMessage(error ? error.message : "Notice published.");
    await load();
  }

  async function archive(notice: Notice) {
    const supabase = createClient();
    const { error } = await supabase.from("app_notices").update({ status: "archived" }).eq("id", notice.id);
    setMessage(error ? error.message : "Notice archived. It is no longer shown in Blossom.");
    await load();
  }

  if (loading) return <p className={styles.subtitle}>Loading…</p>;

  return (
    <>
      <h1 className={styles.title}>App notices</h1>
      <p className={styles.subtitle}>
        Short, calm messages for maintenance or service changes. Notices expire automatically when an end date is set.
      </p>

      <section className={styles.card}>
        <span className={styles.cardTitle}>New draft</span>
        <div className={styles.field}>
          <span className={styles.label}>Title</span>
          <input className={styles.input} maxLength={90} value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} placeholder="A short service update" />
        </div>
        <div className={styles.field}>
          <span className={styles.label}>Message</span>
          <textarea className={styles.textarea} maxLength={320} value={draft.body} onChange={(event) => setDraft({ ...draft, body: event.target.value })} placeholder="Keep it clear, kind and practical." />
        </div>
        <div className={styles.formGrid}>
          <div className={styles.field}>
            <span className={styles.label}>Style</span>
            <select className={styles.select} value={draft.tone} onChange={(event) => setDraft({ ...draft, tone: event.target.value as "info" | "care" })}>
              <option value="info">Information</option>
              <option value="care">Gentle update</option>
            </select>
          </div>
          <div className={styles.field}>
            <span className={styles.label}>Hide after (optional)</span>
            <input className={styles.input} type="date" value={draft.endsAt} onChange={(event) => setDraft({ ...draft, endsAt: event.target.value })} />
          </div>
        </div>
        <button type="button" className={styles.primaryButton} style={{ width: "fit-content" }} onClick={saveDraft} disabled={saving || !draft.title.trim() || !draft.body.trim()}>
          {saving ? "Saving…" : "Save draft"}
        </button>
        {message && <p className={styles.subtitle}>{message}</p>}
      </section>

      <h2 className={styles.cardTitle} style={{ marginTop: 20 }}>Recent notices</h2>
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead><tr><th>Notice</th><th>Status</th><th>Expiry</th><th></th></tr></thead>
          <tbody>
            {notices.map((notice) => (
              <tr key={notice.id}>
                <td><strong>{notice.title}</strong><br /><span className={styles.mutedCell}>{notice.body}</span></td>
                <td><span className={`${styles.badge} ${notice.status === "published" ? styles.badgeReviewed : notice.status === "draft" ? styles.badgeUnreviewed : styles.badgeClosed}`}>{notice.status}</span></td>
                <td>{notice.ends_at ? new Date(notice.ends_at).toLocaleDateString("en-GB") : "No expiry"}</td>
                <td className={styles.actionCell}>
                  {notice.status === "draft" && <button type="button" className={styles.secondaryButton} onClick={() => void publish(notice)}>Publish</button>}
                  {notice.status !== "archived" && <button type="button" className={styles.dangerButton} onClick={() => void archive(notice)}>Archive</button>}
                </td>
              </tr>
            ))}
            {notices.length === 0 && <tr><td colSpan={4} className={styles.subtitle}>No notices yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}

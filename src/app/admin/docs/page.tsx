"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import styles from "../admin.module.css";

type Category = "support-process" | "moderation" | "onboarding" | "general";

interface StaffDoc {
  id: string;
  title: string;
  category: Category;
  body: string;
  updated_at: string;
}

const CATEGORIES: Category[] = ["support-process", "moderation", "onboarding", "general"];
const CATEGORY_LABELS: Record<Category, string> = {
  "support-process": "Support process",
  moderation: "Moderation",
  onboarding: "Onboarding",
  general: "General",
};

export default function AdminDocsPage() {
  const [docs, setDocs] = useState<StaffDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState<"all" | Category>("all");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<Category>("general");
  const [body, setBody] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  async function load() {
    const supabase = createClient();
    const { data } = await supabase.from("staff_docs").select("id,title,category,body,updated_at").order("title");
    setDocs((data as StaffDoc[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  function startCreate() {
    setCreating(true);
    setEditingId(null);
    setTitle("");
    setCategory("general");
    setBody("");
  }

  function startEdit(doc: StaffDoc) {
    setCreating(false);
    setEditingId(doc.id);
    setTitle(doc.title);
    setCategory(doc.category);
    setBody(doc.body);
  }

  function cancelForm() {
    setCreating(false);
    setEditingId(null);
  }

  async function save() {
    if (!title.trim() || !body.trim()) return;
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const input = { title: title.trim(), category, body: body.trim(), updated_by: user?.id ?? null, updated_at: new Date().toISOString() };
    const { error } = editingId
      ? await supabase.from("staff_docs").update(input).eq("id", editingId)
      : await supabase.from("staff_docs").insert(input);
    if (error) {
      setMessage(error.message);
      return;
    }
    cancelForm();
    void load();
  }

  async function remove(id: string) {
    if (!window.confirm("Delete this doc?")) return;
    const supabase = createClient();
    const { error } = await supabase.from("staff_docs").delete().eq("id", id);
    if (error) {
      setMessage(error.message);
      return;
    }
    void load();
  }

  if (loading) return <p className={styles.subtitle}>Loading…</p>;

  const visible = docs.filter((d) => categoryFilter === "all" || d.category === categoryFilter);
  const showingForm = creating || editingId !== null;

  return (
    <>
      <h1 className={styles.title}>Knowledge base</h1>
      <p className={styles.subtitle}>
        Durable, written playbooks and reference docs - unlike Handoff notes, these are meant to last.
      </p>
      {message && <p className={styles.subtitle}>{message}</p>}

      <button type="button" className={styles.primaryButton} style={{ width: "fit-content" }} onClick={() => (showingForm ? cancelForm() : startCreate())}>
        {showingForm ? "Cancel" : "+ New doc"}
      </button>

      {showingForm && (
        <div className={styles.formGrid}>
          <div className={styles.field}>
            <span className={styles.label}>Title</span>
            <input className={styles.input} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Handling a crisis-related message" autoFocus />
          </div>
          <div className={styles.field}>
            <span className={styles.label}>Category</span>
            <select className={styles.select} value={category} onChange={(e) => setCategory(e.target.value as Category)}>
              {CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
            </select>
          </div>
          <div className={styles.field}>
            <span className={styles.label}>Body</span>
            <textarea className={styles.textarea} style={{ minHeight: 160 }} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Write the playbook or reference content here" />
          </div>
          <button type="button" className={styles.primaryButton} style={{ width: "fit-content" }} disabled={!title.trim() || !body.trim()} onClick={save}>
            {editingId ? "Save changes" : "Add doc"}
          </button>
        </div>
      )}

      <div className={styles.nav} style={{ borderBottom: "none", paddingBottom: 0, flexWrap: "wrap" }}>
        <button type="button" className={`${styles.navLink} ${categoryFilter === "all" ? styles.active : ""}`} onClick={() => setCategoryFilter("all")}>
          All
        </button>
        {CATEGORIES.map((c) => (
          <button key={c} type="button" className={`${styles.navLink} ${categoryFilter === c ? styles.active : ""}`} onClick={() => setCategoryFilter(c)}>
            {CATEGORY_LABELS[c]}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <p className={styles.subtitle}>Nothing here yet.</p>
      ) : (
        <div className={styles.feedbackList}>
          {visible.map((doc) => (
            <div key={doc.id} className={styles.feedbackCard}>
              <div className={styles.feedbackHeader}>
                <span className={`${styles.badge} ${styles.badgeReviewed}`}>{CATEGORY_LABELS[doc.category]}</span>
                <span className={styles.subtitle} style={{ margin: 0 }}>
                  Updated {new Date(doc.updated_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                </span>
              </div>
              <div className={styles.cardTitle} style={{ fontSize: 15 }}>{doc.title}</div>
              <div className={styles.subtitle} style={{ margin: 0, whiteSpace: "pre-wrap" }}>{doc.body}</div>
              <div className={styles.feedbackControls}>
                <button type="button" className={styles.secondaryButton} onClick={() => startEdit(doc)}>Edit</button>
                <button type="button" className={styles.dangerButton} onClick={() => remove(doc.id)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

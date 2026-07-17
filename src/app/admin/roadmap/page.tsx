"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import styles from "../admin.module.css";

type Stage = "available" | "next" | "later";
type Status = "active" | "hidden";

interface RoadmapItem {
  id: string;
  title: string;
  description: string;
  stage: Stage;
  status: Status;
  sort_order: number;
  is_recent: boolean;
}

const STAGE_LABELS: Record<Stage, string> = {
  available: "Available now",
  next: "Up next",
  later: "Later on",
};

const STAGE_ORDER: Record<Stage, number> = {
  available: 0,
  next: 1,
  later: 2,
};

const EMPTY_DRAFT = {
  title: "",
  description: "",
  stage: "next" as Stage,
  sortOrder: "100",
  isRecent: false,
};

function sortRoadmapItems(items: RoadmapItem[]) {
  return [...items].sort(
    (first, second) => STAGE_ORDER[first.stage] - STAGE_ORDER[second.stage] || first.sort_order - second.sort_order
  );
}

export default function RoadmapAdminPage() {
  const [items, setItems] = useState<RoadmapItem[]>([]);
  const [draft, setDraft] = useState(EMPTY_DRAFT);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function load() {
    const { data, error } = await createClient()
      .from("product_roadmap")
      .select("id,title,description,stage,status,sort_order,is_recent")
      .order("stage", { ascending: true })
      .order("sort_order", { ascending: true });
    if (error) setMessage("Roadmap management is not ready yet. Run the roadmap SQL once, then refresh this page.");
    else setItems(sortRoadmapItems((data as RoadmapItem[]) ?? []));
    setLoading(false);
  }

  useEffect(() => {
    let cancelled = false;
    void createClient()
      .from("product_roadmap")
      .select("id,title,description,stage,status,sort_order,is_recent")
      .order("stage", { ascending: true })
      .order("sort_order", { ascending: true })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) setMessage("Roadmap management is not ready yet. Run the roadmap SQL once, then refresh this page.");
        else {
          setItems(sortRoadmapItems((data as RoadmapItem[]) ?? []));
        }
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  function beginEdit(item: RoadmapItem) {
    setEditingId(item.id);
    setDraft({
      title: item.title,
      description: item.description,
      stage: item.stage,
      sortOrder: String(item.sort_order),
      isRecent: item.is_recent,
    });
    setMessage(null);
  }

  function resetDraft() {
    setEditingId(null);
    setDraft(EMPTY_DRAFT);
  }

  async function save() {
    if (!draft.title.trim() || !draft.description.trim()) return;
    setSaving(true);
    setMessage(null);
    const payload = {
      title: draft.title.trim(),
      description: draft.description.trim(),
      stage: draft.stage,
      sort_order: Number(draft.sortOrder) || 100,
      is_recent: draft.isRecent,
    };
    const query = editingId
      ? createClient().from("product_roadmap").update(payload).eq("id", editingId)
      : createClient().from("product_roadmap").insert(payload);
    const { error } = await query;
    setSaving(false);
    if (error) {
      setMessage(error.message);
      return;
    }
    setMessage(editingId ? "Roadmap item updated." : "Roadmap item added.");
    resetDraft();
    await load();
  }

  async function toggleVisibility(item: RoadmapItem) {
    const status: Status = item.status === "active" ? "hidden" : "active";
    const { error } = await createClient().from("product_roadmap").update({ status }).eq("id", item.id);
    setMessage(error ? error.message : status === "active" ? "Item is visible in Blossom." : "Item is hidden from Blossom.");
    await load();
  }

  if (loading) return <p className={styles.subtitle}>Loading…</p>;

  return (
    <>
      <h1 className={styles.title}>Roadmap</h1>
      <p className={styles.subtitle}>
        A straightforward, date-free view of what Blossom has now and what may come next. Hidden items stay staff-only.
      </p>

      <section className={styles.card}>
        <span className={styles.cardTitle}>{editingId ? "Edit roadmap item" : "Add roadmap item"}</span>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="roadmap-title">Title</label>
          <input id="roadmap-title" className={styles.input} maxLength={100} value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} placeholder="A short, clear feature name" />
        </div>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="roadmap-description">What it means for people</label>
          <textarea id="roadmap-description" className={styles.textarea} maxLength={320} value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} placeholder="Keep this practical, calm and free of deadlines." />
        </div>
        <div className={styles.formGrid}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="roadmap-stage">Place on roadmap</label>
            <select id="roadmap-stage" className={styles.select} value={draft.stage} onChange={(event) => setDraft({ ...draft, stage: event.target.value as Stage })}>
              <option value="available">Available now</option>
              <option value="next">Up next</option>
              <option value="later">Later on</option>
            </select>
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="roadmap-order">Order within section</label>
            <input id="roadmap-order" className={styles.input} type="number" min="0" value={draft.sortOrder} onChange={(event) => setDraft({ ...draft, sortOrder: event.target.value })} />
          </div>
        </div>
        <label className={styles.checkRow}>
          <input type="checkbox" checked={draft.isRecent} onChange={(event) => setDraft({ ...draft, isRecent: event.target.checked })} />
          Show “Recently added” beside this item
        </label>
        <div className={styles.actionCell}>
          <button type="button" className={styles.primaryButton} style={{ width: "fit-content" }} onClick={() => void save()} disabled={saving || !draft.title.trim() || !draft.description.trim()}>
            {saving ? "Saving…" : editingId ? "Save changes" : "Add item"}
          </button>
          {editingId && <button type="button" className={styles.secondaryButton} onClick={resetDraft}>Cancel</button>}
        </div>
        {message && <p className={styles.subtitle}>{message}</p>}
      </section>

      <h2 className={styles.cardTitle} style={{ marginTop: 20 }}>Current roadmap</h2>
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead><tr><th>Item</th><th>Section</th><th>Visibility</th><th></th></tr></thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td><strong>{item.title}</strong><br /><span className={styles.mutedCell}>{item.description}</span></td>
                <td>{STAGE_LABELS[item.stage]}</td>
                <td><span className={`${styles.badge} ${item.status === "active" ? styles.badgeReviewed : styles.badgeClosed}`}>{item.status}</span></td>
                <td className={styles.actionCell}>
                  <button type="button" className={styles.secondaryButton} onClick={() => beginEdit(item)}>Edit</button>
                  <button type="button" className={styles.secondaryButton} onClick={() => void toggleVisibility(item)}>{item.status === "active" ? "Hide" : "Show"}</button>
                </td>
              </tr>
            ))}
            {items.length === 0 && <tr><td colSpan={4} className={styles.subtitle}>Nothing on the roadmap yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}

"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import styles from "../admin.module.css";

interface StaffIncident {
  id: string;
  title: string;
  description: string | null;
  impact: string | null;
  resolution: string | null;
  lessons_learned: string | null;
  occurred_at: string | null;
  discovered_at: string;
  resolved_at: string | null;
}

export default function AdminIncidentsPage() {
  const [items, setItems] = useState<StaffIncident[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [impact, setImpact] = useState("");
  const [resolution, setResolution] = useState("");
  const [lessonsLearned, setLessonsLearned] = useState("");
  const [occurredAt, setOccurredAt] = useState("");
  const [resolved, setResolved] = useState(false);

  async function load() {
    const supabase = createClient();
    const { data } = await supabase
      .from("staff_incidents")
      .select("id,title,description,impact,resolution,lessons_learned,occurred_at,discovered_at,resolved_at")
      .order("discovered_at", { ascending: false });
    setItems((data as StaffIncident[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  function resetForm() {
    setCreating(false);
    setEditingId(null);
    setTitle("");
    setDescription("");
    setImpact("");
    setResolution("");
    setLessonsLearned("");
    setOccurredAt("");
    setResolved(false);
  }

  function startEdit(item: StaffIncident) {
    setCreating(false);
    setEditingId(item.id);
    setTitle(item.title);
    setDescription(item.description ?? "");
    setImpact(item.impact ?? "");
    setResolution(item.resolution ?? "");
    setLessonsLearned(item.lessons_learned ?? "");
    setOccurredAt(item.occurred_at ? item.occurred_at.slice(0, 10) : "");
    setResolved(Boolean(item.resolved_at));
  }

  async function save() {
    if (!title.trim()) return;
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const input = {
      title: title.trim(),
      description: description.trim() || null,
      impact: impact.trim() || null,
      resolution: resolution.trim() || null,
      lessons_learned: lessonsLearned.trim() || null,
      occurred_at: occurredAt || null,
      resolved_at: resolved ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
      created_by: user?.id ?? null,
    };
    const { error } = editingId
      ? await supabase.from("staff_incidents").update(input).eq("id", editingId)
      : await supabase.from("staff_incidents").insert(input);
    if (error) {
      setMessage(error.message);
      return;
    }
    resetForm();
    void load();
  }

  async function remove(id: string) {
    if (!window.confirm("Delete this incident record?")) return;
    const supabase = createClient();
    const { error } = await supabase.from("staff_incidents").delete().eq("id", id);
    if (error) {
      setMessage(error.message);
      return;
    }
    void load();
  }

  if (loading) return <p className={styles.subtitle}>Loading…</p>;

  const showingForm = creating || editingId !== null;

  return (
    <>
      <h1 className={styles.title}>Incident log</h1>
      <p className={styles.subtitle}>
        A retrospective record of what broke, the impact, and what changed as a result - distinct from
        Known issues, which is for ongoing bugs. Fill this in once something is understood, not while
        it's still unfolding.
      </p>
      {message && <p className={styles.subtitle}>{message}</p>}

      <button type="button" className={styles.primaryButton} style={{ width: "fit-content" }} onClick={() => (showingForm ? resetForm() : setCreating(true))}>
        {showingForm ? "Cancel" : "+ New incident"}
      </button>

      {showingForm && (
        <div className={styles.formGrid}>
          <div className={styles.field}>
            <span className={styles.label}>Title</span>
            <input className={styles.input} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What happened, in a few words" autoFocus />
          </div>
          <div className={styles.field}>
            <span className={styles.label}>What happened</span>
            <textarea className={styles.textarea} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe the incident" />
          </div>
          <div className={styles.field}>
            <span className={styles.label}>Impact</span>
            <textarea className={styles.textarea} value={impact} onChange={(e) => setImpact(e.target.value)} placeholder="Who or what was affected, and how badly" />
          </div>
          <div className={styles.field}>
            <span className={styles.label}>Resolution</span>
            <textarea className={styles.textarea} value={resolution} onChange={(e) => setResolution(e.target.value)} placeholder="What fixed it" />
          </div>
          <div className={styles.field}>
            <span className={styles.label}>Lessons learned</span>
            <textarea className={styles.textarea} value={lessonsLearned} onChange={(e) => setLessonsLearned(e.target.value)} placeholder="What changed as a result, so it's less likely to happen again" />
          </div>
          <div className={styles.field}>
            <span className={styles.label}>When it happened (optional)</span>
            <input className={styles.input} type="date" value={occurredAt} onChange={(e) => setOccurredAt(e.target.value)} />
          </div>
          <div className={styles.checkRow}>
            <input type="checkbox" checked={resolved} onChange={(e) => setResolved(e.target.checked)} id="incident-resolved" />
            <label htmlFor="incident-resolved" className={styles.label}>Resolved</label>
          </div>
          <button type="button" className={styles.primaryButton} style={{ width: "fit-content" }} disabled={!title.trim()} onClick={save}>
            {editingId ? "Save changes" : "Add incident"}
          </button>
        </div>
      )}

      {items.length === 0 ? (
        <p className={styles.subtitle}>Nothing recorded yet.</p>
      ) : (
        <div className={styles.feedbackList}>
          {items.map((item) => (
            <div key={item.id} className={styles.feedbackCard}>
              <div className={styles.feedbackHeader}>
                <span className={`${styles.badge} ${item.resolved_at ? styles.badgeReviewed : styles.badgeUnreviewed}`}>
                  {item.resolved_at ? "Resolved" : "Open"}
                </span>
                <span className={styles.subtitle} style={{ margin: 0 }}>
                  Discovered {new Date(item.discovered_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                </span>
              </div>
              <div className={styles.cardTitle} style={{ fontSize: 15 }}>{item.title}</div>
              {item.description && <div className={styles.subtitle} style={{ margin: 0 }}>{item.description}</div>}
              {item.impact && <div className={styles.subtitle} style={{ margin: 0 }}><strong>Impact:</strong> {item.impact}</div>}
              {item.resolution && <div className={styles.subtitle} style={{ margin: 0 }}><strong>Resolution:</strong> {item.resolution}</div>}
              {item.lessons_learned && <div className={styles.subtitle} style={{ margin: 0 }}><strong>Lessons learned:</strong> {item.lessons_learned}</div>}
              <div className={styles.feedbackControls}>
                <button type="button" className={styles.secondaryButton} onClick={() => startEdit(item)}>Edit</button>
                <button type="button" className={styles.dangerButton} onClick={() => remove(item.id)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

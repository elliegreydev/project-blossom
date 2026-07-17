"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { COUNTRIES, SUBREGIONS, CATEGORY_LABELS, type ResourceCategory } from "@/lib/regionResources";
import styles from "../admin.module.css";

interface ResourceRow {
  id: string;
  country: string;
  subregion: string | null;
  city_name: string | null;
  org_name: string;
  category: ResourceCategory;
  contact_info: string;
  availability: string | null;
  source_url: string;
  note: string | null;
  last_reviewed_at: string;
  reviewed_by_staff: boolean;
}

interface LegalNoteRow {
  id: string;
  country: string;
  subregion: string;
  note: string;
  source_url: string;
  last_reviewed_at: string;
}

const CATEGORIES: ResourceCategory[] = ["emergency", "crisis", "peer", "legal", "housing", "general"];
const TODAY = new Date().toISOString().slice(0, 10);

function emptyDraft(): Omit<ResourceRow, "id" | "reviewed_by_staff"> {
  return {
    country: COUNTRIES[0],
    subregion: null,
    city_name: null,
    org_name: "",
    category: "general",
    contact_info: "",
    availability: null,
    source_url: "",
    note: null,
    last_reviewed_at: TODAY,
  };
}

export default function AdminResourcesPage() {
  const [resources, setResources] = useState<ResourceRow[]>([]);
  const [legalNotes, setLegalNotes] = useState<LegalNoteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCountry, setFilterCountry] = useState<string>("");
  const [filterReviewed, setFilterReviewed] = useState<string>("");
  const [filterAttention, setFilterAttention] = useState<string>("");
  const [reviewCutoff] = useState(() => Date.now() - 180 * 24 * 60 * 60 * 1000);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState(emptyDraft());
  const [creating, setCreating] = useState(false);

  async function load(): Promise<{ resources: ResourceRow[]; legalNotes: LegalNoteRow[] }> {
    const supabase = createClient();
    const [{ data: r }, { data: n }] = await Promise.all([
      supabase.from("region_resources").select("*").order("country").order("subregion"),
      supabase.from("legal_context_notes").select("*").order("country").order("subregion"),
    ]);
    return { resources: (r as ResourceRow[]) ?? [], legalNotes: (n as LegalNoteRow[]) ?? [] };
  }

  async function reload() {
    const { resources: r, legalNotes: n } = await load();
    setResources(r);
    setLegalNotes(n);
  }

  useEffect(() => {
    void load().then(({ resources: r, legalNotes: n }) => {
      setResources(r);
      setLegalNotes(n);
      setLoading(false);
    });
  }, []);

  async function markReviewed(id: string) {
    const supabase = createClient();
    await supabase
      .from("region_resources")
      .update({ reviewed_by_staff: true, last_reviewed_at: TODAY })
      .eq("id", id);
    void reload();
  }

  async function saveEdit(row: ResourceRow) {
    const supabase = createClient();
    await supabase
      .from("region_resources")
      .update({
        country: row.country,
        subregion: row.subregion,
        city_name: row.city_name,
        org_name: row.org_name,
        category: row.category,
        contact_info: row.contact_info,
        availability: row.availability,
        source_url: row.source_url,
        note: row.note,
        last_reviewed_at: row.last_reviewed_at,
      })
      .eq("id", row.id);
    setEditingId(null);
    void reload();
  }

  async function deleteResource(id: string) {
    if (!window.confirm("Remove this resource for everyone? This can't be undone.")) return;
    const supabase = createClient();
    await supabase.from("region_resources").delete().eq("id", id);
    void reload();
  }

  async function createResource() {
    if (!draft.org_name.trim() || !draft.contact_info.trim() || !draft.source_url.trim()) return;
    const id = `${draft.country}-${draft.subregion ?? ""}-${draft.org_name}`
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
    const supabase = createClient();
    const { error } = await supabase.from("region_resources").insert({
      id,
      ...draft,
      reviewed_by_staff: true,
    });
    if (!error) {
      setCreating(false);
      setDraft(emptyDraft());
      void reload();
    }
  }

  const filtered = resources.filter((r) => {
    if (filterCountry && r.country !== filterCountry) return false;
    if (filterReviewed === "unreviewed" && r.reviewed_by_staff) return false;
    if (filterReviewed === "reviewed" && !r.reviewed_by_staff) return false;
    if (filterAttention === "overdue" && new Date(r.last_reviewed_at).getTime() > reviewCutoff) return false;
    return true;
  });

  const unreviewedCount = resources.filter((r) => !r.reviewed_by_staff).length;
  const overdueCount = resources.filter((r) => new Date(r.last_reviewed_at).getTime() <= reviewCutoff).length;

  if (loading) return <p className={styles.subtitle}>Loading…</p>;

  return (
    <>
      <h1 className={styles.title}>Support resources</h1>
      <p className={styles.subtitle}>
        {resources.length} resources, {legalNotes.length} legal-context notes.{" "}
        {unreviewedCount > 0 ? `${unreviewedCount} still need your review.` : "All caught up."}
        {overdueCount > 0 && ` ${overdueCount} have not been checked in six months.`}
      </p>

      <div className={styles.formGrid}>
        <div className={styles.field}>
          <span className={styles.label}>Country</span>
          <select className={styles.select} value={filterCountry} onChange={(e) => setFilterCountry(e.target.value)}>
            <option value="">All countries</option>
            {COUNTRIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div className={styles.field}>
          <span className={styles.label}>Attention</span>
          <select className={styles.select} value={filterAttention} onChange={(e) => setFilterAttention(e.target.value)}>
            <option value="">Everything</option>
            <option value="overdue">Review overdue</option>
          </select>
        </div>
        <div className={styles.field}>
          <span className={styles.label}>Review status</span>
          <select className={styles.select} value={filterReviewed} onChange={(e) => setFilterReviewed(e.target.value)}>
            <option value="">All</option>
            <option value="unreviewed">Not yet reviewed</option>
            <option value="reviewed">Reviewed</option>
          </select>
        </div>
      </div>

      <button type="button" className={styles.primaryButton} style={{ width: "fit-content" }} onClick={() => setCreating((v) => !v)}>
        {creating ? "Cancel" : "+ Add resource"}
      </button>

      {creating && (
        <div className={styles.card}>
          <div className={styles.formGrid}>
            <div className={styles.field}>
              <span className={styles.label}>Country</span>
              <select className={styles.select} value={draft.country} onChange={(e) => setDraft({ ...draft, country: e.target.value, subregion: null })}>
                {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            {SUBREGIONS[draft.country as keyof typeof SUBREGIONS] && (
              <div className={styles.field}>
                <span className={styles.label}>Subregion</span>
                <select className={styles.select} value={draft.subregion ?? ""} onChange={(e) => setDraft({ ...draft, subregion: e.target.value || null })}>
                  <option value="">Whole country</option>
                  {SUBREGIONS[draft.country as keyof typeof SUBREGIONS]!.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            )}
            <div className={styles.field}>
              <span className={styles.label}>City (optional)</span>
              <input className={styles.input} value={draft.city_name ?? ""} onChange={(e) => setDraft({ ...draft, city_name: e.target.value || null })} />
            </div>
            <div className={styles.field}>
              <span className={styles.label}>Category</span>
              <select className={styles.select} value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value as ResourceCategory })}>
                {CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
              </select>
            </div>
          </div>
          <div className={styles.field}>
            <span className={styles.label}>Organization name</span>
            <input className={styles.input} value={draft.org_name} onChange={(e) => setDraft({ ...draft, org_name: e.target.value })} />
          </div>
          <div className={styles.field}>
            <span className={styles.label}>Contact info</span>
            <input className={styles.input} value={draft.contact_info} onChange={(e) => setDraft({ ...draft, contact_info: e.target.value })} />
          </div>
          <div className={styles.field}>
            <span className={styles.label}>Availability (optional)</span>
            <input className={styles.input} value={draft.availability ?? ""} onChange={(e) => setDraft({ ...draft, availability: e.target.value || null })} />
          </div>
          <div className={styles.field}>
            <span className={styles.label}>Source URL</span>
            <input className={styles.input} value={draft.source_url} onChange={(e) => setDraft({ ...draft, source_url: e.target.value })} />
          </div>
          <div className={styles.field}>
            <span className={styles.label}>Note (optional)</span>
            <textarea className={styles.textarea} value={draft.note ?? ""} onChange={(e) => setDraft({ ...draft, note: e.target.value || null })} />
          </div>
          <button type="button" className={styles.primaryButton} style={{ width: "fit-content" }} onClick={createResource}>
            Save resource
          </button>
        </div>
      )}

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Status</th>
              <th>Where</th>
              <th>Category</th>
              <th>Organization</th>
              <th>Contact</th>
              <th>Reviewed</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) =>
              editingId === r.id ? (
                <EditRow key={r.id} row={r} onCancel={() => setEditingId(null)} onSave={saveEdit} />
              ) : (
                <tr key={r.id}>
                  <td>
                    <span className={`${styles.badge} ${r.reviewed_by_staff ? styles.badgeReviewed : styles.badgeUnreviewed}`}>
                      {r.reviewed_by_staff ? "Reviewed" : "Unreviewed"}
                    </span>
                  </td>
                  <td>{[r.city_name, r.subregion, r.country].filter(Boolean).join(", ")}</td>
                  <td>{CATEGORY_LABELS[r.category]}</td>
                  <td>{r.org_name}</td>
                  <td>{r.contact_info}</td>
                  <td>{r.last_reviewed_at}</td>
                  <td style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {!r.reviewed_by_staff && (
                      <button type="button" className={styles.secondaryButton} onClick={() => markReviewed(r.id)}>
                        Mark reviewed
                      </button>
                    )}
                    <button type="button" className={styles.secondaryButton} onClick={() => setEditingId(r.id)}>
                      Edit
                    </button>
                    <button type="button" className={styles.dangerButton} onClick={() => deleteResource(r.id)}>
                      Remove
                    </button>
                  </td>
                </tr>
              )
            )}
          </tbody>
        </table>
      </div>

      <h2 className={styles.cardTitle} style={{ marginTop: 20 }}>Legal context notes</h2>
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Where</th>
              <th>Note</th>
              <th>Reviewed</th>
            </tr>
          </thead>
          <tbody>
            {legalNotes.map((n) => (
              <tr key={n.id}>
                <td>{n.subregion}, {n.country}</td>
                <td style={{ maxWidth: 400 }}>{n.note}</td>
                <td>{n.last_reviewed_at}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function EditRow({
  row,
  onCancel,
  onSave,
}: {
  row: ResourceRow;
  onCancel: () => void;
  onSave: (row: ResourceRow) => void;
}) {
  const [local, setLocal] = useState(row);
  return (
    <tr>
      <td colSpan={7}>
        <div className={styles.card}>
          <div className={styles.formGrid}>
            <div className={styles.field}>
              <span className={styles.label}>Organization</span>
              <input className={styles.input} value={local.org_name} onChange={(e) => setLocal({ ...local, org_name: e.target.value })} />
            </div>
            <div className={styles.field}>
              <span className={styles.label}>Category</span>
              <select className={styles.select} value={local.category} onChange={(e) => setLocal({ ...local, category: e.target.value as ResourceCategory })}>
                {CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
              </select>
            </div>
          </div>
          <div className={styles.field}>
            <span className={styles.label}>Contact info</span>
            <input className={styles.input} value={local.contact_info} onChange={(e) => setLocal({ ...local, contact_info: e.target.value })} />
          </div>
          <div className={styles.field}>
            <span className={styles.label}>Availability</span>
            <input className={styles.input} value={local.availability ?? ""} onChange={(e) => setLocal({ ...local, availability: e.target.value || null })} />
          </div>
          <div className={styles.field}>
            <span className={styles.label}>Source URL</span>
            <input className={styles.input} value={local.source_url} onChange={(e) => setLocal({ ...local, source_url: e.target.value })} />
          </div>
          <div className={styles.field}>
            <span className={styles.label}>Note</span>
            <textarea className={styles.textarea} value={local.note ?? ""} onChange={(e) => setLocal({ ...local, note: e.target.value || null })} />
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" className={styles.primaryButton} onClick={() => onSave(local)}>Save</button>
            <button type="button" className={styles.secondaryButton} onClick={onCancel}>Cancel</button>
          </div>
        </div>
      </td>
    </tr>
  );
}

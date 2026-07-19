"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import ScreenHeader from "@/components/ScreenHeader";
import formStyles from "@/components/settingsForm.module.css";

type Category = "profile" | "journey" | "medications" | "appointments" | "checkins" | "goals";

const CATEGORY_LABELS: Record<Category, string> = {
  profile: "Profile & preferences",
  journey: "Journey timeline",
  medications: "Medications",
  appointments: "Appointments",
  checkins: "Check-ins",
  goals: "Goals",
};
const ALL_CATEGORIES = Object.keys(CATEGORY_LABELS) as Category[];

const EXPIRY_OPTIONS = [
  { label: "24 hours", hours: 24 },
  { label: "7 days", hours: 24 * 7 },
  { label: "30 days", hours: 24 * 30 },
];

interface BridgeLink {
  id: string;
  categories: Category[];
  label: string | null;
  expires_at: string;
  revoked_at: string | null;
  created_at: string;
}

function fmtDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

export default function BlossomBridgePage() {
  const [links, setLinks] = useState<BridgeLink[]>([]);
  const [viewCounts, setViewCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<Category>>(new Set());
  const [expiryHours, setExpiryHours] = useState(24);
  const [label, setLabel] = useState("");
  const [creating, setCreating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  async function load() {
    const supabase = createClient();
    const { data } = await supabase.from("bridge_links").select("id,categories,label,expires_at,revoked_at,created_at").order("created_at", { ascending: false });
    const rows = (data as BridgeLink[]) ?? [];
    setLinks(rows);

    if (rows.length > 0) {
      const { data: logRows } = await supabase.from("bridge_access_log").select("link_id").in("link_id", rows.map((r) => r.id));
      const counts: Record<string, number> = {};
      for (const row of logRows ?? []) counts[row.link_id] = (counts[row.link_id] ?? 0) + 1;
      setViewCounts(counts);
    }
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  function toggleCategory(c: Category) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(c)) next.delete(c);
      else next.add(c);
      return next;
    });
  }

  async function createLink() {
    if (selected.size === 0) return;
    setCreating(true);
    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();
    const expiresAt = new Date(Date.now() + expiryHours * 60 * 60 * 1000).toISOString();
    await supabase.from("bridge_links").insert({
      owner_id: userData.user?.id,
      categories: [...selected],
      label: label.trim() || null,
      expires_at: expiresAt,
    });
    setCreating(false);
    setSelected(new Set());
    setLabel("");
    void load();
  }

  async function revoke(id: string) {
    if (!window.confirm("Revoke this link? It stops working immediately for anyone who has it.")) return;
    await createClient().from("bridge_links").update({ revoked_at: new Date().toISOString() }).eq("id", id);
    void load();
  }

  async function deleteLink(id: string) {
    if (!window.confirm("Delete this link and its access history?")) return;
    await createClient().from("bridge_links").delete().eq("id", id);
    void load();
  }

  function copyLink(id: string) {
    const url = `${window.location.origin}/bridge/${id}`;
    void navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  if (loading) return null;

  const now = Date.now();
  const active = links.filter((l) => !l.revoked_at && new Date(l.expires_at).getTime() > now);
  const inactive = links.filter((l) => l.revoked_at || new Date(l.expires_at).getTime() <= now);

  return (
    <div className={formStyles.screen}>
      <ScreenHeader title="Blossom Bridge" backHref="/settings" />
      <p className={formStyles.hint}>
        Temporary, read-only links for someone without a Blossom account - a doctor, a family
        member, anyone. They never need to sign in. Only the categories you pick are ever visible,
        every link expires on its own, and you can revoke one instantly at any time.
      </p>

      <div className={formStyles.field}>
        <span className={formStyles.label}>Create a link</span>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {ALL_CATEGORIES.map((c) => (
            <label key={c} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13.5 }}>
              <input type="checkbox" checked={selected.has(c)} onChange={() => toggleCategory(c)} style={{ width: 17, height: 17, accentColor: "var(--plum)" }} />
              {CATEGORY_LABELS[c]}
            </label>
          ))}
        </div>
        <span className={formStyles.label} style={{ marginTop: 8 }}>Expires after</span>
        <div style={{ display: "flex", gap: 8 }}>
          {EXPIRY_OPTIONS.map((opt) => (
            <button
              key={opt.hours}
              type="button"
              className={expiryHours === opt.hours ? formStyles.primaryButton : formStyles.tertiaryButton}
              onClick={() => setExpiryHours(opt.hours)}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <span className={formStyles.label} style={{ marginTop: 8 }}>Label (optional, just for you)</span>
        <input className={formStyles.input} value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. For Dr. Patel" />
        <button
          type="button"
          className={formStyles.primaryButton}
          style={{ width: "fit-content", marginTop: 8 }}
          disabled={creating || selected.size === 0}
          onClick={createLink}
        >
          {creating ? "Creating…" : "Create link"}
        </button>
      </div>

      <div className={formStyles.field}>
        <span className={formStyles.label}>Active links</span>
        {active.length === 0 && <p className={formStyles.hint}>None right now.</p>}
        {active.map((link) => (
          <div key={link.id} className={formStyles.toggleRow} style={{ flexDirection: "column", alignItems: "stretch", gap: 6 }}>
            <div className={formStyles.toggleText}>
              <span className={formStyles.toggleTitle}>{link.label || link.categories.map((c) => CATEGORY_LABELS[c]).join(", ")}</span>
              <span className={formStyles.toggleDesc}>
                Expires {fmtDateTime(link.expires_at)} · Viewed {viewCounts[link.id] ?? 0} time{(viewCounts[link.id] ?? 0) === 1 ? "" : "s"}
              </span>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button type="button" className={formStyles.tertiaryButton} onClick={() => copyLink(link.id)}>
                {copiedId === link.id ? "Copied!" : "Copy link"}
              </button>
              <button type="button" className={formStyles.dangerButton} onClick={() => revoke(link.id)}>
                Revoke
              </button>
            </div>
          </div>
        ))}
      </div>

      {inactive.length > 0 && (
        <div className={formStyles.field}>
          <span className={formStyles.label}>Expired or revoked</span>
          {inactive.map((link) => (
            <div key={link.id} className={formStyles.toggleRow} style={{ flexDirection: "column", alignItems: "stretch", gap: 6 }}>
              <div className={formStyles.toggleText}>
                <span className={formStyles.toggleTitle}>{link.label || link.categories.map((c) => CATEGORY_LABELS[c]).join(", ")}</span>
                <span className={formStyles.toggleDesc}>
                  {link.revoked_at ? "Revoked" : "Expired"} · Viewed {viewCounts[link.id] ?? 0} time{(viewCounts[link.id] ?? 0) === 1 ? "" : "s"}
                </span>
              </div>
              <button type="button" className={formStyles.tertiaryButton} style={{ alignSelf: "flex-start" }} onClick={() => deleteLink(link.id)}>
                Delete
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

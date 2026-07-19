"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import ScreenHeader from "@/components/ScreenHeader";
import formStyles from "@/components/settingsForm.module.css";
import styles from "./circle.module.css";

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

interface Grant {
  id: string;
  owner_id: string;
  grantee_email: string;
  grantee_id: string | null;
  categories: Category[];
  status: "pending" | "active" | "revoked" | "declined";
  created_at: string;
}

interface PendingInvite {
  id: string;
  owner_id: string;
  owner_display_name: string | null;
  categories: Category[];
  created_at: string;
}

interface LogEntry {
  grant_id: string;
  category: Category;
  accessed_at: string;
}

function fmtDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

export default function TrustedCirclePage() {
  const [myGrants, setMyGrants] = useState<Grant[]>([]);
  const [sharedWithMe, setSharedWithMe] = useState<Grant[]>([]);
  const [pending, setPending] = useState<PendingInvite[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [selected, setSelected] = useState<Set<Category>>(new Set());
  const [adding, setAdding] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function load() {
    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();
    const uid = userData.user?.id;
    if (!uid) {
      setLoading(false);
      return;
    }
    const [{ data: mine }, { data: shared }, { data: invites }] = await Promise.all([
      supabase.from("trusted_circle_grants").select("*").eq("owner_id", uid).order("created_at", { ascending: false }),
      supabase
        .from("trusted_circle_grants")
        .select("*")
        .eq("grantee_id", uid)
        .eq("status", "active")
        .order("created_at", { ascending: false }),
      supabase.rpc("pending_trusted_circle_invites"),
    ]);
    const mineGrants = (mine as Grant[]) ?? [];
    setMyGrants(mineGrants);
    setSharedWithMe((shared as Grant[]) ?? []);
    setPending((invites as PendingInvite[]) ?? []);

    const activeIds = mineGrants.filter((g) => g.status === "active").map((g) => g.id);
    if (activeIds.length > 0) {
      const { data: logRows } = await supabase
        .from("trusted_circle_access_log")
        .select("grant_id,category,accessed_at")
        .in("grant_id", activeIds)
        .order("accessed_at", { ascending: false })
        .limit(50);
      setLogs((logRows as LogEntry[]) ?? []);
    } else {
      setLogs([]);
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

  async function addShare() {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || selected.size === 0) return;
    setAdding(true);
    setMessage(null);
    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();
    const { error } = await supabase.from("trusted_circle_grants").insert({
      owner_id: userData.user?.id,
      grantee_email: trimmed,
      categories: [...selected],
    });
    setAdding(false);
    if (error) {
      setMessage(error.message);
      return;
    }
    setEmail("");
    setSelected(new Set());
    setMessage(`Invite created for ${trimmed} - let them know to check Settings > Trusted Circle next time they sign in.`);
    void load();
  }

  async function revoke(id: string) {
    if (!window.confirm("Revoke this share? It takes effect immediately.")) return;
    await createClient().from("trusted_circle_grants").delete().eq("id", id);
    void load();
  }

  async function respond(id: string, accept: boolean) {
    await createClient().rpc("respond_trusted_circle_invite", { target_id: id, accept });
    void load();
  }

  async function leave(id: string) {
    if (!window.confirm("Stop viewing this person's shared data?")) return;
    await createClient().from("trusted_circle_grants").delete().eq("id", id);
    void load();
  }

  if (loading) return null;

  return (
    <div className={formStyles.screen}>
      <ScreenHeader title="Trusted Circle" backHref="/settings" />
      <p className={formStyles.hint}>
        Share specific parts of your account with people you choose - never your whole account by
        default. Only the categories below can ever be shared; journal entries, blood tests,
        photos and voice practice are never available this way, since they never leave this device
        in the first place. You can revoke any share instantly, and the other person can leave at
        any time too.
      </p>

      {pending.length > 0 && (
        <div className={formStyles.field}>
          <span className={formStyles.label}>Invitations for you</span>
          {pending.map((inv) => (
            <div key={inv.id} className={styles.card}>
              <div className={styles.cardHeader}>
                <span className={styles.cardTitle}>{inv.owner_display_name ?? "Someone"} wants to share</span>
              </div>
              <div className={styles.tagRow}>
                {inv.categories.map((c) => (
                  <span key={c} className={styles.tag}>{CATEGORY_LABELS[c]}</span>
                ))}
              </div>
              <div className={styles.actionRow}>
                <button type="button" className={formStyles.primaryButton} onClick={() => respond(inv.id, true)}>
                  Accept
                </button>
                <button type="button" className={formStyles.tertiaryButton} onClick={() => respond(inv.id, false)}>
                  Decline
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className={formStyles.field}>
        <span className={formStyles.label}>Share with someone</span>
        <input
          className={formStyles.input}
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="their-email@example.com"
        />
        <div className={styles.checkboxGrid}>
          {ALL_CATEGORIES.map((c) => (
            <label key={c} className={styles.checkboxRow}>
              <input type="checkbox" checked={selected.has(c)} onChange={() => toggleCategory(c)} />
              {CATEGORY_LABELS[c]}
            </label>
          ))}
        </div>
        <button
          type="button"
          className={formStyles.primaryButton}
          style={{ width: "fit-content" }}
          disabled={adding || !email.trim() || selected.size === 0}
          onClick={addShare}
        >
          {adding ? "Creating…" : "Create invite"}
        </button>
        {message && <p className={formStyles.hint}>{message}</p>}
      </div>

      <div className={formStyles.field}>
        <span className={formStyles.label}>People you&apos;re sharing with</span>
        {myGrants.length === 0 && <p className={formStyles.hint}>Nobody yet.</p>}
        {myGrants.map((g) => (
          <div key={g.id} className={styles.card}>
            <div className={styles.cardHeader}>
              <span className={styles.cardTitle}>{g.grantee_email}</span>
              <span className={`${formStyles.hint} ${g.status !== "active" ? styles.statusPending : ""}`}>
                {g.status === "pending" ? "Waiting for them to accept" : g.status === "active" ? "Active" : g.status}
              </span>
            </div>
            <div className={styles.tagRow}>
              {g.categories.map((c) => (
                <span key={c} className={styles.tag}>{CATEGORY_LABELS[c]}</span>
              ))}
            </div>
            {g.status === "active" && (() => {
              const grantLogs = logs.filter((l) => l.grant_id === g.id).slice(0, 3);
              return grantLogs.length > 0 ? (
                <div>
                  <span className={styles.cardMeta}>Recent activity:</span>
                  {grantLogs.map((l, i) => (
                    <p key={i} className={styles.cardMeta}>
                      Viewed {CATEGORY_LABELS[l.category]} · {fmtDateTime(l.accessed_at)}
                    </p>
                  ))}
                </div>
              ) : null;
            })()}
            {(g.status === "active" || g.status === "pending") && (
              <div className={styles.actionRow}>
                <button type="button" className={formStyles.dangerButton} onClick={() => revoke(g.id)}>
                  Revoke
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className={formStyles.field}>
        <span className={formStyles.label}>Shared with you</span>
        {sharedWithMe.length === 0 && <p className={formStyles.hint}>Nobody has shared anything with you yet.</p>}
        {sharedWithMe.map((g) => (
          <div key={g.id} className={styles.viewerRow}>
            <Link href={`/circle/${g.id}`} className={styles.viewerRowTitle}>
              View shared data
            </Link>
            <span className={styles.viewerRowMeta}>{g.categories.map((c) => CATEGORY_LABELS[c]).join(", ")}</span>
            <button type="button" className={formStyles.tertiaryButton} style={{ alignSelf: "flex-start", padding: "4px 0" }} onClick={() => leave(g.id)}>
              Leave
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

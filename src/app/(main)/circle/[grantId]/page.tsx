"use client";

import { use, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import ScreenHeader from "@/components/ScreenHeader";
import formStyles from "@/components/settingsForm.module.css";
import styles from "../../settings/circle/circle.module.css";

type Category = "profile" | "journey" | "medications" | "appointments" | "checkins" | "goals";

const CATEGORY_LABELS: Record<Category, string> = {
  profile: "Profile & preferences",
  journey: "Journey timeline",
  medications: "Medications",
  appointments: "Appointments",
  checkins: "Check-ins",
  goals: "Goals",
};

interface Grant {
  id: string;
  owner_id: string;
  categories: Category[];
  status: string;
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export default function CircleViewerPage({ params }: { params: Promise<{ grantId: string }> }) {
  const { grantId } = use(params);
  const [grant, setGrant] = useState<Grant | null>(null);
  const [tab, setTab] = useState<Category | null>(null);
  const [profile, setProfile] = useState<Record<string, unknown> | null>(null);
  const [journeyItems, setJourneyItems] = useState<Record<string, unknown>[]>([]);
  const [medications, setMedications] = useState<Record<string, unknown>[]>([]);
  const [appointments, setAppointments] = useState<Record<string, unknown>[]>([]);
  const [checkIns, setCheckIns] = useState<Record<string, unknown>[]>([]);
  const [goals, setGoals] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const logged = useRef(new Set<string>());

  useEffect(() => {
    void loadGrant();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [grantId]);

  async function loadGrant() {
    setLoading(true);
    const supabase = createClient();
    const { data } = await supabase.from("trusted_circle_grants").select("id,owner_id,categories,status").eq("id", grantId).maybeSingle();
    const g = data as Grant | null;
    setGrant(g);
    if (g && g.status === "active" && g.categories.length > 0) setTab(g.categories[0]);
    setLoading(false);
  }

  useEffect(() => {
    if (!grant || !tab) return;
    void loadCategory(tab);
    if (!logged.current.has(tab)) {
      logged.current.add(tab);
      void createClient().from("trusted_circle_access_log").insert({ grant_id: grant.id, category: tab });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, grant]);

  async function loadCategory(category: Category) {
    if (!grant) return;
    const supabase = createClient();
    const ownerId = grant.owner_id;
    if (category === "profile" && !profile) {
      const { data } = await supabase.from("profiles").select("display_name,pronouns,hrt_status,region").eq("id", ownerId).maybeSingle();
      setProfile(data);
    }
    if (category === "journey" && journeyItems.length === 0) {
      const [{ data: m }, { data: e }] = await Promise.all([
        supabase.from("milestones").select("title,category,event_date,note").eq("user_id", ownerId),
        supabase.from("journey_events").select("title,category,event_date,note").eq("user_id", ownerId),
      ]);
      setJourneyItems([...(m ?? []), ...(e ?? [])].sort((a, b) => String(b.event_date ?? "").localeCompare(String(a.event_date ?? ""))));
    }
    if (category === "medications" && medications.length === 0) {
      const { data } = await supabase.from("medications").select("name,route,unit,active").eq("user_id", ownerId);
      setMedications(data ?? []);
    }
    if (category === "appointments" && appointments.length === 0) {
      const { data } = await supabase.from("appointments").select("title,appointment_at,location").eq("user_id", ownerId).order("appointment_at", { ascending: false });
      setAppointments(data ?? []);
    }
    if (category === "checkins" && checkIns.length === 0) {
      const { data } = await supabase.from("check_ins").select("mood,energy,confidence,stress,comfort,created_at").eq("user_id", ownerId).order("created_at", { ascending: false });
      setCheckIns(data ?? []);
    }
    if (category === "goals" && goals.length === 0) {
      const { data } = await supabase.from("goals").select("title,status,category").eq("user_id", ownerId);
      setGoals(data ?? []);
    }
  }

  if (loading) return null;

  if (!grant || grant.status !== "active") {
    return (
      <div className={formStyles.screen}>
        <ScreenHeader title="Shared data" backHref="/settings/circle" />
        <p className={formStyles.hint}>
          This share isn&apos;t available - it may have been revoked, or you may not have access
          to it. <Link href="/settings/circle">Back to Trusted Circle</Link>.
        </p>
      </div>
    );
  }

  return (
    <div className={formStyles.screen}>
      <ScreenHeader title="Shared data" backHref="/settings/circle" />
      <p className={formStyles.hint}>Read-only. This person can revoke your access at any time.</p>

      <div className={styles.tabRow}>
        {grant.categories.map((c) => (
          <button
            key={c}
            type="button"
            className={`${styles.tab} ${tab === c ? styles.tabActive : ""}`}
            onClick={() => setTab(c)}
          >
            {CATEGORY_LABELS[c]}
          </button>
        ))}
      </div>

      {tab === "profile" && (
        <div className={formStyles.field}>
          {!profile && <p className={formStyles.hint}>Nothing set.</p>}
          {profile?.display_name ? <p>Name: {String(profile.display_name)}</p> : null}
          {profile?.pronouns ? <p>Pronouns: {String(profile.pronouns)}</p> : null}
          {profile?.hrt_status ? <p>HRT: {String(profile.hrt_status)}</p> : null}
          {profile?.region ? <p>Region: {String(profile.region)}</p> : null}
        </div>
      )}

      {tab === "journey" && (
        <div className={formStyles.field}>
          {journeyItems.length === 0 && <p className={formStyles.hint}>Nothing recorded.</p>}
          {journeyItems.map((item, i) => (
            <div key={i} className={styles.card}>
              <span className={styles.cardTitle}>{String(item.title)}</span>
              <span className={styles.cardMeta}>{[item.category, fmtDate(item.event_date as string)].filter(Boolean).join(" · ")}</span>
              {item.note ? <p>{String(item.note)}</p> : null}
            </div>
          ))}
        </div>
      )}

      {tab === "medications" && (
        <div className={formStyles.field}>
          {medications.length === 0 && <p className={formStyles.hint}>None added.</p>}
          {medications.map((m, i) => (
            <div key={i} className={styles.card}>
              <span className={styles.cardTitle}>{String(m.name)}{m.active ? "" : " (inactive)"}</span>
              <span className={styles.cardMeta}>{[m.route, m.unit].filter(Boolean).join(" · ")}</span>
            </div>
          ))}
        </div>
      )}

      {tab === "appointments" && (
        <div className={formStyles.field}>
          {appointments.length === 0 && <p className={formStyles.hint}>None added.</p>}
          {appointments.map((a, i) => (
            <div key={i} className={styles.card}>
              <span className={styles.cardTitle}>{String(a.title)}</span>
              <span className={styles.cardMeta}>{[a.appointment_at ? fmtDate(a.appointment_at as string) : "", a.location].filter(Boolean).join(" · ")}</span>
            </div>
          ))}
        </div>
      )}

      {tab === "checkins" && (
        <div className={formStyles.field}>
          {checkIns.length === 0 && <p className={formStyles.hint}>None logged.</p>}
          {checkIns.map((c, i) => (
            <div key={i} className={styles.card}>
              <span className={styles.cardMeta}>{fmtDate(c.created_at as string)}</span>
              <span className={styles.cardTitle}>
                {[
                  c.mood !== null ? `Mood ${c.mood}/5` : "",
                  c.energy !== null ? `Energy ${c.energy}/5` : "",
                  c.confidence !== null ? `Confidence ${c.confidence}/5` : "",
                  c.stress !== null ? `Stress ${c.stress}/5` : "",
                  c.comfort !== null ? `Comfort ${c.comfort}/5` : "",
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </span>
            </div>
          ))}
        </div>
      )}

      {tab === "goals" && (
        <div className={formStyles.field}>
          {goals.length === 0 && <p className={formStyles.hint}>None added.</p>}
          {goals.map((g, i) => (
            <div key={i} className={styles.card}>
              <span className={styles.cardTitle}>{String(g.title)}</span>
              <span className={styles.cardMeta}>{[g.status, g.category].filter(Boolean).join(" · ")}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

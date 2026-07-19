"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import styles from "../../ideas/ideas.module.css";

interface ValidityResponse {
  valid: boolean;
  reason?: "not_found" | "revoked" | "expired";
  ownerName?: string | null;
  categories?: string[];
}

interface RevealResponse {
  valid: boolean;
  categories: string[];
  data: Record<string, unknown[] | Record<string, unknown> | null>;
}

function fmtDate(value: string | null | undefined): string {
  if (!value) return "";
  return new Date(value).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export default function BridgeViewerPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [check, setCheck] = useState<ValidityResponse | null>(null);
  const [revealed, setRevealed] = useState<RevealResponse | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    void fetch(`/api/bridge/${token}`)
      .then((r) => r.json())
      .then(setCheck);
  }, [token]);

  async function reveal() {
    setLoading(true);
    const res = await fetch(`/api/bridge/${token}`, { method: "POST" });
    const json = await res.json();
    setLoading(false);
    if (json.valid) setRevealed(json);
  }

  if (!check) return null;

  if (!check.valid) {
    const message =
      check.reason === "expired"
        ? "This link has expired."
        : check.reason === "revoked"
          ? "This link was revoked by whoever shared it."
          : "This link doesn't exist, or was never valid.";
    return (
      <main className={styles.page}>
        <div className={styles.shell}>
          <Link href="/" className={styles.back}>← Back to Blossom</Link>
          <header className={styles.header}>
            <span className={styles.eyebrow}>Blossom Bridge</span>
            <h1>Not available</h1>
            <p className={styles.intro}>{message}</p>
          </header>
        </div>
      </main>
    );
  }

  if (!revealed) {
    return (
      <main className={styles.page}>
        <div className={styles.shell}>
          <Link href="/" className={styles.back}>← Back to Blossom</Link>
          <header className={styles.header}>
            <span className={styles.eyebrow}>Blossom Bridge</span>
            <h1>{check.ownerName ?? "Someone"} shared something with you</h1>
            <p className={styles.intro}>
              This link contains: {check.categories?.join(", ")}. It&apos;s temporary and can be revoked at any
              time by whoever shared it.
            </p>
          </header>
          <button type="button" className={styles.voteButton} style={{ width: "auto", height: "auto", padding: "12px 20px" }} disabled={loading} onClick={reveal}>
            {loading ? "Loading…" : "View"}
          </button>
        </div>
      </main>
    );
  }

  const { data } = revealed;
  const profile = data.profile as { display_name?: string; pronouns?: string; hrt_status?: string; region?: string } | null;
  const journey = (data.journey as Array<{ title: string; category: string | null; event_date: string | null; note: string | null }>) ?? [];
  const medications = (data.medications as Array<{ name: string; route: string | null; unit: string | null; active: boolean }>) ?? [];
  const appointments = (data.appointments as Array<{ title: string; appointment_at: string; location: string | null }>) ?? [];
  const checkins = (data.checkins as Array<{ mood: number | null; energy: number | null; confidence: number | null; stress: number | null; comfort: number | null; created_at: string }>) ?? [];
  const goals = (data.goals as Array<{ title: string; status: string; category: string | null }>) ?? [];

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <Link href="/" className={styles.back}>← Back to Blossom</Link>
        <header className={styles.header}>
          <span className={styles.eyebrow}>Blossom Bridge</span>
          <h1>Shared with you</h1>
          <p className={styles.intro}>Read-only. This can be revoked by the person who shared it at any time.</p>
        </header>

        {profile && (
          <div className={styles.item}>
            <div className={styles.itemBody}>
              {profile.display_name && <div className={styles.itemTitle}>{profile.display_name}</div>}
              {profile.pronouns && <div className={styles.itemDescription}>Pronouns: {profile.pronouns}</div>}
              {profile.hrt_status && <div className={styles.itemDescription}>HRT: {profile.hrt_status}</div>}
              {profile.region && <div className={styles.itemDescription}>Region: {profile.region}</div>}
            </div>
          </div>
        )}

        {journey.length > 0 && (
          <div className={styles.list}>
            {journey.map((entry, i) => (
              <div key={i} className={styles.item}>
                <div className={styles.itemBody}>
                  <div className={styles.itemTitle}>{entry.title}</div>
                  <div className={styles.itemDescription}>{[entry.category, fmtDate(entry.event_date)].filter(Boolean).join(" · ")}</div>
                  {entry.note && <div className={styles.itemDescription}>{entry.note}</div>}
                </div>
              </div>
            ))}
          </div>
        )}

        {medications.length > 0 && (
          <div className={styles.list}>
            {medications.map((med, i) => (
              <div key={i} className={styles.item}>
                <div className={styles.itemBody}>
                  <div className={styles.itemTitle}>{med.name}{med.active ? "" : " (inactive)"}</div>
                  <div className={styles.itemDescription}>{[med.route, med.unit].filter(Boolean).join(" · ")}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {appointments.length > 0 && (
          <div className={styles.list}>
            {appointments.map((appt, i) => (
              <div key={i} className={styles.item}>
                <div className={styles.itemBody}>
                  <div className={styles.itemTitle}>{appt.title}</div>
                  <div className={styles.itemDescription}>{[fmtDate(appt.appointment_at), appt.location].filter(Boolean).join(" · ")}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {checkins.length > 0 && (
          <div className={styles.list}>
            {checkins.map((ci, i) => (
              <div key={i} className={styles.item}>
                <div className={styles.itemBody}>
                  <div className={styles.itemDescription}>{fmtDate(ci.created_at)}</div>
                  <div className={styles.itemTitle}>
                    {[
                      ci.mood !== null ? `Mood ${ci.mood}/5` : "",
                      ci.energy !== null ? `Energy ${ci.energy}/5` : "",
                      ci.confidence !== null ? `Confidence ${ci.confidence}/5` : "",
                      ci.stress !== null ? `Stress ${ci.stress}/5` : "",
                      ci.comfort !== null ? `Comfort ${ci.comfort}/5` : "",
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {goals.length > 0 && (
          <div className={styles.list}>
            {goals.map((goal, i) => (
              <div key={i} className={styles.item}>
                <div className={styles.itemBody}>
                  <div className={styles.itemTitle}>{goal.title}</div>
                  <div className={styles.itemDescription}>{[goal.status, goal.category].filter(Boolean).join(" · ")}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

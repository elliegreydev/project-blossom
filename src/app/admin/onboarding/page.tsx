"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import styles from "../admin.module.css";

const STEPS: { key: string; title: string; body: string; href: string; actionLabel: string }[] = [
  {
    key: "read-support-flow",
    title: "Know how Support lookup works",
    body: "Opening a case gives full access to one account for 72 hours, and every access is logged. Never open a case out of curiosity - only to help with something specific.",
    href: "/admin/support",
    actionLabel: "Open Support lookup",
  },
  {
    key: "review-resources",
    title: "Get familiar with the resource list",
    body: "Region resources and legal-context notes are what members actually see when they ask Blossom for help finding support - accuracy matters here.",
    href: "/admin/resources",
    actionLabel: "Open Resources",
  },
  {
    key: "know-issues-notes",
    title: "Know where Known issues and Handoff notes live",
    body: "If you notice something broken, log it as a Known issue rather than just mentioning it in passing. Handoff notes are for quick context that doesn't fit anywhere else.",
    href: "/admin/issues",
    actionLabel: "Open Known issues",
  },
  {
    key: "check-operations",
    title: "See what Operations is watching",
    body: "A single view of app health, resource review status, open cases and the privacy audit - worth knowing it exists even if you don't check it daily.",
    href: "/admin/operations",
    actionLabel: "Open Operations",
  },
  {
    key: "leave-intro-note",
    title: "Leave the team a quick note",
    body: "A short hello in Handoff notes is a nice way for the rest of the team to know you're in and getting started.",
    href: "/admin/notes",
    actionLabel: "Open Handoff notes",
  },
];

export default function AdminOnboardingPage() {
  const [done, setDone] = useState<string[] | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  async function load() {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setDone([]);
      return;
    }
    setUserId(user.id);
    const { data } = await supabase
      .from("staff_onboarding_progress")
      .select("done_steps")
      .eq("user_id", user.id)
      .maybeSingle();
    setDone(data?.done_steps ?? []);
  }

  useEffect(() => {
    void load();
  }, []);

  async function toggle(key: string) {
    if (!userId || !done) return;
    const next = done.includes(key) ? done.filter((k) => k !== key) : [...done, key];
    setDone(next);
    const supabase = createClient();
    await supabase.from("staff_onboarding_progress").upsert({ user_id: userId, done_steps: next, updated_at: new Date().toISOString() });
  }

  if (done === null) return <p className={styles.subtitle}>Loading…</p>;

  return (
    <>
      <h1 className={styles.title}>Getting started</h1>
      <p className={styles.subtitle}>
        A few things worth knowing before diving in. Tick off whatever&apos;s useful - this is just for
        you, though any staff member can see your progress.
      </p>

      <div className={styles.feedbackList}>
        {STEPS.map((step) => {
          const checked = done.includes(step.key);
          return (
            <div key={step.key} className={styles.feedbackCard}>
              <button
                type="button"
                onClick={() => toggle(step.key)}
                aria-pressed={checked}
                style={{ display: "flex", alignItems: "flex-start", gap: 10, background: "transparent", border: "none", padding: 0, textAlign: "left", cursor: "pointer" }}
              >
                <span
                  aria-hidden="true"
                  style={{
                    marginTop: 2,
                    flex: "0 0 auto",
                    width: 20,
                    height: 20,
                    borderRadius: 6,
                    border: "1px solid var(--border)",
                    background: checked ? "var(--lavender)" : "transparent",
                    display: "grid",
                    placeItems: "center",
                  }}
                >
                  {checked && (
                    <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="var(--plum)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </span>
                <span style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <span className={styles.cardTitle} style={{ fontSize: 15, textDecoration: checked ? "line-through" : "none", opacity: checked ? 0.6 : 1 }}>
                    {step.title}
                  </span>
                  <span className={styles.subtitle} style={{ margin: 0 }}>{step.body}</span>
                </span>
              </button>
              <Link href={step.href} style={{ display: "inline-block", marginTop: 4, fontSize: 13, fontWeight: 600, color: "var(--plum)" }}>
                {step.actionLabel} →
              </Link>
            </div>
          );
        })}
      </div>
    </>
  );
}

"use client";

import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import ScreenHeader from "@/components/ScreenHeader";
import { db, LOCAL_PROFILE_ID, updateProfile } from "@/lib/db";
import styles from "@/components/feature.module.css";

const STEPS: { key: string; title: string; body: string; href: string; actionLabel: string }[] = [
  {
    key: "baseline-labs",
    title: "Get baseline bloodwork",
    body: "Before you start, or right at the beginning, it's worth having a snapshot of where things are now - so later results actually mean something to you.",
    href: "/care/blood-tests",
    actionLabel: "Open Blood tests",
  },
  {
    key: "track-medication",
    title: "Set up your medication tracker",
    body: "Log what you're taking and when, so you've got your own private record - not shared with anyone unless you choose to.",
    href: "/care/medication",
    actionLabel: "Open Medication",
  },
  {
    key: "injection-rotation",
    title: "If it's an injection, know about site rotation",
    body: "Rotating where you inject helps avoid soreness and scarring over time. Blossom can remind you which site you used last.",
    href: "/care/medication",
    actionLabel: "Open Medication",
  },
  {
    key: "find-support",
    title: "Know where to find support",
    body: "Whether that's a harm-reduction community, a crisis line, or just people who get it - it's easier to look this up now than in a harder moment.",
    href: "/aurora",
    actionLabel: "Find support",
  },
  {
    key: "loop-someone-in",
    title: "Think about whether there's someone you'd want to loop in",
    body: "Trusted Circle lets you share specific details with one person you trust. Safety check-ins can let someone notice if you go quiet.",
    href: "/settings/circle",
    actionLabel: "Open Trusted Circle",
  },
  {
    key: "supervised-care",
    title: "Supervised care is always an option, whenever that feels right",
    body: "Blossom Passport can turn your own record into something clear to bring to a doctor or an informed-consent clinic, whenever - if ever - you want that.",
    href: "/settings/passport",
    actionLabel: "Open Blossom Passport",
  },
];

export default function GettingStartedPage() {
  const profile = useLiveQuery(() => db.profiles.get(LOCAL_PROFILE_ID));
  if (!profile) return null;

  const done = profile.hrtStartChecklistDone ?? [];

  function toggle(key: string) {
    const next = done.includes(key) ? done.filter((k) => k !== key) : [...done, key];
    void updateProfile({ hrtStartChecklistDone: next });
  }

  return (
    <div className={styles.screen}>
      <ScreenHeader title="Starting HRT safely" backHref="/care" />
      <p className={styles.pageSubtitle} style={{ marginTop: -10 }}>
        A few practical things worth having in place when you're starting a regimen - prescribed or
        self-directed. This is logistics, never medical advice: Blossom doesn&apos;t give dosing guidance
        anywhere, and neither does this checklist. Tick off whatever&apos;s useful, skip what isn&apos;t.
      </p>

      <div className={styles.list}>
        {STEPS.map((step) => {
          const checked = done.includes(step.key);
          return (
            <div key={step.key} className={styles.item}>
              <div className={styles.itemRow}>
                <button
                  type="button"
                  className={styles.itemButton}
                  style={{ display: "flex", flexDirection: "row", alignItems: "flex-start", gap: 10 }}
                  onClick={() => toggle(step.key)}
                  aria-pressed={checked}
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
                    <span className={styles.itemTitle} style={{ textDecoration: checked ? "line-through" : "none", opacity: checked ? 0.6 : 1 }}>
                      {step.title}
                    </span>
                    <span className={styles.itemBody}>{step.body}</span>
                  </span>
                </button>
              </div>
              <Link href={step.href} style={{ display: "inline-block", marginTop: 4, fontSize: 13, fontWeight: 600, color: "var(--plum)" }}>
                {step.actionLabel} →
              </Link>
            </div>
          );
        })}
      </div>
    </div>
  );
}

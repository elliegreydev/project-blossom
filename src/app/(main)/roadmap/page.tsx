"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import styles from "./roadmap.module.css";

type Stage = "available" | "next" | "later";
type Theme = "privacy" | "health" | "daily" | "community" | "data" | "social" | "other";

interface RoadmapItem {
  id: string;
  slug: string;
  title: string;
  description: string;
  stage: Stage;
  is_recent: boolean;
}

const STAGES: Array<{ key: Stage; eyebrow: string; title: string; description: string }> = [
  {
    key: "available",
    eyebrow: "Built and ready",
    title: "Available now",
    description: "These parts of Blossom are ready to use, at your own pace.",
  },
  {
    key: "next",
    eyebrow: "Making the basics sturdier",
    title: "Up next",
    description: "The next improvements worth making. No pressure, no promised dates.",
  },
  {
    key: "later",
    eyebrow: "When the time is right",
    title: "Future ideas",
    description: "Things Blossom may grow into when they are genuinely useful, safe and ready.",
  },
];

const THEME_OPTIONS: Array<{ key: Theme | "all"; label: string }> = [
  { key: "all", label: "All ideas" },
  { key: "privacy", label: "Privacy & control" },
  { key: "health", label: "Health & appointments" },
  { key: "daily", label: "Daily life" },
  { key: "community", label: "Community & trust" },
  { key: "data", label: "Data & connections" },
  { key: "social", label: "Blossom Social" },
];

const THEME_DETAILS: Record<Theme, { title: string; description: string }> = {
  privacy: {
    title: "Privacy & control",
    description: "Ways to keep information private, deliberate and in your hands.",
  },
  health: {
    title: "Health & appointments",
    description: "Tools for preparation, practical organisation and reviewed support.",
  },
  daily: {
    title: "Daily life & wellbeing",
    description: "Gentler ways to reflect, organise and move through everyday life.",
  },
  community: {
    title: "Community & trust",
    description: "Clearer resources, transparency and space for the community to shape Blossom.",
  },
  data: {
    title: "Data & connections",
    description: "Useful patterns and portability without losing sight of privacy.",
  },
  social: {
    title: "Blossom Social",
    description: "An optional community space, explored one careful phase at a time - all of it research-first and a long way from being built.",
  },
  other: {
    title: "Other future ideas",
    description: "Thoughtful work that does not fit one neat box yet.",
  },
};

const THEME_ORDER: Theme[] = ["privacy", "health", "daily", "community", "data", "social", "other"];

const ROADMAP_THEMES: Record<string, Theme> = {
  "gentle-mode": "daily",
  "expanded-local-first-storage": "privacy",
  "appointment-builder": "health",
  "resource-trust-system": "community",
  "medication-supply-planner": "health",
  "accessibility-profiles": "daily",
  "low-energy-mode": "daily",
  "crisis-resource-quick-access": "health",
  "modular-home-screen": "daily",
  "data-import-escape-hatch": "data",
  "what-do-i-need-today": "daily",
  "blossom-passport": "privacy",
  "discreet-mode": "privacy",
  "travel-mode": "health",
  "surgery-recovery-planner": "health",
  "social-transition-planner": "daily",
  "voice-studio": "daily",
  "gender-euphoria-journal": "daily",
  "personal-baseline-tracking": "daily",
  "fertility-family-planning": "health",
  "trusted-circle": "privacy",
  "safety-check-ins": "privacy",
  "privacy-receipt": "privacy",
  "public-trust-centre": "community",
  "feature-request-voting": "community",
  "blossom-bridge": "privacy",
  "on-device-voice-analysis": "data",
  "regional-transition-navigator": "community",
  "personal-support-map": "privacy",
  "community-language-glossary": "community",
  "wider-tracker-sync": "data",
  "background-reminders": "daily",
  "advanced-charts": "data",
  "social-foundation-safety": "social",
  "social-profiles": "social",
  "social-circles": "social",
  "social-posts-discussions": "social",
  "social-celebration-garden": "social",
  "social-qa": "social",
  "social-buddy-matching": "social",
  "social-messaging": "social",
  "social-events": "social",
  "social-trusted-contributors": "social",
  "social-anonymous-posts": "social",
  "social-organisation-pages": "social",
  "social-advanced-features": "social",
};

function themeFor(item: RoadmapItem): Theme {
  return ROADMAP_THEMES[item.slug] ?? "other";
}

function RoadmapItemRow({ item }: { item: RoadmapItem }) {
  return (
    <article className={styles.item}>
      <div className={styles.itemHeading}>
        <h3>{item.title}</h3>
        {item.is_recent && <span className={styles.recent}>Recently added</span>}
      </div>
      <p>{item.description}</p>
    </article>
  );
}

export default function RoadmapPage() {
  const [items, setItems] = useState<RoadmapItem[] | null>(null);
  const [activeTheme, setActiveTheme] = useState<Theme | "all">("all");

  useEffect(() => {
    let cancelled = false;

    async function loadRoadmap() {
      const { data } = await createClient()
        .from("product_roadmap")
        .select("id,slug,title,description,stage,is_recent")
        .eq("status", "active")
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: false });

      if (!cancelled) setItems((data as RoadmapItem[]) ?? []);
    }

    void loadRoadmap();
    return () => {
      cancelled = true;
    };
  }, []);

  const counts = useMemo(() => {
    return STAGES.reduce<Record<Stage, number>>(
      (result, stage) => ({ ...result, [stage.key]: items?.filter((item) => item.stage === stage.key).length ?? 0 }),
      { available: 0, next: 0, later: 0 }
    );
  }, [items]);

  return (
    <div className={styles.screen}>
      <header className={styles.hero}>
        <span className={styles.eyebrow}>A quiet look ahead</span>
        <h1>Blossom&apos;s roadmap</h1>
        <p>
          Blossom is growing steadily, not noisily. Browse what&apos;s ready, what&apos;s next and the ideas we&apos;re holding with care.
        </p>
      </header>

      {items === null ? (
        <p className={styles.loading} aria-live="polite">Loading the roadmap…</p>
      ) : (
        <>
          <section className={styles.summary} aria-label="Roadmap summary">
            {STAGES.map((stage) => (
              <a key={stage.key} href={`#${stage.key}`} className={styles.summaryLink}>
                <strong>{counts[stage.key]}</strong>
                <span>{stage.title}</span>
              </a>
            ))}
          </section>

          <section className={styles.filters} aria-label="Filter roadmap ideas">
            <span className={styles.filterLabel}>Explore by focus</span>
            <div className={styles.filterButtons}>
              {THEME_OPTIONS.map((option) => (
                <button
                  key={option.key}
                  type="button"
                  className={styles.filterButton}
                  aria-pressed={activeTheme === option.key}
                  onClick={() => setActiveTheme(option.key)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </section>

          <div className={styles.timeline}>
            {STAGES.map((stage) => {
              const stageItems = items.filter(
                (item) => item.stage === stage.key && (activeTheme === "all" || themeFor(item) === activeTheme)
              );
              const isLater = stage.key === "later";

              return (
                <section key={stage.key} id={stage.key} className={styles.stage} aria-labelledby={`${stage.key}-title`}>
                  <div className={styles.stageHeader}>
                    <span className={styles.stageEyebrow}>{stage.eyebrow}</span>
                    <h2 id={`${stage.key}-title`}>{stage.title}</h2>
                    <p>{stage.description}</p>
                  </div>
                  <div className={styles.stageContent}>
                    {!isLater && (
                      <details className={styles.stageDisclosure} open>
                        <summary>
                          <span>{stageItems.length} {stageItems.length === 1 ? "item" : "items"}</span>
                          <span className={styles.summaryAction}>Show details</span>
                        </summary>
                        <div className={styles.items}>
                          {stageItems.map((item) => <RoadmapItemRow key={item.id} item={item} />)}
                          {stageItems.length === 0 && <p className={styles.empty}>Nothing matches this focus just yet.</p>}
                        </div>
                      </details>
                    )}

                    {isLater && (
                      <div className={styles.themeGroups}>
                        {THEME_ORDER.map((theme) => {
                          const groupItems = stageItems.filter((item) => themeFor(item) === theme);
                          if (groupItems.length === 0) return null;
                          const group = THEME_DETAILS[theme];
                          return (
                            <details key={theme} className={styles.themeGroup} open={activeTheme !== "all"}>
                              <summary>
                                <span>
                                  <strong>{group.title}</strong>
                                  <small>{group.description}</small>
                                </span>
                                <span className={styles.groupCount}>{groupItems.length}</span>
                              </summary>
                              <div className={styles.items}>
                                {groupItems.map((item) => <RoadmapItemRow key={item.id} item={item} />)}
                              </div>
                            </details>
                          );
                        })}
                        {stageItems.length === 0 && <p className={styles.empty}>Nothing matches this focus just yet.</p>}
                      </div>
                    )}
                  </div>
                </section>
              );
            })}
          </div>
        </>
      )}

      <aside className={styles.note}>
        <strong>A small promise from us</strong>
        <p>
          We won&apos;t use this page to pressure you with deadlines or collect information for unfinished features. If plans change, we&apos;ll say so plainly.
        </p>
        <Link href="/crisis-support">Need help with Blossom right now?</Link>
      </aside>
    </div>
  );
}

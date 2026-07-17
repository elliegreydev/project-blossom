"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import styles from "./roadmap.module.css";

type Stage = "available" | "next" | "later";

interface RoadmapItem {
  id: string;
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
    title: "Later on",
    description: "Ideas with a place in Blossom's future, when they are genuinely ready.",
  },
];

export default function RoadmapPage() {
  const [items, setItems] = useState<RoadmapItem[] | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadRoadmap() {
      const { data } = await createClient()
        .from("product_roadmap")
        .select("id,title,description,stage,is_recent")
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

  return (
    <div className={styles.screen}>
      <header className={styles.hero}>
        <span className={styles.eyebrow}>A quiet look ahead</span>
        <h1>Blossom&apos;s roadmap</h1>
        <p>
          Blossom is growing steadily, not noisily. This is a simple view of what&apos;s here,
          what&apos;s being worked on, and what may come later.
        </p>
      </header>

      {items === null ? (
        <p className={styles.loading} aria-live="polite">Loading the roadmap…</p>
      ) : (
        <div className={styles.timeline}>
          {STAGES.map((stage) => {
            const stageItems = items.filter((item) => item.stage === stage.key);
            return (
              <section key={stage.key} className={styles.stage} aria-labelledby={`${stage.key}-title`}>
                <div className={styles.stageHeader}>
                  <span className={styles.stageEyebrow}>{stage.eyebrow}</span>
                  <h2 id={`${stage.key}-title`}>{stage.title}</h2>
                  <p>{stage.description}</p>
                </div>
                <div className={styles.items}>
                  {stageItems.map((item) => (
                    <article key={item.id} className={styles.item}>
                      <div className={styles.itemHeading}>
                        <h3>{item.title}</h3>
                        {item.is_recent && <span className={styles.recent}>Recently added</span>}
                      </div>
                      <p>{item.description}</p>
                    </article>
                  ))}
                  {stageItems.length === 0 && (
                    <p className={styles.empty}>Nothing to share here just yet.</p>
                  )}
                </div>
              </section>
            );
          })}
        </div>
      )}

      <aside className={styles.note}>
        <strong>A small promise from us</strong>
        <p>
          We won&apos;t use this page to pressure you with deadlines or collect information for unfinished
          features. If plans change, we&apos;ll say so plainly.
        </p>
        <Link href="/settings/support">Need help with Blossom right now?</Link>
      </aside>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import styles from "./AppNotice.module.css";

interface Notice {
  id: string;
  title: string;
  body: string;
  tone: "info" | "care";
}

export default function AppNotice() {
  const [notice, setNotice] = useState<Notice | null>(null);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();

    async function load() {
      const now = new Date().toISOString();
      const { data } = await supabase
        .from("app_notices")
        .select("id,title,body,tone")
        .eq("status", "published")
        .lte("starts_at", now)
        .or(`ends_at.is.null,ends_at.gt.${now}`)
        .order("published_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!cancelled) setNotice((data as Notice | null) ?? null);
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!notice) return null;

  return (
    <aside className={`${styles.notice} ${notice.tone === "care" ? styles.care : ""}`} aria-label="Blossom notice">
      <strong>{notice.title}</strong>
      <span>{notice.body}</span>
    </aside>
  );
}

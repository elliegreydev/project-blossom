"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import ScreenHeader from "@/components/ScreenHeader";
import formStyles from "@/components/settingsForm.module.css";

interface RoadmapItem {
  slug: string;
  title: string;
  description: string;
}

type Access = "checking" | "denied" | "ok";

export default function BetaHubPage() {
  const [access, setAccess] = useState<Access>("checking");
  const [recent, setRecent] = useState<RoadmapItem[]>([]);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();

    async function load() {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        if (!cancelled) setAccess("denied");
        return;
      }
      const [{ data: betaData }, { data: staffData }] = await Promise.all([
        supabase.rpc("is_beta_tester"),
        supabase.rpc("is_staff"),
      ]);
      if (cancelled) return;
      const ok = betaData === true || staffData === true;
      setAccess(ok ? "ok" : "denied");
      if (!ok) return;

      const { data: roadmap } = await supabase
        .from("product_roadmap")
        .select("slug,title,description")
        .eq("stage", "available")
        .eq("is_recent", true)
        .order("updated_at", { ascending: false })
        .limit(6);
      if (!cancelled) setRecent((roadmap as RoadmapItem[]) ?? []);
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (access === "checking") return null;

  if (access === "denied") {
    return (
      <div className={formStyles.screen}>
        <ScreenHeader title="Beta" backHref="/settings" />
        <p className={formStyles.hint}>
          This is for beta testers. Got an invite code? <Link href="/beta/join">Join the beta</Link>.
        </p>
      </div>
    );
  }

  return (
    <div className={formStyles.screen}>
      <ScreenHeader title="Beta" backHref="/settings" />

      <div className={formStyles.field}>
        <span className={formStyles.label}>You&apos;re a Blossom beta tester</span>
        <p className={formStyles.hint}>
          Thanks for helping test Blossom. Features may change and data may reset while we&apos;re
          in beta.
        </p>
      </div>

      <div className={formStyles.field}>
        <Link href="/beta-chat" className={formStyles.primaryButton} style={{ textAlign: "center" }}>
          Open beta chat
        </Link>
        <Link href="/ideas" className={formStyles.tertiaryButton} style={{ textAlign: "center" }}>
          Report a bug or idea
        </Link>
      </div>

      {recent.length > 0 && (
        <div className={formStyles.field}>
          <span className={formStyles.label}>What&apos;s new</span>
          {recent.map((item) => (
            <div key={item.slug} className={formStyles.toggleRow} style={{ alignItems: "flex-start" }}>
              <div className={formStyles.toggleText}>
                <span className={formStyles.toggleTitle}>{item.title}</span>
                <span className={formStyles.toggleDesc}>{item.description}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

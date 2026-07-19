"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import ScreenHeader from "@/components/ScreenHeader";
import formStyles from "@/components/settingsForm.module.css";

interface RoadmapItem {
  slug: string;
  title: string;
  description: string;
}

interface KnownIssue {
  id: string;
  title: string;
  note: string | null;
}

type Access = "checking" | "denied" | "ok";

// Vercel injects this automatically at build time - no version-bump
// discipline to maintain, just a short commit hash so testers and staff can
// compare "are you on the same build" during triage.
const BUILD_ID = process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "dev";

export default function BetaHubPage() {
  const router = useRouter();
  const [access, setAccess] = useState<Access>("checking");
  const [recent, setRecent] = useState<RoadmapItem[]>([]);
  const [issues, setIssues] = useState<KnownIssue[]>([]);
  const [focusNote, setFocusNote] = useState("");
  const [leaving, setLeaving] = useState(false);

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

      const [{ data: roadmap }, { data: issueRows }, { data: focusRow }] = await Promise.all([
        supabase
          .from("product_roadmap")
          .select("slug,title,description")
          .eq("stage", "available")
          .eq("is_recent", true)
          .order("updated_at", { ascending: false })
          .limit(6),
        supabase
          .from("beta_known_issues")
          .select("id,title,note")
          .eq("resolved", false)
          .order("created_at", { ascending: false }),
        supabase.from("beta_focus_note").select("note").eq("id", "current").maybeSingle(),
      ]);
      if (cancelled) return;
      setRecent((roadmap as RoadmapItem[]) ?? []);
      setIssues((issueRows as KnownIssue[]) ?? []);
      setFocusNote(focusRow?.note?.trim() ?? "");
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  async function leaveBeta() {
    if (!window.confirm("Leave the beta? You'll lose access to beta chat, but you can rejoin later with a new invite code.")) return;
    setLeaving(true);
    await createClient().rpc("leave_beta_program");
    router.replace("/settings");
  }

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
        <p className={formStyles.hint}>Build {BUILD_ID}</p>
      </div>

      {focusNote && (
        <div className={formStyles.field}>
          <span className={formStyles.label}>Currently focused on</span>
          <p className={formStyles.hint}>{focusNote}</p>
        </div>
      )}

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

      {issues.length > 0 && (
        <div className={formStyles.field}>
          <span className={formStyles.label}>Known issues</span>
          <p className={formStyles.hint}>Already on our list - no need to report these again.</p>
          {issues.map((issue) => (
            <div key={issue.id} className={formStyles.toggleRow} style={{ alignItems: "flex-start" }}>
              <div className={formStyles.toggleText}>
                <span className={formStyles.toggleTitle}>{issue.title}</span>
                {issue.note && <span className={formStyles.toggleDesc}>{issue.note}</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className={formStyles.field}>
        <span className={formStyles.label}>Leave the beta</span>
        <p className={formStyles.hint}>
          You can stop testing at any time - this doesn&apos;t affect anything else in your account.
        </p>
        <button type="button" className={formStyles.dangerButton} style={{ width: "fit-content" }} disabled={leaving} onClick={leaveBeta}>
          {leaving ? "Leaving…" : "Leave the beta"}
        </button>
      </div>
    </div>
  );
}

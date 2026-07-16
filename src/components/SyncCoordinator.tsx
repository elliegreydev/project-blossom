"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { syncNow } from "@/lib/sync";

export default function SyncCoordinator() {
  useEffect(() => {
    const supabase = createClient();
    let debounceTimer: number | undefined;

    async function runSync() {
      if (!navigator.onLine) return;
      const { data } = await supabase.auth.getSession();
      if (!data.session?.user) return;
      try {
        await syncNow(data.session.user.id);
      } catch {
        // The account screen surfaces the stored error and offers a retry.
      }
    }

    function scheduleSync() {
      window.clearTimeout(debounceTimer);
      debounceTimer = window.setTimeout(() => void runSync(), 900);
    }

    function handleVisibility() {
      if (document.visibilityState === "visible") scheduleSync();
    }

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) scheduleSync();
    });
    window.addEventListener("online", scheduleSync);
    window.addEventListener("blossom:sync-needed", scheduleSync);
    document.addEventListener("visibilitychange", handleVisibility);
    const interval = window.setInterval(scheduleSync, 5 * 60 * 1000);
    scheduleSync();

    return () => {
      window.clearTimeout(debounceTimer);
      window.clearInterval(interval);
      authListener.subscription.unsubscribe();
      window.removeEventListener("online", scheduleSync);
      window.removeEventListener("blossom:sync-needed", scheduleSync);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  return null;
}

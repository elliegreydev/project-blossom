"use client";

import { useEffect } from "react";
import { reportClientError } from "@/lib/clientErrorReport";
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
      } catch (error) {
        // The account screen surfaces the stored error and offers a retry.
        // Told to HQ as well, because this is the background pass: nobody is
        // looking at a screen when it fails, so without this the first sign of
        // a broken sync is someone noticing data missing weeks later.
        reportClientError("syncing their data in the background", error);
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

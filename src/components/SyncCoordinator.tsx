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

    // Leaving is the one moment worth skipping the wait for. The debounce is
    // there so a burst of edits becomes one upload, but if the app is going
    // away the burst is over, and 900ms is long enough to lose the race
    // against someone switching straight to another device to check.
    function flushNow() {
      window.clearTimeout(debounceTimer);
      void runSync();
    }

    // Both halves, deliberately. Coming back catches anything written
    // elsewhere; going away sends what was written here. Only the first half
    // existed before, so a change made on a phone waited for the five minute
    // tick while its owner was already looking at the website wondering where
    // it had got to.
    function handleVisibility() {
      if (document.visibilityState === "visible") scheduleSync();
      else flushNow();
    }

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) scheduleSync();
    });
    window.addEventListener("online", scheduleSync);
    window.addEventListener("blossom:sync-needed", scheduleSync);
    document.addEventListener("visibilitychange", handleVisibility);
    // Belt and braces for the installed app: on Android a swipe away doesn't
    // always give us a visibilitychange before the page is frozen.
    window.addEventListener("pagehide", flushNow);
    const interval = window.setInterval(scheduleSync, 5 * 60 * 1000);
    scheduleSync();

    return () => {
      window.clearTimeout(debounceTimer);
      window.clearInterval(interval);
      authListener.subscription.unsubscribe();
      window.removeEventListener("online", scheduleSync);
      window.removeEventListener("blossom:sync-needed", scheduleSync);
      window.removeEventListener("pagehide", flushNow);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  return null;
}

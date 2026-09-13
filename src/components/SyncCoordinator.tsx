"use client";

import { useEffect } from "react";
import { reportClientError } from "@/lib/clientErrorReport";

// The Supabase client is imported at the point of use rather than at the top
// of the file, and this component is the reason it matters: it is mounted in
// the root layout, so a static import put the whole client, realtime engine
// included, into the first chunk of every single page. That is a quarter of a
// megabyte the phone had to parse before it could draw anything, on behalf of
// a sync that most people have never turned on.
//
// The sync engine is behind a second dynamic import, and it only loads once
// Supabase has confirmed a real session, so somebody who has never connected
// an account never downloads it at all. To be exact about what this does and
// does not do: the Supabase client itself is still fetched a second or so
// after the app is up, because asking whether there is a session needs it.
// What changed is that it is no longer in front of the first paint.
//
// Whether somebody is signed in is deliberately not guessed from a cookie.
// Guessing wrong in that direction means their data quietly stops syncing and
// nothing on screen would say so. Supabase's own answer is the only one worth
// trusting here.
async function supabaseClient() {
  const { createClient } = await import("@/lib/supabase/client");
  return createClient();
}

export default function SyncCoordinator() {
  useEffect(() => {
    let debounceTimer: number | undefined;
    let cancelled = false;

    async function runSync() {
      if (!navigator.onLine) return;
      const supabase = await supabaseClient();
      if (cancelled) return;
      const { data } = await supabase.auth.getSession();
      if (!data.session?.user || cancelled) return;
      try {
        const { backgroundSync } = await import("@/lib/sync");
        await backgroundSync(data.session.user.id);
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

    // Leaving is the one moment worth skipping the wait for. The debounce is
    // there so a burst of edits becomes one upload, but if the app is going
    // away the burst is over, and 900ms is long enough to lose the race
    // against someone switching straight to the other device to check.
    function flushNow() {
      window.clearTimeout(debounceTimer);
      void runSync();
    }

    // Both halves, deliberately. Coming back catches anything written
    // elsewhere; going away sends what was written here. Only the first half
    // existed before, so a change made on the phone waited for the five minute
    // tick while she was already looking at the website wondering where it was.
    function handleVisibility() {
      if (document.visibilityState === "visible") scheduleSync();
      else flushNow();
    }

    // The listener is the one thing here that needs the client whether or not
    // anything has happened yet, so it is attached on the same 900ms delay as
    // the first sync rather than during boot. Nothing is missed by waiting:
    // the first sync does its own getSession, so a session that already exists
    // is picked up on this open regardless. The listener is only there to
    // catch somebody signing in later, and nobody signs in inside the first
    // second of the app opening.
    let unsubscribeAuth = () => {};
    const authTimer = window.setTimeout(() => {
      void (async () => {
        const supabase = await supabaseClient();
        if (cancelled) return;
        const { data } = supabase.auth.onAuthStateChange((_event, session) => {
          if (session?.user) scheduleSync();
        });
        unsubscribeAuth = () => data.subscription.unsubscribe();
      })();
    }, 900);

    window.addEventListener("online", scheduleSync);
    window.addEventListener("blossom:sync-needed", scheduleSync);
    document.addEventListener("visibilitychange", handleVisibility);
    // Belt and braces for the installed app: on Android a swipe away doesn't
    // always give us a visibilitychange before the page is frozen.
    window.addEventListener("pagehide", flushNow);
    const interval = window.setInterval(scheduleSync, 5 * 60 * 1000);
    scheduleSync();

    return () => {
      cancelled = true;
      window.clearTimeout(debounceTimer);
      window.clearTimeout(authTimer);
      window.clearInterval(interval);
      unsubscribeAuth();
      window.removeEventListener("online", scheduleSync);
      window.removeEventListener("blossom:sync-needed", scheduleSync);
      window.removeEventListener("pagehide", flushNow);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  return null;
}

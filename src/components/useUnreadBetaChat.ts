"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

// Device-local "have I seen the latest message" state, same treatment as
// dismissed nudges elsewhere in this app - not synced, just enough to show
// a dot without needing a new synced read-receipts table for a small beta
// cohort's group chat.
const LAST_READ_KEY = "blossom-beta-chat-last-read";

export function markBetaChatRead(): void {
  try {
    localStorage.setItem(LAST_READ_KEY, new Date().toISOString());
  } catch {
    // Nothing else needed when storage is unavailable.
  }
}

export function useUnreadBetaChat(enabled: boolean): boolean {
  const [unread, setUnread] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    const supabase = createClient();
    void supabase
      .from("beta_chat_messages")
      .select("created_at")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled || !data) return;
        let lastRead = "";
        try {
          lastRead = localStorage.getItem(LAST_READ_KEY) ?? "";
        } catch {
          // Treat storage-unavailable the same as "never read".
        }
        setUnread(data.created_at > lastRead);
      });
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return unread;
}

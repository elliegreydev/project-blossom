"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import { db, LOCAL_PROFILE_ID } from "@/lib/db";
import { createClient } from "@/lib/supabase/client";
import { markBetaChatRead } from "@/components/useUnreadBetaChat";
import styles from "./betaChat.module.css";

interface ChatMessage {
  id: string;
  user_id: string;
  sender_name: string;
  is_staff_sender: boolean;
  body: string;
  created_at: string;
}

type Access = "checking" | "denied" | "ok";

export default function BetaChatPage() {
  const localProfile = useLiveQuery(() => db.profiles.get(LOCAL_PROFILE_ID));
  const [access, setAccess] = useState<Access>("checking");
  const [isStaff, setIsStaff] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();

    async function checkAccess() {
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
      const staff = staffData === true;
      setIsStaff(staff);
      setAccess(betaData === true || staff ? "ok" : "denied");
    }

    void checkAccess();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (access !== "ok") return;
    let cancelled = false;
    const supabase = createClient();
    markBetaChatRead();

    async function load() {
      const { data } = await supabase
        .from("beta_chat_messages")
        .select("id,user_id,sender_name,is_staff_sender,body,created_at")
        .order("created_at", { ascending: true })
        .limit(200);
      if (!cancelled) setMessages((data as ChatMessage[]) ?? []);
    }
    void load();

    const channel = supabase
      .channel("beta-chat-messages")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "beta_chat_messages" },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as ChatMessage]);
          markBetaChatRead();
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "beta_chat_messages" },
        (payload) => {
          const removedId = (payload.old as { id: string }).id;
          setMessages((prev) => prev.filter((m) => m.id !== removedId));
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, [access]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages.length]);

  async function send() {
    const body = draft.trim();
    if (!body) return;
    setSending(true);
    const supabase = createClient();
    const { data: inserted, error } = await supabase
      .from("beta_chat_messages")
      .insert({
        body,
        sender_name: localProfile?.displayName?.trim() || "A beta tester",
      })
      .select("id")
      .single();
    setSending(false);
    if (inserted?.id) {
      void fetch("/api/beta-chat/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageId: inserted.id }),
      });
    }
    if (!error) setDraft("");
  }

  async function remove(id: string) {
    if (!window.confirm("Remove this message?")) return;
    const supabase = createClient();
    await supabase.from("beta_chat_messages").delete().eq("id", id);
  }

  if (access === "checking") return null;

  if (access === "denied") {
    return (
      <div className={styles.screen}>
        <div className={styles.header}>
          <span className={styles.title}>Beta chat</span>
        </div>
        <p className={styles.empty}>
          This is for beta testers. Got an invite code? <Link href="/beta/join">Join the beta</Link>.
        </p>
      </div>
    );
  }

  return (
    <div className={styles.screen}>
      <div className={styles.header}>
        <span className={styles.title}>Beta chat</span>
        <span className={styles.badge}>Beta - features may change, data may reset</span>
      </div>

      <div className={styles.messages} ref={listRef}>
        {messages.length === 0 && <p className={styles.empty}>No messages yet - say hello!</p>}
        {messages.map((m) => (
          <div key={m.id} className={styles.messageRow}>
            <div className={styles.messageMeta}>
              <span>{m.sender_name}</span>
              {m.is_staff_sender && <span className={styles.staffTag}>BLOSSOM TEAM</span>}
              <span>
                {new Date(m.created_at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
            <div className={styles.bubble}>{m.body}</div>
            {isStaff && (
              <button type="button" className={styles.deleteBtn} onClick={() => remove(m.id)}>
                Remove
              </button>
            )}
          </div>
        ))}
      </div>

      <div className={styles.composer}>
        <textarea
          className={styles.input}
          rows={1}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Message the beta group…"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void send();
            }
          }}
        />
        <button type="button" className={styles.sendButton} disabled={sending || !draft.trim()} onClick={send}>
          Send
        </button>
      </div>
    </div>
  );
}

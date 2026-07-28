"use client";

import { use, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import ScreenHeader from "@/components/ScreenHeader";
import { CATEGORY_LABELS, type TicketCategory } from "@/lib/ticketCategories";
import styles from "@/components/settingsForm.module.css";

interface Ticket {
  id: string;
  category: TicketCategory;
  status: "open" | "resolved";
  created_at: string;
}

interface Message {
  id: string;
  sender_id: string;
  body: string;
  is_system: boolean;
  visible_to_user_only: boolean;
  created_at: string;
}

export default function TicketThreadPage({ params }: { params: Promise<{ ticketId: string }> }) {
  const { ticketId } = use(params);
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  async function load() {
    const supabase = createClient();
    const [{ data: ticketRow }, { data: messageRows }, { data: userData }] = await Promise.all([
      supabase.from("support_tickets").select("id,category,status,created_at").eq("id", ticketId).maybeSingle(),
      supabase
        .from("support_ticket_messages")
        .select("id,sender_id,body,is_system,visible_to_user_only,created_at")
        .eq("ticket_id", ticketId)
        .order("created_at", { ascending: true }),
      supabase.auth.getUser(),
    ]);
    setTicket(ticketRow as Ticket | null);
    setMessages((messageRows as Message[]) ?? []);
    setUserId(userData.user?.id ?? null);
    setLoading(false);
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticketId]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages.length]);

  async function send() {
    const body = draft.trim();
    if (!body || !userId) return;
    setSending(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("support_ticket_messages")
      .insert({ ticket_id: ticketId, sender_id: userId, body })
      .select("id")
      .single();
    setSending(false);
    if (!error) {
      setDraft("");
      if (data?.id) {
        void fetch("/api/tickets/notify-message", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messageId: data.id }),
        });
      }
      void load();
    }
  }

  if (loading) return <div className={styles.screen}><p className={styles.hint}>Loading…</p></div>;
  if (!ticket) return <div className={styles.screen}><p className={styles.hint}>Ticket not found.</p></div>;

  return (
    <div className={styles.screen}>
      <ScreenHeader title={CATEGORY_LABELS[ticket.category]} backHref="/tickets" />
      <p className={styles.hint}>
        {ticket.status === "open" ? "Open" : "Resolved"} · opened{" "}
        {new Date(ticket.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
      </p>

      <div ref={listRef} style={{ display: "flex", flexDirection: "column", gap: 10, maxHeight: 420, overflowY: "auto" }}>
        {messages.length === 0 && <p className={styles.hint}>No messages yet.</p>}
        {messages.map((m) =>
          m.visible_to_user_only ? (
            <div
              key={m.id}
              className={styles.optionCard}
              style={{ borderColor: "var(--pink, #e08bb0)", background: "var(--surface-raised, rgba(224,139,176,0.08))" }}
            >
              <span className={styles.optionTitle}>🔒 Access code</span>
              <span className={styles.optionDesc} style={{ whiteSpace: "pre-wrap" }}>{m.body}</span>
            </div>
          ) : (
            <div key={m.id}>
              <div className={styles.hint} style={{ margin: 0 }}>
                {m.is_system ? "System" : m.sender_id === userId ? "You" : "Staff"} ·{" "}
                {new Date(m.created_at).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
              </div>
              <div style={{ whiteSpace: "pre-wrap" }}>{m.body}</div>
            </div>
          )
        )}
      </div>

      {ticket.status === "open" ? (
        <div className={styles.field}>
          <textarea
            className={styles.input}
            style={{ minHeight: 80 }}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Reply…"
          />
          <button type="button" className={styles.primaryButton} style={{ width: "fit-content" }} disabled={sending || !draft.trim()} onClick={send}>
            {sending ? "Sending…" : "Send"}
          </button>
        </div>
      ) : (
        <p className={styles.hint}>
          This ticket has been marked resolved, so it&apos;s closed to new replies. If you still need
          help, open a new ticket.
        </p>
      )}
    </div>
  );
}

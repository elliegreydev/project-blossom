"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import ScreenHeader from "@/components/ScreenHeader";
import { TICKET_CATEGORIES, type TicketCategory } from "@/lib/ticketCategories";
import styles from "@/components/settingsForm.module.css";

export default function NewTicketPage() {
  const router = useRouter();
  const [category, setCategory] = useState<TicketCategory | null>(null);
  const [message, setMessage] = useState("");
  const [otherDetail, setOtherDetail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!category || !message.trim()) return;
    setSubmitting(true);
    setError(null);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setError("You need to be signed in to open a ticket.");
      setSubmitting(false);
      return;
    }

    const { data: ticket, error: ticketError } = await supabase
      .from("support_tickets")
      .insert({ user_id: user.id, category })
      .select("id")
      .single();
    if (ticketError || !ticket) {
      setError(ticketError?.message ?? "Couldn't open the ticket.");
      setSubmitting(false);
      return;
    }

    const body = category === "other" && otherDetail.trim() ? `${otherDetail.trim()}\n\n${message.trim()}` : message.trim();
    const { error: messageError } = await supabase
      .from("support_ticket_messages")
      .insert({ ticket_id: ticket.id, sender_id: user.id, body });
    if (messageError) {
      setError(messageError.message);
      setSubmitting(false);
      return;
    }

    void fetch("/api/tickets/notify-new", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ticketId: ticket.id }),
    });

    router.push(`/tickets/${ticket.id}`);
  }

  return (
    <div className={styles.screen}>
      <ScreenHeader title="New ticket" backHref="/tickets" />

      <div className={styles.field}>
        <span className={styles.label}>What's this about?</span>
        <div className={styles.optionGrid} style={{ gridTemplateColumns: "1fr" }}>
          {TICKET_CATEGORIES.map((c) => (
            <button
              key={c.key}
              type="button"
              className={`${styles.optionCard} ${category === c.key ? styles.selected : ""}`}
              onClick={() => setCategory(c.key)}
            >
              <span className={styles.optionTitle}>{c.label}</span>
              <span className={styles.optionDesc}>{c.desc}</span>
            </button>
          ))}
        </div>
      </div>

      {category === "other" && (
        <div className={styles.field}>
          <span className={styles.label}>In a few words, what's it about?</span>
          <input className={styles.input} value={otherDetail} onChange={(e) => setOtherDetail(e.target.value)} placeholder="A short label" />
        </div>
      )}

      {category && (
        <div className={styles.field}>
          <span className={styles.label}>Tell us more</span>
          <textarea
            className={styles.input}
            style={{ minHeight: 120 }}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="What's going on?"
            autoFocus
          />
        </div>
      )}

      {error && <p className={styles.hint} style={{ color: "var(--pink)" }}>{error}</p>}

      <button
        type="button"
        className={styles.primaryButton}
        style={{ width: "fit-content" }}
        disabled={!category || !message.trim() || submitting}
        onClick={submit}
      >
        {submitting ? "Opening…" : "Open ticket"}
      </button>
    </div>
  );
}

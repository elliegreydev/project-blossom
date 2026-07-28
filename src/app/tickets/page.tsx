"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
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

export default function TicketsPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    void supabase
      .from("support_tickets")
      .select("id,category,status,created_at")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setTickets((data as Ticket[]) ?? []);
        setLoading(false);
      });
  }, []);

  return (
    <div className={styles.screen}>
      <ScreenHeader title="Support tickets" backHref="/settings" />

      <p className={styles.hint}>
        Need help with something? Open a ticket and a staff member will get back to you here.
      </p>

      <Link href="/tickets/new" className={styles.primaryButton} style={{ width: "fit-content", textDecoration: "none", textAlign: "center" }}>
        + New ticket
      </Link>

      {loading ? (
        <p className={styles.hint}>Loading…</p>
      ) : tickets.length === 0 ? (
        <p className={styles.hint}>You haven&apos;t opened any tickets yet.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {tickets.map((ticket) => (
            <Link
              key={ticket.id}
              href={`/tickets/${ticket.id}`}
              className={styles.optionCard}
              style={{ textDecoration: "none", display: "block" }}
            >
              <span className={styles.optionTitle}>{CATEGORY_LABELS[ticket.category]}</span>
              <span className={styles.optionDesc}>
                {ticket.status === "open" ? "Open" : "Resolved"} · opened{" "}
                {new Date(ticket.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

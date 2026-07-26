"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import styles from "../admin.module.css";

interface Result {
  id: string;
  group: string;
  title: string;
  snippet: string | null;
  href: string;
}

export default function AdminSearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Result[] | null>(null);
  const [searching, setSearching] = useState(false);

  async function runSearch() {
    const q = query.trim();
    if (q.length < 2) return;
    setSearching(true);
    const supabase = createClient();
    const like = `%${q}%`;

    const [{ data: issues }, { data: notes }, { data: cases }] = await Promise.all([
      supabase.from("staff_issues").select("id,title,description,status").or(`title.ilike.${like},description.ilike.${like}`).limit(20),
      supabase.from("staff_handoff_notes").select("id,body").ilike("body", like).limit(20),
      supabase.from("support_cases").select("id,subject,status").ilike("subject", like).limit(20),
    ]);

    const found: Result[] = [
      ...(issues ?? []).map((item) => ({ id: `issue-${item.id}`, group: "Known issues", title: item.title, snippet: item.status, href: "/admin/issues" })),
      ...(notes ?? []).map((item) => ({ id: `note-${item.id}`, group: "Handoff notes", title: item.body.slice(0, 100), snippet: null, href: "/admin/notes" })),
      ...(cases ?? []).map((item) => ({ id: `case-${item.id}`, group: "Support cases", title: item.subject, snippet: item.status, href: `/admin/support/${item.id}` })),
    ];
    setResults(found);
    setSearching(false);
  }

  return (
    <>
      <h1 className={styles.title}>Staff search</h1>
      <p className={styles.subtitle}>
        Search across Known issues, Handoff notes, and support case subjects. Case contents themselves
        stay behind the case-gate - only subjects show up here.
      </p>

      <div className={styles.field}>
        <input
          className={styles.input}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && runSearch()}
          placeholder="Search staff tools…"
          autoFocus
        />
        <button type="button" className={styles.primaryButton} style={{ width: "fit-content" }} disabled={query.trim().length < 2 || searching} onClick={runSearch}>
          {searching ? "Searching…" : "Search"}
        </button>
      </div>

      {results !== null && (
        results.length === 0 ? (
          <p className={styles.subtitle}>No matches for &quot;{query.trim()}&quot;.</p>
        ) : (
          <div className={styles.feedbackList}>
            {results.map((r) => (
              <Link key={r.id} href={r.href} className={styles.feedbackCard}>
                <span className={styles.subtitle} style={{ margin: 0, textTransform: "uppercase", fontSize: 11, fontWeight: 700 }}>{r.group}</span>
                <span className={styles.cardTitle} style={{ fontSize: 15 }}>{r.title}</span>
                {r.snippet && <span className={styles.subtitle} style={{ margin: 0 }}>{r.snippet}</span>}
              </Link>
            ))}
          </div>
        )
      )}
    </>
  );
}

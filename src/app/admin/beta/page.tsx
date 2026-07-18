"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import styles from "../admin.module.css";

interface CodeRow {
  code: string;
  created_at: string;
  redeemed_by: string | null;
  redeemed_email: string | null;
  redeemed_at: string | null;
}

function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I
  let out = "";
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  for (const b of bytes) out += chars[b % chars.length];
  return out;
}

function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-GB", {
    day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
  });
}

export default function AdminBetaPage() {
  const [codes, setCodes] = useState<CodeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function load() {
    const supabase = createClient();
    const { data, error } = await supabase.rpc("list_beta_codes");
    if (!error) setCodes((data as CodeRow[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  async function addCode() {
    setGenerating(true);
    setMessage(null);
    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();
    const code = generateCode();
    const { error } = await supabase
      .from("beta_invite_codes")
      .insert({ code, created_by: userData.user?.id });
    setGenerating(false);
    if (error) {
      setMessage(error.message);
      return;
    }
    void load();
  }

  async function deleteCode(code: string) {
    if (!window.confirm(`Delete unused code ${code}? It won't work if someone still has it.`)) return;
    const supabase = createClient();
    const { error } = await supabase.from("beta_invite_codes").delete().eq("code", code);
    if (error) {
      setMessage(error.message);
      return;
    }
    void load();
  }

  async function revoke(userId: string, email: string | null) {
    if (!window.confirm(`Revoke beta access for ${email ?? "this person"}? Their invite code stays used either way.`)) return;
    const supabase = createClient();
    const { error } = await supabase.rpc("revoke_beta_access", { target_user_id: userId });
    if (error) {
      setMessage(error.message);
      return;
    }
    void load();
  }

  if (loading) return <p className={styles.subtitle}>Loading…</p>;

  const unredeemed = codes.filter((c) => !c.redeemed_by);
  const redeemed = codes.filter((c) => c.redeemed_by);

  return (
    <>
      <h1 className={styles.title}>Beta</h1>
      <p className={styles.subtitle}>
        Single-use invite codes for beta testers. Each code works once and is tied to whoever
        redeems it, so a leaked or shared code traces back to exactly one person. Testers get
        access to the beta chat and a small in-app badge.
      </p>

      {message && <p className={styles.subtitle}>{message}</p>}

      <div className={styles.card}>
        <span className={styles.cardTitle}>{unredeemed.length} unused code{unredeemed.length === 1 ? "" : "s"}</span>
        <button
          type="button"
          className={styles.primaryButton}
          style={{ width: "fit-content" }}
          disabled={generating}
          onClick={addCode}
        >
          {generating ? "Generating…" : "+ Generate a code"}
        </button>
        {unredeemed.length > 0 && (
          <div className={styles.tableWrap} style={{ marginTop: 8 }}>
            <table className={styles.table}>
              <thead>
                <tr><th>Code</th><th>Created</th><th></th></tr>
              </thead>
              <tbody>
                {unredeemed.map((c) => (
                  <tr key={c.code}>
                    <td style={{ fontFamily: "monospace", fontWeight: 600 }}>{c.code}</td>
                    <td>{formatDate(c.created_at)}</td>
                    <td>
                      <button type="button" className={styles.dangerButton} onClick={() => deleteCode(c.code)}>
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Code</th>
              <th>Redeemed by</th>
              <th>Redeemed at</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {redeemed.map((c) => (
              <tr key={c.code}>
                <td style={{ fontFamily: "monospace" }}>{c.code}</td>
                <td>{c.redeemed_email ?? c.redeemed_by}</td>
                <td>{formatDate(c.redeemed_at)}</td>
                <td>
                  {c.redeemed_by && (
                    <button
                      type="button"
                      className={styles.dangerButton}
                      onClick={() => revoke(c.redeemed_by as string, c.redeemed_email)}
                    >
                      Revoke access
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {redeemed.length === 0 && (
              <tr><td colSpan={4} className={styles.mutedCell}>No codes redeemed yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import styles from "../blog/blog.module.css";

export default function AboutPage() {
  const [body, setBody] = useState<string | null>(null);
  const [isStaff, setIsStaff] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    const supabase = createClient();
    const { data: sessionData } = await supabase.auth.getSession();
    let staff = false;
    if (sessionData.session) {
      const { data } = await supabase.rpc("is_staff");
      staff = data === true;
    }
    setIsStaff(staff);

    const { data: row } = await supabase.from("about_page").select("body").eq("id", "current").maybeSingle();
    setBody(row?.body ?? "");
  }

  useEffect(() => {
    void load();
  }, []);

  async function save() {
    setSaving(true);
    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();
    await supabase.from("about_page").upsert({
      id: "current",
      body: draft,
      updated_at: new Date().toISOString(),
      updated_by: userData.user?.id,
    });
    setSaving(false);
    setEditing(false);
    void load();
  }

  if (body === null) return null;

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <Link href="/" className={styles.back}>← Back to Blossom</Link>

        <header className={styles.header}>
          <span className={styles.eyebrow}>About</span>
          <h1>Hi, I&apos;m Ellie.</h1>
        </header>

        {isStaff && (
          <div className={styles.staffBar}>
            {!editing ? (
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={() => {
                  setDraft(body);
                  setEditing(true);
                }}
              >
                Edit
              </button>
            ) : (
              <div className={styles.form} style={{ width: "100%" }}>
                <div className={styles.field}>
                  <span className={styles.label}>About page text</span>
                  <textarea
                    className={styles.textarea}
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    style={{ minHeight: 320 }}
                  />
                </div>
                <div className={styles.actionRow}>
                  <button type="button" className={styles.secondaryButton} onClick={() => setEditing(false)} disabled={saving}>
                    Cancel
                  </button>
                  <button type="button" className={styles.primaryButton} disabled={saving || !draft.trim()} onClick={save}>
                    {saving ? "Saving…" : "Save changes"}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        <div className={styles.body}>{body}</div>
      </div>
    </main>
  );
}

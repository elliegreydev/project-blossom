"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import styles from "../blog.module.css";

interface BlogPost {
  id: string;
  slug: string;
  title: string;
  body: string;
  status: "draft" | "published" | "archived";
  published_at: string | null;
  created_at: string;
}

function dateLabel(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

export default function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const router = useRouter();
  const [post, setPost] = useState<BlogPost | null | undefined>(undefined);
  const [isStaff, setIsStaff] = useState(false);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
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

    const { data } = await supabase
      .from("blog_posts")
      .select("id,slug,title,body,status,published_at,created_at")
      .eq("slug", slug)
      .maybeSingle();
    const row = data as BlogPost | null;
    setPost(row);
    if (row) {
      setTitle(row.title);
      setBody(row.body);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  async function saveEdit() {
    if (!post || !title.trim() || !body.trim()) return;
    setSaving(true);
    await createClient().from("blog_posts").update({ title: title.trim(), body: body.trim() }).eq("id", post.id);
    setSaving(false);
    setEditing(false);
    void load();
  }

  async function setStatus(status: "draft" | "published") {
    if (!post) return;
    await createClient()
      .from("blog_posts")
      .update({ status, published_at: status === "published" ? new Date().toISOString() : null })
      .eq("id", post.id);
    void load();
  }

  async function deletePost() {
    if (!post || !window.confirm(`Delete "${post.title}"? This can't be undone.`)) return;
    await createClient().from("blog_posts").delete().eq("id", post.id);
    router.push("/blog");
  }

  if (post === undefined) return null;

  if (!post) {
    return (
      <main className={styles.page}>
        <div className={styles.shell}>
          <Link href="/blog" className={styles.back}>← Back to blog</Link>
          <p className={styles.intro}>That post doesn&apos;t exist, or isn&apos;t published.</p>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <Link href="/blog" className={styles.back}>← Back to blog</Link>

        {isStaff && (
          <div className={styles.staffBar}>
            {!editing ? (
              <div className={styles.actionRow}>
                <button type="button" className={styles.secondaryButton} onClick={() => setEditing(true)}>
                  Edit
                </button>
                {post.status === "published" ? (
                  <button type="button" className={styles.secondaryButton} onClick={() => setStatus("draft")}>
                    Unpublish
                  </button>
                ) : (
                  <button type="button" className={styles.primaryButton} onClick={() => setStatus("published")}>
                    Publish
                  </button>
                )}
                <button type="button" className={styles.dangerButton} onClick={deletePost}>
                  Delete
                </button>
              </div>
            ) : (
              <div className={styles.form} style={{ width: "100%" }}>
                <div className={styles.field}>
                  <span className={styles.label}>Title</span>
                  <input className={styles.input} value={title} onChange={(e) => setTitle(e.target.value)} />
                </div>
                <div className={styles.field}>
                  <span className={styles.label}>Post</span>
                  <textarea className={styles.textarea} value={body} onChange={(e) => setBody(e.target.value)} />
                </div>
                <div className={styles.actionRow}>
                  <button type="button" className={styles.secondaryButton} onClick={() => setEditing(false)} disabled={saving}>
                    Cancel
                  </button>
                  <button type="button" className={styles.primaryButton} disabled={saving || !title.trim() || !body.trim()} onClick={saveEdit}>
                    {saving ? "Saving…" : "Save changes"}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        <header className={styles.header}>
          {post.status !== "published" && <span className={styles.draftBadge}>Draft</span>}
          <h1>{post.title}</h1>
          <p className={styles.intro}>{dateLabel(post.published_at ?? post.created_at)}</p>
        </header>

        <div className={styles.body}>{post.body}</div>
      </div>
    </main>
  );
}

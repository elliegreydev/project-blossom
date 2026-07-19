"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import styles from "./blog.module.css";

interface BlogPost {
  id: string;
  slug: string;
  title: string;
  body: string;
  status: "draft" | "published" | "archived";
  published_at: string | null;
  created_at: string;
}

function excerpt(body: string): string {
  const firstPara = body.split("\n\n")[0] ?? body;
  return firstPara.length > 220 ? firstPara.slice(0, 220).trim() + "…" : firstPara;
}

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function dateLabel(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

export default function BlogListPage() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [isStaff, setIsStaff] = useState(false);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const supabase = createClient();
    const { data: sessionData } = await supabase.auth.getSession();
    let staff = false;
    if (sessionData.session) {
      const { data } = await supabase.rpc("is_staff");
      staff = data === true;
    }
    setIsStaff(staff);

    const { data: rows } = await supabase
      .from("blog_posts")
      .select("id,slug,title,body,status,published_at,created_at")
      .order("published_at", { ascending: false, nullsFirst: false });
    setPosts((rows as BlogPost[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  async function createPost() {
    if (!title.trim() || !body.trim()) return;
    setSaving(true);
    setError(null);
    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();
    const { error: insertError } = await supabase.from("blog_posts").insert({
      title: title.trim(),
      slug: slug.trim() || slugify(title),
      body: body.trim(),
      created_by: userData.user?.id,
    });
    setSaving(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }
    setTitle("");
    setSlug("");
    setBody("");
    setCreating(false);
    void load();
  }

  async function setStatus(id: string, status: "draft" | "published") {
    await createClient()
      .from("blog_posts")
      .update({ status, published_at: status === "published" ? new Date().toISOString() : null })
      .eq("id", id);
    void load();
  }

  async function deletePost(id: string, postTitle: string) {
    if (!window.confirm(`Delete "${postTitle}"? This can't be undone.`)) return;
    await createClient().from("blog_posts").delete().eq("id", id);
    void load();
  }

  if (loading) return null;

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <Link href="/" className={styles.back}>← Back to Blossom</Link>

        <header className={styles.header}>
          <span className={styles.eyebrow}>From the team</span>
          <h1>Blog</h1>
          <p className={styles.intro}>Updates, thinking, and the occasional ramble from whoever's building Blossom.</p>
        </header>

        {isStaff && (
          <div className={styles.staffBar}>
            {!creating ? (
              <button type="button" className={styles.primaryButton} onClick={() => setCreating(true)}>
                + New post
              </button>
            ) : (
              <div className={styles.form} style={{ width: "100%" }}>
                <div className={styles.field}>
                  <span className={styles.label}>Title</span>
                  <input
                    className={styles.input}
                    value={title}
                    onChange={(e) => {
                      setTitle(e.target.value);
                      setSlug(slugify(e.target.value));
                    }}
                    placeholder="What's this post about?"
                  />
                </div>
                <div className={styles.field}>
                  <span className={styles.label}>URL slug</span>
                  <input className={styles.input} value={slug} onChange={(e) => setSlug(slugify(e.target.value))} placeholder="url-friendly-slug" />
                </div>
                <div className={styles.field}>
                  <span className={styles.label}>Post</span>
                  <textarea
                    className={styles.textarea}
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    placeholder="Write the post. Blank lines start a new paragraph."
                  />
                </div>
                {error && <p className={styles.itemMeta} style={{ color: "var(--pink)" }}>{error}</p>}
                <div className={styles.actionRow}>
                  <button type="button" className={styles.secondaryButton} onClick={() => setCreating(false)} disabled={saving}>
                    Cancel
                  </button>
                  <button
                    type="button"
                    className={styles.primaryButton}
                    disabled={saving || !title.trim() || !body.trim()}
                    onClick={createPost}
                  >
                    {saving ? "Saving…" : "Save as draft"}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        <div className={styles.list}>
          {posts.length === 0 && <p className={styles.intro}>Nothing posted yet.</p>}
          {posts.map((post) => (
            <div key={post.id} className={styles.item}>
              <div className={styles.itemHeader}>
                <Link href={`/blog/${post.slug}`} className={styles.itemTitle}>
                  {post.title}
                </Link>
                {post.status !== "published" && <span className={styles.draftBadge}>Draft</span>}
              </div>
              <span className={styles.itemMeta}>{dateLabel(post.published_at ?? post.created_at)}</span>
              <p className={styles.itemExcerpt}>{excerpt(post.body)}</p>
              {isStaff && (
                <div className={styles.actionRow}>
                  {post.status === "published" ? (
                    <button type="button" className={styles.secondaryButton} onClick={() => setStatus(post.id, "draft")}>
                      Unpublish
                    </button>
                  ) : (
                    <button type="button" className={styles.secondaryButton} onClick={() => setStatus(post.id, "published")}>
                      Publish
                    </button>
                  )}
                  <button type="button" className={styles.dangerButton} onClick={() => deletePost(post.id, post.title)}>
                    Delete
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}

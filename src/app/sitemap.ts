import type { MetadataRoute } from "next";

/**
 * The pages worth finding from a search.
 *
 * Deliberately short. Blossom is an app, not a content site, and almost
 * everything in it sits behind onboarding where a crawler would find an empty
 * shell. What is listed here is the handful of pages that answer a question
 * somebody might actually type: what is this, who made it, how is it built,
 * and where do I get help right now.
 *
 * Nothing personal, nothing token-shaped, nothing behind sign-in. If a page is
 * not in this list it is because it either needs an account or is not useful to
 * a stranger, and both of those are reasons to leave it out rather than an
 * oversight.
 *
 * Search matters here for a quiet reason: it is the one way somebody finds
 * Blossom without anybody having to post about it anywhere.
 */
const SITE = "https://projectblossom.net";

const PAGES: { path: string; priority: number; changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"] }[] = [
  { path: "/", priority: 1.0, changeFrequency: "weekly" },
  // The one somebody may need urgently, and it needs no account.
  { path: "/crisis-support", priority: 0.9, changeFrequency: "monthly" },
  { path: "/about", priority: 0.8, changeFrequency: "monthly" },
  { path: "/ai", priority: 0.8, changeFrequency: "monthly" },
  // Two pages that answer the questions a careful person asks before
  // trusting a health app run by one person.
  { path: "/if-blossom-stops", priority: 0.7, changeFrequency: "monthly" },
  { path: "/changelog", priority: 0.6, changeFrequency: "weekly" },
  { path: "/roadmap", priority: 0.6, changeFrequency: "weekly" },
  { path: "/ideas", priority: 0.5, changeFrequency: "weekly" },
  { path: "/blog", priority: 0.5, changeFrequency: "weekly" },
  { path: "/support-blossom", priority: 0.4, changeFrequency: "monthly" },
  { path: "/join", priority: 0.4, changeFrequency: "monthly" },
  { path: "/legal/privacy", priority: 0.3, changeFrequency: "monthly" },
  { path: "/legal/terms", priority: 0.3, changeFrequency: "monthly" },
];

export default function sitemap(): MetadataRoute.Sitemap {
  // One timestamp for the whole file. Per-page dates would be invented, and an
  // invented date is worse than none.
  const lastModified = new Date();
  return PAGES.map(({ path, priority, changeFrequency }) => ({
    url: `${SITE}${path}`,
    lastModified,
    changeFrequency,
    priority,
  }));
}

import type { MetadataRoute } from "next";

/**
 * What crawlers may look at.
 *
 * There was no robots.txt at all, which meant everything was fair game by
 * default. Most of the app is client-rendered behind onboarding so a crawler
 * would find an empty shell, but three paths are not "pointless to index", they
 * are "must never be indexed":
 *
 *   /bridge/<token>   a link somebody shares with a clinician or a friend
 *   /circle/<grantId> a trusted circle invite
 *   /tickets/<id>     a support conversation
 *
 * Each of those is a URL that grants access to something personal. A shared
 * link ending up in a search index is not a crawl budget problem, it is
 * somebody's health summary turning up in results. robots.txt is only advice
 * to well-behaved crawlers, so the pages themselves also carry a noindex.
 *
 * The rest of the disallow list is ordinary: the app's own screens hold nothing
 * a crawler can read and appearing as "Blossom - Journal" in results helps
 * nobody.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          // Links that are themselves the credential.
          "/bridge/",
          "/circle/",
          "/tickets/",
          // Signed-in surfaces. Nothing readable, nothing useful.
          "/account",
          "/settings/",
          "/track/",
          "/journey",
          "/calendar",
          "/search",
          "/onboarding",
          "/reminders",
          "/travel",
          // Never anything under the API.
          "/api/",
        ],
      },
    ],
    sitemap: "https://projectblossom.net/sitemap.xml",
    host: "https://projectblossom.net",
  };
}

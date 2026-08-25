import type { NextConfig } from "next";

/**
 * Security headers.
 *
 * Blossom shipped with none of these, which securityheaders.com graded a D.
 * Every value below was chosen by reading what the app actually does, not from
 * a template, because a copied Content-Security-Policy is the fastest way to
 * break a working app for everybody at once.
 *
 * The four things that would have broken, and why they do not:
 *
 *   blob: in img-src and media-src. Voice recordings are held as Blobs and
 *   played through an object URL, and the data and passport exports build one
 *   to hand you a file. Omit blob: and voice practice silently stops working.
 *
 *   microphone=(self) in Permissions-Policy. Voice practice calls
 *   getUserMedia({ audio: true }). A blanket microphone=() would kill it.
 *   Camera and geolocation really are unused, so those stay closed.
 *
 *   'unsafe-inline' in script-src. There is an inline script in the root
 *   layout that applies the saved theme before first paint, and Next injects
 *   its own inline hydration scripts. Locking this down properly needs nonces
 *   from middleware, which this app does not have. It is a real weakening, and
 *   the mitigation is that no user content is ever rendered as HTML anywhere
 *   in the app, so there is no injection point to exploit.
 *
 *   connect-src built from the environment. Dev and production point at
 *   different Supabase projects, so hardcoding one origin would break sync on
 *   the other. This reads whichever the build was given.
 *
 * connect-src is the directive that earns its place here. Even if something
 * did manage to run in the page, it could not post a journal entry to an
 * attacker's server, because there is nowhere to send it. That matters more
 * for this app than any of the others.
 *
 * The external links in the resource directory (NHS, helplines, and so on) are
 * anchors, not fetches, so no CSP directive touches them.
 */
const supabaseOrigin = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").origin;
  } catch {
    // No Supabase configured. The app still runs local-only, and connect-src
    // simply stays tighter.
    return "";
  }
})();

const isDev = process.env.NODE_ENV === "development";

const csp = [
  "default-src 'self'",
  // 'unsafe-eval' is React Refresh in dev only. It never reaches production.
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  // data: for inline icons, blob: for locally held photos.
  "img-src 'self' data: blob:",
  // Voice recordings play from an object URL.
  "media-src 'self' blob:",
  // next/font self-hosts Manrope and Inter, so no Google origin is needed.
  "font-src 'self'",
  ["connect-src 'self'", supabaseOrigin].filter(Boolean).join(" "),
  "worker-src 'self'",
  "manifest-src 'self'",
  // Blossom is never legitimately framed. Clickjacking a health app could mean
  // someone tricked into tapping a delete or a share.
  "frame-ancestors 'none'",
  "frame-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  // frame-ancestors already covers this for modern browsers. Kept for old ones.
  { key: "X-Frame-Options", value: "DENY" },
  /**
   * no-referrer, rather than the usual strict-origin-when-cross-origin.
   *
   * The resource directory links out to gender clinics, helplines and peer
   * support. Sending an origin header would tell every one of those sites that
   * the visitor arrived from a trans health app, which is a disclosure the
   * person did not choose to make by tapping a link.
   */
  { key: "Referrer-Policy", value: "no-referrer" },
  {
    key: "Permissions-Policy",
    value: [
      "camera=()",
      "geolocation=()",
      "payment=()",
      "usb=()",
      "interest-cohort=()",
      // Voice practice needs this. Everything else is closed.
      "microphone=(self)",
    ].join(", "),
  },
];

const nextConfig: NextConfig = {
  /**
   * The 2026 rename: Track became Care, Calendar became Plan, Info became
   * Library. Blossom is installed to home screens and people bookmark pages
   * inside it, so the old paths keep working rather than turning into 404s
   * for anyone who saved one. Permanent, because these are not coming back.
   *
   * /track/care is the exception: that page moved to /care/overview rather
   * than /care/care, so it needs its own rule ahead of the wildcard.
   */
  async redirects() {
    return [
      { source: "/track/care", destination: "/care/overview", permanent: true },
      { source: "/track", destination: "/care", permanent: true },
      { source: "/track/:path*", destination: "/care/:path*", permanent: true },
      { source: "/calendar", destination: "/plan", permanent: true },
      { source: "/calendar/:path*", destination: "/plan/:path*", permanent: true },
      { source: "/info", destination: "/library", permanent: true },
      { source: "/info/:path*", destination: "/library/:path*", permanent: true },
    ];
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      /**
       * Vercel's CDN puts Access-Control-Allow-Origin: * on prerendered pages.
       * Nothing here asked for it: no route handles a CORS preflight, no route
       * sets CORS headers, and nothing outside the app calls it. It only means
       * any site's script may read Blossom's HTML, so it is turned off.
       *
       * The web manifest is deliberately left alone. It is a public file and
       * restricting it risks the install prompt for no benefit.
       */
      {
        source: "/((?!manifest\\.webmanifest).*)",
        headers: [{ key: "Access-Control-Allow-Origin", value: "" }],
      },
    ];
  },
};

export default nextConfig;

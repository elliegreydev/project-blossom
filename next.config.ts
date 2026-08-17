import type { NextConfig } from "next";

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
};

export default nextConfig;

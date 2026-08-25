import type { Metadata, Viewport } from "next";
import { Manrope, Inter } from "next/font/google";
import AccessibilityEffects from "@/components/AccessibilityEffects";
import SyncCoordinator from "@/components/SyncCoordinator";
import ServiceWorkerRegistrar from "@/components/ServiceWorkerRegistrar";
import PersistentStorageRequest from "@/components/PersistentStorageRequest";
import ThemeSync from "@/components/ThemeSync";
import { SPLASH_SIZES, splashDims, splashMedia } from "@/lib/appleSplash";
import "./globals.css";

const manrope = Manrope({
  weight: ["600", "700"],
  subsets: ["latin"],
  variable: "--font-manrope",
  display: "swap",
});

const inter = Inter({
  weight: ["400", "500", "600"],
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

// Where relative metadata URLs resolve from. Next throws at build time if a
// relative og:image has no base, and getting it wrong is worse than useless:
// a card pointing at the wrong host renders as a broken image everywhere the
// link is shared. The dev site sets this to its own domain so its previews
// aren't quietly served from production.
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://projectblossom.net";

// Deliberately says nothing about who Blossom is for. See the note in
// opengraph-image.tsx: a preview card appears wherever the link is pasted,
// and the person pasting it doesn't choose where that is.
const TAGLINE = "A gentle companion for your journey.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  applicationName: "Project Blossom",
  title: {
    default: "Project Blossom",
    template: "%s · Blossom",
  },
  description: TAGLINE,
  openGraph: {
    type: "website",
    siteName: "Project Blossom",
    title: "Project Blossom",
    description: TAGLINE,
    url: "/",
    locale: "en_GB",
  },
  twitter: {
    card: "summary_large_image",
    title: "Project Blossom",
    description: TAGLINE,
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Blossom",
    startupImage: SPLASH_SIZES.map((size) => ({
      url: `/splash/${splashDims(size)}`,
      media: splashMedia(size),
    })),
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#fcfaFc",
  colorScheme: "light dark",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // The boot script below stamps data-theme/data-appearance on <html> before
    // React hydrates - that's the point, it stops a light flash. React can't
    // know about it, so the mismatch is expected and suppressed here.
    <html lang="en-GB" className={`${manrope.variable} ${inter.variable}`} suppressHydrationWarning>
      <head>
        {/*
          Applies the saved theme before anything paints. Reading it from
          Dexie would be async, and the app would flash Classic-light for a
          frame or two on every open - which is exactly the jolt someone
          using a dark or discreet theme doesn't want. The database stays the
          source of truth; localStorage is only a cache for this moment.
        */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{var d=document.documentElement," +
              "t=localStorage.getItem('blossom-theme')," +
              "a=localStorage.getItem('blossom-appearance')," +
              "h=localStorage.getItem('blossom-hue');" +
              "if(t)d.dataset.theme=t;" +
              "if(a){d.dataset.appearance=a;d.style.colorScheme=a==='system'?'light dark':a;}" +
              // Their chosen hue has to land in the same frame as the theme,
              // or picking a colour means seeing the default purple flash
              // first on every single open.
              "if(h)d.style.setProperty('--accent-hue',h);" +
              "}catch(e){}",
          }}
        />
      </head>
      <body>
        <AccessibilityEffects />
        <ServiceWorkerRegistrar />
        <PersistentStorageRequest />
        <ThemeSync />
        {children}
        <SyncCoordinator />
      </body>
    </html>
  );
}

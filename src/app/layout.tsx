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

export const metadata: Metadata = {
  applicationName: "Project Blossom",
  title: {
    default: "Project Blossom",
    template: "%s · Blossom",
  },
  description: "A gentle companion for your journey.",
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
              "a=localStorage.getItem('blossom-appearance');" +
              "if(t)d.dataset.theme=t;" +
              "if(a){d.dataset.appearance=a;d.style.colorScheme=a==='system'?'light dark':a;}" +
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

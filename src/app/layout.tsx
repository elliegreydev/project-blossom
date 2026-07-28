import type { Metadata, Viewport } from "next";
import { Manrope, Inter } from "next/font/google";
import AccessibilityEffects from "@/components/AccessibilityEffects";
import SyncCoordinator from "@/components/SyncCoordinator";
import ServiceWorkerRegistrar from "@/components/ServiceWorkerRegistrar";
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
    <html lang="en-GB" className={`${manrope.variable} ${inter.variable}`}>
      <body>
        <AccessibilityEffects />
        <ServiceWorkerRegistrar />
        {children}
        <SyncCoordinator />
      </body>
    </html>
  );
}

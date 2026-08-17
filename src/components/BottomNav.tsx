"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./BottomNav.module.css";

const ICON_PROPS = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

const TABS = [
  {
    href: "/",
    label: "Home",
    icon: (
      <svg {...ICON_PROPS} className={styles.icon}>
        <path d="M4 11.5 12 4l8 7.5" />
        <path d="M6 10v9a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-9" />
      </svg>
    ),
  },
  {
    href: "/journey",
    label: "Journey",
    icon: (
      <svg {...ICON_PROPS} className={styles.icon}>
        <circle cx="12" cy="5" r="1.6" />
        <circle cx="12" cy="12" r="1.6" />
        <circle cx="12" cy="19" r="1.6" />
        <path d="M12 6.6v3.8M12 13.6v3.8" />
      </svg>
    ),
  },
  {
    href: "/track",
    label: "Track",
    icon: (
      <svg {...ICON_PROPS} className={styles.icon}>
        <rect x="5" y="4" width="14" height="17" rx="2.2" />
        <path d="M9 3.5h6M8.5 11.5l2 2 4-4.4M8.5 17h7" />
      </svg>
    ),
  },
  {
    href: "/calendar",
    label: "Calendar",
    icon: (
      <svg {...ICON_PROPS} className={styles.icon}>
        <rect x="4" y="5.5" width="16" height="14.5" rx="2.2" />
        <path d="M4 10h16M8 3.5v3M16 3.5v3" />
      </svg>
    ),
  },
  {
    href: "/info",
    label: "Info",
    icon: (
      <svg {...ICON_PROPS} className={styles.icon}>
        <circle cx="12" cy="12" r="8.5" />
        <path d="M12 11v5.5M12 7.8v.6" />
      </svg>
    ),
  },
  {
    href: "/settings",
    label: "Settings",
    icon: (
      // A cog, not a sun. The difference is entirely in the teeth: a sun's rays
      // are thin, rounded and detached from the disc, so the old icon (a dot
      // with eight radiating capped lines) read as a brightness control to
      // everyone who saw it. Teeth are blunt, blocky and joined to the rim, and
      // the middle is a hole rather than a dot.
      <svg {...ICON_PROPS} className={styles.icon}>
        <circle cx="12" cy="12" r="6.4" />
        <circle cx="12" cy="12" r="2.6" />
        <path
          strokeWidth={2.8}
          strokeLinecap="butt"
          d="M18.4 12 20.5 12M16.53 16.53 18.01 18.01M12 18.4 12 20.5M7.47 16.53 5.99 18.01M5.6 12 3.5 12M7.47 7.47 5.99 5.99M12 5.6 12 3.5M16.53 7.47 18.01 5.99"
        />
      </svg>
    ),
  },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className={styles.nav} aria-label="Primary navigation">
      <div className={styles.brand}>
        <Image src="/icon-192.png" width={38} height={38} alt="" priority />
        <span>Blossom</span>
      </div>
      <div className={styles.items}>
        {TABS.map((tab) => {
          const active = tab.href === "/" ? pathname === "/" : pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`${styles.item} ${active ? styles.active : ""}`}
              aria-current={active ? "page" : undefined}
            >
              {tab.icon}
              <span className={styles.label}>{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

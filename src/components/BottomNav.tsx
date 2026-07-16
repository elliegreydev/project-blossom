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
    href: "/settings",
    label: "Settings",
    icon: (
      <svg {...ICON_PROPS} className={styles.icon}>
        <circle cx="12" cy="12" r="3" />
        <path d="M12 4v2M12 18v2M4 12h2M18 12h2M6.3 6.3l1.4 1.4M16.3 16.3l1.4 1.4M6.3 17.7l1.4-1.4M16.3 7.7l1.4-1.4" />
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

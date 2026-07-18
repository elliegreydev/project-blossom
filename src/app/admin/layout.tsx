"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import styles from "./admin.module.css";

const NAV = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/resources", label: "Resources" },
  { href: "/admin/support", label: "Support" },
  { href: "/admin/ideas", label: "Ideas" },
  { href: "/admin/analytics", label: "Analytics" },
  { href: "/admin/operations", label: "Operations" },
  { href: "/admin/audit", label: "Audit" },
  { href: "/admin/notices", label: "Notices" },
  { href: "/admin/roadmap", label: "Roadmap" },
];

// Administrator and above only - managing the team and reviewing
// applications are more sensitive than anything else in the admin panel.
const ADMIN_ONLY_NAV = [
  { href: "/admin/team", label: "Team" },
  { href: "/admin/applications", label: "Applications" },
  { href: "/admin/beta", label: "Beta" },
];
const ADMINISTRATOR_RANK = 80;

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [status, setStatus] = useState<"checking" | "denied" | "ok">("checking");
  const [rank, setRank] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();

    async function check() {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        if (!cancelled) setStatus("denied");
        return;
      }
      const { data, error } = await supabase.rpc("is_staff");
      if (cancelled) return;
      setStatus(!error && data === true ? "ok" : "denied");
      if (!error && data === true) {
        const { data: rankData } = await supabase.rpc("my_staff_rank");
        if (!cancelled && typeof rankData === "number") setRank(rankData);
      }
    }

    void check();
    return () => {
      cancelled = true;
    };
  }, []);

  if (status === "checking") {
    return <div className={styles.loadingScreen}>Checking access…</div>;
  }

  if (status === "denied") {
    return (
      <div className={styles.page}>
        <div className={styles.shell}>
          <h1 className={styles.title}>Not authorized</h1>
          <p className={styles.subtitle}>
            This area is staff-only. If you think this is a mistake, sign in with your staff
            account first.
          </p>
          <Link href="/account" className={styles.secondaryButton} style={{ width: "fit-content" }}>
            Go to account
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.shell}>
        <nav className={styles.nav}>
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`${styles.navLink} ${pathname === item.href ? styles.active : ""}`}
            >
              {item.label}
            </Link>
          ))}
          {rank >= ADMINISTRATOR_RANK &&
            ADMIN_ONLY_NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`${styles.navLink} ${pathname === item.href ? styles.active : ""}`}
              >
                {item.label}
              </Link>
            ))}
          <button
            type="button"
            className={styles.navLink}
            onClick={() => router.push("/")}
          >
            Back to Blossom
          </button>
        </nav>
        {children}
      </div>
    </div>
  );
}

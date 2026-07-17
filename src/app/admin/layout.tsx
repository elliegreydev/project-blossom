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
  { href: "/admin/analytics", label: "Analytics" },
  { href: "/admin/operations", label: "Operations" },
  { href: "/admin/audit", label: "Audit" },
  { href: "/admin/notices", label: "Notices" },
  { href: "/admin/roadmap", label: "Roadmap" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [status, setStatus] = useState<"checking" | "denied" | "ok">("checking");

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

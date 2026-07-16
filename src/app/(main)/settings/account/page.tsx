"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// The real account/sync UI lives at /account (its own top-level route, since
// sign-in shouldn't be wrapped in the tab shell). This redirect just keeps
// the Settings landing page's "Account & sync" row working.
export default function AccountSettingsRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/account");
  }, [router]);

  return null;
}

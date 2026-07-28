"use client";

import { useEffect } from "react";

// Registers the service worker unconditionally, on every visit - not just
// when someone opts into push notifications. An installed PWA with no
// active service worker is a fragile install on Android (the WebAPK wrapper
// periodically re-checks that a site still qualifies as a real PWA), which
// is the most likely cause of installed icons vanishing after a deploy.
export default function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Best-effort - push notifications simply won't be available if this
      // fails, nothing else in the app depends on it.
    });
  }, []);

  return null;
}

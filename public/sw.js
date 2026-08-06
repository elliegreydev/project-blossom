// Service worker: real (server-sent) push delivery plus offline support.
//
// Push - see src/app/api/cron/send-reminders and src/lib/push.ts. Foreground
// reminders (src/components/LocalReminderService) don't need a service worker
// at all. Registered unconditionally on every visit (see ServiceWorkerRegistrar
// in the root layout) rather than only when someone opts into push - an
// installed PWA with no active service worker is a fragile install on Android,
// and skipWaiting/clients.claim below make sure each deploy's new worker takes
// over immediately instead of leaving an old one in control until every tab is
// closed and reopened.
//
// Offline - Blossom is local-first: every entry lives in IndexedDB on the
// device. Without the caching below the app still couldn't *open* without a
// network, which is the wrong way round - someone's whole journal sitting on
// their phone, unreachable on a train. Google Play also tests offline during
// review.

const VERSION = "v2";
const SHELL_CACHE = `blossom-shell-${VERSION}`;
const ASSET_CACHE = `blossom-assets-${VERSION}`;
const SHELL_URL = "/";

// Minimal last-resort page, only seen if even the cached shell is missing
// (i.e. offline on the very first visit). Inline so it can't itself 404.
const OFFLINE_FALLBACK = `<!doctype html>
<html lang="en-GB"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Blossom</title>
<style>
  body{margin:0;min-height:100vh;display:grid;place-items:center;text-align:center;
    padding:24px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
    background:#fcfafc;color:#2b1f33}
  @media (prefers-color-scheme:dark){body{background:#1b151f;color:#efeaf2}}
  p{color:#6f6577;font-size:14px;line-height:1.6;max-width:30ch}
  @media (prefers-color-scheme:dark){p{color:#a9a0b2}}
</style></head>
<body><div>
  <h1 style="font-size:19px;margin:0 0 8px">You're offline</h1>
  <p>Blossom needs to load once while you're connected. After that it works without a signal.</p>
</div></body></html>`;

self.addEventListener("install", (event) => {
  // Warm the shell so a cold start with no network still boots the app.
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.add(new Request(SHELL_URL, { cache: "reload" })))
      .catch(() => {
        // Installing offline is fine - the shell gets cached on the first
        // successful navigation instead.
      })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keep = new Set([SHELL_CACHE, ASSET_CACHE]);
      const names = await caches.keys();
      const stale = names.filter((n) => n.startsWith("blossom-") && !keep.has(n));
      await Promise.all(stale.map((n) => caches.delete(n)));
      await self.clients.claim();

      // A page that was already open keeps running whatever JavaScript it
      // loaded, possibly weeks old, while this worker serves it the new
      // deploy's chunks. UpdatePrompt handles that from inside the app - but
      // it only exists in builds that already have it, so it can't rescue
      // anyone still on an older one. This can: the browser re-fetches sw.js
      // independently of the page.
      //
      // Only backgrounded pages are reloaded. Someone with the app in front of
      // them might be mid-sentence in a journal entry, and older builds have no
      // draft saving to catch it (see src/lib/drafts.ts) - so we never pull the
      // floor out from under a visible window. They get the new build when they
      // come back to it, or on their next navigation.
      //
      // `stale.length` guards a first install: on a brand new device there is
      // no old build to escape and a reload would be pure noise.
      if (stale.length === 0) return;

      const clients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      await Promise.all(
        clients.map(async (client) => {
          if (client.visibilityState === "visible") return;
          try {
            await client.navigate(client.url);
          } catch {
            // Cross-origin or otherwise not navigable - nothing to do, and it
            // must not stop the other clients being updated.
          }
        })
      );
    })()
  );
});

// Next.js fingerprints these, so a given URL's contents never change - safe to
// serve straight from cache and cheap to keep.
function isImmutableAsset(url) {
  return url.pathname.startsWith("/_next/static/");
}

function isCacheableImage(url) {
  return /^\/(icon|apple-icon|icon-192|icon-512|icon-maskable-512)[\w.-]*\.(png|svg|ico)$/.test(url.pathname);
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Cross-origin (Supabase, push endpoints) is never our business to cache.
  if (url.origin !== self.location.origin) return;

  // Never cache API responses. They're per-user, frequently sensitive, and a
  // stale answer is worse than no answer. Same for anything auth-related.
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/auth/")) return;

  // Next.js sends RSC payloads for client-side navigation; those can carry
  // rendered user data, so they stay network-only too.
  if (url.searchParams.has("_rsc")) return;

  if (isImmutableAsset(url) || isCacheableImage(url)) {
    event.respondWith(cacheFirst(request));
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(navigationHandler(request));
  }
});

async function cacheFirst(request) {
  const cache = await caches.open(ASSET_CACHE);
  const hit = await cache.match(request);
  if (hit) return hit;
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch (error) {
    // A missing chunk offline is unrecoverable here; let it surface rather
    // than pretending with an empty 200.
    throw error;
  }
}

// Network-first so a fresh deploy always wins while online, falling back
// through the previously-cached shell to the inline page above.
async function navigationHandler(request) {
  const cache = await caches.open(SHELL_CACHE);
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(SHELL_URL, response.clone());
    return response;
  } catch {
    const cachedShell = await cache.match(SHELL_URL);
    if (cachedShell) return cachedShell;
    return new Response(OFFLINE_FALLBACK, {
      status: 200,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }
}

self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = {};
  }

  const title = payload.title || "Blossom";
  event.waitUntil(
    self.registration.showNotification(title, {
      body: payload.body || "",
      tag: payload.tag,
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      data: { url: payload.url || "/" },
      actions: Array.isArray(payload.actions) ? payload.actions : undefined,
    })
  );
});

// "Mark as taken" / "Snooze" - see src/app/api/reminders/action. Both just
// fire the request in the background and close the notification; neither
// needs to open or focus a window.
function sendReminderAction(key, action) {
  return fetch("/api/reminders/action", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key, action }),
  }).catch(() => {
    // Best-effort - if this fails (offline, session expired), the reminder
    // just re-nags again later like normal instead of erroring visibly.
  });
}

self.addEventListener("notificationclick", (event) => {
  const key = event.notification.tag;

  if (event.action === "taken" || event.action === "snooze") {
    event.notification.close();
    event.waitUntil(sendReminderAction(key, event.action));
    return;
  }

  event.notification.close();
  const url = event.notification.data?.url || "/";
  const isSameOrigin = url.startsWith("/") || url.startsWith(self.location.origin);

  // Cross-origin targets (e.g. the staff app) can't reuse an existing client
  // via navigate() - the Clients API only allows navigating same-origin
  // clients - so just open a new window for those instead.
  if (!isSameOrigin) {
    event.waitUntil(self.clients.openWindow(url));
    return;
  }

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return self.clients.openWindow(url);
    })
  );
});

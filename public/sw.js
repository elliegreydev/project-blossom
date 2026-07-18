// Minimal service worker, only for real (server-sent) push delivery to
// signed-in/synced accounts - see src/app/api/cron/send-reminders and
// src/lib/push.ts. Foreground reminders (src/components/LocalReminderService)
// don't need a service worker at all.

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

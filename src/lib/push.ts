import { reportClientError } from "@/lib/clientErrorReport";
import { createClient } from "@/lib/supabase/client";

// Real, server-triggered push (see src/app/api/cron/send-reminders) - only
// reaches signed-in, sync-enabled accounts. Foreground-only reminders for
// everyone else live in src/lib/reminders.ts / LocalReminderService and don't
// touch any of this.

export function isPushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const base64Safe = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64Safe);
  return Uint8Array.from([...raw].map((char) => char.charCodeAt(0)));
}

export async function getExistingPushSubscription(): Promise<PushSubscription | null> {
  if (!isPushSupported()) return null;
  const registration = await navigator.serviceWorker.getRegistration();
  if (!registration) return null;
  return registration.pushManager.getSubscription();
}

export type SubscribeResult = "subscribed" | "unsupported" | "permission-denied";

export async function subscribeToPush(userId: string): Promise<SubscribeResult> {
  if (!isPushSupported()) return "unsupported";

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return "permission-denied";

  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!publicKey) return "unsupported";

  let subscription: PushSubscription;
  try {
    const registration = await navigator.serviceWorker.register("/sw.js");
    await navigator.serviceWorker.ready;

    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
    });
  } catch (error) {
    // Someone has said yes to notifications and the browser still couldn't
    // set one up. Rethrown so the settings screen can say so rather than
    // quietly showing the toggle as on.
    reportClientError("turning on reminder notifications", error, { severity: "warning" });
    throw error;
  }

  const json = subscription.toJSON();
  const { error } = await createClient()
    .from("push_subscriptions")
    .upsert(
      {
        user_id: userId,
        endpoint: json.endpoint,
        p256dh: json.keys?.p256dh,
        auth: json.keys?.auth,
      },
      { onConflict: "endpoint" }
    );
  if (error) {
    // The worse half of the two. The browser is subscribed but the server has
    // no row for it, so the reminder cron will never find this device and the
    // person will wait for a dose reminder that was never going to come.
    reportClientError("turning on reminder notifications", error);
    throw error;
  }

  return "subscribed";
}

export async function unsubscribeFromPush(): Promise<void> {
  const subscription = await getExistingPushSubscription();
  if (!subscription) return;
  const endpoint = subscription.endpoint;
  await subscription.unsubscribe();
  await createClient().from("push_subscriptions").delete().eq("endpoint", endpoint);
}

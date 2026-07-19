import { createClient as createServiceClient } from "@supabase/supabase-js";
import webpush from "web-push";

// Server-only. Sends a push notification to every subscribed device for a
// given set of user ids, using the same VAPID/web-push setup and dead-
// endpoint cleanup as src/app/api/cron/send-reminders/route.ts. That route
// keeps its own inline copy (working code, left alone) - this is for new
// send points like staff notifications.
export interface PushPayload {
  title: string;
  body: string;
  tag?: string;
  url?: string;
}

function isDeadEndpointError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "statusCode" in error &&
    (error.statusCode === 404 || error.statusCode === 410)
  );
}

export async function sendPushToUsers(userIds: string[], payload: PushPayload): Promise<{ sent: number }> {
  if (userIds.length === 0) return { sent: 0 };

  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
  const vapidSubject = process.env.VAPID_SUBJECT;
  if (!vapidPublicKey || !vapidPrivateKey || !vapidSubject) return { sent: 0 };
  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

  const supabase = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: subscriptions } = await supabase
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth")
    .in("user_id", userIds);
  if (!subscriptions || subscriptions.length === 0) return { sent: 0 };

  const body = JSON.stringify({ title: payload.title, body: payload.body, tag: payload.tag, url: payload.url ?? "/" });
  let sent = 0;
  const deadEndpoints = new Set<string>();

  for (const sub of subscriptions) {
    try {
      await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, body);
      sent++;
    } catch (error) {
      if (isDeadEndpointError(error)) deadEndpoints.add(sub.endpoint);
    }
  }

  if (deadEndpoints.size > 0) {
    await supabase.from("push_subscriptions").delete().in("endpoint", [...deadEndpoints]);
  }

  return { sent };
}

// Every account currently flagged beta_tester = true. Revoked/never-tester
// accounts are naturally excluded since this reads the live column, not a
// cached list.
export async function activeBetaTesterUserIds(): Promise<string[]> {
  const supabase = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  const { data } = await supabase.from("profiles").select("id").eq("beta_tester", true);
  return (data ?? []).map((row) => row.id as string);
}

// Fetches the user ids of every staff member at or above a rank threshold.
// Staff are matched by email against auth.users, same join as is_staff().
export async function staffUserIdsAtRank(minRank: number): Promise<string[]> {
  const supabase = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  const { data: staffRows } = await supabase.from("staff_emails").select("email, role");
  if (!staffRows) return [];

  const rank = (role: string) =>
    ({ owner: 100, administrator: 80, manager: 60, moderator: 40, trial_moderator: 20 }[role] ?? 0);
  const emails = staffRows.filter((row) => rank(row.role) >= minRank).map((row) => row.email);
  if (emails.length === 0) return [];

  const { data: usersPage } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  const users = usersPage?.users ?? [];
  return users.filter((user) => user.email && emails.includes(user.email)).map((user) => user.id);
}

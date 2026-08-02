import { NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

// Write-capable staff-management feed for Grey Studios HQ. Separate secret
// from the read-only hq-stats connector on purpose. Runs with the service
// role, which bypasses staff_emails' RLS entirely, so the safety rules
// Blossom's own RLS enforces (staff_roles.sql) are re-implemented here in
// code instead: Owner can never be granted or touched through this route,
// even though Blossom's own native admin UI does allow an Owner to promote
// someone else to Owner - HQ deliberately stays more conservative than that.
const EDITABLE_ROLES = ["administrator", "manager", "moderator", "trial_moderator"];

function authorised(request: Request) {
  const expected = process.env.HQ_ADMIN_SECRET;
  if (!expected) return false;
  return request.headers.get("x-hq-admin-secret") === expected;
}

function serviceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createServiceClient(url, key);
}

export async function GET(request: Request) {
  if (!authorised(request)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const supabase = serviceClient();
  if (!supabase) return NextResponse.json({ error: "cloud not configured" }, { status: 503 });

  const { data, error } = await supabase
    .from("staff_emails")
    .select("email, role, added_at")
    .order("added_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ staff: data ?? [] });
}

export async function POST(request: Request) {
  if (!authorised(request)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const supabase = serviceClient();
  if (!supabase) return NextResponse.json({ error: "cloud not configured" }, { status: 503 });

  const body = await request.json().catch(() => ({}));
  const { action, email, role, actorEmail } = body;

  if (action !== "setRole") {
    return NextResponse.json({ error: "unknown action" }, { status: 400 });
  }
  if (typeof email !== "string" || !email.trim() || !email.includes("@")) {
    return NextResponse.json({ error: "bad email" }, { status: 400 });
  }
  const targetEmail = email.trim().toLowerCase();

  const { data: existing } = await supabase
    .from("staff_emails")
    .select("role")
    .eq("email", targetEmail)
    .maybeSingle();

  if (existing?.role === "owner") {
    return NextResponse.json({ error: "can't change the owner" }, { status: 403 });
  }

  if (role === "none") {
    if (!existing) return NextResponse.json({ ok: true, email: targetEmail, role: "none" });
    const { error } = await supabase.from("staff_emails").delete().eq("email", targetEmail);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, email: targetEmail, role: "none" });
  }

  if (!EDITABLE_ROLES.includes(role)) {
    return NextResponse.json({ error: "bad role (owner is set directly in the database only)" }, { status: 400 });
  }

  const { error } = await supabase
    .from("staff_emails")
    .upsert({ email: targetEmail, role }, { onConflict: "email" });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // staff_emails already has an automatic audit trigger (staff_activity_log)
  // that fires regardless of who writes, service role included - it just
  // can't attribute a real actor since auth.uid() is null for this call, so
  // it records the change with a null actor. Note who really triggered it
  // via HQ separately, in HQ's own Audit Log (actorEmail is passed for that).
  void actorEmail;

  return NextResponse.json({ ok: true, email: targetEmail, role });
}

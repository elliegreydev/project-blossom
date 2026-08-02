import { NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

// Read-only queue feed (GET) + write-capable ticket handling (POST) for Grey
// Studios HQ. GET without a ticketId stays metadata-only (see the original
// comment below); GET with a ticketId returns the real message thread so a
// reply can be composed with full context. POST covers claim/unclaim/reply/
// resolve/reopen - everyday ticket handling. The account-access-code flow
// (request/verify/revoke) is deliberately NOT exposed here - out of scope
// for now, stays exclusive to the Blossom Staff app.
function authorisedRead(request: Request) {
  const expected = process.env.HQ_STATS_SECRET;
  return !!expected && request.headers.get("x-hq-stats-secret") === expected;
}

function authorisedWrite(request: Request) {
  const expected = process.env.HQ_ADMIN_SECRET;
  return !!expected && request.headers.get("x-hq-admin-secret") === expected;
}

function serviceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createServiceClient(url, key);
}

async function resolveByEmail(admin: NonNullable<ReturnType<typeof serviceClient>>, email: string) {
  let page = 1;
  while (page <= 5) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error || !data?.users?.length) break;
    const match = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (match) return match.id;
    if (data.users.length < 200) break;
    page += 1;
  }
  return null;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const ticketId = url.searchParams.get("ticketId");

  if (ticketId) {
    if (!authorisedWrite(request)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
    const supabase = serviceClient();
    if (!supabase) return NextResponse.json({ error: "cloud not configured" }, { status: 503 });

    const { data: messages, error } = await supabase
      .from("support_ticket_messages")
      .select("id, sender_id, body, is_system, created_at")
      .eq("ticket_id", ticketId)
      .eq("visible_to_user_only", false)
      .order("created_at", { ascending: true });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const senderIds = Array.from(new Set((messages ?? []).map((m) => m.sender_id)));
    const { data: profiles } = senderIds.length
      ? await supabase.from("profiles").select("id, display_name").in("id", senderIds)
      : { data: [] as { id: string; display_name: string | null }[] };
    const nameById = new Map((profiles ?? []).map((p) => [p.id, p.display_name]));

    return NextResponse.json({
      messages: (messages ?? []).map((m) => ({
        id: m.id,
        senderName: nameById.get(m.sender_id) ?? "Staff member",
        body: m.body,
        isSystem: m.is_system,
        createdAt: m.created_at,
      })),
    });
  }

  if (!authorisedRead(request)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const supabase = serviceClient();
  if (!supabase) return NextResponse.json({ error: "cloud not configured" }, { status: 503 });

  const { data: tickets, error } = await supabase
    .from("support_tickets")
    .select("id, category, status, claimed_by, created_at, updated_at, resolved_at")
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) return NextResponse.json({ error: "read failed" }, { status: 500 });

  const claimerIds = Array.from(new Set((tickets ?? []).map((t) => t.claimed_by).filter((id): id is string => !!id)));
  const { data: claimers } = claimerIds.length
    ? await supabase.from("profiles").select("id, display_name").in("id", claimerIds)
    : { data: [] as { id: string; display_name: string | null }[] };
  const nameById = new Map((claimers ?? []).map((c) => [c.id, c.display_name]));

  const ticketIds = (tickets ?? []).map((t) => t.id);
  const { data: messageCounts } = ticketIds.length
    ? await supabase
        .from("support_ticket_messages")
        .select("ticket_id, visible_to_user_only")
        .in("ticket_id", ticketIds)
        .eq("visible_to_user_only", false)
    : { data: [] as { ticket_id: string }[] };
  const countByTicket = new Map<string, number>();
  for (const row of messageCounts ?? []) {
    countByTicket.set(row.ticket_id, (countByTicket.get(row.ticket_id) ?? 0) + 1);
  }

  return NextResponse.json({
    tickets: (tickets ?? []).map((t) => ({
      id: t.id,
      category: t.category,
      status: t.status,
      claimedByName: t.claimed_by ? (nameById.get(t.claimed_by) ?? "Staff member") : null,
      messageCount: countByTicket.get(t.id) ?? 0,
      createdAt: t.created_at,
      updatedAt: t.updated_at,
      resolvedAt: t.resolved_at,
    })),
    asOf: new Date().toISOString(),
  });
}

export async function POST(request: Request) {
  if (!authorisedWrite(request)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const supabase = serviceClient();
  if (!supabase) return NextResponse.json({ error: "cloud not configured" }, { status: 503 });

  const body = await request.json().catch(() => ({}));
  const { action, ticketId, actorEmail } = body;

  if (typeof ticketId !== "string" || !ticketId) {
    return NextResponse.json({ error: "missing ticketId" }, { status: 400 });
  }
  if (typeof actorEmail !== "string" || !actorEmail.trim()) {
    return NextResponse.json({ error: "missing actorEmail" }, { status: 400 });
  }
  const actorId = await resolveByEmail(supabase, actorEmail.trim());
  if (!actorId) {
    return NextResponse.json({ error: "actor not found - the signed-in HQ user needs a matching Blossom account" }, { status: 400 });
  }

  if (action === "claim") {
    const { data: ticket } = await supabase.from("support_tickets").select("claimed_by").eq("id", ticketId).maybeSingle();
    if (!ticket) return NextResponse.json({ error: "ticket not found" }, { status: 404 });
    if (ticket.claimed_by && ticket.claimed_by !== actorId) {
      return NextResponse.json({ error: "already claimed by someone else" }, { status: 409 });
    }
    const { error } = await supabase
      .from("support_tickets")
      .update({ claimed_by: actorId, claimed_at: new Date().toISOString() })
      .eq("id", ticketId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (action === "unclaim") {
    const { error } = await supabase.from("support_tickets").update({ claimed_by: null, claimed_at: null }).eq("id", ticketId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (action === "reply") {
    const messageBody = typeof body.message === "string" ? body.message.trim() : "";
    if (!messageBody) return NextResponse.json({ error: "message required" }, { status: 400 });
    const { error } = await supabase.from("support_ticket_messages").insert({
      ticket_id: ticketId,
      sender_id: actorId,
      body: messageBody.slice(0, 4000),
      is_system: false,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (action === "resolve") {
    const { error } = await supabase
      .from("support_tickets")
      .update({ status: "resolved", resolved_at: new Date().toISOString() })
      .eq("id", ticketId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (action === "reopen") {
    const { error } = await supabase.from("support_tickets").update({ status: "open", resolved_at: null }).eq("id", ticketId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "unknown action" }, { status: 400 });
}

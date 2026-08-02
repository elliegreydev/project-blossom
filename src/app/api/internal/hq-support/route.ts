import { NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

// Read-only support-queue feed for Grey Studios HQ. Deliberately metadata
// only (category, status, who's claimed it, how stale) - never ticket
// message content. Blossom's own architecture goes out of its way to keep
// user disclosures gated behind active participation (the access-code
// system in support_tickets.sql); pulling full conversations into a second
// system would undercut that, and HQ doesn't need message bodies to show
// "3 open, 1 unclaimed for 2 days." Same secret tier as hq-stats - this
// isn't a more sensitive read than the user count already exposed there.
export async function GET(request: Request) {
  const expected = process.env.HQ_STATS_SECRET;
  if (!expected) {
    return NextResponse.json({ error: "not configured" }, { status: 503 });
  }

  const provided = request.headers.get("x-hq-stats-secret");
  if (provided !== expected) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    return NextResponse.json({ error: "cloud not configured" }, { status: 503 });
  }

  const supabase = createServiceClient(url, serviceRoleKey);

  const { data: tickets, error } = await supabase
    .from("support_tickets")
    .select("id, category, status, claimed_by, created_at, updated_at, resolved_at")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    return NextResponse.json({ error: "read failed" }, { status: 500 });
  }

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

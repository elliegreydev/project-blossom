import { NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

/**
 * Generic staff-admin connector for Grey Studios HQ.
 *
 * Blossom's staff app has no API of its own - it queries Supabase straight from
 * server components - so unlike FRT there was nothing for HQ to proxy. Rather
 * than one bespoke route per area, this is a single section-dispatched surface
 * that mirrors the shape FRT already exposes, so HQ's existing proxy machinery
 * works against it unchanged.
 *
 * Two tiers, same as the existing hq-support connector:
 *   x-hq-stats-secret  -> read
 *   x-hq-admin-secret  -> write
 * They are deliberately separate secrets, so a read-only integration can never
 * be escalated into a write one by reusing its credential.
 *
 * Writes also carry x-hq-actor-email, resolved here to a real Blossom profile
 * so anything recorded is attributed to the actual person rather than to "HQ".
 */

const READ_SECTIONS = [
  "issues",
  "incidents",
  "notes",
  "applications",
  "beta",
  "roadmap",
  "docs",
  "resources",
  "notices",
  "team",
  "onboarding",
  "activity",
  "feedback",
  "messages",
  "emails",
] as const;

type Section = (typeof READ_SECTIONS)[number];

function isSection(value: string): value is Section {
  return (READ_SECTIONS as readonly string[]).includes(value);
}

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

type Admin = NonNullable<ReturnType<typeof serviceClient>>;

async function resolveByEmail(admin: Admin, email: string) {
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

/**
 * Attaches display names to rows that carry a user id, so HQ shows people not
 * UUIDs. Staff live in staff_profiles keyed by user_id; `profiles` is the app's
 * end-user table and mostly won't contain them, so it's only a fallback.
 */
async function withNames<T extends Record<string, unknown>>(admin: Admin, rows: T[], fields: string[]) {
  const ids = new Set<string>();
  for (const row of rows) {
    for (const field of fields) {
      const value = row[field];
      if (typeof value === "string" && value) ids.add(value);
    }
  }
  if (!ids.size) return rows;
  const idList = [...ids];
  const [{ data: staff }, { data: profiles }] = await Promise.all([
    admin.from("staff_profiles").select("user_id, display_name, email").in("user_id", idList),
    admin.from("profiles").select("id, display_name").in("id", idList),
  ]);
  const nameById = new Map<string, string | null>();
  for (const p of profiles ?? []) nameById.set(p.id, p.display_name);
  // Staff names win over end-user ones for the same id.
  for (const s of staff ?? []) nameById.set(s.user_id, s.display_name || s.email);
  return rows.map((row) => {
    const named: Record<string, unknown> = { ...row };
    for (const field of fields) {
      const value = row[field];
      if (typeof value === "string" && value) named[`${field}_name`] = nameById.get(value) ?? "Staff member";
    }
    return named as T;
  });
}

async function readSection(admin: Admin, section: Section) {
  switch (section) {
    case "issues": {
      const [{ data: items }, { data: comments }] = await Promise.all([
        admin
          .from("staff_issues")
          .select("id,title,description,severity,status,reported_by,assigned_to,created_at,updated_at")
          .order("created_at", { ascending: false })
          .limit(200),
        admin.from("staff_issue_comments").select("id,issue_id,body,created_at").order("created_at", { ascending: true }).limit(500),
      ]);
      return { items: await withNames(admin, items ?? [], ["reported_by", "assigned_to"]), comments: comments ?? [] };
    }
    case "incidents": {
      const { data } = await admin
        .from("staff_incidents")
        .select("id,title,description,impact,resolution,lessons_learned,occurred_at,discovered_at,resolved_at")
        .order("occurred_at", { ascending: false })
        .limit(100);
      return { items: data ?? [] };
    }
    case "notes": {
      const { data } = await admin
        .from("staff_handoff_notes")
        .select("id,body,pinned,created_by,created_at,resolved_at")
        .order("created_at", { ascending: false })
        .limit(200);
      return { items: await withNames(admin, data ?? [], ["created_by"]) };
    }
    case "applications": {
      const { data } = await admin
        .from("staff_applications")
        .select("id,name,email,message,area_of_interest,status,review_note,created_at")
        .order("created_at", { ascending: false })
        .limit(200);
      return { items: data ?? [] };
    }
    case "beta": {
      const [{ data: knownIssues }, { data: codes }, { data: focus }] = await Promise.all([
        admin.from("beta_known_issues").select("id,title,note,resolved,created_at").order("created_at", { ascending: false }).limit(100),
        admin.from("beta_invite_codes").select("*").order("created_at", { ascending: false }).limit(100),
        admin.from("beta_focus_note").select("note").limit(1).maybeSingle(),
      ]);
      return { knownIssues: knownIssues ?? [], codes: codes ?? [], focus: focus?.note ?? null };
    }
    case "roadmap": {
      const { data } = await admin
        .from("product_roadmap")
        .select("id,title,description,stage,status,sort_order,is_recent")
        .order("sort_order", { ascending: true })
        .limit(200);
      return { items: data ?? [] };
    }
    case "docs": {
      const { data } = await admin
        .from("staff_docs")
        .select("id,title,category,body,updated_at")
        .order("updated_at", { ascending: false })
        .limit(100);
      return { items: data ?? [] };
    }
    case "resources": {
      const { data } = await admin.from("region_resources").select("*").order("created_at", { ascending: false }).limit(300);
      return { items: data ?? [] };
    }
    case "notices": {
      const { data } = await admin.from("app_notices").select("*").order("created_at", { ascending: false }).limit(100);
      return { items: data ?? [] };
    }
    case "team": {
      const [{ data: staff }, { data: perms }] = await Promise.all([
        admin.from("staff_profiles").select("*").limit(100),
        admin.from("staff_page_permissions").select("*").limit(500),
      ]);
      return { staff: staff ?? [], permissions: perms ?? [] };
    }
    case "onboarding": {
      const { data } = await admin.from("staff_onboarding_progress").select("*").limit(300);
      return { items: await withNames(admin, data ?? [], ["user_id"]) };
    }
    case "activity": {
      const { data } = await admin
        .from("staff_activity_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(150);
      // Rows already carry staff_email, but the name is friendlier to read.
      return { items: await withNames(admin, data ?? [], ["staff_user_id"]) };
    }
    case "feedback": {
      const { data } = await admin.from("feedback_items").select("*").order("created_at", { ascending: false }).limit(200);
      return { items: data ?? [] };
    }
    case "messages": {
      // Team channel only. Direct messages between staff are private
      // conversations, so HQ gets counts and who's talking rather than bodies.
      const [{ data: channel }, { data: dms }] = await Promise.all([
        admin
          .from("staff_chat_messages")
          .select("id,channel,sender_name,sender_role,body,created_at")
          .order("created_at", { ascending: false })
          .limit(60),
        admin.from("staff_dm_messages").select("sender_id,recipient_id,created_at,read_at").order("created_at", { ascending: false }).limit(500),
      ]);
      const dmRows = dms ?? [];
      const pairs = new Map<string, { a: string; b: string; count: number; unread: number; latest: string }>();
      for (const dm of dmRows) {
        const [a, b] = [dm.sender_id, dm.recipient_id].sort();
        const key = `${a}|${b}`;
        const existing = pairs.get(key) ?? { a, b, count: 0, unread: 0, latest: dm.created_at };
        existing.count += 1;
        if (!dm.read_at) existing.unread += 1;
        if (dm.created_at > existing.latest) existing.latest = dm.created_at;
        pairs.set(key, existing);
      }
      const threads = await withNames(admin, [...pairs.values()], ["a", "b"]);
      return { channel: (channel ?? []).reverse(), threads, dmTotal: dmRows.length };
    }
    case "emails": {
      const { data } = await admin.from("staff_emails").select("email,role,added_at").order("added_at", { ascending: true });
      return { items: data ?? [] };
    }
  }
}

export async function GET(request: Request, { params }: { params: Promise<{ section: string }> }) {
  if (!authorisedRead(request) && !authorisedWrite(request)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const { section } = await params;
  if (!isSection(section)) return NextResponse.json({ error: "unknown section" }, { status: 400 });

  const admin = serviceClient();
  if (!admin) return NextResponse.json({ error: "cloud not configured" }, { status: 503 });

  try {
    return NextResponse.json(await readSection(admin, section));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "read failed" }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ section: string }> }) {
  if (!authorisedWrite(request)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { section } = await params;
  if (!isSection(section)) return NextResponse.json({ error: "unknown section" }, { status: 400 });

  const admin = serviceClient();
  if (!admin) return NextResponse.json({ error: "cloud not configured" }, { status: 503 });

  const actorEmail = (request.headers.get("x-hq-actor-email") ?? "").trim().toLowerCase();
  const actorId = actorEmail ? await resolveByEmail(admin, actorEmail) : null;
  // Anything that records who did it must name a real person. Without a
  // resolvable actor the write is refused rather than attributed to nobody.
  if (!actorId) return NextResponse.json({ error: "Could not match that email to a Blossom account." }, { status: 403 });

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const action = String(body.action ?? "");
  const id = body.id;
  const now = new Date().toISOString();

  try {
    if (section === "issues") {
      if (action === "update") {
        const patch: Record<string, unknown> = { updated_at: now };
        if (typeof body.status === "string") patch.status = body.status;
        if (typeof body.severity === "string") patch.severity = body.severity;
        if (body.assigned_to === null || typeof body.assigned_to === "string") patch.assigned_to = body.assigned_to;
        const { error } = await admin.from("staff_issues").update(patch).eq("id", id);
        if (error) throw error;
        return NextResponse.json({ ok: true });
      }
      if (action === "comment") {
        const text = String(body.body ?? "").trim().slice(0, 2000);
        if (!text) return NextResponse.json({ error: "empty comment" }, { status: 400 });
        const { error } = await admin.from("staff_issue_comments").insert({ issue_id: id, body: text, author_id: actorId });
        if (error) throw error;
        return NextResponse.json({ ok: true });
      }
    }

    if (section === "notes") {
      if (action === "add") {
        const text = String(body.body ?? "").trim().slice(0, 4000);
        if (!text) return NextResponse.json({ error: "empty note" }, { status: 400 });
        const { error } = await admin.from("staff_handoff_notes").insert({ body: text, created_by: actorId, pinned: !!body.pinned });
        if (error) throw error;
        return NextResponse.json({ ok: true });
      }
      if (action === "pin") {
        const { error } = await admin.from("staff_handoff_notes").update({ pinned: !!body.pinned }).eq("id", id);
        if (error) throw error;
        return NextResponse.json({ ok: true });
      }
      if (action === "resolve") {
        const { error } = await admin
          .from("staff_handoff_notes")
          .update({ resolved_at: body.resolved === false ? null : now })
          .eq("id", id);
        if (error) throw error;
        return NextResponse.json({ ok: true });
      }
    }

    if (section === "applications" && action === "review") {
      const patch: Record<string, unknown> = {};
      if (typeof body.status === "string") patch.status = body.status;
      if (typeof body.review_note === "string") patch.review_note = body.review_note.slice(0, 1000);
      const { error } = await admin.from("staff_applications").update(patch).eq("id", id);
      if (error) throw error;
      return NextResponse.json({ ok: true });
    }

    if (section === "beta" && action === "resolveIssue") {
      const { error } = await admin.from("beta_known_issues").update({ resolved: !!body.resolved }).eq("id", id);
      if (error) throw error;
      return NextResponse.json({ ok: true });
    }

    if (section === "roadmap" && action === "setStatus") {
      const patch: Record<string, unknown> = {};
      if (typeof body.status === "string") patch.status = body.status;
      if (typeof body.stage === "string") patch.stage = body.stage;
      const { error } = await admin.from("product_roadmap").update(patch).eq("id", id);
      if (error) throw error;
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "unknown action" }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "write failed" }, { status: 500 });
  }
}

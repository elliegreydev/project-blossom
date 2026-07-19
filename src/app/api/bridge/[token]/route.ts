import { NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const CATEGORY_LABELS: Record<string, string> = {
  profile: "Profile & preferences",
  journey: "Journey timeline",
  medications: "Medications",
  appointments: "Appointments",
  checkins: "Check-ins",
  goals: "Goals",
};

function serviceClient() {
  return createServiceClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

async function loadLink(token: string) {
  const supabase = serviceClient();
  const { data: link } = await supabase
    .from("bridge_links")
    .select("id,owner_id,categories,expires_at,revoked_at")
    .eq("id", token)
    .maybeSingle();
  if (!link) return { link: null, reason: "not_found" as const };
  if (link.revoked_at) return { link: null, reason: "revoked" as const };
  if (new Date(link.expires_at).getTime() < Date.now()) return { link: null, reason: "expired" as const };
  return { link, reason: null };
}

// GET: a lightweight validity check for the splash screen - category
// *names* only, never the actual data, so a link-preview bot fetching this
// URL (Slack/Discord/iMessage unfurling a pasted link) never sees anything
// beyond "a share exists for these categories".
export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const { link, reason } = await loadLink(token);
  if (!link) return NextResponse.json({ valid: false, reason });

  const supabase = serviceClient();
  const { data: owner } = await supabase.from("profiles").select("display_name").eq("id", link.owner_id).maybeSingle();

  return NextResponse.json({
    valid: true,
    ownerName: owner?.display_name ?? null,
    categories: (link.categories as string[]).map((c) => CATEGORY_LABELS[c] ?? c),
  });
}

// POST: the actual reveal, triggered only by the recipient tapping "View" -
// never happens on page load, so a bot fetching the GET above can't trigger
// this path by accident. Logs the access (the "access history" the owner
// sees) and returns the real data for the granted categories only.
export async function POST(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const { link, reason } = await loadLink(token);
  if (!link) return NextResponse.json({ valid: false, reason });

  const supabase = serviceClient();
  await supabase.from("bridge_access_log").insert({ link_id: link.id });

  const ownerId = link.owner_id;
  const categories: string[] = link.categories;
  const result: Record<string, unknown> = {};

  if (categories.includes("profile")) {
    const { data } = await supabase.from("profiles").select("display_name,pronouns,hrt_status,region").eq("id", ownerId).maybeSingle();
    result.profile = data;
  }
  if (categories.includes("journey")) {
    const [{ data: m }, { data: e }] = await Promise.all([
      supabase.from("milestones").select("title,category,event_date,note").eq("user_id", ownerId),
      supabase.from("journey_events").select("title,category,event_date,note").eq("user_id", ownerId),
    ]);
    result.journey = [...(m ?? []), ...(e ?? [])];
  }
  if (categories.includes("medications")) {
    const { data } = await supabase.from("medications").select("name,route,unit,active").eq("user_id", ownerId);
    result.medications = data ?? [];
  }
  if (categories.includes("appointments")) {
    const { data } = await supabase.from("appointments").select("title,appointment_at,location").eq("user_id", ownerId).order("appointment_at", { ascending: false });
    result.appointments = data ?? [];
  }
  if (categories.includes("checkins")) {
    const { data } = await supabase.from("check_ins").select("mood,energy,confidence,stress,comfort,created_at").eq("user_id", ownerId).order("created_at", { ascending: false });
    result.checkins = data ?? [];
  }
  if (categories.includes("goals")) {
    const { data } = await supabase.from("goals").select("title,status,category").eq("user_id", ownerId);
    result.goals = data ?? [];
  }

  return NextResponse.json({ valid: true, categories, data: result });
}

import { NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import pkg from "../../../../../package.json";

export const dynamic = "force-dynamic";

// Read-only stats feed for Grey Studios HQ's Command Centre. Blossom has no
// revenue model, so revenueMinor is always 0 — this only ever exposes the
// user count, version, and health, never raw table access.
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

  const { count: userCount, error } = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true });

  if (error) {
    return NextResponse.json({ error: "read failed" }, { status: 500 });
  }

  return NextResponse.json({
    app: "blossom",
    status: "healthy",
    userCount: userCount || 0,
    revenueMinor: 0,
    revenueCurrency: "GBP",
    version: pkg.version,
    asOf: new Date().toISOString(),
  });
}

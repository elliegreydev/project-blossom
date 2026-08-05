import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";
import { DEV_GATE_COOKIE, gateEnabled, readToken } from "@/lib/devGate";

export const dynamic = "force-dynamic";

function service() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// Every route here re-checks the cookie rather than trusting that the proxy
// let the request through - the admin list is the one thing a non-admin
// tester must not be able to touch.
async function requireAdmin() {
  if (!gateEnabled()) return null;
  const jar = await cookies();
  const session = await readToken(jar.get(DEV_GATE_COOKIE)?.value);
  return session?.isAdmin ? session : null;
}

export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { data, error } = await service()
    .from("dev_access")
    .select("email, is_admin, created_at, last_seen_at")
    .order("created_at", { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ users: data ?? [] });
}

export async function POST(request: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const body = await request.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body?.password === "string" ? body.password : "";
  const isAdmin = Boolean(body?.isAdmin);

  if (!email.includes("@")) {
    return NextResponse.json({ error: "That doesn't look like an email address." }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json({ error: "Give them a password of at least 6 characters." }, { status: 400 });
  }

  const { error } = await service().rpc("dev_access_add", {
    p_email: email,
    p_password: password,
    p_is_admin: isAdmin,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const email = new URL(request.url).searchParams.get("email");
  if (!email) return NextResponse.json({ error: "no email given" }, { status: 400 });

  const { error } = await service().from("dev_access").delete().eq("email", email.toLowerCase());
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

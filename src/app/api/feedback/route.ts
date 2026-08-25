import { NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { reportError } from "@/lib/errorReport";
import { allow, callerKey, tooManyRequests, HOUR } from "@/lib/rateLimit";
import { errorClassOf } from "@/lib/errorShape";

export const dynamic = "force-dynamic";

// Public, unauthenticated endpoint for both feature ideas and bug reports.
// Mirrors /api/staff-applications: the insert goes through the anon client
// and feedback_items' own RLS (public insert-only, status locked to
// "submitted"), so a bug here can't do more than the database already
// allows.
export async function POST(request: Request) {
  // Anonymous and unlimited before this, with only a honeypot in front of it.
  if (!allow(`feedback:${callerKey(request)}`, 10, HOUR)) return tooManyRequests(3600);

  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "invalid request" }, { status: 400 });

  // Honeypot: real visitors never see or fill this field.
  if (typeof body.website === "string" && body.website.trim() !== "") {
    return NextResponse.json({ ok: true });
  }

  const type = body.type === "bug" ? "bug" : body.type === "feature" ? "feature" : null;
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const description = typeof body.description === "string" ? body.description.trim() : "";
  const contactEmail = typeof body.contactEmail === "string" ? body.contactEmail.trim() : "";

  if (!type || !title || title.length > 200 || !description || description.length > 4000) {
    return NextResponse.json({ error: "invalid request" }, { status: 400 });
  }

  const anon = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  // No .select() here deliberately: a bug report isn't publicly readable
  // (feedback_items' RLS only allows type='feature' or staff to read), so
  // asking PostgREST to hand the row back after insert would fail RLS for
  // bug submissions even though the insert itself succeeded.
  const { error } = await anon
    .from("feedback_items")
    .insert({ type, title, description, contact_email: contactEmail || null });
  if (error) {
    // This form is one of the few ways somebody tells us Blossom is broken.
    // If it's broken itself, every report about everything else goes quiet at
    // the same time, and the app looks healthier than it is.
    //
    // The error only, never the submission: what they typed is the whole
    // point of the form and none of HQ's business.
    reportError({
      operation: "sending feedback or a bug report",
      errorClass: errorClassOf(error),
      detail: "insert into feedback_items",
      severity: "error",
      // A public form. There may well be nobody signed in behind it.
      accountRef: null,
      context: { route: "/api/feedback", method: "POST" },
    });
    return NextResponse.json({ error: "could not submit" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

import { NextResponse } from "next/server";
import { APP_VERSION } from "@/lib/changelog";

// The version of the build currently deployed. The server always runs the
// newest deploy, so an app that's been open for days can compare this against
// the APP_VERSION baked into its own bundle and notice it's gone stale.
//
// Never cached: a cached answer here would defeat the entire point, and the
// service worker already skips /api/* (see public/sw.js).
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(
    { version: APP_VERSION },
    { headers: { "Cache-Control": "no-store, max-age=0" } }
  );
}

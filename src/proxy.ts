import { NextResponse, type NextRequest } from "next/server";
import { refreshAuth } from "@/lib/supabase/proxy";
import {
  DEV_GATE_COOKIE,
  DEV_GATE_PATH,
  isAlwaysAllowed,
  isDevGateEnabled,
  isValidGateCookie,
} from "@/lib/devGate";

export async function proxy(request: NextRequest) {
  // The dev app's shared access code. Runs before anything else so an
  // un-let-in visitor never reaches the app at all, and returns early on
  // production, where isDevGateEnabled() is false and this costs two string
  // comparisons. See devGate.ts for why it takes two conditions to engage.
  if (isDevGateEnabled() && !isAlwaysAllowed(request.nextUrl.pathname)) {
    if (!isValidGateCookie(request.cookies.get(DEV_GATE_COOKIE)?.value)) {
      const gate = new URL(DEV_GATE_PATH, request.url);
      // Bring them back to whatever they were actually after, so a shared
      // deep link still lands in the right place once they are in.
      gate.searchParams.set("next", request.nextUrl.pathname + request.nextUrl.search);
      return NextResponse.redirect(gate);
    }
  }

  return refreshAuth(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

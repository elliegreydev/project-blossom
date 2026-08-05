import { NextResponse, type NextRequest } from "next/server";
import { refreshAuth } from "@/lib/supabase/proxy";

// Dev-site gate.
//
// dev.projectblossom.net runs the real app against the dev database, and it
// shouldn't be something a stranger can wander into. Vercel's own protection
// isn't an option: Vercel Authentication doesn't cover production deployments
// on the Pro plan, and the dev branch deploys as production.
//
// So: HTTP Basic auth, active only when DEV_SITE_PASSWORD is set. That
// variable exists solely on the dev Vercel project, so production is
// untouched and there's no way to accidentally lock out real users. Basic
// auth means the browser handles the prompt, so there's no login page to
// build and it works fine on mobile.
function devGate(request: NextRequest): NextResponse | null {
  const password = process.env.DEV_SITE_PASSWORD;
  if (!password) return null;

  const header = request.headers.get("authorization");
  if (header?.startsWith("Basic ")) {
    try {
      const decoded = atob(header.slice(6));
      // Username is ignored; only the password matters.
      const supplied = decoded.slice(decoded.indexOf(":") + 1);
      if (timingSafeEqual(supplied, password)) return null;
    } catch {
      // Malformed header - fall through and re-prompt.
    }
  }

  return new NextResponse("Authentication required.", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="Blossom dev", charset="UTF-8"',
      // Belt and braces - a dev build should never be indexed.
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}

// Compare without leaking position through timing. Overkill for a shared dev
// password, but it costs nothing and avoids a bad habit.
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function proxy(request: NextRequest) {
  const blocked = devGate(request);
  if (blocked) return blocked;

  return refreshAuth(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

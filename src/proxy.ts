import { NextResponse, type NextRequest } from "next/server";
import { refreshAuth } from "@/lib/supabase/proxy";
import { DEV_GATE_COOKIE, gateEnabled, readToken } from "@/lib/devGate";

// Paths the proxy must not intercept.
//
// /dev-login, or nobody could ever log in. And all of /api/dev-access, because
// every route under it re-checks the cookie itself - letting them through
// means an unauthorised call gets a clean 401 instead of a redirect to an HTML
// login page, which a fetch() can't make sense of.
const GATE_OPEN_PATHS = ["/dev-login", "/api/dev-access"];

// Dev-site gate.
//
// dev.projectblossom.net runs the real app against the dev database and
// shouldn't be open to anyone who finds the URL. Vercel's own protection
// isn't available here: Vercel Authentication doesn't cover production
// deployments on the Pro plan, and the dev branch deploys as production.
//
// Active only when DEV_SITE_PASSWORD is set, and that variable exists solely
// on the dev Vercel project - so production is untouched and there is no way
// to accidentally lock out real users.
async function devGate(request: NextRequest): Promise<NextResponse | null> {
  if (!gateEnabled()) return null;

  const { pathname } = request.nextUrl;
  if (GATE_OPEN_PATHS.some((p) => pathname.startsWith(p))) return null;

  const session = await readToken(request.cookies.get(DEV_GATE_COOKIE)?.value);
  if (session) return null;

  const login = request.nextUrl.clone();
  login.pathname = "/dev-login";
  login.search = pathname === "/" ? "" : `?next=${encodeURIComponent(pathname)}`;
  const response = NextResponse.redirect(login);
  // A dev build has no business in search results.
  response.headers.set("X-Robots-Tag", "noindex, nofollow");
  return response;
}

export async function proxy(request: NextRequest) {
  const blocked = await devGate(request);
  if (blocked) return blocked;

  return refreshAuth(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

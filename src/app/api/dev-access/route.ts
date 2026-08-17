import { NextResponse } from "next/server";
import {
  DEV_GATE_COOKIE,
  DEV_GATE_MAX_AGE,
  expectedToken,
  isCorrectCode,
  isDevGateEnabled,
} from "@/lib/devGate";

export const dynamic = "force-dynamic";

/**
 * Redeems the dev app's shared code for a cookie.
 *
 * Returns the same shape whether the code was right or wrong apart from the
 * status, and never says which part was wrong, because there is only one part.
 *
 * On production isDevGateEnabled() is false and this 404s, so the endpoint
 * does not exist there in any meaningful sense even though the file ships.
 */
export async function POST(request: Request) {
  if (!isDevGateEnabled()) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  let submitted: unknown = null;
  try {
    const body = await request.json();
    submitted = (body as { code?: unknown } | null)?.code ?? null;
  } catch {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }

  if (!isCorrectCode(submitted)) {
    return NextResponse.json({ error: "wrong code" }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    name: DEV_GATE_COOKIE,
    value: expectedToken(),
    httpOnly: true,
    sameSite: "lax",
    // Dev is https, and a cookie that only travels over https cannot be read
    // off a coffee shop network.
    secure: true,
    path: "/",
    maxAge: DEV_GATE_MAX_AGE,
  });
  return response;
}

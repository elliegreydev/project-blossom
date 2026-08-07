import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { reportError } from "@/lib/errorReport";
import {
  isClientOperation,
  isErrorSeverity,
  isKnownBrowser,
  isKnownPlatform,
  coarseRoute,
  narrowErrorClass,
  type ErrorContext,
} from "@/lib/errorShape";

export const dynamic = "force-dynamic";

// Where the browser's error reports come in, on their way to Grey Studios HQ.
// This route exists for one reason: HQ_ERROR_SECRET is a server secret and
// can never be in a page.
//
// It has to be open to callers with no session, because a sign-in failing is
// one of the things most worth hearing about and there is no session yet when
// it does. So everything arriving here is treated as hostile. The operation
// must be one from the fixed list in errorShape.ts, errorClass is filed down
// to a bare token, context is rebuilt field by field from known values, and
// there is no free-text field anywhere. Nothing a caller sends can widen what
// ends up in Ellie's error log.

function numberIn(value: unknown, max: number): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value)) return undefined;
  const rounded = Math.trunc(value);
  return rounded >= 0 && rounded <= max ? rounded : undefined;
}

function safeContext(raw: unknown): ErrorContext {
  if (typeof raw !== "object" || raw === null) return {};
  const input = raw as Record<string, unknown>;
  const context: ErrorContext = {};

  // Run back through the same narrowing the browser used, so a caller that
  // skipped it gets the same answer anyway.
  if (typeof input.route === "string") context.route = coarseRoute(input.route);
  if (isKnownBrowser(input.browser)) context.browser = input.browser;
  if (isKnownPlatform(input.platform)) context.platform = input.platform;
  // A version and nothing that merely looks like one.
  if (typeof input.release === "string" && /^\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(input.release)) {
    context.release = input.release;
  }

  const status = numberIn(input.status, 599);
  if (status !== undefined) context.status = status;
  const retryCount = numberIn(input.retryCount, 1000);
  if (retryCount !== undefined) context.retryCount = retryCount;
  const durationMs = numberIn(input.durationMs, 600000);
  if (durationMs !== undefined) context.durationMs = durationMs;

  return context;
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);

  // Always 200, whatever happens below. The browser has nothing useful to do
  // with a failure here, and telling a caller which of its guesses got through
  // would only help somebody probing at them.
  const accepted = NextResponse.json({ ok: true });

  if (typeof body !== "object" || body === null) return accepted;
  const input = body as Record<string, unknown>;
  if (!isClientOperation(input.operation)) return accepted;

  const errorClass = narrowErrorClass(input.errorClass);
  const severity = isErrorSeverity(input.severity) ? input.severity : "error";

  // Read off the session cookie, never from the body. A caller must not be
  // able to hang a failure on somebody else's account.
  let accountRef: string | null = null;
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    accountRef = data.user?.id ?? null;
  } catch {
    // Not being able to name the account doesn't make the failure any less
    // worth reporting, so carry on without one.
  }

  reportError({
    operation: input.operation,
    errorClass,
    severity,
    accountRef,
    context: safeContext(input.context),
  });

  return accepted;
}

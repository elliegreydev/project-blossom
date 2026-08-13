import { after } from "next/server";
import {
  ERROR_CONTEXT_KEYS,
  type ErrorContext,
  type ErrorSeverity,
} from "@/lib/errorShape";

// Server-side half of Blossom's error reporting. Sends the shape of a failure
// to Grey Studios HQ so Ellie finds out when something breaks for somebody.
// The browser half goes through src/app/api/internal/report-error, which ends
// up back here.
//
// Read src/lib/errorShape.ts first. It carries the rules about what may and
// may not go in one of these, and they matter more than anything in this file.

const HQ_ENDPOINT = "https://hq.greystudios.xyz/api/ingest/errors";
const APP_SLUG = "project-blossom";

// Long enough for a healthy HQ, short enough that a sick one can't hold a
// function open. A report that never arrives costs nothing.
const TIMEOUT_MS = 4000;

/**
 * Which site this is. Vercel sets VERCEL_ENV on every deployment, so this needs
 * no configuration and cannot drift out of step with reality. "preview" is the
 * dev site, and anything unrecognised says so rather than guessing production:
 * HQ reading a dev test as a real outage is the mistake this prevents.
 */
function hqEnvironment(): "production" | "development" | "unknown" {
  const raw = process.env.VERCEL_ENV;
  if (raw === "production") return "production";
  if (raw === "preview" || raw === "development") return "development";
  return "unknown";
}

export interface ErrorReport {
  /**
   * What the PERSON was doing, in words Ellie can read: "signing in with their
   * code", not "POST /api/auth". Must be a fixed string. Never build one from
   * an id, a name or a time.
   */
  operation: string;
  /** The kind of failure: a Postgres code, "timeout", "fetch_failed". Fixed too. */
  errorClass: string;
  /**
   * Optional, and written here at the call site rather than lifted off the
   * error. Schema-level facts only, like which table or which entity. Never an
   * error message: Postgres quotes the failing row back in its own text, and
   * in Blossom the failing row is somebody's journal entry.
   */
  detail?: string;
  severity?: ErrorSeverity;
  /** The signed-in Supabase user id, or null for crons, webhooks and visitors. */
  accountRef?: string | null;
  context?: ErrorContext;
}

function cleanContext(context: ErrorContext): Record<string, string | number> {
  const cleaned: Record<string, string | number> = {};
  // Walked key by key off the allow-list rather than copied wholesale, so a
  // field added to ErrorContext by mistake later can't ride along.
  for (const key of ERROR_CONTEXT_KEYS) {
    const value = context[key];
    if (typeof value === "string" && value !== "") cleaned[key] = value.slice(0, 120);
    else if (typeof value === "number" && Number.isFinite(value)) cleaned[key] = Math.trunc(value);
  }
  return cleaned;
}

/**
 * Sends one report and resolves either way. Never rejects, never retries.
 *
 * Await this only where there is nothing waiting on the other end, which in
 * practice means instrumentation.ts. Everywhere else use reportError below.
 */
export async function deliverErrorReport(report: ErrorReport): Promise<void> {
  try {
    const secret = process.env.HQ_ERROR_SECRET;
    // Not set on any dev machine, and not set on Vercel until Ellie puts it
    // there. Going quiet is deliberate: a warning on every request would be a
    // worse problem than the missing report.
    if (!secret) return;

    const context = report.context ? cleanContext(report.context) : {};

    await fetch(HQ_ENDPOINT, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-hq-app": APP_SLUG,
        "x-hq-error-secret": secret,
      },
      body: JSON.stringify({
        operation: report.operation,
        errorClass: report.errorClass,
        ...(report.detail ? { detail: report.detail.slice(0, 500) } : {}),
        severity: report.severity ?? "error",
        environment: hqEnvironment(),
        accountRef: report.accountRef ?? null,
        ...(Object.keys(context).length > 0 ? { context } : {}),
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
    });
  } catch {
    // An error while reporting an error is not worth breaking a page over, so
    // it dies here. No retry either: if HQ is down, a loop turns one outage
    // into two.
  }
}

/**
 * Fire and forget. Call this from anywhere handling a request.
 *
 * The work is handed to after(), so it runs once the response has already gone
 * back to whoever was waiting for it. Nothing in here is ever in the way of a
 * person using the app.
 */
export function reportError(report: ErrorReport): void {
  try {
    after(() => deliverErrorReport(report));
  } catch {
    // No request to attach to. Let it fly on its own instead; it swallows its
    // own failures, so the worst case is a report that doesn't arrive.
    void deliverErrorReport(report);
  }
}

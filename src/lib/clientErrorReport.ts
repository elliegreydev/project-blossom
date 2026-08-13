import { APP_VERSION } from "@/lib/changelog";
import {
  browserToken,
  coarseRoute,
  errorClassOf,
  platformToken,
  type ClientOperation,
  type ErrorSeverity,
} from "@/lib/errorShape";

// Browser half of Blossom's error reporting. Posts to Blossom's own server,
// which forwards to Grey Studios HQ. It goes the long way round because the
// HQ secret is a server secret and can never be in a page.
//
// Read src/lib/errorShape.ts first for what is allowed in one of these. This
// file adds one rule of its own: reporting must never make anything worse. It
// is fire and forget, it is never awaited, and every path through it swallows
// its own failure.

const ENDPOINT = "/api/internal/report-error";

// A render loop or a phone with a broken IndexedDB can throw thousands of
// times a minute. HQ counts repeats for us, so the first of each kind is the
// useful one and the rest are just noise arriving at somebody's expense.
const SESSION_LIMIT = 8;

let sentThisSession = 0;
const alreadyReported = new Set<string>();

interface ClientReportExtras {
  severity?: ErrorSeverity;
  status?: number;
  retryCount?: number;
  durationMs?: number;
}

function installed(): boolean {
  return (
    window.matchMedia?.("(display-mode: standalone)").matches === true ||
    (window.navigator as { standalone?: boolean }).standalone === true
  );
}

export function reportClientError(
  operation: ClientOperation,
  error: unknown,
  extras: ClientReportExtras = {}
): void {
  try {
    if (typeof window === "undefined") return;

    // Blossom is built to work with no signal at all, on a train or anywhere
    // else. A failure while offline is the app doing what it is supposed to
    // do, not something anyone needs telling about.
    if (navigator.onLine === false) return;

    const errorClass = errorClassOf(error);
    const key = `${operation}|${errorClass}`;
    if (alreadyReported.has(key) || sentThisSession >= SESSION_LIMIT) return;
    alreadyReported.add(key);
    sentThisSession += 1;

    const userAgent = navigator.userAgent ?? "";

    void fetch(ENDPOINT, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        operation,
        errorClass,
        severity: extras.severity ?? "error",
        // No accountRef: the server reads that off the session cookie, so a
        // caller can't pin somebody else's account to a failure.
        context: {
          route: coarseRoute(window.location.pathname),
          browser: browserToken(userAgent),
          platform: platformToken(userAgent, installed()),
          release: APP_VERSION,
          ...(typeof extras.status === "number" ? { status: extras.status } : {}),
          ...(typeof extras.retryCount === "number" ? { retryCount: extras.retryCount } : {}),
          ...(typeof extras.durationMs === "number" ? { durationMs: extras.durationMs } : {}),
        },
      }),
      // Survives the tab being closed or navigated away from, which is exactly
      // what tends to happen in the same second as a crash.
      keepalive: true,
    }).catch(() => {
      // Nothing to do. If Blossom can't reach its own server then the person
      // has bigger problems than a missing report, and a retry here would only
      // add to them.
    });
  } catch {
    // Reporting must never be the thing that breaks the page somebody is on.
  }
}

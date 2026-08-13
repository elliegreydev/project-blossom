import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { reportError } from "@/lib/errorReport";
import { errorClassOf, isExpectedAuthFailure } from "@/lib/errorShape";
import { createClient } from "@/lib/supabase/server";

function safeNext(value: string | null): string {
  return value?.startsWith("/") && !value.startsWith("//") ? value : "/account";
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;
  const next = safeNext(url.searchParams.get("next"));
  const supabase = await createClient();

  let error: Error | null = null;
  let missingToken = false;
  if (code) {
    const result = await supabase.auth.exchangeCodeForSession(code);
    error = result.error;
  } else if (tokenHash && type) {
    const result = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    error = result.error;
  } else {
    error = new Error("The sign-in link is missing its confirmation code.");
    missingToken = true;
  }

  if (error) {
    // A link arriving with no token at all is not somebody being slow to click
    // it. It means the email template or the redirect is wrong, which locks
    // every single person out at once and looks identical from the outside to
    // an expired link. Worth interrupting Ellie for. An actually expired link
    // is not, so isExpectedAuthFailure keeps those out of the log.
    if (missingToken || !isExpectedAuthFailure(error)) {
      reportError({
        operation: "finishing a sign-in from an email link",
        errorClass: missingToken ? "missing_token" : errorClassOf(error),
        detail: missingToken ? "no code or token_hash on the callback" : undefined,
        severity: "error",
        // Nobody is signed in yet, by definition.
        accountRef: null,
        context: { route: "/auth", method: "GET" },
      });
    }

    const destination = new URL("/account", url.origin);
    destination.searchParams.set("authError", "link");
    return NextResponse.redirect(destination);
  }

  return NextResponse.redirect(new URL(next, url.origin));
}


"use client";

import { useEffect } from "react";
import { reportClientError } from "@/lib/clientErrorReport";

// The last thing standing when the root layout itself falls over. Nothing
// above this catches, so if someone sees this screen, Blossom has failed as
// completely as it can.
//
// This file replaces the root layout when it renders, which means the boot
// script that applies someone's theme never runs and none of the app's fonts
// or tokens exist here. So it sets no colours of its own and lets the browser
// pick light or dark. A crash screen in the wrong theme, flashing white at
// somebody who chose a dark or discreet one, would be its own small cruelty.
export default function GlobalError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    // Reported as fatal. By definition this is a failure nobody anticipated,
    // and it is the whole app rather than one screen.
    reportClientError("the app falling back to its error screen", error, { severity: "fatal" });
  }, [error]);

  return (
    <html lang="en-GB" style={{ colorScheme: "light dark" }}>
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "grid",
          placeItems: "center",
          padding: "2rem 1.5rem",
          fontFamily: "system-ui, -apple-system, sans-serif",
          lineHeight: 1.6,
        }}
      >
        <main style={{ maxWidth: "26rem", textAlign: "left" }}>
          <h1 style={{ fontSize: "1.35rem", margin: "0 0 0.75rem" }}>Blossom has stopped</h1>
          <p style={{ margin: "0 0 0.75rem" }}>
            Something went wrong at our end, not yours.
          </p>
          <p style={{ margin: "0 0 1.5rem", opacity: 0.85 }}>
            Nothing you have written has been lost. It is stored on this device, exactly where you
            left it.
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem" }}>
            <button
              type="button"
              onClick={() => unstable_retry()}
              style={{
                font: "inherit",
                padding: "0.65rem 1.1rem",
                borderRadius: "999px",
                border: "1px solid currentColor",
                background: "transparent",
                color: "inherit",
                cursor: "pointer",
              }}
            >
              Try again
            </button>
            {/* A full reload, not a client navigation. React has already
                fallen over, so the useful thing is a clean boot rather than
                another route rendered into the same broken tree. */}
            <button
              type="button"
              onClick={() => window.location.assign("/")}
              style={{
                font: "inherit",
                padding: "0.65rem 1.1rem",
                borderRadius: "999px",
                border: "1px solid transparent",
                background: "transparent",
                color: "inherit",
                textDecoration: "underline",
                cursor: "pointer",
              }}
            >
              Back to Blossom
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}

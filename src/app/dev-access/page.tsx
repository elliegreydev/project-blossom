"use client";

import { FormEvent, Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { safeReturnPath } from "@/lib/devGate";
import styles from "./devAccess.module.css";

/**
 * The door of the dev app.
 *
 * Deliberately not styled to look like a security screen. Anyone arriving
 * here is a person Ellie invited to have a poke around, so the page explains
 * what this build is and what it is not, before it asks for anything. The
 * warning matters more than the code box: the thing that would actually go
 * wrong here is somebody mistaking a test build for the real app and putting
 * three years of their transition into a database that gets wiped.
 */
function DevAccessForm() {
  const params = useSearchParams();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [working, setWorking] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setWorking(true);
    setError(null);
    try {
      const response = await fetch("/api/dev-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      if (!response.ok) {
        setError("That code isn't right. Check it and try again.");
        return;
      }
      // A full page load rather than a router push, so the proxy re-runs and
      // sees the new cookie. A client-side navigation would not.
      window.location.href = safeReturnPath(params.get("next"));
    } catch {
      setError("Couldn't check that just now. Try again in a moment.");
    } finally {
      setWorking(false);
    }
  }

  return (
    <main className={styles.page}>
      <div className={styles.card}>
        <span className={styles.eyebrow}>Test build</span>
        <h1>This is Blossom&apos;s test version</h1>

        <p>
          It&apos;s where new things get tried before they reach the real app. Some of it will
          be half-finished, and some of it will be broken. That&apos;s rather the point, and
          finding the broken bits is the most useful thing you can do here.
        </p>

        <div className={styles.warning}>
          <strong>Please don&apos;t put anything real in it.</strong>
          <p>
            This version has its own separate database that gets wiped without warning, and
            nothing you enter here is kept or protected the way the real app keeps things.
            Make things up. If you want to actually use Blossom, that&apos;s{" "}
            <a href="https://projectblossom.net">projectblossom.net</a>.
          </p>
        </div>

        <form className={styles.form} onSubmit={submit}>
          <label htmlFor="dev-code">Access code</label>
          <input
            id="dev-code"
            className={styles.input}
            type="text"
            value={code}
            onChange={(event) => setCode(event.target.value)}
            autoComplete="off"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            autoFocus
            required
          />
          {error && <p className={styles.error}>{error}</p>}
          <button type="submit" className={styles.button} disabled={working || code.trim() === ""}>
            {working ? "Checking…" : "Let me in"}
          </button>
        </form>

        <p className={styles.footnote}>
          Haven&apos;t got a code? They come from Ellie. The real app doesn&apos;t need one and
          is at <a href="https://projectblossom.net">projectblossom.net</a>.
        </p>
      </div>
    </main>
  );
}

export default function DevAccessPage() {
  // useSearchParams needs a Suspense boundary or the whole route opts into
  // dynamic rendering.
  return (
    <Suspense fallback={null}>
      <DevAccessForm />
    </Suspense>
  );
}

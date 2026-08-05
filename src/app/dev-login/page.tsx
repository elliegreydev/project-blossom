"use client";

import { Suspense, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import styles from "./devLogin.module.css";

function DevLoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [working, setWorking] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setWorking(true);
    setError(null);
    try {
      const response = await fetch("/api/dev-access/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        setError(data?.error ?? "That didn't work.");
        setWorking(false);
        return;
      }
      const next = params.get("next");
      // Full reload so the proxy re-reads the freshly set cookie.
      window.location.href = next && next.startsWith("/") ? next : "/";
    } catch {
      setError("Couldn't reach the server. Try again.");
      setWorking(false);
    }
  }

  return (
    <form className={styles.card} onSubmit={submit}>
      <span className={styles.badge}>Dev build</span>
      <h1 className={styles.title}>Blossom, test version</h1>
      <p className={styles.sub}>
        This is the in-progress build, kept separate from the real app. Nothing you write here
        touches the live site or anyone&apos;s real entries.
      </p>

      <label className={styles.field}>
        <span className={styles.label}>Email</span>
        <input
          className={styles.input}
          type="email"
          autoComplete="username"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </label>

      <label className={styles.field}>
        <span className={styles.label}>Password</span>
        <input
          className={styles.input}
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </label>

      <button className={styles.button} type="submit" disabled={working}>
        {working ? "Checking…" : "Let me in"}
      </button>

      {error && <p className={styles.error}>{error}</p>}
    </form>
  );
}

export default function DevLoginPage() {
  return (
    <main className={styles.screen}>
      <Suspense fallback={null}>
        <DevLoginForm />
      </Suspense>
    </main>
  );
}

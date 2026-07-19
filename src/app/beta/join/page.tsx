"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import styles from "../../account/account.module.css";

export default function BetaJoinPage() {
  const [user, setUser] = useState<User | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [email, setEmail] = useState("");
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const [otpCode, setOtpCode] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [redeemed, setRedeemed] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    void supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setCheckingSession(false);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  async function sendCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setWorking(true);
    setError(null);
    const address = email.trim().toLowerCase();
    const { error: authError } = await createClient().auth.signInWithOtp({
      email: address,
      options: { shouldCreateUser: true },
    });
    setWorking(false);
    if (authError) {
      setError(authError.message);
      return;
    }
    setPendingEmail(address);
    setMessage("We sent a six-digit code. It may take a minute to arrive.");
  }

  async function verifyCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!pendingEmail || otpCode.length !== 6) return;
    setWorking(true);
    setError(null);
    const { data, error: verifyError } = await createClient().auth.verifyOtp({
      email: pendingEmail,
      token: otpCode,
      type: "email",
    });
    setWorking(false);
    if (verifyError) {
      setError("That code is incorrect or has expired. Check it and try again.");
      return;
    }
    setUser(data.user ?? data.session?.user ?? null);
    setPendingEmail(null);
    setOtpCode("");
  }

  async function redeem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setWorking(true);
    setError(null);
    setMessage(null);
    const code = inviteCode.trim().toUpperCase();
    const { data, error: rpcError } = await createClient().rpc("redeem_beta_code", { input_code: code });
    setWorking(false);
    if (rpcError) {
      setError(rpcError.message);
      return;
    }
    if (data !== true) {
      setError("That code doesn't look right, or has already been used. Double-check it and try again.");
      return;
    }
    setRedeemed(true);
    void fetch("/api/beta/notify-join", { method: "POST" });
  }

  if (checkingSession) return null;

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <Link href="/" className={styles.back}>← Back to Blossom</Link>

        <header className={styles.header}>
          <span className={styles.eyebrow}>Beta program</span>
          <h1>Join the Blossom beta</h1>
          <p>Try things early and help shape what we build next.</p>
        </header>

        {redeemed ? (
          <section className={styles.card}>
            <h2>You&apos;re in</h2>
            <p>Thanks for helping test Blossom. Features may change and data may reset while we&apos;re in beta - the beta chat is the fastest way to reach us if something feels off.</p>
            <Link href="/beta-chat" className={styles.primaryButton} style={{ width: "fit-content", display: "inline-block", textAlign: "center" }}>
              Open beta chat
            </Link>
          </section>
        ) : !user ? (
          pendingEmail ? (
            <section className={styles.card}>
              <div className={styles.cardHeading}>
                <div className={styles.icon} aria-hidden="true">#</div>
                <div>
                  <h2>Enter your six-digit code</h2>
                  <p>We sent it to {pendingEmail}.</p>
                </div>
              </div>
              <form className={styles.form} onSubmit={verifyCode}>
                <label htmlFor="beta-otp">Verification code</label>
                <input
                  id="beta-otp"
                  className={styles.codeInput}
                  type="text"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  autoComplete="one-time-code"
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  placeholder="000000"
                  maxLength={6}
                  autoFocus
                  required
                />
                <button type="submit" className={styles.primaryButton} disabled={working || otpCode.length !== 6}>
                  {working ? "Checking…" : "Sign in"}
                </button>
              </form>
            </section>
          ) : (
            <section className={styles.card}>
              <div className={styles.cardHeading}>
                <div className={styles.icon} aria-hidden="true">✉</div>
                <div>
                  <h2>Sign in by email</h2>
                  <p>Beta access is tied to your account, so we need to sign you in first. No password needed.</p>
                </div>
              </div>
              <form className={styles.form} onSubmit={sendCode}>
                <label htmlFor="beta-email">Email address</label>
                <input
                  id="beta-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  inputMode="email"
                  placeholder="you@example.com"
                  required
                />
                <button type="submit" className={styles.primaryButton} disabled={working}>
                  {working ? "Sending…" : "Email me a code"}
                </button>
              </form>
            </section>
          )
        ) : (
          <section className={styles.card}>
            <div className={styles.accountRow}>
              <div>
                <span className={styles.smallLabel}>Signed in as</span>
                <strong>{user.email}</strong>
              </div>
            </div>
            <form className={styles.form} onSubmit={redeem}>
              <label htmlFor="beta-code">Invite code</label>
              <input
                id="beta-code"
                type="text"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                placeholder="e.g. K4P7QXNM"
                autoCapitalize="characters"
                required
              />
              <button type="submit" className={styles.primaryButton} disabled={working || !inviteCode.trim()}>
                {working ? "Checking…" : "Join the beta"}
              </button>
            </form>
          </section>
        )}

        {message && <p className={styles.success} role="status">{message}</p>}
        {error && <p className={styles.error} role="alert">{error}</p>}
      </div>
    </main>
  );
}

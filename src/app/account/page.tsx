"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import type { User } from "@supabase/supabase-js";
import { useLiveQuery } from "dexie-react-hooks";
import { db, LOCAL_PROFILE_ID } from "@/lib/db";
import { createClient } from "@/lib/supabase/client";
import {
  enableSync,
  LocalDataOwnershipError,
  pauseSync,
  syncNow,
} from "@/lib/sync";
import styles from "./account.module.css";

function friendlySyncError(error: unknown): string {
  if (error instanceof LocalDataOwnershipError) return error.message;
  if (!navigator.onLine) return "You’re offline. Nothing is lost, and Blossom will try again when you reconnect.";
  return error instanceof Error ? error.message : "Blossom couldn’t sync just now. Your local data is safe.";
}

function formatSyncTime(value: string | null | undefined): string {
  if (!value) return "Not synced yet";
  return `Last synced ${new Date(value).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

export default function AccountPage() {
  const profile = useLiveQuery(() => db.profiles.get(LOCAL_PROFILE_ID));
  const syncState = useLiveQuery(() => db.syncMeta.get("sync"));
  const pendingCount = useLiveQuery(() => db.syncOutbox.count(), []);
  const [user, setUser] = useState<User | null>(null);
  const [email, setEmail] = useState("");
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [working, setWorking] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    const linkFailed = Boolean(new URLSearchParams(window.location.search).get("authError"));
    void supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      if (linkFailed) {
        setError("That sign-in link has expired or was already used. Ask for a fresh one below.");
      }
    });
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => {
      data.subscription.unsubscribe();
    };
  }, []);

  async function requestCode(address: string) {
    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithOtp({
      email: address,
      options: { shouldCreateUser: true },
    });
    if (authError) throw authError;
  }

  async function sendCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setWorking(true);
    setError(null);
    setMessage(null);
    const address = email.trim().toLowerCase();
    try {
      await requestCode(address);
      setPendingEmail(address);
      setCode("");
      setMessage("We sent a six-digit code. It may take a minute to arrive.");
    } catch (authError) {
      setError(authError instanceof Error ? authError.message : "Blossom couldn’t send a code just now.");
    } finally {
      setWorking(false);
    }
  }

  async function verifyCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!pendingEmail || code.length !== 6) return;
    setWorking(true);
    setError(null);
    setMessage(null);
    const { data, error: verifyError } = await createClient().auth.verifyOtp({
      email: pendingEmail,
      token: code,
      type: "email",
    });
    if (verifyError) {
      setError("That code is incorrect or has expired. Check it and try again.");
    } else {
      setUser(data.user ?? data.session?.user ?? null);
      setPendingEmail(null);
      setCode("");
      setMessage("You’re signed in. Nothing has synced until you choose to connect this device.");
    }
    setWorking(false);
  }

  async function resendCode() {
    if (!pendingEmail) return;
    setWorking(true);
    setError(null);
    setMessage(null);
    try {
      await requestCode(pendingEmail);
      setMessage("A fresh six-digit code is on its way.");
    } catch (authError) {
      setError(authError instanceof Error ? authError.message : "Blossom couldn’t resend the code just now.");
    } finally {
      setWorking(false);
    }
  }

  async function connectSync() {
    if (!user) return;
    setWorking(true);
    setError(null);
    setMessage(null);
    try {
      await enableSync(user.id);
      setMessage("Sync is on. Blossom has safely connected this device to your account.");
    } catch (syncError) {
      setError(friendlySyncError(syncError));
    } finally {
      setWorking(false);
    }
  }

  async function retrySync() {
    if (!user) return;
    setWorking(true);
    setError(null);
    try {
      await syncNow(user.id);
      setMessage("All caught up.");
    } catch (syncError) {
      setError(friendlySyncError(syncError));
    } finally {
      setWorking(false);
    }
  }

  async function pause() {
    setWorking(true);
    await pauseSync();
    setMessage("Sync is paused. Changes will stay on this device until you turn it back on.");
    setWorking(false);
  }

  async function signOut() {
    setWorking(true);
    setError(null);
    if (user && profile?.syncEnabled && navigator.onLine) {
      try {
        await syncNow(user.id);
      } catch {
        // Pending changes remain safely in the outbox after sign-out.
      }
    }
    const { error: signOutError } = await createClient().auth.signOut();
    if (signOutError) setError(signOutError.message);
    else setMessage("Signed out. Your Blossom data is still on this device.");
    setWorking(false);
  }

  const ownershipConflict = Boolean(user && syncState?.ownerId && syncState.ownerId !== user.id);
  const syncing = Boolean(syncState?.syncing || working);

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <Link href="/" className={styles.back}>← Back to Blossom</Link>

        <header className={styles.header}>
          <span className={styles.eyebrow}>Account & sync</span>
          <h1>Keep your space connected</h1>
          <p>Signing in is optional. It never uploads your local Blossom data by itself.</p>
        </header>

        {!user && pendingEmail ? (
          <section className={styles.card}>
            <div className={styles.cardHeading}>
              <div className={styles.icon} aria-hidden="true">#</div>
              <div>
                <h2>Enter your six-digit code</h2>
                <p>We sent it to {pendingEmail}.</p>
              </div>
            </div>
            <form className={styles.form} onSubmit={verifyCode}>
              <label htmlFor="account-code">Verification code</label>
              <input
                id="account-code"
                className={styles.codeInput}
                type="text"
                value={code}
                onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                autoComplete="one-time-code"
                inputMode="numeric"
                pattern="[0-9]{6}"
                placeholder="000000"
                maxLength={6}
                autoFocus
                required
              />
              <button type="submit" className={styles.primaryButton} disabled={working || code.length !== 6}>
                {working ? "Checking…" : "Sign in"}
              </button>
            </form>
            <div className={styles.codeActions}>
              <button type="button" className={styles.textButton} onClick={resendCode} disabled={working}>
                Send a new code
              </button>
              <button
                type="button"
                className={styles.textButton}
                onClick={() => {
                  setPendingEmail(null);
                  setCode("");
                  setError(null);
                  setMessage(null);
                }}
                disabled={working}
              >
                Use a different email
              </button>
            </div>
          </section>
        ) : !user ? (
          <section className={styles.card}>
            <div className={styles.cardHeading}>
              <div className={styles.icon} aria-hidden="true">✉</div>
              <div>
                <h2>Sign in by email</h2>
                <p>No password to remember. We’ll send a six-digit code.</p>
              </div>
            </div>
            <form className={styles.form} onSubmit={sendCode}>
              <label htmlFor="account-email">Email address</label>
              <input
                id="account-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
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
        ) : (
          <>
            <section className={styles.card}>
              <div className={styles.accountRow}>
                <div>
                  <span className={styles.smallLabel}>Signed in as</span>
                  <strong>{user.email}</strong>
                </div>
                <span className={styles.statusPill}>Connected</span>
              </div>
            </section>

            {ownershipConflict ? (
              <section className={`${styles.card} ${styles.warningCard}`}>
                <h2>This device belongs to another Blossom account</h2>
                <p>
                  Sync is blocked so this device’s local data can’t be attached to the wrong person.
                  Sign back into the account previously used on this device.
                </p>
              </section>
            ) : profile?.syncEnabled ? (
              <section className={styles.card}>
                <div className={styles.syncHeader}>
                  <div>
                    <span className={styles.smallLabel}>Device sync</span>
                    <h2>{syncState?.lastError ? "Needs another try" : syncing ? "Syncing…" : "Sync is on"}</h2>
                  </div>
                  <span className={`${styles.dot} ${syncState?.lastError ? styles.dotWarning : ""}`} aria-hidden="true" />
                </div>
                <p className={styles.syncMeta}>
                  {formatSyncTime(syncState?.lastSyncedAt)}
                  {pendingCount ? ` · ${pendingCount} change${pendingCount === 1 ? "" : "s"} waiting` : " · Everything caught up"}
                </p>
                <div className={styles.actions}>
                  <button type="button" className={styles.primaryButton} onClick={retrySync} disabled={syncing}>
                    {syncing ? "Syncing…" : "Sync now"}
                  </button>
                  <button type="button" className={styles.secondaryButton} onClick={pause} disabled={syncing}>
                    Pause sync
                  </button>
                </div>
              </section>
            ) : (
              <section className={styles.card}>
                <span className={styles.smallLabel}>Your choice</span>
                <h2>Turn on sync?</h2>
                <p>
                  Blossom will merge this device with your account without deleting local data.
                  Future changes can then follow you between signed-in devices.
                </p>
                <ul className={styles.list}>
                  <li>Milestones, medication, appointments, goals and check-in ratings can sync.</li>
                  <li>Journal writing and check-in notes stay only on this device.</li>
                  <li>You can pause sync without removing local data.</li>
                </ul>
                <button type="button" className={styles.primaryButton} onClick={connectSync} disabled={syncing}>
                  {syncing ? "Connecting safely…" : "Connect this device"}
                </button>
              </section>
            )}

            <button type="button" className={styles.signOutButton} onClick={signOut} disabled={working}>
              Sign out, keep data on this device
            </button>
          </>
        )}

        {message && <p className={styles.success} role="status">{message}</p>}
        {(error || syncState?.lastError) && (
          <p className={styles.error} role="alert">{error ?? "Sync paused after a problem. Your local data is safe; try again when you’re ready."}</p>
        )}

        <aside className={styles.privacyNote}>
          <strong>Privacy note</strong>
          <p>
            Synced records are protected by your account and database access rules. Journal and check-in writing remain local until Blossom has proper end-to-end encryption.
          </p>
        </aside>
      </div>
    </main>
  );
}

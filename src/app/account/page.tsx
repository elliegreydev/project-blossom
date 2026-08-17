"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import type { User } from "@supabase/supabase-js";
import { useLiveQuery } from "dexie-react-hooks";
import { db, LOCAL_PROFILE_ID } from "@/lib/db";
import { isHqDevEntry } from "@/lib/devAccess";
import HqSignInNotice from "@/components/HqSignInNotice";
import { reportClientError } from "@/lib/clientErrorReport";
import { isExpectedAuthFailure, rateLimitWaitSeconds } from "@/lib/errorShape";
import { createClient } from "@/lib/supabase/client";
import {
  enableSync,
  LocalDataOwnershipError,
  pauseSync,
  retryStuckSyncItems,
  syncNow,
} from "@/lib/sync";
import styles from "./account.module.css";

function friendlySyncError(error: unknown): string {
  if (error instanceof LocalDataOwnershipError) return error.message;
  if (!navigator.onLine) return "You’re offline. Nothing is lost, and Blossom will try again when you reconnect.";
  return error instanceof Error ? error.message : "Blossom couldn’t sync just now. Your local data is safe.";
}

// Sync refusing to run because this device belongs to someone else is the
// guard working, not a fault, so it stays out of the error log. Everything
// else here is Blossom failing at the one job it promised.
function reportSyncFailure(operation: "connecting a device to their account" | "syncing their data when they asked", error: unknown) {
  if (error instanceof LocalDataOwnershipError) return;
  reportClientError(operation, error);
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
  const excludedCount = (profile?.syncExcludedCategories ?? []).length;
  // Anything that has failed at least once. Without this the screen could say
  // "1 change waiting" for weeks with no hint of what was wrong - which is how
  // a sync problem stays invisible until someone notices data missing.
  const failedItems = useLiveQuery(() => db.syncOutbox.filter((i) => i.attempts > 0).toArray(), []);
  const [user, setUser] = useState<User | null>(null);
  const [email, setEmail] = useState("");
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [working, setWorking] = useState(false);
  // Seconds until another code can be asked for. Zero means no wait on.
  const [waitSeconds, setWaitSeconds] = useState(0);

  // Each tick schedules the next one, so the countdown stops on its own rather
  // than leaving an interval running behind a screen nobody is looking at.
  useEffect(() => {
    if (waitSeconds <= 0) return;
    const timer = setTimeout(() => setWaitSeconds((left) => Math.max(0, left - 1)), 1000);
    return () => clearTimeout(timer);
  }, [waitSeconds]);

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
      // A malformed address is the person, not us, and isExpectedAuthFailure
      // filters those out. A 429 gets through on purpose: if Blossom's sign-in
      // emails are being rate limited then nobody new can get in at all, and
      // that is exactly the kind of thing we'd otherwise learn about far too
      // late.
      if (!isExpectedAuthFailure(authError)) {
        reportClientError("asking for a sign-in code", authError);
      }
      setError(describeCodeFailure(authError, "send"));
      startWaitIfRateLimited(authError);
    } finally {
      setWorking(false);
    }
  }

  /**
   * Being told to wait is not the same as being told no.
   *
   * Supabase's own wording for the wait is "For security purposes, you can only
   * request this after 51 seconds", which reads like an accusation and doesn't
   * say the obvious thing: the first code is probably already on its way, and
   * the reason you can't see it is that it's in spam. So say that instead.
   */
  function describeCodeFailure(authError: unknown, kind: "send" | "resend"): string {
    const wait = rateLimitWaitSeconds(authError);
    if (wait !== null) {
      return `A code is already on its way to that address. You can ask for another in ${wait} seconds. It's worth checking your spam folder while you wait, that's usually where it is.`;
    }
    if (authError instanceof Error && authError.message.trim() !== "") return authError.message;
    return kind === "send"
      ? "Blossom couldn’t send a code just now."
      : "Blossom couldn’t resend the code just now.";
  }

  function startWaitIfRateLimited(authError: unknown) {
    const wait = rateLimitWaitSeconds(authError);
    if (wait !== null) setWaitSeconds(wait);
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
      // Somebody mistyping six digits is not a breakage, and a log full of it
      // would bury the times the code was right and Blossom still said no.
      if (!isExpectedAuthFailure(verifyError)) {
        reportClientError("signing in with their code", verifyError);
      }
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
      // Reported the same way as the first request. This is the button people
      // actually press when an email is slow, so it is the likeliest place to
      // meet the rate limit, and a failure here that never reached the log was
      // a failure nobody could see.
      if (!isExpectedAuthFailure(authError)) {
        reportClientError("asking for a sign-in code", authError);
      }
      setError(describeCodeFailure(authError, "resend"));
      startWaitIfRateLimited(authError);
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
      reportSyncFailure("connecting a device to their account", syncError);
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
      // Clears the attempt count on anything parked before syncing. Without
      // this, a record that failed five times was skipped by every subsequent
      // sync forever - including this button.
      await retryStuckSyncItems(user.id);
      setMessage("All caught up.");
    } catch (syncError) {
      reportSyncFailure("syncing their data when they asked", syncError);
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
  // Dev only. False on production, where the email code sign-in below stays
  // exactly as it has always been.
  const hqOnlySignIn = isHqDevEntry();

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <Link href="/" className={styles.back}>← Back to Blossom</Link>

        <header className={styles.header}>
          <span className={styles.eyebrow}>Account & sync</span>
          <h1>Keep your space connected</h1>
          <p>Signing in is optional. It never uploads your local Blossom data by itself.</p>
        </header>

        {!user && hqOnlySignIn ? (
          <HqSignInNotice purpose="account" />
        ) : !user && pendingEmail ? (
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
              <button
                type="button"
                className={styles.textButton}
                onClick={resendCode}
                disabled={working || waitSeconds > 0}
              >
                {waitSeconds > 0 ? `Send a new code (${waitSeconds}s)` : "Send a new code"}
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
              <button type="submit" className={styles.primaryButton} disabled={working || waitSeconds > 0}>
                {working ? "Sending…" : waitSeconds > 0 ? `Email me a code (${waitSeconds}s)` : "Email me a code"}
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
                {/* Sync keeps whichever version was saved most recently. When
                    that means something written on this device got replaced,
                    say so - finding your own words quietly changed later is
                    worse than being told. */}
                {Boolean(syncState?.lastOverwrittenCount) && (
                  <p className={styles.syncMeta}>
                    Last sync replaced {syncState!.lastOverwrittenCount} item
                    {syncState!.lastOverwrittenCount === 1 ? "" : "s"} on this device with a newer
                    version from somewhere else.
                  </p>
                )}
                <div className={styles.actions}>
                  <button type="button" className={styles.primaryButton} onClick={retrySync} disabled={syncing}>
                    {syncing ? "Syncing…" : "Sync now"}
                  </button>
                  <button type="button" className={styles.secondaryButton} onClick={pause} disabled={syncing}>
                    Pause sync
                  </button>
                </div>
                {/* Sync used to be all or nothing. This is where someone says
                    which parts of their life may leave the device. */}
                <Link href="/account/what-syncs" className={styles.chooseLink}>
                  Choose what syncs
                  <span>
                    {excludedCount === 0
                      ? "Everything is being synced"
                      : `${excludedCount} ${excludedCount === 1 ? "category is" : "categories are"} on your devices only`}
                  </span>
                </Link>
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
                  <li>
                    Milestones, medication, appointments, goals, check-ins, journal entries, blood
                    tests, voice practice notes, presentation and body/progress data, weight and
                    calorie logs, budget entries, Intimacy &amp; wellbeing entries, safety
                    check-ins, private links and your Personal Support Map can sync.
                  </li>
                  <li>Photos and voice recordings never sync, even with sync on.</li>
                  <li>You can pause sync without removing local data.</li>
                  <li>
                    Unlocks real reminders that reach you even when Blossom is closed - turn it
                    on under Settings &gt; Notifications.
                  </li>
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
          <div className={styles.error} role="alert">
            <p>{error ?? "Sync paused after a problem. Your local data is safe; try again when you’re ready."}</p>
            {/* The real message, not a paraphrase of it. This screen is the
                only place a sync failure is ever visible, so swallowing the
                text meant nobody - including us - could tell what broke. */}
            {!error && syncState?.lastError && (
              <p className={styles.errorDetail}>{syncState.lastError}</p>
            )}
          </div>
        )}

        {failedItems && failedItems.length > 0 && (
          <details className={styles.diagnostics}>
            <summary>
              {failedItems.length} change{failedItems.length === 1 ? "" : "s"} the server refused
            </summary>
            <p className={styles.diagnosticsIntro}>
              Nothing here has been lost - it&rsquo;s still saved on this device and will be retried.
              If you&rsquo;re reporting a problem, this is the useful part.
            </p>
            <ul>
              {failedItems.map((item) => (
                <li key={item.id}>
                  <code>{item.entity}</code> &middot; {item.attempts} attempt
                  {item.attempts === 1 ? "" : "s"}
                  {item.lastError ? <span className={styles.itemError}>{item.lastError}</span> : null}
                </li>
              ))}
            </ul>
          </details>
        )}

        <aside className={styles.privacyNote}>
          <strong>Privacy note</strong>
          <p>
            Synced records are protected by your account and database access rules, though not yet
            fully end-to-end encrypted. Photos and voice recordings never sync, regardless of
            account or sync status.
          </p>
        </aside>
      </div>
    </main>
  );
}

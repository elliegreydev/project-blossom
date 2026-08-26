"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { useLiveQuery } from "dexie-react-hooks";
import { db, LOCAL_PROFILE_ID, deleteAllData, verifyAppLockPin } from "@/lib/db";
import { isHqDevEntry } from "@/lib/devAccess";
import DevSignInNotice from "@/components/DevSignInNotice";
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

const SUPPORT_EMAIL = "support@projectblossom.net";

/**
 * The word somebody has to type before their account is deleted.
 *
 * Compared case-insensitively and trimmed. A real confirmation is a deliberate
 * act, not a spelling test, and making a frightened person get the capitals
 * right is a cruelty that buys no extra safety.
 */
const CONFIRM_WORD = "delete";

/**
 * What is said when Blossom has no better words of its own to use.
 *
 * The route writes its own message for the failures it understands (see
 * /api/account/delete), and that message is shown as it is. This is the
 * fallback for everything else: a proxy error page, a 500 with no JSON, a
 * connection that dropped, a response shape nobody expected.
 *
 * It deliberately does NOT say the account still exists. On any of those the
 * request may well have reached the server and finished, and the answer is
 * what went missing. Telling somebody their trans health record is still
 * sitting on a server when it is not is the frightening direction to be wrong
 * in, so this says what is actually known, and gives them the one check they
 * can run themselves.
 */
const DELETE_FAILED =
  `Blossom didn't get an answer back, so it can't tell you whether your account was deleted. Nothing on this device has been touched. Please try again: if Blossom says you're not signed in, the deletion did go through. If it keeps failing, email ${SUPPORT_EMAIL} and we will finish it by hand.`;

interface DeleteResponse {
  ok?: unknown;
  error?: unknown;
  deletedAt?: unknown;
}

/**
 * Turns a refusal into something a person can act on.
 *
 * The route's own error string is only trusted when the body actually carries
 * ok:false, because that is the one shape written to be read by a human and it
 * always says the account still exists. A 429 comes from the shared rate
 * limiter and has no ok field at all (it is just { error }), so its wording
 * says nothing about whether anything was deleted, and it gets its own
 * sentence here rather than being passed through.
 */
function describeDeleteFailure(status: number, payload: DeleteResponse | null): string {
  if (status === 429) {
    return `Blossom has had several delete attempts from your account in a short time and stopped, so your account has not been deleted and nothing on this device has been touched. Please wait an hour and try again, or email ${SUPPORT_EMAIL}.`;
  }
  if (payload?.ok === false && typeof payload.error === "string" && payload.error.trim() !== "") {
    return payload.error.trim();
  }
  return DELETE_FAILED;
}

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
  const router = useRouter();
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
  // Deleting the account. Kept in its own state rather than reusing working/
  // error/message, because those are shared with sign-in and sync, and a sync
  // message clearing the sentence that says "your account was not deleted"
  // would be exactly the kind of quiet ambiguity this flow must not create.
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [confirmWord, setConfirmWord] = useState("");
  // The app lock guards the app, but /account sits outside it (it has to work
  // when signed out, to sign in), so without this the one irreversible action
  // in Blossom could be reached on an unlocked phone the lock was meant to
  // protect. Gated on the hash being on THIS device, not merely appLockEnabled:
  // a lock whose intent synced from another device has no local PIN to check,
  // and blocking deletion behind a PIN the person cannot enter would trap them.
  const [deletePin, setDeletePin] = useState("");
  const [deletePinError, setDeletePinError] = useState(false);
  const deleteNeedsPin = Boolean(profile?.appLockPinHash);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  // True only once the server has said the account is gone AND the device has
  // been wiped. Nothing else may set it.
  const [deleted, setDeleted] = useState(false);
  // Opening and closing the delete panel swaps one element for another, which
  // leaves focus nowhere at all. These carry it across.
  const deletePanelRef = useRef<HTMLDivElement | null>(null);
  const deleteTriggerRef = useRef<HTMLButtonElement | null>(null);
  // Only Cancel sets this. A panel that closed because the deletion finished,
  // or half finished, must not yank focus back to a button that is either gone
  // or about to be.
  const returnFocusToTrigger = useRef(false);

  useEffect(() => {
    if (deleteOpen) {
      deletePanelRef.current?.focus();
    } else if (returnFocusToTrigger.current) {
      returnFocusToTrigger.current = false;
      deleteTriggerRef.current?.focus();
    }
  }, [deleteOpen]);

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

  // The complement to the button above. On a shared or borrowed device,
  // "keep data on this device" is the wrong default, so this offers the other
  // choice explicitly rather than wiping on every sign-out (which would lose a
  // local-only user's journal the moment they signed out). Wipe first, then
  // sign out, so a failure to wipe never leaves them signed out AND exposed.
  async function signOutAndWipe() {
    setWorking(true);
    setError(null);
    try {
      await deleteAllData();
    } catch {
      setWorking(false);
      setError("Something went wrong and nothing was removed. You are still signed in. Please try again.");
      return;
    }
    await createClient().auth.signOut();
    setMessage("Signed out, and this device's Blossom data has been removed.");
    setWorking(false);
  }

  /**
   * Deleting the account itself. Irreversible, and the order matters.
   *
   * Server first, device second, and never the other way round. If the device
   * were wiped first and the server call then failed, somebody would be left
   * with an empty phone, an account that still exists, and no way to tell that
   * had happened. So nothing local is touched until the route has said ok:true.
   *
   * Nothing is sent in the body on purpose. The route takes the account from
   * the session and refuses to read anything else, which is what stops this
   * from ever being a way to delete somebody else.
   */
  async function deleteAccount() {
    if (!user || deleting) return;

    // Check the PIN before anything else, and before the button even shows a
    // busy state, so a wrong PIN is a quiet correction rather than a scare. A
    // wrong PIN stops here and nothing is sent.
    if (deleteNeedsPin) {
      const ok = await verifyAppLockPin(deletePin);
      if (!ok) {
        setDeletePinError(true);
        return;
      }
    }

    setDeleting(true);
    setDeleteError(null);
    setDeletePinError(false);
    setError(null);
    setMessage(null);

    let status = 0;
    let payload: DeleteResponse | null = null;
    try {
      const response = await fetch("/api/account/delete", { method: "POST" });
      status = response.status;
      // A response that is not JSON is a failure like any other, not a crash.
      payload = (await response.json().catch(() => null)) as DeleteResponse | null;
    } catch {
      setDeleting(false);
      setDeleteError(
        navigator.onLine
          ? DELETE_FAILED
          : `Blossom is offline, so it can't tell you whether your account was deleted. Almost certainly it wasn't, because the request never left this device. Nothing on this device has been touched. Try again when you're back online: if Blossom says you're not signed in, the deletion did go through. If it keeps failing, email ${SUPPORT_EMAIL}.`
      );
      return;
    }

    if (status !== 200 || payload?.ok !== true) {
      setDeleting(false);
      setDeleteError(describeDeleteFailure(status, payload));
      return;
    }

    // From here the account is gone and cannot come back, so nothing below may
    // claim more or less than it knows.
    //
    // The one case where the device is deliberately left alone: its local data
    // belongs to a different account, which is the same conflict that blocks
    // sync. Somebody deleting their own account must never take another
    // person's journal off a shared device with it, so the wipe is skipped and
    // the receipt says so rather than claiming a clean sweep that didn't happen.
    const otherAccountOnDevice = Boolean(syncState?.ownerId && syncState.ownerId !== user.id);
    let wipeFailed = false;
    if (!otherAccountOnDevice) {
      try {
        await deleteAllData();
      } catch (wipeError) {
        wipeFailed = true;
        // A wipe that fails after the account has gone is invisible to the
        // server, and this is the only chance anyone has of learning it
        // happened. deleteAllData is a Dexie transaction, so a failure here is
        // genuinely a failure to store data on this device.
        reportClientError("storing data on this device", wipeError, { severity: "error" });
      }
    }

    // Local scope deliberately. The session this would revoke belongs to an
    // account that no longer exists, so the network call could only fail, and a
    // failure here must never look like the deletion not having worked. This
    // just clears the stored session in the browser.
    try {
      await createClient().auth.signOut({ scope: "local" });
    } catch {
      // Nothing left to sign out of.
    }

    if (wipeFailed) {
      setDeleting(false);
      setDeleteOpen(false);
      setConfirmWord("");
      setDeletePin("");
      setDeletePinError(false);
      setDeleteError(
        `Your account has been deleted from Blossom's servers and you've been signed out. This device's own copy couldn't be removed automatically, so it's still here. Settings, then Data controls, then Delete all data will clear it. If that doesn't work either, email ${SUPPORT_EMAIL}.`
      );
      return;
    }

    const at = typeof payload?.deletedAt === "string" ? payload.deletedAt : new Date().toISOString();
    const kept = otherAccountOnDevice ? "&device=kept" : "";
    // Set before navigating so the moment between the wipe and the next screen
    // shows the calm line rather than flashing the sign-in form at somebody who
    // has just deleted their account.
    setDeleted(true);
    router.replace(`/account/deleted?at=${encodeURIComponent(at)}${kept}`);
  }

  const ownershipConflict = Boolean(user && syncState?.ownerId && syncState.ownerId !== user.id);
  const syncing = Boolean(syncState?.syncing || working);
  // Dev only. False on production, where the email code sign-in below stays
  // exactly as it has always been.
  const hqOnlySignIn = isHqDevEntry();

  // The account is gone and the device is clear. Everything this screen would
  // otherwise render is about an account that no longer exists, so it renders
  // none of it while the receipt page loads.
  if (deleted) {
    return (
      <main className={styles.page}>
        <div className={styles.shell}>
          <header className={styles.header}>
            <span className={styles.eyebrow}>Done</span>
            <h1>Your account has been deleted.</h1>
          </header>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <Link href="/" className={styles.back}>← Back to Blossom</Link>

        <header className={styles.header}>
          <span className={styles.eyebrow}>Account & sync</span>
          <h1>Keep your space connected</h1>
          <p>Signing in is optional. It never uploads your local Blossom data by itself.</p>
        </header>

        {/* A deletion that half worked signs them out, so everything below
            this becomes a sign-in form. The one sentence explaining what state
            their account is in has to sit ABOVE that, not underneath a screen
            asking them to start again. */}
        {deleteError && !user && (
          <div className={styles.error} role="alert">
            <p>{deleteError}</p>
          </div>
        )}

        {!user && hqOnlySignIn ? (
          <DevSignInNotice />
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
                    check-ins, private links, your Personal Support Map, your waiting list
                    referrals and your self-directed care settings can sync.
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
            <button
              type="button"
              className={styles.signOutButton}
              style={{ color: "var(--pink)" }}
              onClick={() => {
                // Now that deleting the account sits directly below this, the
                // two have to be told apart at the moment of pressing. This is
                // the easier button of the pair and it does the lesser thing,
                // so somebody frightened, moving fast and reading the label as
                // "get rid of it all" would otherwise walk away believing
                // their account had gone with the device.
                if (confirm("Remove all of this device's Blossom data and sign out? This cannot be undone. Your account, and anything synced to it, stays on Blossom's servers: Delete your account below removes those as well. Export a backup first if you might need it.")) {
                  void signOutAndWipe();
                }
              }}
              disabled={working}
            >
              Sign out and remove data from this device
            </button>

            {/*
              Deleting the account for real, which lives here because this is
              the only screen that knows whether there is an account to delete.
              Data controls owns the device-only wipe; this owns the server.

              Two steps and a typed word, never one tap. It is quiet until it
              is opened, it does not ask why, and it does not offer anything in
              exchange for staying.
            */}
            <section className={styles.dangerSection}>
              <span className={styles.smallLabel}>Leaving</span>
              <h2>Delete your account</h2>
              <p>
                {ownershipConflict
                  ? "This removes your Blossom account and everything synced to it. This device’s own data belongs to a different account, so it stays."
                  : "This removes your Blossom account and everything synced to it, and clears Blossom from this device at the same time."}{" "}
                If you want a copy of anything first, you can export one from Settings, then Data
                controls.
              </p>

              {!deleteOpen ? (
                <div className={styles.deleteActions}>
                  <button
                    type="button"
                    ref={deleteTriggerRef}
                    className={styles.dangerButton}
                    onClick={() => {
                      setDeleteOpen(true);
                      setConfirmWord("");
                      setDeletePin("");
                      setDeletePinError(false);
                      setDeleteError(null);
                    }}
                  >
                    Delete my account
                  </button>
                </div>
              ) : (
                // Opening this unmounts the button that opened it, so without
                // somewhere to send it, focus falls to the top of the document
                // and a keyboard or screen reader user has to tab the whole
                // page again to reach a confirmation they just asked for.
                // Focus lands on the panel rather than the input so the two
                // lists are still read in order, and Tab from here reaches the
                // box to type in.
                <div
                  className={styles.deletePanel}
                  ref={deletePanelRef}
                  tabIndex={-1}
                  role="group"
                  aria-label="Delete your account"
                >
                  <span className={styles.deleteLabel}>What goes</span>
                  <ul className={styles.deleteList}>
                    <li>
                      Your account {user.email ? <strong>{user.email}</strong> : null} and everything
                      synced to it, removed from Blossom&rsquo;s servers.
                    </li>
                    <li>
                      Any links you shared from it stop working, because the records behind them are
                      gone.
                    </li>
                    {ownershipConflict ? null : (
                      <li>
                        Blossom&rsquo;s data on this device, including photos and voice recordings,
                        wiped at the same time.
                      </li>
                    )}
                  </ul>
                  <span className={styles.deleteLabel}>What doesn&rsquo;t</span>
                  <ul className={styles.deleteList}>
                    <li>Anything you exported and downloaded is yours. It stays where you put it.</li>
                    <li>
                      Blossom on your other devices keeps its own local copy until you clear it
                      there.
                    </li>
                    {ownershipConflict ? (
                      <li>
                        This device&rsquo;s Blossom data, which belongs to a different account. It
                        won&rsquo;t be touched.
                      </li>
                    ) : null}
                  </ul>
                  <p>This can&rsquo;t be undone.</p>
                  <label
                    className={styles.deleteLabel}
                    htmlFor="account-delete-confirm"
                    id="account-delete-confirm-label"
                  >
                    Type <strong>{CONFIRM_WORD}</strong> to confirm
                  </label>
                  <input
                    id="account-delete-confirm"
                    className={styles.confirmInput}
                    type="text"
                    value={confirmWord}
                    onChange={(event) => setConfirmWord(event.target.value)}
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="none"
                    spellCheck={false}
                    placeholder={CONFIRM_WORD}
                    disabled={deleting}
                  />
                  {deleteNeedsPin && (
                    <>
                      <label
                        className={styles.deleteLabel}
                        htmlFor="account-delete-pin"
                        id="account-delete-pin-label"
                      >
                        Enter your app lock PIN
                      </label>
                      <input
                        id="account-delete-pin"
                        className={styles.confirmInput}
                        type="password"
                        inputMode="numeric"
                        value={deletePin}
                        onChange={(event) => {
                          setDeletePin(event.target.value);
                          setDeletePinError(false);
                        }}
                        autoComplete="off"
                        placeholder="PIN"
                        disabled={deleting}
                        aria-invalid={deletePinError}
                        aria-describedby={deletePinError ? "account-delete-pin-error" : undefined}
                      />
                      {deletePinError && (
                        <p id="account-delete-pin-error" className={styles.deletePinError} role="alert">
                          That PIN doesn&rsquo;t match. Nothing has been deleted.
                        </p>
                      )}
                    </>
                  )}
                  <div className={styles.deleteActions}>
                    <button
                      type="button"
                      className={styles.dangerButton}
                      onClick={() => void deleteAccount()}
                      disabled={
                        deleting ||
                        confirmWord.trim().toLowerCase() !== CONFIRM_WORD ||
                        (deleteNeedsPin && deletePin.length === 0)
                      }
                      // A dimmed button with no reason attached is a wall
                      // somebody can stand in front of without being told why,
                      // so it carries the instruction that unlocks it.
                      aria-describedby="account-delete-confirm-label"
                    >
                      {deleting ? "Deleting…" : "Delete my account"}
                    </button>
                    <button
                      type="button"
                      className={styles.secondaryButton}
                      onClick={() => {
                        // Back to the button they came from, rather than to
                        // the top of the page.
                        returnFocusToTrigger.current = true;
                        setDeleteOpen(false);
                        setConfirmWord("");
                        setDeletePin("");
                        setDeletePinError(false);
                      }}
                      disabled={deleting}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </section>
          </>
        )}

        {/* Still signed in, so the deletion did not happen and this belongs
            directly under the panel they were just looking at. The signed-out
            copy of this is above, before the sign-in form. Either way the
            explanation never disappears with the branch it was raised in. */}
        {deleteError && user && (
          <div className={styles.error} role="alert">
            <p>{deleteError}</p>
          </div>
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

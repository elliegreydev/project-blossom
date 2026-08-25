import { NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { allow, tooManyRequests, HOUR } from "@/lib/rateLimit";
import { reportError } from "@/lib/errorReport";
import { errorClassOf } from "@/lib/errorShape";

export const dynamic = "force-dynamic";

/**
 * Deleting a synced Blossom account, for real.
 *
 * Both the privacy policy and the terms told people they could do this, and
 * for a long time there was no route anywhere in the app that did it. Support
 * did it by hand. This is the promise being made true.
 *
 * THE CONTRACT WITH THE CLIENT, which matters more than anything else here.
 *
 *   POST with the session cookie. No body is read at all, deliberately: see
 *   "only ever themselves" below.
 *
 *   { ok: true, deletedAt } means the account is gone from the server and the
 *   session has been cleared. Only then may the caller wipe the device.
 *
 *   { ok: false, stage, error } means it did NOT happen. The error string is
 *   written to be shown to a person as it is. Do not wipe local data on this
 *   response: somebody left with an account that still exists and a phone with
 *   nothing on it is the worst outcome this route can produce.
 *
 * ONLY EVER THEMSELVES. The account comes from the session and nowhere else.
 * A user id in the body would turn this into a route for deleting other
 * people, so the body is never read, and the id that is used comes from
 * supabase.auth.getUser(), which asks the auth server rather than trusting the
 * cookie in front of it. The "are you sure" belongs in the interface rather
 * than in a token this route would have to trust anyway.
 *
 * That leaves the question of who got the browser to post. Supabase's auth
 * cookies are SameSite Lax, so another SITE cannot do it. Another ORIGIN on the
 * same site could, which is why there is an origin check as well: see
 * fromAnotherOrigin below.
 *
 * NOT A STAFF ACCOUNT. Refused before anything is removed, because the steps
 * below would be destructive for a staff member and would then fail anyway.
 * The reasoning is at the guard itself.
 *
 * WHAT THE DATABASE ACTUALLY DOES, established by testing rather than assumed.
 *
 * Every user_id column in Blossom cascades from auth.users, so deleting the
 * auth user takes the person's own rows with it: profile, journal, meds,
 * appointments, check-ins, goals, voice practice, blood tests, weight,
 * calories, budget, intimacy, safety check-ins, push subscriptions, referrals,
 * bridge links and trusted circle grants. Their share links stop working
 * because the rows behind them are gone, not because anything marks them dead.
 *
 * Cascade ordering does NOT save you, which is the part that had to be found
 * out the hard way. A real deletion was attempted inside a rolled back
 * transaction on the dev database and it failed:
 *
 *   violates foreign key constraint "support_ticket_messages_sender_id_fkey"
 *
 * Seventeen foreign keys point at auth.users with NO ACTION, so they block
 * instead of cascading. Fifteen are staff attribution columns (who claimed a
 * ticket, who reviewed an application) and an ordinary member never fills one
 * in. Two of them an ordinary member fills in just by using Blossom:
 *
 *   support_ticket_messages.sender_id    NOT NULL. Anyone who has ever
 *                                        messaged support.
 *   trusted_circle_access_log.viewer_id  NOT NULL. Anyone who has opened data
 *                                        that somebody else shared with them.
 *
 * Those two are cleared first, below. Both deletions are irreversible before
 * the account itself goes, and that cost is real: an access log row is a line
 * in somebody ELSE'S history of who looked at their data. There is no way to
 * honour an erasure request without it, the person asking is the one those
 * rows are about, and the alternative is a deletion that simply fails.
 *
 * WHAT ELSE IS THEIRS, checked in the schema rather than guessed at.
 *
 *   Storage objects. None. The only bucket in the project is staff-avatars
 *   (supabase/staff_profiles.sql) and it is gated to staff. Members upload
 *   nothing: photo backup is designed and deliberately not built. Nothing to
 *   delete, so nothing is deleted.
 *
 *   Push subscriptions. Keyed on endpoint but owned by user_id with a
 *   cascade, so they go on their own and their devices stop being reachable.
 *   Not pre deleted on purpose: anything cleared before the account itself
 *   would be lost for nothing if the account delete then failed.
 *
 *   Bridge access log, support ticket messages from staff, ticket access
 *   grants. All cascade through their parent row, which cascades from the
 *   person, so they go too.
 *
 *   Trusted Circle invites addressed to them that were never taken up. The
 *   one thing here held by an EMAIL rather than an account id, so no cascade
 *   reaches it and no amount of deleting by user_id ever would. Cleared by
 *   hand in step (d) below, after the account has gone.
 *
 *   feedback_items and staff_applications. Left alone, deliberately. Both are
 *   public forms with no account link at all, and the only thread back to a
 *   person is an email address they typed by hand. Matching on that would be
 *   a guess that could delete a stranger's bug report, and the privacy policy
 *   already treats feedback and applications as separately retained. Deleting
 *   an account does not touch them.
 */

/**
 * One stable operation string for every report out of this route, so the same
 * failure hitting several people arrives at HQ as one row with a count.
 *
 * CLIENT_OPERATIONS in src/lib/errorShape.ts is the allow-list for reports
 * coming FROM the browser through /api/internal/report-error, and nothing on
 * it covers deleting an account. Server routes write their own operation in
 * plain English (see /api/feedback, /api/bridge/[token], /auth/confirm), so
 * this is one of those. Fixed string, never built from an id.
 */
const OPERATION = "deleting their account";
const ROUTE = "/api/account/delete";

/**
 * What is said to somebody whose deletion did not work. Shown to them word for
 * word by the client, so it is written for them and not for a developer.
 *
 * Two things have to be true of every one of these. It must never say the
 * account is gone when it is not. And it must never imply a clean rollback
 * that did not happen: steps (a) and (b) below are permanent the moment they
 * run, so by the time the account itself is attempted, some of what was
 * attached to it has already gone for good. A single message saying "nothing
 * has been touched" would leave somebody half deleted with no way of finding
 * that out, which is the one outcome this route must never produce.
 *
 * No apology theatre, nothing about why they might want to stay, and always a
 * person they can email.
 */
const TRY_AGAIN =
  "Please try again, and if it keeps failing email support@projectblossom.net and we will finish it by hand.";

type Stage =
  | "origin"
  | "staff_account"
  | "access_log"
  | "support_messages"
  | "account"
  | "unknown";

const FAILED: Record<Stage, string> = {
  // Nobody legitimate ever sees this one: it is refused before the session is
  // even looked up, and the browser that sent it is not allowed to read the
  // answer anyway. It still says the true thing, in case it ever surprises
  // somebody on a setup nobody anticipated.
  origin: `Blossom could not tell that this request came from Blossom, so it stopped. Your account is still here and nothing on this device has been touched. ${TRY_AGAIN}`,
  // Refused before anything destructive runs. See the staff guard below.
  staff_account: `This account is also a Blossom staff account. Deleting it from here would take replies out of other people's support conversations and the account itself would still be left behind, so Blossom will not do it this way. Nothing has been removed and nothing on this device has been touched. Please email support@projectblossom.net and we will do it properly by hand.`,
  // Nothing has run yet, so this one really can promise a clean stop.
  access_log: `Blossom could not start deleting your account, so nothing has been removed and your account is still here. Nothing on this device has been touched. ${TRY_AGAIN}`,
  // Step (a) is already done and cannot be undone.
  support_messages: `Blossom could not finish deleting your account, so your account is still here. Nothing on this device has been touched. One part did go before it stopped, and cannot be brought back: the record of times you opened something another person shared with you. ${TRY_AGAIN}`,
  // Steps (a) and (b) are both already done.
  account: `Blossom could not finish deleting your account, so your account is still here. Nothing on this device has been touched. Two parts did go before it stopped, and cannot be brought back: anything you had written to support, and the record of times you opened something another person shared with you. ${TRY_AGAIN}`,
  // Somewhere unexpected, so this claims only what is certain either way: the
  // account is only ever reported gone on ok:true, and the device is this
  // route's business at no point at all.
  unknown: `Blossom could not delete your account, so your account is still here. Nothing on this device has been touched. ${TRY_AGAIN}`,
};

function failed(stage: Stage, status = 500) {
  return NextResponse.json({ ok: false, stage, error: FAILED[stage] }, { status });
}

/**
 * True when this POST did not come from a page on Blossom's own origin.
 *
 * Supabase's auth cookies are SameSite Lax, which stops another SITE getting a
 * browser to post here with them attached. It does not stop another ORIGIN on
 * the same site: dev.projectblossom.net and projectblossom.net share a
 * registrable domain, so a page on one counts as same-site with the other and
 * the cookies ride along. This route reads no body, which means a cross-origin
 * fetch to it is a CORS-simple request with no preflight standing in the way,
 * and by the time the browser refuses to hand the caller the response the
 * account is already gone. One compromised or borrowed subdomain would be
 * enough. So when the browser tells us where a request came from, it has to be
 * from here.
 *
 * Deliberately permissive when there is no Origin header at all. Nothing that
 * omits it is a browser acting on somebody else's cookies, and failing closed
 * on a header this branch cannot test would be a way to lock real people out
 * of deleting their own account.
 */
function fromAnotherOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;

  let originHost: string;
  try {
    originHost = new URL(origin).host;
  } catch {
    // An Origin that will not parse as a URL is not one of ours.
    return true;
  }

  // Vercel sets both, and either one is the host the person actually asked for.
  const hosts = [request.headers.get("host"), request.headers.get("x-forwarded-host")].filter(
    (value): value is string => typeof value === "string" && value !== ""
  );
  if (hosts.length === 0) return false;
  return !hosts.includes(originHost);
}

export async function POST(request: Request) {
  try {
    // Before the session is looked up and before the auth server is troubled.
    if (fromAnotherOrigin(request)) return failed("origin", 403);

    // The account being deleted, from the session and only from the session.
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { ok: false, stage: "unknown", error: "You are not signed in, so there is no account here to delete." },
        { status: 401 }
      );
    }

    // Keyed on the account rather than the IP. This can only be reached with a
    // session, so the thing worth guarding against is one signed in caller
    // replaying it, not a shared network.
    //
    // Deliberately loose. A successful delete cannot be replayed at all, since
    // there is no account left to sign the next one, so the only thing this
    // number limits is repeated FAILURES, and the person hitting those is
    // somebody trying to get rid of a health record and being told no. After a
    // failure the interface leaves the button live, so a frightened person can
    // reasonably tap it several times in a few seconds. Locking them out for an
    // hour at that point would be a worse thing to do than anything this limit
    // prevents.
    if (!allow(`account-delete:${user.id}`, 15, HOUR)) return tooManyRequests(3600);

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceKey) {
      // A deployment that cannot delete an account is a broken promise sitting
      // quietly in production, so it is reported at the top severity even
      // though nobody's data is at risk.
      reportError({
        operation: OPERATION,
        errorClass: "service_role_not_configured",
        detail: "SUPABASE_SERVICE_ROLE_KEY missing on this deployment",
        severity: "fatal",
        accountRef: user.id,
        context: { route: ROUTE, method: "POST" },
      });
      return failed("unknown", 503);
    }

    const service = createServiceClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // A staff account is refused here, before a single row is removed.
    //
    // This is not a courtesy to staff. Step (b) below deletes every row in
    // support_ticket_messages where sender_id is this person, and for an
    // ordinary member that is only ever their own words on their own tickets,
    // which are about to cascade away regardless. For a staff member it is
    // their REPLIES, sitting on other people's tickets, which do not cascade
    // and which those people are still reading. Then step (c) fails anyway,
    // because fifteen more foreign keys point at auth.users from staff
    // attribution columns (who claimed a ticket, who reviewed an application)
    // and none of them cascade either. The result would be somebody else's
    // support history quietly gone, a staff account still standing, and a
    // message saying the deletion did not work. Staff deletion is out of scope
    // on this branch; making it destructive was never in scope at all.
    //
    // Matched the same way is_staff() matches, on the email as auth.users
    // holds it (supabase/staff.sql). Service role, so RLS is not in the way.
    if (user.email) {
      const { data: staffRow, error: staffLookupError } = await service
        .from("staff_emails")
        .select("email")
        .eq("email", user.email)
        .maybeSingle();
      if (staffLookupError) {
        // Fails closed on purpose. Not knowing whether this is a staff account
        // is not a reason to go ahead and find out destructively.
        reportError({
          operation: OPERATION,
          errorClass: errorClassOf(staffLookupError),
          detail: "select from staff_emails by email",
          severity: "error",
          accountRef: user.id,
          context: { route: ROUTE, method: "POST" },
        });
        return failed("unknown");
      }
      if (staffRow) return failed("staff_account", 409);
    }

    // (a) Every time this person opened something a friend shared with them.
    // trusted_circle_access_log.viewer_id is NOT NULL and does not cascade,
    // so it blocks the delete below until it is empty. Testing, not theory:
    // see the header.
    const { error: accessLogError } = await service
      .from("trusted_circle_access_log")
      .delete()
      .eq("viewer_id", user.id);
    if (accessLogError) {
      reportError({
        operation: OPERATION,
        errorClass: errorClassOf(accessLogError),
        detail: "delete from trusted_circle_access_log by viewer_id",
        severity: "error",
        accountRef: user.id,
        context: { route: ROUTE, method: "POST" },
      });
      return failed("access_log");
    }

    // (b) Everything they ever wrote to support. support_ticket_messages
    // .sender_id is NOT NULL and does not cascade either, and this is the
    // constraint that actually failed when a deletion was tried on dev. Their
    // tickets and the staff replies on them cascade with the account a moment
    // later; only their own messages have to go first.
    const { error: messagesError } = await service
      .from("support_ticket_messages")
      .delete()
      .eq("sender_id", user.id);
    if (messagesError) {
      reportError({
        operation: OPERATION,
        errorClass: errorClassOf(messagesError),
        detail: "delete from support_ticket_messages by sender_id",
        severity: "error",
        accountRef: user.id,
        context: { route: ROUTE, method: "POST" },
      });
      return failed("support_messages");
    }

    // (c) The account itself, which takes everything that cascades with it.
    //
    // A hard delete. deleteUser's second argument (shouldSoftDelete) defaults
    // to false and has to stay that way: a soft delete leaves the row sitting
    // in auth.users with their email address still on it, which is precisely
    // the thing somebody deleting a trans health record is asking us to get
    // rid of.
    const { error: deleteError } = await service.auth.admin.deleteUser(user.id);
    if (deleteError) {
      // The one failure that leaves a person believing something happened that
      // did not, so it is reported as fatal and success is never claimed.
      reportError({
        operation: OPERATION,
        errorClass: errorClassOf(deleteError),
        detail: "auth.admin.deleteUser",
        severity: "fatal",
        accountRef: user.id,
        context: { route: ROUTE, method: "POST" },
      });
      return failed("account");
    }

    // (d) Invitations somebody else sent to this person's email address that
    // were never taken up.
    //
    // Every other trace of Trusted Circle goes on its own: a grant they own
    // cascades from owner_id, and one they accepted or declined carries their
    // account id in grantee_id and cascades from there. An invite still sitting
    // at "pending" has grantee_id null, so it is held by NOTHING except the
    // email address it was addressed to, and the delete above cannot see it.
    // Left alone it is their email address parked in another person's row for
    // good, on an app people delete their account from because they are
    // frightened. Worse, if that address were ever registered again,
    // pending_trusted_circle_invites() would offer the new account a share of
    // somebody's medical record that was meant for the person who left.
    //
    // Deliberately after the account has gone rather than before it, and
    // deliberately unable to fail the deletion. This row is not a foreign key
    // blocker and it belongs to a different person, so refusing somebody their
    // own deletion because of it would be the wrong way round. It is reported
    // instead, so a failure here is something Ellie finds out about and support
    // can finish by hand rather than something nobody ever learns.
    //
    // ilike is a coarse first pass and never the thing that decides. It treats
    // _ and % in an address as wildcards, so it can only ever match MORE rows
    // than it should, never fewer, and the exact comparison below throws the
    // extras away. A delete driven straight off the pattern could take a
    // stranger's invite, which is the same kind of guess this route refuses to
    // make about feedback and applications.
    if (user.email) {
      try {
        const wanted = user.email.trim().toLowerCase();
        const { data: invites, error: invitesError } = await service
          .from("trusted_circle_grants")
          .select("id, grantee_email")
          .is("grantee_id", null)
          .ilike("grantee_email", user.email.trim());
        if (invitesError) throw invitesError;

        const ids = ((invites ?? []) as Array<{ id: string; grantee_email: string | null }>)
          .filter((row) => (row.grantee_email ?? "").trim().toLowerCase() === wanted)
          .map((row) => row.id);

        if (ids.length > 0) {
          const { error: inviteDeleteError } = await service
            .from("trusted_circle_grants")
            .delete()
            .in("id", ids);
          if (inviteDeleteError) throw inviteDeleteError;
        }
      } catch (invitesError) {
        reportError({
          operation: OPERATION,
          errorClass: errorClassOf(invitesError),
          detail: "clear pending trusted_circle_grants by grantee_email",
          severity: "error",
          accountRef: user.id,
          context: { route: ROUTE, method: "POST" },
        });
      }
    }

    // The account is gone. This is only about the cookies still sitting in
    // front of it, so the browser is not carrying a session for a user that no
    // longer exists. signOut ignores the 401, 403 and 404 the logout call now
    // returns and clears the stored session either way. Local scope because
    // there is nothing left to revoke anywhere else. The client signs out and
    // wipes the device as well; this is the half a route handler can promise.
    try {
      await supabase.auth.signOut({ scope: "local" });
    } catch {
      // Never a reason to tell somebody their deletion failed when it did not.
    }

    return NextResponse.json({ ok: true, deletedAt: new Date().toISOString() });
  } catch (error) {
    // Without this an unexpected throw becomes a 500 with no JSON body, the
    // client's response parsing throws in turn, and the person is left staring
    // at a screen that cannot tell them whether their account still exists.
    reportError({
      operation: OPERATION,
      errorClass: errorClassOf(error),
      detail: "unexpected failure while deleting an account",
      severity: "fatal",
      accountRef: null,
      context: { route: ROUTE, method: "POST" },
    });
    return failed("unknown");
  }
}

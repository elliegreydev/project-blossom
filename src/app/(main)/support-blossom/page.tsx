"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import ScreenHeader from "@/components/ScreenHeader";
import { SUPPORT_URL, supportConfigured } from "@/lib/support";
import {
  parseRunningCosts,
  runningCostsFromEnv,
  runningCostsStatus,
  type RunningCosts,
  type RunningCostsStatus,
} from "@/lib/runningCosts";
import styles from "./support.module.css";

/**
 * Where we are this month, in one number and no progress bar. The reasoning
 * for both of those lives in src/lib/runningCosts.ts.
 *
 * Worked out after mount rather than during render, because the answer depends
 * on today's date and this page is prerendered: deciding it on the server would
 * bake in the build date and then disagree with the browser.
 */
function RunningCostsNote() {
  const [status, setStatus] = useState<RunningCostsStatus | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      // Stripe first, and the hand-set figure only if Stripe isn't wired up or
      // couldn't be reached. That ordering is what stops the two disagreeing:
      // once Stripe is answering, the manual figure can be left stale without
      // anyone seeing a wrong number.
      const costs = (await fetchRunningCosts()) ?? runningCostsFromEnv();
      if (!cancelled) setStatus(runningCostsStatus(costs, new Date()));
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // Tied to the donate link existing. A shortfall with no way to help is a
  // complaint, and the page already says donations aren't switched on yet.
  if (!status || !supportConfigured()) return null;

  return (
    <section className={styles.target}>
      {status.kind === "covered" ? (
        <p className={styles.targetHeadline}>{status.month}&rsquo;s costs are covered.</p>
      ) : (
        <>
          <p className={styles.targetHeadline}>We&rsquo;re {status.shortfall} short this month.</p>
          <p className={styles.targetDetail}>{daysLeftLine(status.daysLeft, status.month)}</p>
        </>
      )}
      <p className={styles.targetAsOf}>As of {status.asOf}.</p>
    </section>
  );
}

/** Runs the route's answer back through the same parser the manual figures use,
 *  so a malformed reply is rejected on exactly the same terms rather than
 *  trusted for having come from us. */
async function fetchRunningCosts(): Promise<RunningCosts | null> {
  try {
    const response = await fetch("/api/running-costs");
    if (!response.ok) return null;
    const body = await response.json();
    if (!body?.configured) return null;
    return parseRunningCosts(String(body.targetPence), String(body.raisedPence), body.asOf);
  } catch {
    // Offline, most likely, which is a normal state for this app. Fall back.
    return null;
  }
}

function daysLeftLine(daysLeft: number, month: string): string {
  if (daysLeft === 0) return `Today is the last day of ${month}.`;
  if (daysLeft === 1) return `One day left in ${month}.`;
  return `${daysLeft} days left in ${month}.`;
}

/**
 * Where the money goes, before anyone is asked for any.
 *
 * Payment happens on Stripe's own page, not here. Blossom never sees a card
 * number and never records who gave - see src/lib/support.ts. That's why this
 * screen ends in a link out rather than a form.
 */
export default function SupportBlossomPage() {
  return (
    <div className={styles.screen}>
      <ScreenHeader title="Support Blossom" backHref="/" />

      <p className={styles.lede}>
        Blossom is free, and it stays free. There&rsquo;s no paid version, nothing is locked, and
        nothing here changes what you get.
      </p>

      <section className={styles.section}>
        <h2>What it actually pays for</h2>
        <p>
          Running the app is cheap. Everything you write lives on your phone, so there isn&rsquo;t
          much of a server to pay for, and that stays true however many people use it.
        </p>
        <p>
          The expensive part is checking things. Every support service in Blossom was found and
          verified by a person, with the phone number dialled and the opening hours read. The notes
          on your rights where you live were written by hand and have to be rewritten when the law
          moves. Getting that wrong means someone in a bad moment rings a number that doesn&rsquo;t
          answer, so it has to keep being done properly.
        </p>
        <p>That&rsquo;s the work your money pays for. Not features.</p>
      </section>

      <RunningCostsNote />

      <section className={styles.section}>
        <h2>How it works</h2>
        <ul className={styles.list}>
          <li>Give once, or a little each month. Whatever amount you like.</li>
          <li>Payment happens on Stripe&rsquo;s page. Blossom never sees your card.</li>
          <li>
            <strong>We don&rsquo;t record who donates.</strong>{" "}
            There&rsquo;s no supporter badge and no note on your account, because a list of who paid
            is one more thing that could leak.
          </li>
          <li>You can stop a monthly one whenever you like, from the receipt Stripe emails you.</li>
        </ul>
      </section>

      <section className={styles.section}>
        <h2>If money&rsquo;s tight</h2>
        <p>
          Then don&rsquo;t. Genuinely. Blossom is built for people who are often skint, and an app
          that made you feel bad for using it for free would be a worse app. Telling a friend it
          exists helps more than a few quid.
        </p>
      </section>

      {/* Answered before anyone has to ask. Somebody wondering where their money
          goes once the bills are paid has usually been wondering a while by the
          time they work up to asking, and the answer is nothing to hide. */}
      <section className={styles.section}>
        <h2>What happens when the month is covered?</h2>
        <p>
          It goes into the next one. Some months come up short and some don&rsquo;t, and a buffer
          means Blossom doesn&rsquo;t wobble when one does.
        </p>
        <p>
          Beyond that it goes back into the app: the checking that keeps the support listings
          current, and building things for everyone rather than only for people who pay. If
          there&rsquo;s something you want to see, the{" "}
          <Link href="/ideas" className={styles.inlineLink}>
            ideas board
          </Link>{" "}
          is the place to say so.
        </p>
      </section>

      {supportConfigured() ? (
        <a className={styles.cta} href={SUPPORT_URL} target="_blank" rel="noopener noreferrer">
          Chip in on Stripe
        </a>
      ) : (
        <p className={styles.notReady}>
          Donations aren&rsquo;t switched on yet. Nothing to do here for now.
        </p>
      )}

      <p className={styles.footnote}>
        Blossom is made by Grey Studios. Money goes to running costs, not salaries.
      </p>
    </div>
  );
}

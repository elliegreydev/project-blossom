"use client";

import ScreenHeader from "@/components/ScreenHeader";
import { SUPPORT_URL, supportConfigured } from "@/lib/support";
import styles from "./support.module.css";

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

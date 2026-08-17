"use client";

import { useState } from "react";
import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import ScreenHeader from "@/components/ScreenHeader";
import {
  db,
  LOCAL_PROFILE_ID,
  SELF_DIRECTED_ID,
  completeSelfDirectedSetup,
} from "@/lib/db";
import { todayLocalDateKey } from "@/lib/dates";
import {
  BLOOD_CHECK_INTERVALS,
  PRESCRIBER_OPTIONS,
  bloodRhythmStatus,
  overviewLine,
  sectionLabel,
  shouldOfferBloodRhythm,
  type PrescriberStatus,
} from "@/lib/selfDirected";
import { isOpen } from "@/lib/referrals";
import feature from "@/components/feature.module.css";
import styles from "./self-directed.module.css";

/**
 * The section for looking after your own HRT.
 *
 * Every word here is doing work. Nothing asks anybody to justify themselves,
 * nothing warns anybody off, and supervised care stays visibly available
 * without ever being a nudge. See src/lib/selfDirected.ts for why the tone is
 * the feature rather than a coat of paint on it.
 */

function Setup({ onDone }: { onDone: () => void }) {
  const [status, setStatus] = useState<PrescriberStatus | null>(null);
  const [interval, setInterval] = useState<number | null>(null);
  const [keepPrivate, setKeepPrivate] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);

  const askRhythm = shouldOfferBloodRhythm(status);
  const ready = status !== null && keepPrivate !== null;

  async function finish() {
    if (!ready) return;
    setSaving(true);
    await completeSelfDirectedSetup(
      { prescriberStatus: status, bloodCheckIntervalDays: askRhythm ? interval : null },
      keepPrivate
    );
    setSaving(false);
    onDone();
  }

  return (
    <div className={styles.setup}>
      <div className={styles.question}>
        <div className={styles.questionTitle}>Is anyone else keeping track?</div>
        <p className={styles.questionBody}>
          Blossom asks so it knows which jobs to pick up, not to check up on you.
        </p>
        <p className={styles.questionBody}>
          If a clinic&apos;s monitoring you, they&apos;ll be booking your bloods and
          Blossom will stay out of the way. If they&apos;re not, that job&apos;s yours,
          and Blossom can help you hold it.
        </p>
        <div className={styles.choices}>
          {PRESCRIBER_OPTIONS.map((option) => (
            <button
              key={option.key}
              type="button"
              className={styles.choice}
              aria-pressed={status === option.key}
              onClick={() => setStatus(option.key)}
            >
              {option.label}
            </button>
          ))}
        </div>
        <p className={styles.footnote}>
          You can change this whenever. It stays on this device unless you turn
          syncing on for it.
        </p>
      </div>

      {status !== null && askRhythm && (
        <div className={styles.question}>
          <div className={styles.questionTitle}>Want a nudge about bloods?</div>
          <p className={styles.questionBody}>
            Blossom doesn&apos;t know what you should be testing or how often, and
            won&apos;t pretend to. It can just count how long it&apos;s been since the
            last one you recorded, on whatever interval you pick.
          </p>
          <div className={styles.choices}>
            {BLOOD_CHECK_INTERVALS.map((option) => (
              <button
                key={option.key}
                type="button"
                className={styles.choice}
                aria-pressed={interval === option.days}
                onClick={() => setInterval(option.days)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {status !== null && (
        <div className={styles.question}>
          <div className={styles.questionTitle}>Keep this behind your lock?</div>
          <p className={styles.questionBody}>
            Some people share a phone, or hand it to someone, or just don&apos;t want
            a section like this on screen when a stranger glances across.
          </p>
          <p className={styles.questionBody}>
            If that&apos;s you, Blossom can keep it behind your app lock. If it
            isn&apos;t, leave it open. There&apos;s no wrong answer here.
          </p>
          <div className={styles.choices}>
            <button
              type="button"
              className={styles.choice}
              aria-pressed={keepPrivate === true}
              onClick={() => setKeepPrivate(true)}
            >
              Yes, keep it locked
            </button>
            <button
              type="button"
              className={styles.choice}
              aria-pressed={keepPrivate === false}
              onClick={() => setKeepPrivate(false)}
            >
              No, leave it open
            </button>
          </div>
          {keepPrivate === true && (
            <p className={styles.footnote}>
              If you haven&apos;t set an app lock yet you&apos;ll need one first. It takes
              about a minute, and it protects the rest of Blossom too.
            </p>
          )}
        </div>
      )}

      <button
        type="button"
        className={feature.addButton}
        disabled={!ready || saving}
        onClick={() => void finish()}
      >
        Done
      </button>
    </div>
  );
}

export default function SelfDirectedPage() {
  // `get` resolves to undefined both while the query is still running and when
  // the row simply does not exist, so the two cannot be told apart. Coercing a
  // missing row to null keeps undefined meaning "still loading" - without this
  // the page returns null forever for anyone who has not set up yet, which is
  // everybody on their first visit.
  const settings = useLiveQuery(async () => (await db.selfDirected.get(SELF_DIRECTED_ID)) ?? null, []);
  const profile = useLiveQuery(() => db.profiles.get(LOCAL_PROFILE_ID), []);
  const bloodTests = useLiveQuery(() => db.bloodTestEntries.toArray(), []);
  const medications = useLiveQuery(() => db.medications.toArray(), []);
  const referrals = useLiveQuery(() => db.referrals.toArray(), []);
  const [justFinished, setJustFinished] = useState(false);

  if (settings === undefined || profile === undefined || bloodTests === undefined) return null;

  const label = sectionLabel(settings?.label);
  const setUp = Boolean(settings?.setupCompletedAt) || justFinished;

  if (!setUp) {
    return (
      <div className={feature.screen}>
        <ScreenHeader title={label} backHref="/track" />
        <Setup onDone={() => setJustFinished(true)} />
      </div>
    );
  }

  const today = todayLocalDateKey();
  const lastTest = bloodTests
    .map((entry) => entry.date)
    .sort()
    .at(-1) ?? null;
  const rhythm = bloodRhythmStatus({
    lastTestedOn: lastTest,
    intervalDays: settings?.bloodCheckIntervalDays ?? null,
    today,
  });
  // Most people doing this are also still on a list. The two are the same
  // story, so the section says so rather than pretending they're alternatives.
  const stillWaiting = (referrals ?? []).filter((referral) => isOpen(referral.status)).length;
  const activeMeds = (medications ?? []).filter((medication) => medication.active).length;

  return (
    <div className={feature.screen}>
      <ScreenHeader title={label} backHref="/track" />

      <p className={styles.intro}>
        When a clinic&apos;s involved, someone else keeps the schedule, holds the
        record, and notices if something looks off. Without one, all three of
        those are yours. <strong>This is somewhere to put them.</strong>
      </p>
      <p className={styles.intro}>
        There&apos;s no dosing advice here and there never will be, because that
        isn&apos;t ours to give. What&apos;s here is the boring stuff that&apos;s easy to let
        slide when nobody&apos;s chasing you for it.
      </p>
      <p className={styles.intro}>
        Supervised care is always an option too, whenever or if ever that&apos;s what
        you want.
      </p>

      <div className={feature.section}>
        <div className={feature.sectionTitle}>Where you are</div>
        <div className={styles.overview}>
          <span className={styles.overviewLine}>{overviewLine(settings?.hrtStartedOn ?? null, today)}</span>
          {rhythm.since && <span className={styles.overviewMeta}>Last bloods you recorded: {rhythm.since} ago.</span>}
          {stillWaiting > 0 && (
            <span className={styles.overviewMeta}>
              You&apos;re also on {stillWaiting === 1 ? "a waiting list" : `${stillWaiting} waiting lists`}. Both
              things can be true at once.
            </span>
          )}
        </div>

        {rhythm.title && (
          <div className={styles.prompt}>
            <div className={styles.promptTitle}>{rhythm.title}</div>
            <div className={styles.promptBody}>{rhythm.body}</div>
          </div>
        )}
      </div>

      <div className={feature.section}>
        <div className={feature.sectionTitle}>Your record</div>
        <p className={feature.sectionNote}>
          Nothing new here, just the parts of Blossom that matter most when
          you&apos;re the one keeping track.
        </p>
        <div className={styles.links}>
          <Link href="/track/medication" className={styles.link}>
            <span className={styles.linkTitle}>What you take</span>
            <span className={styles.linkMeta}>
              {activeMeds === 0 ? "Nothing added yet" : `${activeMeds} active`}
            </span>
          </Link>
          <Link href="/track/blood-tests" className={styles.link}>
            <span className={styles.linkTitle}>Blood tests</span>
            <span className={styles.linkMeta}>
              {bloodTests.length === 0 ? "None recorded" : `${bloodTests.length} recorded`}
            </span>
          </Link>
          <Link href="/track/care" className={styles.link}>
            <span className={styles.linkTitle}>Supplies</span>
            <span className={styles.linkMeta}>Needles, sharps bins, what&apos;s left</span>
          </Link>
          <Link href="/track/body" className={styles.link}>
            <span className={styles.linkTitle}>Changes over time</span>
            <span className={styles.linkMeta}>Yours to notice</span>
          </Link>
          {stillWaiting > 0 && (
            <Link href="/track/waiting-list" className={styles.link}>
              <span className={styles.linkTitle}>Waiting lists</span>
              <span className={styles.linkMeta}>
                {stillWaiting} still open
              </span>
            </Link>
          )}
          <Link href="/settings/passport" className={styles.link}>
            <span className={styles.linkTitle}>Something to hand a doctor</span>
            <span className={styles.linkMeta}>Blossom Passport</span>
          </Link>
        </div>
      </div>

      <div className={feature.section}>
        <div className={feature.sectionTitle}>Settings</div>
        <div className={styles.links}>
          <Link href="/settings/self-directed" className={styles.link}>
            <span className={styles.linkTitle}>Rename this section, and the rest</span>
            <span className={styles.linkMeta}>{label}</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

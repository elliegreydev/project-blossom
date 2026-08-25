"use client";

import { useState } from "react";
import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import ScreenHeader from "@/components/ScreenHeader";
import StrengthConverter from "@/components/StrengthConverter";
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
 *
 * The look is the quietest in the app on purpose, which is a different thing
 * from being unstyled: it is built from the same cards and grouped rows as
 * every other screen, turned down. See self-directed.module.css.
 */

const ICON_PROPS = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

function Chevron() {
  return (
    <svg className={styles.chevron} {...ICON_PROPS}>
      <path d="m9 5 7 7-7 7" />
    </svg>
  );
}

function Tick() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m5 12.5 4.5 4.5L19 7" />
    </svg>
  );
}

/** One tappable row. Rows live inside a .group, which carries the tint and
 *  clips the corners, so a lone row and a list of six are the same thing. */
function Row({
  href,
  title,
  meta,
  icon,
}: {
  href: string;
  title: string;
  meta: string;
  icon: React.ReactNode;
}) {
  return (
    <Link href={href} className={styles.row}>
      <span className={styles.rowIcon}>{icon}</span>
      <span className={styles.rowText}>
        <span className={styles.rowTitle}>{title}</span>
        <span className={styles.rowMeta}>{meta}</span>
      </span>
      <Chevron />
    </Link>
  );
}

/** One answer. Defined out here rather than inside Setup: a component declared
 *  during render is a new type on every render, so React would tear the button
 *  down and rebuild it on each tap and a keyboard user would lose their place.
 *
 *  The tick is only rendered when the answer is chosen, rather than always
 *  present and hidden with a transparent colour. Windows high contrast forces
 *  its own colours over the ones here, and a tick hidden by colour alone comes
 *  back there, which would mark every answer as chosen. */
function Choice({ label, pressed, onPick }: { label: string; pressed: boolean; onPick: () => void }) {
  return (
    <button type="button" className={styles.choice} aria-pressed={pressed} onClick={onPick}>
      <span className={styles.choiceLabel}>{label}</span>
      <span className={styles.choiceTick}>{pressed && <Tick />}</span>
    </button>
  );
}

function Setup({ onDone }: { onDone: () => void }) {
  const [status, setStatus] = useState<PrescriberStatus | null>(null);
  // Held as the option's key, not its number of days, so that nothing is
  // selected until somebody selects it. "Don't remind me" is null days, so
  // tracking days would have shown that answer as already chosen on the first
  // frame, and selfDirected.ts is explicit that this question has no default.
  // Answering nothing still saves null, exactly as picking it does.
  const [intervalKey, setIntervalKey] = useState<string | null>(null);
  const [keepPrivate, setKeepPrivate] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);

  const askRhythm = shouldOfferBloodRhythm(status);
  const ready = status !== null && keepPrivate !== null;
  const intervalDays = BLOOD_CHECK_INTERVALS.find((o) => o.key === intervalKey)?.days ?? null;

  async function finish() {
    if (!ready) return;
    setSaving(true);
    await completeSelfDirectedSetup(
      { prescriberStatus: status, bloodCheckIntervalDays: askRhythm ? intervalDays : null },
      keepPrivate
    );
    setSaving(false);
    onDone();
  }

  return (
    <div className={styles.setup}>
      <div className={styles.question}>
        <h2 className={styles.questionTitle} id="sd-q-prescriber">
          Is anyone else keeping track?
        </h2>
        <p className={styles.questionBody}>
          Blossom asks so it knows which jobs to pick up, not to check up on you.
        </p>
        <p className={styles.questionBody}>
          If a clinic&apos;s monitoring you, they&apos;ll be booking your bloods and
          Blossom will stay out of the way. If they&apos;re not, that job&apos;s yours,
          and Blossom can help you hold it.
        </p>
        {/* Each set of answers is one group, named by its own question. Without
            it a screen reader reads four unrelated toggle buttons and the
            question they belong to is only findable by scrolling back up. The
            same wrapper is used by the journey filters and the theme picker. */}
        <div className={styles.choices} role="group" aria-labelledby="sd-q-prescriber">
          {PRESCRIBER_OPTIONS.map((option) => (
            <Choice
              key={option.key}
              label={option.label}
              pressed={status === option.key}
              onPick={() => setStatus(option.key)}
            />
          ))}
        </div>
        <p className={styles.footnote}>
          You can change this whenever. It stays on this device unless you turn
          syncing on for it.
        </p>
      </div>

      {status !== null && askRhythm && (
        <div className={`${styles.question} ${styles.revealed}`}>
          <h2 className={styles.questionTitle} id="sd-q-bloods">
            Want a nudge about bloods?
          </h2>
          <p className={styles.questionBody}>
            Blossom doesn&apos;t know what you should be testing or how often, and
            won&apos;t pretend to. It can just count how long it&apos;s been since the
            last one you recorded, on whatever interval you pick.
          </p>
          <div className={styles.choices} role="group" aria-labelledby="sd-q-bloods">
            {BLOOD_CHECK_INTERVALS.map((option) => (
              <Choice
                key={option.key}
                label={option.label}
                pressed={intervalKey === option.key}
                onPick={() => setIntervalKey(option.key)}
              />
            ))}
          </div>
        </div>
      )}

      {status !== null && (
        <div className={`${styles.question} ${styles.revealed}`}>
          <h2 className={styles.questionTitle} id="sd-q-lock">
            Keep this behind your lock?
          </h2>
          <p className={styles.questionBody}>
            Some people share a phone, or hand it to someone, or just don&apos;t want
            a section like this on screen when a stranger glances across.
          </p>
          <p className={styles.questionBody}>
            If that&apos;s you, Blossom can keep it behind your app lock. If it
            isn&apos;t, leave it open. There&apos;s no wrong answer here.
          </p>
          <div className={styles.choices} role="group" aria-labelledby="sd-q-lock">
            <Choice
              label="Yes, keep it locked"
              pressed={keepPrivate === true}
              onPick={() => setKeepPrivate(true)}
            />
            <Choice
              label="No, leave it open"
              pressed={keepPrivate === false}
              onPick={() => setKeepPrivate(false)}
            />
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
        className={`${feature.addButton} ${styles.done}`}
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
        <ScreenHeader title={label} backHref="/care" />
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
      <ScreenHeader title={label} backHref="/care" />

      <div className={styles.lead}>
        <p>
          When a clinic&apos;s involved, someone else keeps the schedule, holds the
          record, and notices if something looks off. Without one, all three of
          those are yours. <strong>This is somewhere to put them.</strong>
        </p>
        <p>
          There&apos;s no dosing advice here and there never will be, because that
          isn&apos;t ours to give. What&apos;s here is the boring stuff that&apos;s easy to let
          slide when nobody&apos;s chasing you for it.
        </p>
        <p>
          Supervised care is always an option too, whenever or if ever that&apos;s what
          you want.
        </p>
      </div>

      {/* Above the person's own record on purpose. Somebody arriving here for
          the first time is usually looking for information, not a dashboard. */}
      <div className={`${styles.group} ${styles.tintMint}`}>
        <Link href="/care/self-directed/info" className={styles.row}>
          <span className={styles.rowIcon}>
            <svg {...ICON_PROPS}>
              <path d="M4 5.2A1.2 1.2 0 0 1 5.2 4H10a2 2 0 0 1 2 2v13a2 2 0 0 0-2-2H5.2A1.2 1.2 0 0 1 4 15.8Z" />
              <path d="M20 5.2A1.2 1.2 0 0 0 18.8 4H14a2 2 0 0 0-2 2v13a2 2 0 0 1 2-2h4.8a1.2 1.2 0 0 0 1.2-1.2Z" />
            </svg>
          </span>
          <span className={styles.rowText}>
            <span className={styles.rowTitle}>Practical things</span>
            <span className={styles.rowMeta}>
              Bridging prescriptions, bloods without a GP, storage, sharps, and
              where people get their information.
            </span>
          </span>
          <Chevron />
        </Link>
      </div>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Where you are</h2>
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

        {/* The one thing on the screen anybody can act on, so the one thing
            allowed a tint. Lavender rather than a warning colour: nothing has
            gone wrong, it has just been a while. */}
        {rhythm.title && (
          <div className={styles.callout}>
            <div className={styles.calloutTitle}>{rhythm.title}</div>
            <div className={styles.calloutBody}>{rhythm.body}</div>
          </div>
        )}
      </section>

      {/* Arithmetic on two numbers you typed, and nothing else. It has no
          opinion about either of them: see the note in lib/selfDirected.ts for
          where the line sits between converting a number and suggesting one. */}
      <section className={styles.section}>
        <StrengthConverter />
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Your record</h2>
        <p className={styles.sectionNote}>
          Nothing new here, just the parts of Blossom that matter most when
          you&apos;re the one keeping track.
        </p>
        <div className={`${styles.group} ${styles.tintLavender}`}>
          <Row
            href="/care/medication"
            title="What you take"
            meta={activeMeds === 0 ? "Nothing added yet" : `${activeMeds} active`}
            icon={
              <svg {...ICON_PROPS}>
                <rect x="3" y="8" width="18" height="8" rx="4" transform="rotate(45 12 12)" />
                <path d="M9 9l6 6" />
              </svg>
            }
          />
          <Row
            href="/care/blood-tests"
            title="Blood tests"
            meta={bloodTests.length === 0 ? "None recorded" : `${bloodTests.length} recorded`}
            icon={
              <svg {...ICON_PROPS}>
                <path d="M9 3h6M10 3v6.2a4 4 0 0 1-.7 2.3L6.8 15a5 5 0 1 0 10.4 0l-2.5-3.5a4 4 0 0 1-.7-2.3V3" />
                <path d="M7.5 15.5h9" />
              </svg>
            }
          />
          <Row
            href="/care/overview"
            title="Supplies"
            meta="Needles, sharps bins, what's left"
            icon={
              <svg {...ICON_PROPS}>
                <path d="M4 8.4 12 4.4l8 4v7.2l-8 4-8-4Z" />
                <path d="M4 8.4l8 4 8-4M12 12.4v7.2" />
              </svg>
            }
          />
          <Row
            href="/care/body"
            title="Changes over time"
            meta="Yours to notice"
            icon={
              <svg {...ICON_PROPS}>
                <path d="M12 4a8 8 0 1 0 8 8" />
                <path d="M12 4v8l5 3" />
              </svg>
            }
          />
          {stillWaiting > 0 && (
            <Row
              href="/care/waiting-list"
              title="Waiting lists"
              meta={`${stillWaiting} still open`}
              icon={
                <svg {...ICON_PROPS}>
                  <circle cx="12" cy="12" r="8.5" />
                  <path d="M12 7v5.4l3.2 2" />
                </svg>
              }
            />
          )}
          <Row
            href="/settings/passport"
            title="Something to hand a doctor"
            meta="Blossom Passport"
            icon={
              <svg {...ICON_PROPS}>
                <rect x="5" y="3.2" width="14" height="17.6" rx="2.4" />
                <path d="M9 8.4h6M9 12h6M9 15.6h3.5" />
              </svg>
            }
          />
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Settings</h2>
        <div className={`${styles.group} ${styles.tintSky}`}>
          <Row
            href="/settings/self-directed"
            title="Rename this section, and the rest"
            meta={label}
            icon={
              <svg {...ICON_PROPS}>
                <path d="M4.5 13.2 13.7 4a2.6 2.6 0 0 1 3.7 3.7l-9.2 9.2-4.4 1.2Z" />
                <path d="M12.4 5.3 16 8.9" />
              </svg>
            }
          />
        </div>
      </section>
    </div>
  );
}

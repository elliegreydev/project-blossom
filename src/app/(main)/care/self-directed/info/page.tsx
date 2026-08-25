"use client";

import ScreenHeader from "@/components/ScreenHeader";
import feature from "@/components/feature.module.css";
import styles from "../self-directed.module.css";

/**
 * The practical information page.
 *
 * Every factual claim here was researched and sourced rather than recalled,
 * and the ones that could not be confirmed were cut rather than hedged. The
 * boundary is unchanged and permanent: no dosing, no sourcing, no
 * interpreting anybody's results. Blossom explains what things are and points
 * at people who know more; it does not tell anyone what to do.
 *
 * The links at the bottom belong to other people. They are marked as such,
 * because the moment this page reads as Blossom vouching for a supplier it has
 * become a different kind of thing.
 *
 * The "Covers suppliers" marker is deliberately quiet small print and not a
 * badge. It was briefly a tinted pill, on the reasoning that it is the one
 * thing somebody needs to see before they tap, which is true. It still loses to
 * the two rules it broke: this stylesheet opens with "no badges, nothing that
 * draws an eye across a room", and "suppliers" is the single most disclosing
 * word on the page, so a pill puts it in the one style built to be noticed on
 * the one screen built not to be. Small print carries the same warning to
 * anybody actually reading the row.
 */

interface Source {
  name: string;
  href: string;
  what: string;
  /** True where the site itself covers sourcing or suppliers. Called out on
   *  screen rather than blurred into the rest of the list. */
  vendors?: boolean;
}

const SOURCES: Source[] = [
  {
    name: "Trans Harm Reduction",
    href: "https://transharmreduction.org/",
    what: "Injecting safely, needle disposal, vial care, blood tests, and third-party lab testing with a public results database.",
  },
  {
    name: "Gender Construction Kit",
    href: "https://genderkit.org.uk/",
    what: "UK-focused guides on names, documents, healthcare, and how to make the case for a bridging prescription.",
  },
  {
    name: "Transfeminine Science",
    href: "https://transfemscience.org/",
    what: "Evidence-based reviews of the research. Dense, careful, and written for people who want the actual literature.",
  },
  {
    name: "DIY HRT",
    href: "https://diyhrt.coffee/",
    what: "Community-maintained directory of suppliers, with reviews and availability tracking.",
    vendors: true,
  },
  {
    name: "r/TransDIY",
    href: "https://www.reddit.com/r/TransDIY/",
    what: "Long-running community. Advice, reviews, and people answering each other's questions.",
    vendors: true,
  },
];

const ICON_PROPS = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

function LinkOutIcon() {
  return (
    <svg {...ICON_PROPS}>
      <path d="M14 4.6h5.4V10" />
      <path d="M19.4 4.6 12 12" />
      <path d="M18 14.4v3.8a2 2 0 0 1-2 2H5.8a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h3.8" />
    </svg>
  );
}

/** A link off to somebody else's site. Marked as leaving Blossom on both ends
 *  of the row, so it is obvious before the tap and not only after it. */
function ExternalRow({
  href,
  title,
  meta,
  pill,
}: {
  href: string;
  title: string;
  meta?: string;
  pill?: string;
}) {
  return (
    <a className={styles.row} href={href} target="_blank" rel="noreferrer noopener">
      <span className={styles.rowIcon}>
        <LinkOutIcon />
      </span>
      <span className={styles.rowText}>
        <span className={styles.rowTitleLine}>
          <span className={styles.rowTitle}>{title}</span>
        </span>
        {meta && <span className={styles.rowMeta}>{meta}</span>}
        {pill && <span className={styles.rowNote}>{pill}</span>}
      </span>
      <svg className={styles.chevron} {...ICON_PROPS}>
        <path d="M7 17 17 7M8.4 7H17v8.6" />
      </svg>
    </a>
  );
}

export default function SelfDirectedInfoPage() {
  // This page is entirely static: nothing on it reads the person's settings.
  // It used to fetch them for the screen title, and when that stopped being
  // true the query stayed behind along with a "return null while undefined"
  // guard, so the page went blank for a database round-trip it had no use for.
  return (
    <div className={feature.screen}>
      <ScreenHeader title="Practical things" backHref="/care/self-directed" />

      <div className={styles.lead}>
        <p>
          Written and checked by us, sourced where it matters, and deliberately
          short on opinions. There is no dosing advice here and nothing telling
          you where to buy anything.
        </p>
      </div>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Routes you might not know about</h2>
        <div className={styles.prose}>
          <p>
            Most people end up doing this themselves because the wait is measured
            in years and nothing else is on offer. A few other doors do exist
            though, and they are badly advertised, so plenty of people never hear
            about them.
          </p>
          <p>
            None of this is a nudge to stop what you are doing. It is just what is
            there.
          </p>
        </div>

        <div className={styles.callout}>
          <div className={styles.calloutTitle}>A bridging prescription</div>
          <div className={styles.calloutBody}>
            Your GP can prescribe hormones to someone who is already
            self-medicating, while you wait for a gender clinic. This is a
            recognised approach rather than a favour. The GMC describes it as a
            harm reduction strategy, and the Royal College of Psychiatrists
            supports it for exactly this situation: someone already taking
            hormones from an unregulated source while waiting to be seen.
          </div>
          <div className={styles.calloutBody}>
            The GMC&apos;s own reasoning is worth knowing, because it is
            essentially the argument you would be making. Their guidance says
            the risk of a patient self-medicating with hormones from an
            unregulated source may be greater than the risk of starting
            treatment before a specialist has assessed them.
          </div>
          <div className={styles.calloutBody}>
            Being straight about the odds: your GP is allowed to say no, and in
            a 2025 survey most trans people said theirs did. It is still worth
            asking, and other people have written up how to make the case well.
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Getting bloods done, and telling a GP</h2>
        <div className={styles.prose}>
          <p>
            <strong>You do not need a GP to get tested.</strong> Private blood
            tests in the UK run from roughly £20 for a single marker up to around
            £90 for a fuller panel, and you can book one yourself. Some are
            finger-prick kits by post, some need a venous draw at a clinic, which
            usually costs more.
          </p>
          <p>
            Two things worth knowing before you book. Having someone interpret the
            results is usually a separate fee, often £100 or more. And most of
            these panels are marketed at cis men worried about testosterone, so
            the naming is unhelpful and it is worth checking exactly what is
            included rather than trusting the label on the box.
          </p>
          <p>
            <strong>Telling your GP.</strong> The fear that stops most people is
            that disclosing gets you cut off. In practice a GP cannot stop you
            doing what you are doing, and what disclosure usually buys you is
            monitoring, which is the thing that is hardest to arrange alone.
          </p>
          <p>
            It also means it is on your record. That matters more than it sounds
            if you ever end up in A&amp;E, having surgery, or unable to speak for
            yourself, because otherwise nobody treating you knows.
          </p>
          <p>
            Some GPs will monitor without prescribing. That is a real and ordinary
            arrangement, and it is a smaller ask than a bridging prescription if
            you would rather start there.
          </p>
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Storage</h2>
        <div className={styles.prose}>
          <p>
            Injectable estradiol usually wants ordinary room temperature, roughly
            20 to 25°C, and most kinds are not meant to live in the fridge. Cold
            can make crystals form, which does not necessarily mean it is ruined:
            warming it back to room temperature normally clears them. Heat is the
            one that actually degrades it, and so is light, which is why vials
            come in amber glass or a carton. Keeping it in the box it came in is
            doing a job.
          </p>
          <p>
            Expiry dates and shelf life are not the same thing. An expiry date is
            typically set at a year and is often shorter than how long the thing
            genuinely lasts. Past it, the usual concern is that it has weakened
            rather than that it has become harmful.
          </p>
          <p>
            Once a multi-dose vial has been punctured, the standard used in
            pharmacies is 28 days. In practice people often use them a good deal
            longer than that, and the gap between those two numbers is worth
            knowing about rather than being surprised by. We are not going to tell
            you which to follow.
          </p>
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Sharps</h2>
        <div className={styles.prose}>
          <p>
            Used needles never go in a household or recycling bin. You need a
            sharps bin, and you can buy one from a pharmacy without a prescription
            if you would rather not ask your GP.
          </p>
          <p>
            When it is full, your local council is responsible for collecting it,
            and most do not charge. There is a postcode lookup on GOV.UK that
            takes you straight to your council&apos;s page. In some areas you can
            also hand it back to a pharmacy or GP practice instead.
          </p>
        </div>
        <div className={`${styles.group} ${styles.tintMint}`}>
          <ExternalRow
            href="https://www.gov.uk/request-clinical-waste-collection"
            title="Request a clinical waste collection"
            meta="GOV.UK"
          />
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>If a package does not arrive</h2>
        <div className={styles.prose}>
          <p>
            Sometimes things get stopped at the border. If that happens you would
            normally get a formal seizure notice in the post rather than simply
            nothing turning up, and it sets out why and what your options are.
          </p>
        </div>
        {/* The deadline gets the tint, because it is the only thing on this page
            that stops being fixable once it has passed. Mint rather than a
            warning colour: this is worth knowing, not something to be alarmed
            by. */}
        <div className={`${styles.callout} ${styles.calloutMint}`}>
          <div className={styles.calloutBody}>
            The part worth knowing before you ever need it:{" "}
            <strong>
              there is a one month time limit, it is set in law, and there is no
              provision for late challenges.
            </strong>{" "}
            After that, ownership passes and there is no other route. So the worst
            thing to do with that letter is put it in a drawer while you work out
            how you feel about it.
          </div>
        </div>
        <div className={styles.prose}>
          <p>
            There are two formal options and you can use both. Challenge whether
            the seizure was lawful, or accept that it was and ask for the item
            back anyway. The government&apos;s own page sets out how each works.
          </p>
          <p>
            We cannot advise you on this and will not pretend otherwise.
          </p>
        </div>
        <div className={`${styles.group} ${styles.tintMint}`}>
          <ExternalRow
            href="https://www.gov.uk/guidance/what-you-can-do-if-things-are-seized-by-hmrc-or-border-force"
            title="What you can do if things are seized"
            meta="GOV.UK"
          />
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Where people get their information</h2>
        <div className={styles.prose}>
          <p>
            Blossom does not tell anyone what to take, where to get it, or what
            their results mean. That is not false modesty. We would be worse at it
            than the people who do it properly, and being worse at this in
            particular gets people hurt.
          </p>
          <p>
            These are maintained by other people, actively, by communities who
            correct each other. They are not ours and we do not run them. Their
            advice is theirs.
          </p>
        </div>
        <div className={`${styles.group} ${styles.tintSky}`}>
          {SOURCES.map((source) => (
            <ExternalRow
              key={source.href}
              href={source.href}
              title={source.name}
              meta={source.what}
              pill={source.vendors ? "Covers suppliers" : undefined}
            />
          ))}
        </div>
        <p className={styles.footnote}>
          If you find something out of date here, or a link that has gone
          somewhere odd, tell us and we will check it.
        </p>
      </section>
    </div>
  );
}

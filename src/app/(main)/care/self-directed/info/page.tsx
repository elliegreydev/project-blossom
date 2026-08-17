"use client";

import { useLiveQuery } from "dexie-react-hooks";
import ScreenHeader from "@/components/ScreenHeader";
import { db, SELF_DIRECTED_ID } from "@/lib/db";
import { sectionLabel } from "@/lib/selfDirected";
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

export default function SelfDirectedInfoPage() {
  const settings = useLiveQuery(async () => (await db.selfDirected.get(SELF_DIRECTED_ID)) ?? null, []);
  if (settings === undefined) return null;

  return (
    <div className={feature.screen}>
      <ScreenHeader title="Practical things" backHref="/care/self-directed" />

      <p className={styles.intro}>
        Written and checked by us, sourced where it matters, and deliberately
        short on opinions. There is no dosing advice here and nothing telling
        you where to buy anything.
      </p>

      <div className={feature.section}>
        <div className={feature.sectionTitle}>Routes you might not know about</div>
        <p className={styles.intro}>
          Most people end up doing this themselves because the wait is measured
          in years and nothing else is on offer. A few other doors do exist
          though, and they are badly advertised, so plenty of people never hear
          about them.
        </p>
        <p className={styles.intro}>
          None of this is a nudge to stop what you are doing. It is just what is
          there.
        </p>

        <div className={styles.prompt}>
          <div className={styles.promptTitle}>A bridging prescription</div>
          <div className={styles.promptBody}>
            Your GP can prescribe hormones to someone who is already
            self-medicating, while you wait for a gender clinic. This is a
            recognised approach rather than a favour. The GMC describes it as a
            harm reduction strategy, and the Royal College of Psychiatrists
            supports it for exactly this situation: someone already taking
            hormones from an unregulated source while waiting to be seen.
          </div>
          <div className={styles.promptBody}>
            The GMC&apos;s own reasoning is worth knowing, because it is
            essentially the argument you would be making. Their guidance says
            the risk of a patient self-medicating with hormones from an
            unregulated source may be greater than the risk of starting
            treatment before a specialist has assessed them.
          </div>
          <div className={styles.promptBody}>
            Being straight about the odds: your GP is allowed to say no, and in
            a 2025 survey most trans people said theirs did. It is still worth
            asking, and other people have written up how to make the case well.
          </div>
        </div>
      </div>

      <div className={feature.section}>
        <div className={feature.sectionTitle}>Getting bloods done, and telling a GP</div>

        <p className={styles.intro}>
          <strong>You do not need a GP to get tested.</strong> Private blood
          tests in the UK run from roughly £20 for a single marker up to around
          £90 for a fuller panel, and you can book one yourself. Some are
          finger-prick kits by post, some need a venous draw at a clinic, which
          usually costs more.
        </p>
        <p className={styles.intro}>
          Two things worth knowing before you book. Having someone interpret the
          results is usually a separate fee, often £100 or more. And most of
          these panels are marketed at cis men worried about testosterone, so
          the naming is unhelpful and it is worth checking exactly what is
          included rather than trusting the label on the box.
        </p>
        <p className={styles.intro}>
          <strong>Telling your GP.</strong> The fear that stops most people is
          that disclosing gets you cut off. In practice a GP cannot stop you
          doing what you are doing, and what disclosure usually buys you is
          monitoring, which is the thing that is hardest to arrange alone.
        </p>
        <p className={styles.intro}>
          It also means it is on your record. That matters more than it sounds
          if you ever end up in A&amp;E, having surgery, or unable to speak for
          yourself, because otherwise nobody treating you knows.
        </p>
        <p className={styles.intro}>
          Some GPs will monitor without prescribing. That is a real and ordinary
          arrangement, and it is a smaller ask than a bridging prescription if
          you would rather start there.
        </p>
      </div>

      <div className={feature.section}>
        <div className={feature.sectionTitle}>Storage</div>
        <p className={styles.intro}>
          Injectable estradiol usually wants ordinary room temperature, roughly
          20 to 25°C, and most kinds are not meant to live in the fridge. Cold
          can make crystals form, which does not necessarily mean it is ruined:
          warming it back to room temperature normally clears them. Heat is the
          one that actually degrades it, and so is light, which is why vials
          come in amber glass or a carton. Keeping it in the box it came in is
          doing a job.
        </p>
        <p className={styles.intro}>
          Expiry dates and shelf life are not the same thing. An expiry date is
          typically set at a year and is often shorter than how long the thing
          genuinely lasts. Past it, the usual concern is that it has weakened
          rather than that it has become harmful.
        </p>
        <p className={styles.intro}>
          Once a multi-dose vial has been punctured, the standard used in
          pharmacies is 28 days. In practice people often use them a good deal
          longer than that, and the gap between those two numbers is worth
          knowing about rather than being surprised by. We are not going to tell
          you which to follow.
        </p>
      </div>

      <div className={feature.section}>
        <div className={feature.sectionTitle}>Sharps</div>
        <p className={styles.intro}>
          Used needles never go in a household or recycling bin. You need a
          sharps bin, and you can buy one from a pharmacy without a prescription
          if you would rather not ask your GP.
        </p>
        <p className={styles.intro}>
          When it is full, your local council is responsible for collecting it,
          and most do not charge. There is a postcode lookup on GOV.UK that
          takes you straight to your council&apos;s page. In some areas you can
          also hand it back to a pharmacy or GP practice instead.
        </p>
        <a
          className={styles.link}
          href="https://www.gov.uk/request-clinical-waste-collection"
          target="_blank"
          rel="noreferrer noopener"
        >
          <span className={styles.linkTitle}>Request a clinical waste collection</span>
          <span className={styles.linkMeta}>GOV.UK</span>
        </a>
      </div>

      <div className={feature.section}>
        <div className={feature.sectionTitle}>If a package does not arrive</div>
        <p className={styles.intro}>
          Sometimes things get stopped at the border. If that happens you would
          normally get a formal seizure notice in the post rather than simply
          nothing turning up, and it sets out why and what your options are.
        </p>
        <p className={styles.intro}>
          The part worth knowing before you ever need it:{" "}
          <strong>
            there is a one month time limit, it is set in law, and there is no
            provision for late challenges.
          </strong>{" "}
          After that, ownership passes and there is no other route. So the worst
          thing to do with that letter is put it in a drawer while you work out
          how you feel about it.
        </p>
        <p className={styles.intro}>
          There are two formal options and you can use both. Challenge whether
          the seizure was lawful, or accept that it was and ask for the item
          back anyway. The government&apos;s own page sets out how each works.
        </p>
        <p className={styles.intro}>
          We cannot advise you on this and will not pretend otherwise.
        </p>
        <a
          className={styles.link}
          href="https://www.gov.uk/guidance/what-you-can-do-if-things-are-seized-by-hmrc-or-border-force"
          target="_blank"
          rel="noreferrer noopener"
        >
          <span className={styles.linkTitle}>What you can do if things are seized</span>
          <span className={styles.linkMeta}>GOV.UK</span>
        </a>
      </div>

      <div className={feature.section}>
        <div className={feature.sectionTitle}>Where people get their information</div>
        <p className={styles.intro}>
          Blossom does not tell anyone what to take, where to get it, or what
          their results mean. That is not false modesty. We would be worse at it
          than the people who do it properly, and being worse at this in
          particular gets people hurt.
        </p>
        <p className={styles.intro}>
          These are maintained by other people, actively, by communities who
          correct each other. They are not ours and we do not run them. Their
          advice is theirs.
        </p>
        <div className={styles.links}>
          {SOURCES.map((source) => (
            <a
              key={source.href}
              className={styles.link}
              href={source.href}
              target="_blank"
              rel="noreferrer noopener"
            >
              <span>
                <span className={styles.linkTitle}>{source.name}</span>
                <span className={styles.promptBody} style={{ display: "block", marginTop: 3 }}>
                  {source.what}
                </span>
              </span>
              {source.vendors && <span className={styles.linkMeta}>Covers suppliers</span>}
            </a>
          ))}
        </div>
        <p className={styles.overviewMeta} style={{ marginTop: 4 }}>
          If you find something out of date here, or a link that has gone
          somewhere odd, tell us and we will check it.
        </p>
      </div>
    </div>
  );
}

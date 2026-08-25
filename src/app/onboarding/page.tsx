"use client";

import { useEffect, useState } from "react";
import StorageUnavailable from "@/components/StorageUnavailable";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import styles from "@/components/onboarding.module.css";
import {
  type AuroraMode,
  type ModuleKey,
  db,
  getOrCreateProfile,
  updateProfile,
  LOCAL_PROFILE_ID,
} from "@/lib/db";
import { reportClientError } from "@/lib/clientErrorReport";
import {
  COUNTRIES,
  SUBREGIONS,
  resourcesForRegion,
  syncRegionResourcesCache,
} from "@/lib/regionResources";
import { DEFAULT_ONBOARDING_MODULES, MODULE_OPTIONS as MODULES } from "@/lib/moduleOptions";

// Six steps, and each one changes something about the app that follows. Three
// of the old nine did not: HRT status only ever reached the doctor handover
// PDF, the sync question wrote syncEnabled: false whichever card was pressed,
// and the install instructions were static text that InstallAppNudge already
// says better, with a real install button attached. Asking somebody for a
// decision that changes nothing is how a first minute gets spent on nothing.
const TOTAL_STEPS = 6;

const AURORA_MODES: { key: AuroraMode; title: string; desc: string }[] = [
  { key: "quiet", title: "Quiet", desc: "Only appears when you open it" },
  { key: "gentle", title: "Gentle", desc: "Occasional reminders and soft suggestions" },
  { key: "supportive", title: "Supportive", desc: "More frequent check-ins and encouragement" },
  { key: "disabled", title: "Disabled", desc: "No prompts beyond essential messages" },
];

export default function OnboardingPage() {
  const router = useRouter();
  const profile = useLiveQuery(() => db.profiles.get(LOCAL_PROFILE_ID));
  // The region step's payoff is counted off the real cache rather than a
  // number written in the copy, so it can never claim something the device
  // does not actually have.
  const cachedResources = useLiveQuery(() => db.cachedRegionResources.toArray(), []);
  const [step, setStep] = useState(0);
  const [ready, setReady] = useState(false);
  const [storageFailed, setStorageFailed] = useState(false);

  const [displayName, setDisplayName] = useState("");
  const [pronouns, setPronouns] = useState("");
  const [region, setRegion] = useState("");
  const [subregion, setSubregion] = useState("");
  const [modules, setModules] = useState<ModuleKey[]>(DEFAULT_ONBOARDING_MODULES);
  const [auroraMode, setAuroraMode] = useState<AuroraMode>("gentle");

  useEffect(() => {
    getOrCreateProfile().then((p) => {
      if (p.onboardingCompletedAt) {
        router.replace("/");
        return;
      }
      // A profile saved part-way through the older, longer flow can hold a
      // step index that no longer exists. Left as it was, somebody came back
      // to an empty screen with a Continue button that could never reach the
      // end, and every tap took them further into nothing.
      setStep(Math.min(Math.max(p.onboardingStep ?? 0, 0), TOTAL_STEPS - 1));
      setDisplayName(p.displayName ?? "");
      setPronouns(p.pronouns ?? "");
      setRegion(p.region ?? "");
      setSubregion(p.subregion ?? "");
      setModules(p.enabledModules?.length ? p.enabledModules : DEFAULT_ONBOARDING_MODULES);
      setAuroraMode(p.auroraMode ?? "gentle");
      setReady(true);
    })
      // This is the very first screen anyone sees, so a device that cannot
      // store anything failed here before Blossom had said a single word.
      // It rendered null, which is a blank white page. Reporting it is how we
      // find out that somebody could not open Blossom at all, which is the
      // one failure nobody would ever write in to tell us about.
      .catch((error) => {
        reportClientError("storing data on this device", error);
        setStorageFailed(true);
      });
    // Onboarding sits outside the main layout, which is where the resource
    // cache is normally filled, so a brand new device would reach the region
    // step with nothing saved. Seeding here is what makes that step's promise
    // true at the moment it is made. Same call the crisis page makes for the
    // same reason.
    void syncRegionResourcesCache();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (storageFailed) {
    return <StorageUnavailable onRetry={() => window.location.reload()} />;
  }

  if (!ready || !profile) return null;

  async function goTo(next: number) {
    await updateProfile({ onboardingStep: next });
    setStep(next);
  }

  async function finish() {
    await updateProfile({
      displayName: displayName.trim() || null,
      pronouns: pronouns.trim() || null,
      region: region || null,
      subregion: subregion || null,
      enabledModules: modules,
      auroraMode,
      onboardingCompletedAt: new Date().toISOString(),
    });
    router.replace("/");
  }

  async function skipRest() {
    // Age confirmation already required to get past step 0.
    await finish();
  }

  function toggleModule(key: ModuleKey) {
    setModules((prev) =>
      prev.includes(key) ? prev.filter((m) => m !== key) : [...prev, key]
    );
  }

  const canSkipAll = step > 0;

  // Zero while the cache is still loading, and zero for a country with nothing
  // saved. Both render nothing at all below: a "0 services" line is worse than
  // silence, and a number we have not actually counted would be worse still.
  const savedResourceCount = cachedResources
    ? resourcesForRegion(cachedResources, region || null, subregion || null).length
    : 0;

  // The only two countries on the list that take a "the". Spelled out rather
  // than guessed at, because "services for United States" reads like a form
  // letter and this line is meant to sound like a person.
  const regionLabel =
    region === "United Kingdom" || region === "United States" ? `the ${region}` : region;

  return (
    <div className={styles.screen}>
      <div className={styles.progress}>
        {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
          <div
            key={i}
            className={`${styles.progressDot} ${i <= step ? styles.done : ""}`}
          />
        ))}
      </div>

      <div className={styles.body}>
        {step === 0 && (
          <>
            <div className={styles.eyebrow}>Welcome</div>
            <h1 className={styles.title}>Hi, we&apos;re glad you&apos;re here.</h1>
            <p className={styles.subtitle}>
              Blossom is yours to shape at your own pace. Everything here is optional
              and you can change it later. Nothing is locked in.
            </p>
            <p className={styles.subtitle}>
              Before we continue, we just need one thing.
            </p>
            <label className={styles.checkboxRow}>
              <input
                type="checkbox"
                checked={!!profile.ageConfirmedAt}
                onChange={(e) =>
                  updateProfile({
                    ageConfirmedAt: e.target.checked ? new Date().toISOString() : null,
                  })
                }
              />
              <span className={styles.checkboxLabel}>
                I confirm that I am 18 or older.
              </span>
            </label>
            <p className={styles.legalLine}>
              By continuing, you agree to Blossom&apos;s{" "}
              <Link href="/legal/terms">Terms of Service</Link> and{" "}
              <Link href="/legal/privacy">Privacy Policy</Link>.
            </p>
          </>
        )}

        {step === 1 && (
          <>
            <div className={styles.eyebrow}>About you</div>
            <h1 className={styles.title}>What should we call you?</h1>
            <p className={styles.subtitle}>
              This is just for the app. Not your legal name, and never shared.
            </p>
            <div className={styles.field}>
              <span className={styles.label}>Chosen or display name</span>
              <input
                className={styles.input}
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Whatever feels right"
              />
            </div>
            <div className={styles.field}>
              <span className={styles.label}>Pronouns (optional)</span>
              <input
                className={styles.input}
                value={pronouns}
                onChange={(e) => setPronouns(e.target.value)}
                placeholder="e.g. she/her, they/them"
              />
            </div>
          </>
        )}

        {/* The only question in the flow that can hand something back in the
            same second it is answered, so the payoff below is counted rather
            than claimed. The six-country caveat stays in the copy: without it
            somebody from anywhere else reads a promise, finds no dropdown
            entry for home, and has been told they are the exception on the
            third screen.

            The privacy line is qualified on purpose. region and subregion are
            in the profile sync payload, and the profile is the one entity the
            per-category exclusions cannot leave out, so "never sent anywhere"
            would be a promise sync itself breaks. Asking a trans person where
            they live is not the place to be casually absolute. */}
        {step === 2 && (
          <>
            <div className={styles.eyebrow}>Region</div>
            <h1 className={styles.title}>Where are you based?</h1>
            <p className={styles.subtitle}>
              Blossom keeps the support services for your country on this device.
              Answering sends nothing anywhere, and it stays here unless you ever turn
              sync on. More countries are still being added, so if yours isn&apos;t
              listed yet you can skip this.
            </p>
            <div className={styles.field}>
              <span className={styles.label}>Country</span>
              <select
                className={styles.select}
                value={region}
                onChange={(e) => {
                  setRegion(e.target.value);
                  setSubregion("");
                }}
              >
                <option value="">Prefer not to say</option>
                {COUNTRIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {region && SUBREGIONS[region as keyof typeof SUBREGIONS] && (
              <div className={styles.field}>
                <span className={styles.label}>
                  {region === "United States" ? "State" : region === "Canada" ? "Province or territory" : region === "Australia" ? "State or territory" : "Nation"}
                </span>
                <select
                  className={styles.select}
                  value={subregion}
                  onChange={(e) => setSubregion(e.target.value)}
                >
                  <option value="">Prefer not to say</option>
                  {SUBREGIONS[region as keyof typeof SUBREGIONS]!.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {savedResourceCount > 0 && (
              <div className={styles.callout} aria-live="polite">
                <strong>
                  {savedResourceCount} checked{" "}
                  {savedResourceCount === 1 ? "service" : "services"} for {regionLabel}
                </strong>{" "}
                {savedResourceCount === 1 ? "is" : "are"} already saved on this
                device, ready to open with no signal.
              </div>
            )}
          </>
        )}

        {step === 3 && (
          <>
            <div className={styles.eyebrow}>Modules</div>
            <h1 className={styles.title}>What would you like to use?</h1>
            <p className={styles.subtitle}>
              Pick as many or as few as you like. You can change this later in
              Settings, and nothing you skip is deleted.
            </p>
            <div className={styles.optionGrid}>
              {MODULES.map((m) => (
                <button
                  key={m.key}
                  type="button"
                  className={`${styles.optionCard} ${modules.includes(m.key) ? styles.selected : ""}`}
                  aria-pressed={modules.includes(m.key)}
                  onClick={() => toggleModule(m.key)}
                >
                  <span className={styles.optionTitle}>{m.title}</span>
                  <span className={styles.optionDesc}>{m.desc}</span>
                </button>
              ))}
            </div>
          </>
        )}

        {step === 4 && (
          <>
            <div className={styles.eyebrow}>Aurora</div>
            <h1 className={styles.title}>How present should Aurora be?</h1>
            <p className={styles.subtitle}>
              Aurora is your optional guide. You&apos;re always in control of how much
              she shows up.
            </p>
            <div className={styles.optionGrid}>
              {AURORA_MODES.map((m) => (
                <button
                  key={m.key}
                  type="button"
                  className={`${styles.optionCard} ${auroraMode === m.key ? styles.selected : ""}`}
                  aria-pressed={auroraMode === m.key}
                  onClick={() => setAuroraMode(m.key)}
                >
                  <span className={styles.optionTitle}>{m.title}</span>
                  <span className={styles.optionDesc}>{m.desc}</span>
                </button>
              ))}
            </div>
          </>
        )}

        {/* Both of these were questions once, and both had a safe answer
            already selected, so the only thing asking achieved was making
            somebody agree to what was going to happen anyway. Told, not
            asked. The second half is the promise the old sync step made and
            is far too important to have been deleted along with it.

            Both sentences are scoped rather than absolute, and the scope is
            the whole point. "Reminders", not "notifications": a reply on a
            support ticket pushes "New reply on a support ticket", which is a
            notification that does say what it is about. "Everything you
            record", not "nothing": a ticket or a feedback message reaches our
            servers with sync off, exactly as Settings > Privacy already says.
            This is the screen where a promise gets believed, so it only makes
            the ones the code keeps. */}
        {step === 5 && (
          <>
            <div className={styles.eyebrow}>Before you go in</div>
            <h1 className={styles.title}>Two things already set for you.</h1>
            <p className={styles.subtitle}>
              Reminders do not say what they are about. One tells you something is
              due and nothing more, so a lock screen someone else can see cannot out
              you.
            </p>
            <div className={styles.callout}>
              <strong>Everything you record stays on this device.</strong> Sync
              exists if you ever want it, it is off until you turn it on, and photos,
              voice recordings, euphoria entries, Time Capsules and trips never sync
              at all. Not even then.
            </div>
          </>
        )}
      </div>

      <div className={styles.footer}>
        <div className={styles.buttonRow}>
          {step > 0 && (
            <button
              type="button"
              className={styles.tertiaryButton}
              onClick={() => goTo(step - 1)}
            >
              Back
            </button>
          )}
          <button
            type="button"
            className={styles.primaryButton}
            disabled={step === 0 && !profile.ageConfirmedAt}
            onClick={() =>
              step === TOTAL_STEPS - 1 ? finish() : goTo(step + 1)
            }
          >
            {step === TOTAL_STEPS - 1 ? "Take me to Blossom 🌸" : "Continue"}
          </button>
        </div>
        {canSkipAll && (
          <button type="button" className={styles.skipAllButton} onClick={skipRest}>
            Skip the rest for now
          </button>
        )}
        <Link href="/crisis-support" className={styles.skipAllButton}>
          Need support right now?
        </Link>
      </div>
    </div>
  );
}

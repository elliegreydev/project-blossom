"use client";

import { useEffect, useState } from "react";
import StorageUnavailable from "@/components/StorageUnavailable";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import styles from "@/components/onboarding.module.css";
import {
  type AuroraMode,
  type HrtStatus,
  type ModuleKey,
  db,
  getOrCreateProfile,
  updateProfile,
  LOCAL_PROFILE_ID,
} from "@/lib/db";
import { COUNTRIES, SUBREGIONS } from "@/lib/regionResources";
import { DEFAULT_ONBOARDING_MODULES, MODULE_OPTIONS as MODULES } from "@/lib/moduleOptions";

// Nine steps, but somebody already inside the installed app sees eight: the
// last step teaches installing, and teaching it to a person who has already
// done it is noise. totalSteps below handles that.
const TOTAL_STEPS = 9;

const AURORA_MODES: { key: AuroraMode; title: string; desc: string }[] = [
  { key: "quiet", title: "Quiet", desc: "Only appears when you open it" },
  { key: "gentle", title: "Gentle", desc: "Occasional reminders and soft suggestions" },
  { key: "supportive", title: "Supportive", desc: "More frequent check-ins and encouragement" },
  { key: "disabled", title: "Disabled", desc: "No prompts beyond essential messages" },
];

const HRT_OPTIONS: { key: NonNullable<HrtStatus>; title: string }[] = [
  { key: "on", title: "I'm currently on HRT" },
  { key: "considering", title: "I'm considering it" },
  { key: "not_tracking", title: "I don't want to track this" },
];

export default function OnboardingPage() {
  const router = useRouter();
  const profile = useLiveQuery(() => db.profiles.get(LOCAL_PROFILE_ID));
  const [step, setStep] = useState(0);
  const [ready, setReady] = useState(false);
  const [storageFailed, setStorageFailed] = useState(false);

  const [displayName, setDisplayName] = useState("");
  const [pronouns, setPronouns] = useState("");
  const [region, setRegion] = useState("");
  const [subregion, setSubregion] = useState("");
  const [hrtStatus, setHrtStatus] = useState<HrtStatus>(null);
  const [modules, setModules] = useState<ModuleKey[]>(DEFAULT_ONBOARDING_MODULES);
  const [auroraMode, setAuroraMode] = useState<AuroraMode>("gentle");
  const [discreetReminders, setDiscreetReminders] = useState(true);
  const [lockSensitive, setLockSensitive] = useState(false);
  const [setUpSync, setSetUpSync] = useState(false);

  useEffect(() => {
    getOrCreateProfile().then((p) => {
      if (p.onboardingCompletedAt) {
        router.replace("/");
        return;
      }
      setStep(p.onboardingStep ?? 0);
      setDisplayName(p.displayName ?? "");
      setPronouns(p.pronouns ?? "");
      setRegion(p.region ?? "");
      setSubregion(p.subregion ?? "");
      setHrtStatus(p.hrtStatus);
      setModules(p.enabledModules?.length ? p.enabledModules : DEFAULT_ONBOARDING_MODULES);
      setAuroraMode(p.auroraMode ?? "gentle");
      setDiscreetReminders((p.reminderPrivacy ?? "discreet") === "discreet");
      setLockSensitive(p.sensitiveModulesLocked ?? false);
      setSetUpSync(false);
      setReady(true);
    })
      // This is the very first screen anyone sees, so a device that cannot
      // store anything failed here before Blossom had said a single word.
      // It rendered null, which is a blank white page.
      .catch(() => setStorageFailed(true));
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
      hrtStatus,
      enabledModules: modules,
      auroraMode,
      reminderPrivacy: discreetReminders ? "discreet" : "detailed",
      sensitiveModulesLocked: lockSensitive,
      syncEnabled: false,
      onboardingCompletedAt: new Date().toISOString(),
    });
    router.replace(setUpSync ? "/account" : "/");
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

  // Already opened from a home-screen icon? Then the install step teaches
  // nothing, so the flow ends at sync. matchMedia covers Android and desktop
  // installs; navigator.standalone is Safari's own flag for the same thing.
  const isStandalone =
    typeof window !== "undefined" &&
    (window.matchMedia?.("(display-mode: standalone)").matches ||
      (navigator as { standalone?: boolean }).standalone === true);
  const totalSteps = isStandalone ? TOTAL_STEPS - 1 : TOTAL_STEPS;

  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
  const isIos = /iPhone|iPad|iPod/i.test(ua);
  const isAndroid = /Android/i.test(ua);

  return (
    <div className={styles.screen}>
      <div className={styles.progress}>
        {Array.from({ length: totalSteps }).map((_, i) => (
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

        {step === 2 && (
          <>
            <div className={styles.eyebrow}>Region</div>
            <h1 className={styles.title}>Where are you based?</h1>
            <p className={styles.subtitle}>
              This helps us show relevant support resources. More countries will be
              added over time - if yours isn&apos;t listed yet, you can skip this.
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
          </>
        )}

        {step === 3 && (
          <>
            <div className={styles.eyebrow}>HRT</div>
            <h1 className={styles.title}>Would you like to track HRT?</h1>
            <p className={styles.subtitle}>
              Entirely optional. You can turn this on or off at any time.
            </p>
            <div className={styles.optionGrid}>
              {HRT_OPTIONS.map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  className={`${styles.optionCard} ${hrtStatus === opt.key ? styles.selected : ""}`}
                  aria-pressed={hrtStatus === opt.key}
                  onClick={() => setHrtStatus(opt.key)}
                >
                  <span className={styles.optionTitle}>{opt.title}</span>
                </button>
              ))}
            </div>
          </>
        )}

        {step === 4 && (
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

        {step === 5 && (
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

        {step === 6 && (
          <>
            <div className={styles.eyebrow}>Privacy</div>
            <h1 className={styles.title}>Let&apos;s keep things discreet.</h1>
            <p className={styles.subtitle}>
              These can be changed any time in Settings.
            </p>
            <label className={styles.checkboxRow}>
              <input
                type="checkbox"
                checked={discreetReminders}
                onChange={(e) => setDiscreetReminders(e.target.checked)}
              />
              <span className={styles.checkboxLabel}>
                Keep notification text discreet (no medication names, appointment
                types, or journal content shown by default)
              </span>
            </label>
            <label className={styles.checkboxRow}>
              <input
                type="checkbox"
                checked={lockSensitive}
                onChange={(e) => setLockSensitive(e.target.checked)}
              />
              <span className={styles.checkboxLabel}>
                Lock sensitive modules behind an extra app lock step
              </span>
            </label>
          </>
        )}

        {step === 7 && (
          <>
            <div className={styles.eyebrow}>Sync</div>
            <h1 className={styles.title}>Local-only, or sync across devices?</h1>
            <p className={styles.subtitle}>
              Blossom works fully without an account. Sync is optional, and you choose
              category by category what syncs, so your journal can stay on this device
              while your medication follows you.
            </p>
            <div className={styles.callout}>
              <strong>Whatever you choose here:</strong> photos, voice recordings,
              euphoria entries, Time Capsules, Aurora chats and trips never leave this
              device. Not with sync on, not ever.
            </div>
            <div className={styles.optionGrid}>
              <button
                type="button"
                className={`${styles.optionCard} ${!setUpSync ? styles.selected : ""}`}
                aria-pressed={!setUpSync}
                onClick={() => setSetUpSync(false)}
              >
                <span className={styles.optionTitle}>Keep it local-only</span>
                <span className={styles.optionDesc}>
                  Everything stays on this device. You can change your mind any time.
                </span>
              </button>
              <button
                type="button"
                className={`${styles.optionCard} ${setUpSync ? styles.selected : ""}`}
                aria-pressed={setUpSync}
                onClick={() => setSetUpSync(true)}
              >
                <span className={styles.optionTitle}>Set up sync after this</span>
                <span className={styles.optionDesc}>
                  Sign in with just an email and pick what syncs, once you&apos;re in.
                </span>
              </button>
            </div>
          </>
        )}

        {step === 8 && !isStandalone && (
          <>
            <div className={styles.eyebrow}>One last thing</div>
            <h1 className={styles.title}>Put Blossom on your home screen</h1>
            <p className={styles.subtitle}>
              It opens quicker, works with no signal, and your phone treats an
              installed app&apos;s data as worth protecting rather than something to
              clear out.
            </p>
            <div className={styles.installSteps}>
              {(isIos || !isAndroid) && (
                <div className={styles.installStep}>
                  <span className={styles.installNum}>1</span>
                  <span>
                    <strong>On iPhone:</strong> in Safari, tap the Share button, then{" "}
                    <strong>Add to Home Screen</strong>.
                  </span>
                </div>
              )}
              {(isAndroid || !isIos) && (
                <div className={styles.installStep}>
                  <span className={styles.installNum}>{isAndroid && !isIos ? 1 : 2}</span>
                  <span>
                    <strong>On Android:</strong> in Chrome, tap the menu, then{" "}
                    <strong>Add to home screen</strong> or <strong>Install app</strong>.
                  </span>
                </div>
              )}
              <div className={styles.installStep}>
                <span className={styles.installNum}>{isIos || isAndroid ? 2 : 3}</span>
                <span>From then on, open Blossom from the new icon, not the browser.</span>
              </div>
            </div>
            <div className={`${styles.callout} ${styles.calloutPink}`}>
              The icon is visible on your home screen. If someone else uses your phone
              and that&apos;s a worry, it&apos;s okay to skip this - Blossom works in
              the browser too.
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
              step === totalSteps - 1 ? finish() : goTo(step + 1)
            }
          >
            {step === totalSteps - 1 ? (isStandalone ? "Finish" : "Take me to Blossom 🌸") : "Continue"}
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

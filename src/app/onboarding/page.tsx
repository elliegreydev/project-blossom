"use client";

import { useEffect, useState } from "react";
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

const TOTAL_STEPS = 8;

const MODULES: { key: ModuleKey; title: string; desc: string }[] = [
  { key: "journey", title: "Journey", desc: "Milestones and your timeline" },
  { key: "medication", title: "Medication", desc: "Schedules, reminders, history" },
  { key: "appointments", title: "Appointments", desc: "Clinics, tests, reminders" },
  { key: "journal", title: "Journal & check-ins", desc: "Notes, mood, reflections" },
  { key: "goals", title: "Goals", desc: "Things you're working towards" },
];

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

  const [displayName, setDisplayName] = useState("");
  const [pronouns, setPronouns] = useState("");
  const [region, setRegion] = useState("UK");
  const [hrtStatus, setHrtStatus] = useState<HrtStatus>(null);
  const [modules, setModules] = useState<ModuleKey[]>(MODULES.map((m) => m.key));
  const [auroraMode, setAuroraMode] = useState<AuroraMode>("gentle");
  const [discreetReminders, setDiscreetReminders] = useState(true);
  const [lockSensitive, setLockSensitive] = useState(false);
  const [syncEnabled, setSyncEnabled] = useState(false);

  useEffect(() => {
    getOrCreateProfile().then((p) => {
      if (p.onboardingCompletedAt) {
        router.replace("/");
        return;
      }
      setStep(p.onboardingStep ?? 0);
      setDisplayName(p.displayName ?? "");
      setPronouns(p.pronouns ?? "");
      setRegion(p.region ?? "UK");
      setHrtStatus(p.hrtStatus);
      setModules(p.enabledModules?.length ? p.enabledModules : MODULES.map((m) => m.key));
      setAuroraMode(p.auroraMode ?? "gentle");
      setDiscreetReminders((p.reminderPrivacy ?? "discreet") === "discreet");
      setLockSensitive(p.sensitiveModulesLocked ?? false);
      setSyncEnabled(p.syncEnabled ?? false);
      setReady(true);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      hrtStatus,
      enabledModules: modules,
      auroraMode,
      reminderPrivacy: discreetReminders ? "discreet" : "detailed",
      sensitiveModulesLocked: lockSensitive,
      syncEnabled,
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
              This helps us show relevant support resources and date formats. Only UK
              content is available for now. More regions are on the way.
            </p>
            <div className={styles.field}>
              <span className={styles.label}>Region</span>
              <input className={styles.input} value={region} disabled />
            </div>
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
              Settings.
            </p>
            <div className={styles.optionGrid}>
              {MODULES.map((m) => (
                <button
                  key={m.key}
                  type="button"
                  className={`${styles.optionCard} ${modules.includes(m.key) ? styles.selected : ""}`}
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
              Blossom works fully without an account. Sync is an optional upgrade you
              can turn on any time. Not something you&apos;re missing.
            </p>
            <div className={styles.optionGrid}>
              <button
                type="button"
                className={`${styles.optionCard} ${!syncEnabled ? styles.selected : ""}`}
                onClick={() => setSyncEnabled(false)}
              >
                <span className={styles.optionTitle}>Keep it local-only</span>
                <span className={styles.optionDesc}>
                  Everything stays on this device
                </span>
              </button>
              <button
                type="button"
                className={`${styles.optionCard} ${syncEnabled ? styles.selected : ""}`}
                onClick={() => setSyncEnabled(true)}
              >
                <span className={styles.optionTitle}>Set up sync later</span>
                <span className={styles.optionDesc}>
                  We&apos;ll remind you in Settings. Not built yet
                </span>
              </button>
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
            {step === TOTAL_STEPS - 1 ? "Finish" : "Continue"}
          </button>
        </div>
        {canSkipAll && (
          <button type="button" className={styles.skipAllButton} onClick={skipRest}>
            Skip the rest for now
          </button>
        )}
      </div>
    </div>
  );
}

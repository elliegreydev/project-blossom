import type {
  Appointment,
  AuroraMode,
  AuroraNudgeState,
  CheckIn,
  Goal,
  JournalEntry,
  JourneyEvent,
  Medication,
  MedicationLog,
  Milestone,
  PresentationEntry,
  Profile,
  VoiceGoal,
  VoiceSession,
} from "./db";

export type AuroraSuggestionKind =
  | "appointment"
  | "medication"
  | "wellbeing"
  | "goal"
  | "journey"
  | "voice"
  | "presentation";

export interface AuroraSuggestion {
  key: string;
  kind: AuroraSuggestionKind;
  eyebrow: string;
  title: string;
  message: string;
  actionLabel: string;
  href: string;
  priority: number;
}

export interface AuroraContext {
  now: Date;
  profile: Pick<Profile, "auroraMode" | "enabledModules" | "createdAt" | "onboardingCompletedAt">;
  milestones: Milestone[];
  journeyEvents: JourneyEvent[];
  medications: Medication[];
  medicationLogs: MedicationLog[];
  appointments: Appointment[];
  journalEntries: JournalEntry[];
  checkIns: CheckIn[];
  goals: Goal[];
  voiceGoals: VoiceGoal[];
  voiceSessions: VoiceSession[];
  presentationEntries: PresentationEntry[];
  nudgeStates: AuroraNudgeState[];
}

type Candidate = AuroraSuggestion & { cooldownDays: number };

const DAY_MS = 24 * 60 * 60 * 1000;

function validTime(value: string | null | undefined): number | null {
  if (!value) return null;
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : null;
}

function daysSince(value: string | null | undefined, now: Date): number {
  const time = validTime(value);
  if (time === null) return Number.POSITIVE_INFINITY;
  return Math.max(0, (now.getTime() - time) / DAY_MS);
}

function isCoolingDown(
  state: AuroraNudgeState | undefined,
  mode: AuroraMode,
  baseDays: number,
  now: Date
): boolean {
  if (!state || state.dismissedCount < 1) return false;
  const lastShown = validTime(state.lastShownAt);
  if (lastShown === null) return false;

  const modeFactor = mode === "supportive" ? 0.6 : 1;
  const repeatedDismissalFactor = Math.min(3, Math.max(1, state.dismissedCount));
  const cooldown = Math.max(1, Math.ceil(baseDays * modeFactor * repeatedDismissalFactor));
  return now.getTime() - lastShown < cooldown * DAY_MS;
}

function appointmentWhen(appointmentAt: string, now: Date): string {
  const appointment = new Date(appointmentAt);
  const startToday = new Date(now);
  const startAppointment = new Date(appointment);
  startToday.setHours(0, 0, 0, 0);
  startAppointment.setHours(0, 0, 0, 0);
  const calendarDays = Math.round((startAppointment.getTime() - startToday.getTime()) / DAY_MS);

  if (calendarDays <= 0) return "today";
  if (calendarDays === 1) return "tomorrow";
  return "in the next few days";
}

function upcomingAppointment(context: AuroraContext): Candidate | null {
  if (!context.profile.enabledModules.includes("appointments")) return null;
  const nowTime = context.now.getTime();
  const appointment = context.appointments
    .filter((item) => {
      const time = validTime(item.appointmentAt);
      return time !== null && time >= nowTime && time - nowTime <= 72 * 60 * 60 * 1000;
    })
    .sort((a, b) => a.appointmentAt.localeCompare(b.appointmentAt))[0];

  if (!appointment) return null;
  const when = appointmentWhen(appointment.appointmentAt, context.now);
  return {
    key: `appointment_upcoming:${appointment.id}`,
    kind: "appointment",
    eyebrow: "Coming up",
    title: `A little space before ${when}`,
    message: `You have an appointment ${when}. If it helps, you could gather any questions or notes you want to bring.`,
    actionLabel: "View calendar",
    href: "/calendar",
    priority: 100,
    cooldownDays: 3,
  };
}

function scheduledSlotsToday(medication: Medication, now: Date): Date[] {
  if (!medication.active || !medication.frequency?.times.length) return [];
  const days = medication.frequency.days;
  if (days && !days.includes(now.getDay())) return [];

  return medication.frequency.times.flatMap((time) => {
    const [hours, minutes] = time.split(":").map(Number);
    if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return [];
    const slot = new Date(now);
    slot.setHours(hours, minutes, 0, 0);
    return [slot];
  });
}

function openMedicationLog(context: AuroraContext): Candidate | null {
  if (
    context.profile.auroraMode !== "supportive" ||
    !context.profile.enabledModules.includes("medication")
  )
    return null;

  const nowTime = context.now.getTime();
  const loggedSlots = new Set(
    context.medicationLogs
      .map((log) => log.scheduledTime)
      .filter((slot): slot is string => Boolean(slot))
  );

  const openSlot = context.medications
    .flatMap((medication) =>
      scheduledSlotsToday(medication, context.now).map((slot) => ({ medication, slot }))
    )
    .filter(({ slot }) => {
      const age = nowTime - slot.getTime();
      return age >= 30 * 60 * 1000 && age <= 2 * 60 * 60 * 1000 && !loggedSlots.has(slot.toISOString());
    })
    .sort((a, b) => b.slot.getTime() - a.slot.getTime())[0];

  if (!openSlot) return null;
  return {
    key: `medication_log:${openSlot.medication.id}:${openSlot.slot.toISOString()}`,
    kind: "medication",
    eyebrow: "A quiet reminder",
    title: "Your medication log is still open",
    message: "A scheduled entry has not been logged yet. You can update it whenever you are ready.",
    actionLabel: "Open medication",
    href: "/track/medication",
    priority: 90,
    cooldownDays: 1,
  };
}

function wellbeingCheckIn(context: AuroraContext): Candidate | null {
  if (!context.profile.enabledModules.includes("journal")) return null;
  const thresholdDays = context.profile.auroraMode === "supportive" ? 7 : 14;
  const activityDates = [
    ...context.journalEntries.map((entry) => entry.createdAt),
    ...context.checkIns.map((entry) => entry.createdAt),
  ];
  const latestActivity = activityDates
    .map(validTime)
    .filter((time): time is number => time !== null)
    .sort((a, b) => b - a)[0];
  const profileStartedAt = context.profile.onboardingCompletedAt ?? context.profile.createdAt;
  const inactiveDays = latestActivity
    ? Math.max(0, (context.now.getTime() - latestActivity) / DAY_MS)
    : daysSince(profileStartedAt, context.now);

  if (inactiveDays < thresholdDays) return null;
  return {
    key: "wellbeing_checkin",
    kind: "wellbeing",
    eyebrow: "A gentle check-in",
    title: "How have things been feeling?",
    message: "It has been a little while. If it feels useful, there is space to notice how you have been.",
    actionLabel: "Check in",
    href: "/track/journal",
    priority: 70,
    cooldownDays: thresholdDays,
  };
}

function waitingGoal(context: AuroraContext): Candidate | null {
  if (!context.profile.enabledModules.includes("goals")) return null;
  const thresholdDays = context.profile.auroraMode === "supportive" ? 10 : 21;
  const goal = context.goals
    .filter((item) => item.status === "active" && daysSince(item.updatedAt, context.now) >= thresholdDays)
    .sort((a, b) => a.updatedAt.localeCompare(b.updatedAt))[0];

  if (!goal) return null;
  return {
    key: `goal_waiting:${goal.id}`,
    kind: "goal",
    eyebrow: "Your pace is still the right pace",
    title: "A goal has been waiting quietly",
    message: "You can revisit it, change it, or leave it alone. It is still yours either way.",
    actionLabel: "View goals",
    href: "/track/goals",
    priority: 60,
    cooldownDays: 14,
  };
}

function firstJourneyStep(context: AuroraContext): Candidate | null {
  if (
    !context.profile.enabledModules.includes("journey") ||
    context.milestones.length > 0 ||
    context.journeyEvents.length > 0
  )
    return null;

  return {
    key: "first_milestone",
    kind: "journey",
    eyebrow: "A gentle thought from Aurora",
    title: "Your Journey is here when you want it",
    message: "It is a quiet place to note the moments that matter to you. Nothing needs to be added today.",
    actionLabel: "Open Journey",
    href: "/journey",
    priority: 40,
    cooldownDays: 30,
  };
}

// Only fires once a goal exists - this is about a habit someone has already
// started, not a prompt to start one. Mirrors waitingGoal's shape closely.
function voicePracticeWaiting(context: AuroraContext): Candidate | null {
  if (!context.profile.enabledModules.includes("voicePractice") || context.voiceGoals.length === 0)
    return null;
  const thresholdDays = context.profile.auroraMode === "supportive" ? 10 : 21;
  const latestSession = context.voiceSessions
    .map((session) => validTime(session.createdAt))
    .filter((time): time is number => time !== null)
    .sort((a, b) => b - a)[0];
  const oldestGoalCreatedAt = context.voiceGoals
    .map((goal) => goal.createdAt)
    .sort()[0];
  const inactiveDays = latestSession
    ? Math.max(0, (context.now.getTime() - latestSession) / DAY_MS)
    : daysSince(oldestGoalCreatedAt, context.now);

  if (inactiveDays < thresholdDays) return null;
  return {
    key: "voice_practice_waiting",
    kind: "voice",
    eyebrow: "No rush at all",
    title: "Your practice goal is still there",
    message: "Whenever it feels right, there is space to log a session. Skipping stretches of time is completely fine.",
    actionLabel: "Open voice practice",
    href: "/track/voice",
    priority: 55,
    cooldownDays: thresholdDays,
  };
}

// A quiet, purely informational surfacing of the want-to-try list - never
// framed as "you haven't tried anything", since that would cut against the
// module's own no-pressure design. Doesn't require any inactivity signal.
function presentationWantToTry(context: AuroraContext): Candidate | null {
  if (!context.profile.enabledModules.includes("presentation")) return null;
  const wantToTryCount = context.presentationEntries.filter((entry) => entry.wantToTry).length;
  if (wantToTryCount === 0) return null;

  return {
    key: "presentation_want_to_try",
    kind: "presentation",
    eyebrow: "Whenever you feel like it",
    title: "Your want-to-try list is still there",
    message: `You have ${wantToTryCount} idea${wantToTryCount === 1 ? "" : "s"} saved for whenever feels right. No timeline, no pressure to act on any of it.`,
    actionLabel: "Open presentation",
    href: "/track/presentation",
    priority: 45,
    cooldownDays: 21,
  };
}

export function selectAuroraSuggestion(context: AuroraContext): AuroraSuggestion | null {
  const mode = context.profile.auroraMode;
  if (mode === "disabled" || mode === "quiet") return null;

  const states = new Map(context.nudgeStates.map((state) => [state.nudgeKey, state]));
  const candidates = [
    upcomingAppointment(context),
    openMedicationLog(context),
    wellbeingCheckIn(context),
    waitingGoal(context),
    firstJourneyStep(context),
    voicePracticeWaiting(context),
    presentationWantToTry(context),
  ]
    .filter((candidate): candidate is Candidate => candidate !== null)
    .filter(
      (candidate) =>
        !isCoolingDown(states.get(candidate.key), mode, candidate.cooldownDays, context.now)
    )
    .sort((a, b) => b.priority - a.priority);

  const suggestion = candidates[0];
  if (!suggestion) return null;
  return {
    key: suggestion.key,
    kind: suggestion.kind,
    eyebrow: suggestion.eyebrow,
    title: suggestion.title,
    message: suggestion.message,
    actionLabel: suggestion.actionLabel,
    href: suggestion.href,
    priority: suggestion.priority,
  };
}

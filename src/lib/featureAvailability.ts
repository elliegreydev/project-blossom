export const FEATURE_AVAILABILITY = [
  { name: "Journey", status: "Available", detail: "Milestones and timeline entries are ready to use." },
  { name: "Track", status: "Available", detail: "Medication, journal, check-ins, goals and the private tracking modules are available." },
  { name: "Calendar", status: "Available", detail: "Appointments and local reminders are available." },
  { name: "Account & sync", status: "Available", detail: "Optional sign-in and cross-device sync are available for core records." },
  { name: "Aurora", status: "Available", detail: "Gentle, rule-based prompts are available and optional." },
  { name: "Private trackers", status: "Available", detail: "Blood tests, voice practice, presentation, body tracking and local photos are available." },
  { name: "Closed-app reminders", status: "Needs setup", detail: "The secure push feature is built, but needs its timed server delivery configured." },
  { name: "Advanced charts and calendar sync", status: "Later", detail: "These are not built yet and are intentionally not being teased in the main app." },
] as const;

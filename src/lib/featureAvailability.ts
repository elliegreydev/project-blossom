export const FEATURE_AVAILABILITY = [
  { name: "Journey", status: "Available", detail: "Milestones and timeline entries are ready to use." },
  { name: "Track", status: "Available", detail: "Medication, journal, check-ins and goals are available." },
  { name: "Calendar", status: "Available", detail: "Appointments and reminders are available." },
  { name: "Account & sync", status: "Available", detail: "Optional sign-in and cross-device sync are available." },
  { name: "Aurora", status: "Available", detail: "Gentle, rule-based prompts are available and optional." },
  { name: "Progress photos and advanced tracking", status: "Not in v1", detail: "Kept out of the live app until it is properly ready." },
] as const;

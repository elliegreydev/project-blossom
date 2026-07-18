import type { Appointment } from "./db";

// Appointments don't store an end time, so exported events get a sensible
// default length rather than showing as instantaneous in a calendar app.
const DEFAULT_DURATION_MS = 60 * 60 * 1000;

function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

function toIcsDateUtc(iso: string): string {
  return new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function appointmentToVEvent(appointment: Appointment, stampIso: string): string {
  const start = new Date(appointment.appointmentAt);
  const end = new Date(start.getTime() + DEFAULT_DURATION_MS);
  const lines = [
    "BEGIN:VEVENT",
    `UID:${appointment.id}@blossom`,
    `DTSTAMP:${toIcsDateUtc(stampIso)}`,
    `DTSTART:${toIcsDateUtc(start.toISOString())}`,
    `DTEND:${toIcsDateUtc(end.toISOString())}`,
    `SUMMARY:${escapeIcsText(appointment.title)}`,
  ];
  if (appointment.location) lines.push(`LOCATION:${escapeIcsText(appointment.location)}`);
  if (appointment.preparationNote) lines.push(`DESCRIPTION:${escapeIcsText(appointment.preparationNote)}`);
  lines.push("END:VEVENT");
  return lines.join("\r\n");
}

export function appointmentsToIcs(appointments: Appointment[]): string {
  const stampIso = new Date().toISOString();
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Blossom//Appointments//EN",
    "CALSCALE:GREGORIAN",
    ...appointments.map((a) => appointmentToVEvent(a, stampIso)),
    "END:VCALENDAR",
  ].join("\r\n");
}

export function downloadIcs(filename: string, appointments: Appointment[]): void {
  const blob = new Blob([appointmentsToIcs(appointments)], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

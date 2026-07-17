"use client";

import { useParams } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import AppointmentBuilder from "@/components/AppointmentBuilder";
import { db } from "@/lib/db";

export default function AppointmentBuilderPage() {
  const params = useParams<{ appointmentId: string }>();
  const appointment = useLiveQuery(() => db.appointments.get(params.appointmentId), [params.appointmentId]);

  if (appointment === undefined) return null;
  if (!appointment) {
    return <div style={{ padding: "40px 20px", color: "var(--text-secondary)" }}>That appointment is no longer here.</div>;
  }

  return <AppointmentBuilder appointment={appointment} />;
}

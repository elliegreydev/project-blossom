"use client";

import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import ScreenHeader from "@/components/ScreenHeader";
import SensitiveModuleGate from "@/components/SensitiveModuleGate";
import {
  careSupplyNeedsAttention,
  db,
  estimatedMedicationSupplyDays,
  LOCAL_PROFILE_ID,
  medicationSupplyIsLow,
  nextMedicationDose,
} from "@/lib/db";
import styles from "@/components/feature.module.css";

function when(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

export default function CareOverviewPage() {
  const profile = useLiveQuery(() => db.profiles.get(LOCAL_PROFILE_ID));
  const medications = useLiveQuery(() => db.medications.toArray(), []);
  const medicationLogs = useLiveQuery(() => db.medicationLogs.toArray(), []);
  const medicationSupplies = useLiveQuery(() => db.medicationSupplies.toArray(), []);
  const careSupplies = useLiveQuery(() => db.careSupplies.toArray(), []);
  const appointments = useLiveQuery(() => db.appointments.toArray(), []);
  const bloodTests = useLiveQuery(() => db.bloodTestEntries.orderBy("date").reverse().toArray(), []);

  if (!profile || medications === undefined || medicationLogs === undefined || medicationSupplies === undefined || careSupplies === undefined || appointments === undefined || bloodTests === undefined) return null;
  const now = new Date();
  const nextDose = profile.enabledModules.includes("medication") ? nextMedicationDose(medications, medicationLogs, now) : null;
  const nextAppointment = profile.enabledModules.includes("appointments") ? appointments.filter((item) => new Date(item.appointmentAt) > now).sort((first, second) => first.appointmentAt.localeCompare(second.appointmentAt))[0] : null;
  const supplyHeadsUps = [
    ...medications.filter((medication) => medication.active).flatMap((medication) => {
      const supply = medicationSupplies.find((item) => item.medicationId === medication.id);
      if (!supply || !medicationSupplyIsLow(medication, supply)) return [];
      const days = estimatedMedicationSupplyDays(medication, supply);
      return [{ id: medication.id, title: medication.name, meta: days === null ? "A supply check may be useful" : `Around ${days} ${days === 1 ? "day" : "days"} left` }];
    }),
    ...careSupplies.filter((supply) => careSupplyNeedsAttention(supply)).map((supply) => ({ id: supply.id, title: supply.name, meta: "A supply check may be useful" })),
  ];

  return <SensitiveModuleGate><div className={styles.screen}>
    <ScreenHeader title="Care overview" backHref="/track" />
    <p className={styles.pageSubtitle} style={{ marginTop: -10 }}>A quiet view of things you&apos;ve already recorded. Blossom doesn&apos;t interpret results or recommend treatment.</p>

    <section className={styles.section} style={{ borderTop: "none", paddingTop: 0 }}><div className={styles.sectionTitle}>Next up</div>
      {nextDose ? <Link href="/track/medication" className={styles.item}><span className={styles.itemTitle}>{nextDose.medication.name}</span><span className={styles.itemMeta}>Scheduled for {when(nextDose.scheduledTime)}</span></Link> : <div className={styles.empty}><div className={styles.emptyTitle}>No medication due next</div><div className={styles.emptySubtitle}>Medication only appears here when you have a schedule set.</div></div>}
      {nextAppointment ? <Link href="/calendar" className={styles.item}><span className={styles.itemTitle}>{nextAppointment.title}</span><span className={styles.itemMeta}>{when(nextAppointment.appointmentAt)}</span></Link> : <div className={styles.empty}><div className={styles.emptyTitle}>No appointment coming up</div><div className={styles.emptySubtitle}>Future appointments will appear here when you add them.</div></div>}
    </section>

    <section className={styles.section}><div className={styles.itemRow}><div className={styles.sectionTitle}>Supplies</div><Link href="/track/medication" className={styles.linkButton}>Review</Link></div>
      {supplyHeadsUps.length === 0 ? <div className={styles.empty}><div className={styles.emptyTitle}>Nothing needs checking</div><div className={styles.emptySubtitle}>Supply heads-ups appear only when they may help.</div></div> : <div className={styles.list}>{supplyHeadsUps.map((supply) => <Link href="/track/medication" key={supply.id} className={styles.item}><span className={styles.itemTitle}>{supply.title}</span><span className={styles.itemMeta}>{supply.meta}</span></Link>)}</div>}
    </section>

    <section className={styles.section}><div className={styles.itemRow}><div className={styles.sectionTitle}>Recent blood tests</div><Link href="/track/blood-tests" className={styles.linkButton}>View all</Link></div>
      {!profile.enabledModules.includes("bloodTests") ? <p className={styles.sectionNote}>Blood tests are currently turned off in your modules.</p> : bloodTests.length === 0 ? <div className={styles.empty}><div className={styles.emptyTitle}>Nothing recorded yet</div><div className={styles.emptySubtitle}>This is only a private record of results you choose to add.</div></div> : <div className={styles.list}>{bloodTests.slice(0, 3).map((test) => <Link href="/track/blood-tests" key={test.id} className={styles.item}><span className={styles.itemTitle}>{test.testName}</span><span className={styles.itemMeta}>{test.date}{test.value ? ` · ${test.value}${test.unit ? ` ${test.unit}` : ""}` : ""}</span></Link>)}</div>}
    </section>
  </div></SensitiveModuleGate>;
}

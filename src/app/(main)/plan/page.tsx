"use client";

import { useRef, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import AddAppointmentSheet from "@/components/AddAppointmentSheet";
import AppointmentWorkspaceSheet from "@/components/AppointmentWorkspaceSheet";
import UndoRemovalNotice from "@/components/UndoRemovalNotice";
import { useUndoableRemoval } from "@/components/useUndoableRemoval";
import { addGoal, db, deleteAppointment, type Appointment } from "@/lib/db";
import { downloadIcs } from "@/lib/ics";
import styles from "./plan.module.css";

const VIEWS = [
  { key: "agenda", label: "Agenda" },
  { key: "week", label: "Week" },
  { key: "month", label: "Month" },
] as const;

type PlanView = (typeof VIEWS)[number]["key"];

const WEEKDAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function timeLabel(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

// The key a date is filed under, built from local calendar components rather
// than toISOString(). An 11pm appointment in British Summer Time is already
// tomorrow in UTC, and a calendar that puts it on the wrong day is worse than
// no calendar at all.
function dayKey(value: Date): string {
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${value.getFullYear()}-${month}-${day}`;
}

function relativeDayLabel(date: Date, today: Date): string {
  const days = Math.round(
    (new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime() -
      new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()) /
      86400000
  );
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  if (days === -1) return "Yesterday";
  const options: Intl.DateTimeFormatOptions = { weekday: "long", day: "numeric", month: "long" };
  // The year only earns its place once it stops being this one.
  if (date.getFullYear() !== today.getFullYear()) options.year = "numeric";
  return date.toLocaleDateString("en-GB", options);
}

// Runs of appointments that share a day, in whatever order they arrive. The
// agenda reads forwards and the past reads backwards, and both group the same
// way because only the previous group is ever compared against.
function groupByDay(items: Appointment[]): { key: string; date: Date; items: Appointment[] }[] {
  const groups: { key: string; date: Date; items: Appointment[] }[] = [];
  for (const item of items) {
    const date = new Date(item.appointmentAt);
    const key = dayKey(date);
    const last = groups[groups.length - 1];
    if (last && last.key === key) last.items.push(item);
    else groups.push({ key, date, items: [item] });
  }
  return groups;
}

function slugForFilename(title: string): string {
  return title.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "appointment";
}

export default function PlanPage() {
  const appts = useLiveQuery(() => db.appointments.orderBy("appointmentAt").toArray(), []);
  const [addOpen, setAddOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [workspaceAppointment, setWorkspaceAppointment] = useState<Appointment | null>(null);
  const [draftAppointmentTitle, setDraftAppointmentTitle] = useState("");
  const [now] = useState(() => Date.now());
  const [view, setView] = useState<PlanView>("agenda");
  const [monthOffset, setMonthOffset] = useState(0);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const { pendingRemoval, stageRemoval, undoRemoval, isPendingRemoval } = useUndoableRemoval();

  if (appts === undefined) return null;

  const today = new Date(now);
  const todayKey = dayKey(today);
  const live = appts.filter((a) => !isPendingRemoval(a.id));
  const upcoming = live.filter((a) => new Date(a.appointmentAt).getTime() >= now);
  const past = live.filter((a) => new Date(a.appointmentAt).getTime() < now).reverse();

  // One lookup shared by Week and Month. Everything is here, including what has
  // already happened today, because a day row is a day, not a to-do list.
  const byDay = new Map<string, Appointment[]>();
  for (const a of live) {
    const key = dayKey(new Date(a.appointmentAt));
    const existing = byDay.get(key);
    if (existing) existing.push(a);
    else byDay.set(key, [a]);
  }

  const weekDays = Array.from(
    { length: 7 },
    (_, i) => new Date(today.getFullYear(), today.getMonth(), today.getDate() + i)
  );
  const weekIsQuiet = weekDays.every((date) => !byDay.has(dayKey(date)));

  const monthStart = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1);
  const daysInMonth = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0).getDate();
  // getDay() counts from Sunday; the grid starts on Monday, as a UK calendar does.
  const leadingBlanks = (monthStart.getDay() + 6) % 7;
  const trailingBlanks = (7 - ((leadingBlanks + daysInMonth) % 7)) % 7;
  // Landing on this month means today is already the interesting day. Stepping
  // to another month clears that, rather than showing a day you cannot see.
  const openDay = selectedDay ?? (monthOffset === 0 ? todayKey : null);
  const openDayItems = openDay ? byDay.get(openDay) ?? [] : [];

  function stepMonth(delta: number) {
    setMonthOffset((value) => value + delta);
    setSelectedDay(null);
  }

  function onTabKeys(event: React.KeyboardEvent<HTMLDivElement>) {
    const current = VIEWS.findIndex((item) => item.key === view);
    let next = current;
    if (event.key === "ArrowRight") next = (current + 1) % VIEWS.length;
    else if (event.key === "ArrowLeft") next = (current - 1 + VIEWS.length) % VIEWS.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = VIEWS.length - 1;
    else return;
    event.preventDefault();
    setView(VIEWS[next].key);
    tabRefs.current[next]?.focus();
  }

  // role="listitem" the way Journey's entry cards do it. Without it a bare
  // <article> announces as an article region on every appointment, and a
  // screen reader loses "3 items" and where in the run somebody is.
  function renderAppt(a: Appointment, highlight?: boolean) {
    return (
      <article key={a.id} role="listitem" className={styles.appt} data-highlight={highlight ? "true" : undefined}>
        <button type="button" className={styles.apptMain} onClick={() => setEditingAppointment(a)}>
          {highlight && <span className={styles.apptEyebrow}>Next up</span>}
          <span className={styles.apptTop}>
            <span className={styles.apptTitle}>{a.title}</span>
            <span className={styles.apptTime}>{timeLabel(a.appointmentAt)}</span>
          </span>
          {a.location && <span className={styles.apptMeta}>{a.location}</span>}
          {a.preparationNote && <span className={styles.apptNote}>{a.preparationNote}</span>}
        </button>
        <div className={styles.apptActions}>
          <button type="button" className={styles.linkButton} onClick={() => setWorkspaceAppointment(a)}>
            Prepare
          </button>
          <button
            type="button"
            className={styles.linkButton}
            onClick={() => downloadIcs(`${slugForFilename(a.title)}.ics`, [a])}
          >
            Add to calendar
          </button>
          <button
            type="button"
            className={styles.linkButton}
            onClick={() => stageRemoval(a.id, "This appointment", () => deleteAppointment(a.id))}
          >
            Remove
          </button>
        </div>
      </article>
    );
  }

  function renderGroups(items: Appointment[], highlightFirst?: boolean) {
    return (
      <div className={styles.groups}>
        {groupByDay(items).map((group, groupIndex) => (
          <div key={group.key} className={styles.dayGroup}>
            <h3 className={styles.dayHeading}>{relativeDayLabel(group.date, today)}</h3>
            <div className={styles.list} role="list">
              {group.items.map((a, index) =>
                renderAppt(a, Boolean(highlightFirst) && groupIndex === 0 && index === 0)
              )}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={styles.screen}>
      <header className={styles.pageHeader}>
        <div className={styles.eyebrow}>Your dates</div>
        <h1 className={styles.title}>Plan</h1>
        <p className={styles.subtitle}>Appointments and important dates, in one calm place.</p>
      </header>

      <div className={styles.tabs} role="tablist" aria-label="How to view your plan" onKeyDown={onTabKeys}>
        {VIEWS.map((item, index) => (
          <button
            key={item.key}
            type="button"
            role="tab"
            id={`plan-tab-${item.key}`}
            aria-selected={view === item.key}
            aria-controls={`plan-panel-${item.key}`}
            tabIndex={view === item.key ? 0 : -1}
            ref={(node) => {
              tabRefs.current[index] = node;
            }}
            className={styles.tab}
            onClick={() => setView(item.key)}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div
        className={styles.panel}
        role="tabpanel"
        id="plan-panel-agenda"
        aria-labelledby="plan-tab-agenda"
        hidden={view !== "agenda"}
      >
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Upcoming</h2>
          {upcoming.length === 0 ? (
            <div className={styles.empty}>
              <div className={styles.emptyMark} aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                  <rect x="4" y="5.5" width="16" height="14.5" rx="2.2" />
                  <path d="M4 10h16M8 3.5v3M16 3.5v3" />
                </svg>
              </div>
              <div className={styles.emptyTitle}>Nothing scheduled</div>
              <div className={styles.emptySubtitle}>
                Add appointments, blood tests, or any important dates.
              </div>
            </div>
          ) : (
            <>
              <button
                type="button"
                className={styles.linkButton}
                onClick={() => downloadIcs("blossom-appointments.ics", upcoming)}
              >
                Add all to calendar
              </button>
              {renderGroups(upcoming, true)}
            </>
          )}
          <button type="button" className={styles.addButton} onClick={() => setAddOpen(true)}>
            + Add appointment
          </button>
        </section>

        {past.length > 0 && (
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Past</h2>
            {renderGroups(past)}
          </section>
        )}
      </div>

      <div
        className={styles.panel}
        role="tabpanel"
        id="plan-panel-week"
        aria-labelledby="plan-tab-week"
        hidden={view !== "week"}
      >
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>The next seven days</h2>
          {weekIsQuiet && (
            <div className={styles.quiet}>
              <span className={styles.quietTitle}>A quiet week</span>
              <span className={styles.quietText}>
                There is nothing in the next seven days. Nothing needs doing about that.
              </span>
            </div>
          )}
          <div className={styles.week}>
            {weekDays.map((date) => {
              const key = dayKey(date);
              const items = byDay.get(key) ?? [];
              return (
                <div key={key} className={styles.weekDay} data-today={key === todayKey ? "true" : undefined}>
                  <div className={styles.weekDate}>
                    <span className={styles.weekWeekday}>
                      {key === todayKey ? "Today" : date.toLocaleDateString("en-GB", { weekday: "short" })}
                    </span>
                    <span className={styles.weekNumber}>{date.getDate()}</span>
                  </div>
                  <div className={styles.weekItems}>
                    {items.length === 0 ? (
                      <span className={styles.weekQuiet}>Nothing planned</span>
                    ) : (
                      items.map((a) => (
                        <button
                          key={a.id}
                          type="button"
                          className={styles.weekItem}
                          onClick={() => setEditingAppointment(a)}
                        >
                          <span className={styles.weekItemTime}>{timeLabel(a.appointmentAt)}</span>
                          <span className={styles.weekItemTitle}>{a.title}</span>
                          {a.location && <span className={styles.weekItemMeta}>{a.location}</span>}
                        </button>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      <div
        className={styles.panel}
        role="tabpanel"
        id="plan-panel-month"
        aria-labelledby="plan-tab-month"
        hidden={view !== "month"}
      >
        <div className={styles.month}>
          <div className={styles.monthHead}>
            <h2 className={styles.monthTitle}>
              {monthStart.toLocaleDateString("en-GB", { month: "long", year: "numeric" })}
            </h2>
            <div className={styles.monthNav}>
              <button type="button" className={styles.navButton} aria-label="Previous month" onClick={() => stepMonth(-1)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="m15 5-7 7 7 7" />
                </svg>
              </button>
              <button type="button" className={styles.navButton} aria-label="Next month" onClick={() => stepMonth(1)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="m9 5 7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>

          <div className={styles.weekdays} aria-hidden="true">
            {WEEKDAY_NAMES.map((name) => (
              <span key={name} className={styles.weekdayName}>
                {name}
              </span>
            ))}
          </div>

          <div className={styles.grid}>
            {Array.from({ length: leadingBlanks }, (_, i) => (
              <span key={`lead-${i}`} className={styles.dayBlank} />
            ))}
            {Array.from({ length: daysInMonth }, (_, i) => {
              const date = new Date(monthStart.getFullYear(), monthStart.getMonth(), i + 1);
              const key = dayKey(date);
              const has = byDay.has(key);
              return (
                <button
                  key={key}
                  type="button"
                  className={styles.day}
                  aria-pressed={key === openDay}
                  aria-current={key === todayKey ? "date" : undefined}
                  aria-label={`${date.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}${has ? ", something planned" : ""}`}
                  onClick={() => setSelectedDay(key)}
                >
                  <span aria-hidden="true">{i + 1}</span>
                  <span className={has ? styles.dayDot : styles.dayDotEmpty} aria-hidden="true" />
                </button>
              );
            })}
            {Array.from({ length: trailingBlanks }, (_, i) => (
              <span key={`trail-${i}`} className={styles.dayBlank} />
            ))}
          </div>

          {monthOffset !== 0 && (
            <button type="button" className={styles.linkButton} onClick={() => stepMonth(-monthOffset)}>
              Back to this month
            </button>
          )}
        </div>

        <div className={styles.monthDay} aria-live="polite">
          {openDay === null ? (
            <p className={styles.monthDayQuiet}>Pick a day to see what is on it.</p>
          ) : (
            <>
              <h3 className={styles.monthDayTitle}>
                {relativeDayLabel(new Date(`${openDay}T00:00:00`), today)}
              </h3>
              {openDayItems.length === 0 ? (
                <p className={styles.monthDayQuiet}>Nothing on this day.</p>
              ) : (
                <div className={styles.list} role="list">
                  {openDayItems.map((a) => renderAppt(a))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {(addOpen || editingAppointment) && (
        <AddAppointmentSheet
          appointment={editingAppointment}
          initialTitle={draftAppointmentTitle}
          existingAppointments={appts!}
          onClose={() => {
            setAddOpen(false);
            setEditingAppointment(null);
            setDraftAppointmentTitle("");
          }}
        />
      )}
      {workspaceAppointment && <AppointmentWorkspaceSheet appointment={workspaceAppointment} onClose={() => setWorkspaceAppointment(null)} onCreateGoal={async (title) => { await addGoal({ title, category: null, target: null }); }} onCreateAppointment={(title) => { setWorkspaceAppointment(null); setDraftAppointmentTitle(title); setAddOpen(true); }} />}
      {pendingRemoval && <UndoRemovalNotice label={pendingRemoval.label} onUndo={undoRemoval} />}
    </div>
  );
}

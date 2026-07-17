"use client";

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import ScreenHeader from "@/components/ScreenHeader";
import SocialTransitionEntrySheet from "@/components/SocialTransitionEntrySheet";
import {
  addSocialTransitionStarterTasks,
  db,
  deleteSocialTransitionPerson,
  deleteSocialTransitionPlan,
  deleteSocialTransitionTask,
  updateSocialTransitionTask,
  type SocialPlanKind,
  type SocialPlanStatus,
  type SocialPersonStatus,
  type SocialTaskCategory,
  type SocialTaskStatus,
} from "@/lib/db";
import styles from "@/components/feature.module.css";
import local from "./transition.module.css";

type SheetType = "person" | "plan" | "task" | null;

const PERSON_STATUS: Record<SocialPersonStatus, string> = {
  considering: "Considering",
  preparing: "Preparing",
  told: "Told",
  "not-right-now": "Not right now",
};

const PLAN_STATUS: Record<SocialPlanStatus, string> = {
  considering: "Considering",
  preparing: "Preparing",
  done: "Done",
  paused: "Paused",
  "not-for-me": "Not for me",
};

const PLAN_KIND: Record<SocialPlanKind, string> = {
  conversation: "Conversation",
  work: "Work",
  education: "Education",
  online: "Online",
  other: "Something else",
};

const TASK_CATEGORY: Record<SocialTaskCategory, string> = {
  name: "Name",
  documents: "Documents",
  healthcare: "Healthcare",
  money: "Money",
  "work-education": "Work / education",
  online: "Online",
  other: "Other",
};

const TASK_STATUS: Record<SocialTaskStatus, string> = {
  "not-started": "Not started",
  done: "Done",
  paused: "Paused",
};

export default function TransitionPlannerPage() {
  const people = useLiveQuery(() => db.socialTransitionPeople.orderBy("updatedAt").reverse().toArray(), []);
  const plans = useLiveQuery(() => db.socialTransitionPlans.orderBy("updatedAt").reverse().toArray(), []);
  const tasks = useLiveQuery(() => db.socialTransitionTasks.orderBy("updatedAt").reverse().toArray(), []);
  const [sheet, setSheet] = useState<SheetType>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  if (people === undefined || plans === undefined || tasks === undefined) return null;

  function toggleExpanded(key: string) {
    setExpanded((current) => current === key ? null : key);
  }

  return (
    <div className={styles.screen}>
      <ScreenHeader title="Transition planner" backHref="/track" />

      <section className={local.intro}>
        <span className={local.eyebrow}>A private workspace</span>
        <h2>Your transition, at your pace.</h2>
        <p>Nothing here is required. Keep plans, people and life-admin tasks only when they feel useful.</p>
        <span className={local.localOnly}>Stays only on this device</span>
      </section>

      <PlannerSection title="People" description="Private notes for people or groups, without importing your contacts." action="+ Add a person" onAction={() => setSheet("person")}>
        {people.length === 0 ? <Empty copy="You do not need to tell anyone. If it ever feels useful to prepare, this space is here." /> : (
          <div className={styles.list}>
            {people.map((person) => {
              const key = `person:${person.id}`;
              const isExpanded = expanded === key;
              return <article key={person.id} className={styles.item}>
                <button type="button" className={local.entryButton} onClick={() => toggleExpanded(key)}>
                  <div className={styles.itemRow}><strong className={styles.itemTitle}>{person.label}</strong><span className={local.viewHint}>{isExpanded ? "Close" : "View"}</span></div>
                  <span className={local.status}>{PERSON_STATUS[person.status]}</span>
                </button>
                {isExpanded && <div className={local.details}>
                  {person.script && <Detail label="Words to use" value={person.script} />}
                  {person.safetyNote && <Detail label="Safety considerations" value={person.safetyNote} />}
                  {person.privateNote && <Detail label="Private note" value={person.privateNote} />}
                  {!person.script && !person.safetyNote && !person.privateNote && <p className={local.emptyDetail}>No extra notes here.</p>}
                  <button type="button" className={styles.linkButton} onClick={() => deleteSocialTransitionPerson(person.id)}>Remove</button>
                </div>}
              </article>;
            })}
          </div>
        )}
      </PlannerSection>

      <PlannerSection title="Plans" description="Coming-out plans for conversations, work, education or online spaces." action="+ Add a plan" onAction={() => setSheet("plan")}>
        {plans.length === 0 ? <Empty copy="A plan can be as small as a few words you want to say, or it can stay empty." /> : (
          <div className={styles.list}>
            {plans.map((plan) => {
              const key = `plan:${plan.id}`;
              const isExpanded = expanded === key;
              return <article key={plan.id} className={styles.item}>
                <button type="button" className={local.entryButton} onClick={() => toggleExpanded(key)}>
                  <div className={styles.itemRow}><strong className={styles.itemTitle}>{plan.title}</strong><span className={local.viewHint}>{isExpanded ? "Close" : "View"}</span></div>
                  <span className={local.status}>{PLAN_KIND[plan.kind]} · {PLAN_STATUS[plan.status]}</span>
                </button>
                {isExpanded && <div className={local.details}>
                  {plan.privateNote ? <Detail label="Private note" value={plan.privateNote} /> : <p className={local.emptyDetail}>No extra notes here.</p>}
                  <button type="button" className={styles.linkButton} onClick={() => deleteSocialTransitionPlan(plan.id)}>Remove</button>
                </div>}
              </article>;
            })}
          </div>
        )}
      </PlannerSection>

      <PlannerSection title="Life admin" description="Personal reminders for documents and records. This is not legal advice." action="+ Add a task" onAction={() => setSheet("task")}>
        <button type="button" className={local.starterButton} onClick={() => void addSocialTransitionStarterTasks()}>Add common admin steps</button>
        {tasks.length === 0 ? <Empty copy="No checklist is required. Add only the practical bits you want to keep close." /> : (
          <div className={styles.list}>
            {tasks.map((task) => {
              const key = `task:${task.id}`;
              const isExpanded = expanded === key;
              return <article key={task.id} className={styles.item}>
                <div className={styles.itemRow}>
                  <button type="button" className={local.entryButton} onClick={() => toggleExpanded(key)}>
                    <strong className={styles.itemTitle}>{task.title}</strong>
                    <span className={local.status}>{TASK_CATEGORY[task.category]} · {TASK_STATUS[task.status]}</span>
                  </button>
                  <button type="button" className={local.taskStatusButton} onClick={() => updateSocialTransitionTask(task.id, { status: task.status === "done" ? "not-started" : "done" })}>
                    {task.status === "done" ? "Done" : "Mark done"}
                  </button>
                </div>
                {isExpanded && <div className={local.details}>
                  {task.privateNote ? <Detail label="Private note" value={task.privateNote} /> : <p className={local.emptyDetail}>No extra notes here.</p>}
                  <button type="button" className={styles.linkButton} onClick={() => deleteSocialTransitionTask(task.id)}>Remove</button>
                </div>}
              </article>;
            })}
          </div>
        )}
      </PlannerSection>

      {sheet && <SocialTransitionEntrySheet type={sheet} onClose={() => setSheet(null)} />}
    </div>
  );
}

function PlannerSection({ title, description, action, onAction, children }: { title: string; description: string; action: string; onAction: () => void; children: React.ReactNode }) {
  return <section className={styles.section}>
    <div className={styles.linkRow}>
      <div><h2 className={styles.sectionTitle}>{title}</h2><p className={local.sectionDescription}>{description}</p></div>
      <button type="button" className={local.addButton} onClick={onAction}>{action}</button>
    </div>
    {children}
  </section>;
}

function Empty({ copy }: { copy: string }) {
  return <div className={styles.empty}><div className={styles.emptySubtitle}>{copy}</div></div>;
}

function Detail({ label, value }: { label: string; value: string }) {
  return <div className={local.detail}><span>{label}</span><p>{value}</p></div>;
}

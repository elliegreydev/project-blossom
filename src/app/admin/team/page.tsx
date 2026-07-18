"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import styles from "../admin.module.css";

type StaffRole = "trial_moderator" | "moderator" | "manager" | "administrator" | "owner";

interface StaffRow {
  email: string;
  role: StaffRole;
  added_at: string;
}

const ROLE_LABELS: Record<StaffRole, string> = {
  trial_moderator: "Trial Moderator",
  moderator: "Moderator",
  manager: "Manager",
  administrator: "Administrator",
  owner: "Owner",
};

const ALL_ROLES: StaffRole[] = ["trial_moderator", "moderator", "manager", "administrator", "owner"];
const OWNER_RANK = 100;

// Administrators can appoint up to Manager; only an Owner can hand out
// Administrator or Owner. Mirrors the staff_emails RLS check exactly.
function assignableRoles(myRank: number): StaffRole[] {
  return myRank >= OWNER_RANK ? ALL_ROLES : ["trial_moderator", "moderator", "manager"];
}

export default function AdminTeamPage() {
  const [rank, setRank] = useState<number | null>(null);
  const [staff, setStaff] = useState<StaffRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [newEmail, setNewEmail] = useState("");
  const [newRole, setNewRole] = useState<StaffRole>("trial_moderator");
  const [adding, setAdding] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function load() {
    const supabase = createClient();
    const [{ data: rankData }, { data: staffData }] = await Promise.all([
      supabase.rpc("my_staff_rank"),
      supabase.from("staff_emails").select("email,role,added_at").order("added_at"),
    ]);
    setRank(typeof rankData === "number" ? rankData : 0);
    setStaff((staffData as StaffRow[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  async function addStaff() {
    const email = newEmail.trim().toLowerCase();
    if (!email) return;
    setAdding(true);
    setMessage(null);
    const supabase = createClient();
    const { error } = await supabase.from("staff_emails").insert({ email, role: newRole });
    setAdding(false);
    if (error) {
      setMessage(error.message.includes("duplicate") ? "That email is already on staff." : error.message);
      return;
    }
    setNewEmail("");
    setNewRole("trial_moderator");
    void load();
  }

  async function changeRole(email: string, role: StaffRole) {
    const supabase = createClient();
    const { error } = await supabase.from("staff_emails").update({ role }).eq("email", email);
    if (error) {
      setMessage(error.message);
      return;
    }
    void load();
  }

  async function removeStaff(email: string) {
    if (!window.confirm(`Remove ${email} from staff? They'll lose all admin access immediately.`)) return;
    const supabase = createClient();
    const { error } = await supabase.from("staff_emails").delete().eq("email", email);
    if (error) {
      setMessage(error.message);
      return;
    }
    void load();
  }

  if (loading || rank === null) return <p className={styles.subtitle}>Loading…</p>;

  const assignable = assignableRoles(rank);

  return (
    <>
      <h1 className={styles.title}>Team</h1>
      <p className={styles.subtitle}>
        {staff.length} {staff.length === 1 ? "person" : "people"} on staff.
        {rank < OWNER_RANK && " Only an Owner can appoint or manage another Administrator or Owner."}
      </p>

      {message && <p className={styles.subtitle}>{message}</p>}

      <div className={styles.card}>
        <div className={styles.formGrid}>
          <div className={styles.field}>
            <span className={styles.label}>Email</span>
            <input
              className={styles.input}
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="someone@example.com"
            />
          </div>
          <div className={styles.field}>
            <span className={styles.label}>Role</span>
            <select className={styles.select} value={newRole} onChange={(e) => setNewRole(e.target.value as StaffRole)}>
              {assignable.map((role) => (
                <option key={role} value={role}>{ROLE_LABELS[role]}</option>
              ))}
            </select>
          </div>
        </div>
        <p className={styles.subtitle} style={{ marginTop: -4 }}>
          They get staff access the next time they sign in with this email - no invite link needed.
        </p>
        <button
          type="button"
          className={styles.primaryButton}
          style={{ width: "fit-content" }}
          disabled={!newEmail.trim() || adding}
          onClick={addStaff}
        >
          + Add to staff
        </button>
      </div>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Email</th>
              <th>Role</th>
              <th>Joined</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {staff.map((member) => {
              const canManage = rank >= OWNER_RANK || staff_role_rank_client(member.role) < 80;
              const roleOptions = assignableRoles(rank).includes(member.role)
                ? assignableRoles(rank)
                : [...assignableRoles(rank), member.role];
              return (
                <tr key={member.email}>
                  <td>{member.email}</td>
                  <td>
                    {canManage ? (
                      <select
                        className={styles.select}
                        value={member.role}
                        onChange={(e) => changeRole(member.email, e.target.value as StaffRole)}
                      >
                        {roleOptions.map((role) => (
                          <option key={role} value={role}>{ROLE_LABELS[role]}</option>
                        ))}
                      </select>
                    ) : (
                      ROLE_LABELS[member.role]
                    )}
                  </td>
                  <td>{new Date(member.added_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</td>
                  <td>
                    {canManage && (
                      <button type="button" className={styles.dangerButton} onClick={() => removeStaff(member.email)}>
                        Remove
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

// Mirrors public.staff_role_rank() - kept in sync manually since it's a
// small, stable lookup and pulling it over an RPC per row isn't worth it.
function staff_role_rank_client(role: StaffRole): number {
  return { owner: 100, administrator: 80, manager: 60, moderator: 40, trial_moderator: 20 }[role];
}

"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import styles from "../dev-login/devLogin.module.css";

interface DevUser {
  email: string;
  is_admin: boolean;
  created_at: string;
  last_seen_at: string | null;
}

export default function DevAccessPage() {
  const [users, setUsers] = useState<DevUser[] | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [working, setWorking] = useState(false);

  const load = useCallback(async () => {
    const response = await fetch("/api/dev-access/users");
    if (response.status === 401) { setError("You need to sign in as an admin."); setUsers([]); return; }
    const data = await response.json().catch(() => null);
    setUsers(data?.users ?? []);
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function addUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setWorking(true); setError(null); setNotice(null);
    const response = await fetch("/api/dev-access/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, isAdmin }),
    });
    const data = await response.json().catch(() => null);
    setWorking(false);
    if (!response.ok) { setError(data?.error ?? "Couldn't add them."); return; }
    setNotice(`${email} can now sign in. Send them the password yourself - it isn't shown again.`);
    setEmail(""); setPassword(""); setIsAdmin(false);
    void load();
  }

  async function remove(target: string) {
    setError(null); setNotice(null);
    const response = await fetch(`/api/dev-access/users?email=${encodeURIComponent(target)}`, { method: "DELETE" });
    if (!response.ok) { setError("Couldn't remove them."); return; }
    setNotice(`${target} no longer has access.`);
    void load();
  }

  return (
    <main className={styles.screen} style={{ alignItems: "start", paddingTop: 40 }}>
      <div className={styles.card} style={{ maxWidth: 460 }}>
        <span className={styles.badge}>Dev build</span>
        <h1 className={styles.title}>Who can test</h1>
        <p className={styles.sub}>
          Anyone here can open the dev site. This list only exists on dev - it has nothing to do
          with real Blossom accounts.
        </p>

        <form onSubmit={addUser}>
          <label className={styles.field}>
            <span className={styles.label}>Their email</span>
            <input className={styles.input} type="email" value={email}
              onChange={(e) => setEmail(e.target.value)} required />
          </label>
          <label className={styles.field}>
            <span className={styles.label}>Password you&apos;re giving them</span>
            <input className={styles.input} type="text" value={password}
              onChange={(e) => setPassword(e.target.value)} required minLength={6} />
          </label>
          <label className={styles.field} style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input type="checkbox" checked={isAdmin} onChange={(e) => setIsAdmin(e.target.checked)} />
            <span className={styles.label} style={{ margin: 0 }}>Let them manage this list too</span>
          </label>
          <button className={styles.button} type="submit" disabled={working}>
            {working ? "Adding…" : "Add tester"}
          </button>
        </form>

        {error && <p className={styles.error}>{error}</p>}
        {notice && <p className={styles.sub} style={{ marginTop: 12 }}>{notice}</p>}

        <div style={{ marginTop: 26 }}>
          <span className={styles.label}>With access ({users?.length ?? 0})</span>
          {users === null && <p className={styles.sub}>Loading…</p>}
          {users?.length === 0 && (
            <p className={styles.sub}>
              Nobody yet. You can always get in with the master password.
            </p>
          )}
          {users?.map((u) => (
            <div key={u.email} style={{
              display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10,
              padding: "10px 0", borderTop: "1px solid var(--border)",
            }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13.5, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {u.email}{u.is_admin && " · admin"}
                </div>
                <div style={{ fontSize: 11.5, color: "var(--text-muted)" }}>
                  {u.last_seen_at ? `last in ${new Date(u.last_seen_at).toLocaleDateString("en-GB")}` : "never signed in"}
                </div>
              </div>
              <button type="button" onClick={() => remove(u.email)} style={{
                flex: "none", background: "transparent", border: "1px solid var(--border)",
                borderRadius: "var(--radius-sm)", padding: "6px 11px", fontSize: 12,
                color: "var(--text-secondary)", cursor: "pointer",
              }}>Remove</button>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}

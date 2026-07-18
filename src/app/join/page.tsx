"use client";

import { useState } from "react";
import Link from "next/link";
import styles from "./join.module.css";
import sheetStyles from "@/components/Sheet.module.css";

export default function JoinPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [areaOfInterest, setAreaOfInterest] = useState("");
  const [website, setWebsite] = useState(""); // honeypot, left blank by real people
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  async function submit() {
    if (!name.trim() || !email.trim() || !message.trim()) return;
    setStatus("sending");
    try {
      const res = await fetch("/api/staff-applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          message: message.trim(),
          areaOfInterest: areaOfInterest.trim(),
          website,
        }),
      });
      setStatus(res.ok ? "sent" : "error");
    } catch {
      setStatus("error");
    }
  }

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <Link href="/" className={styles.back}>← Back to Blossom</Link>

        <header className={styles.header}>
          <span className={styles.eyebrow}>Join the team</span>
          <h1>Help build Blossom</h1>
          <p className={styles.intro}>
            Blossom is run by a small volunteer team. If you&apos;d like to help - with support,
            moderation, resources, or anything else - tell us a bit about yourself below. There&apos;s
            no deadline and no pressure; we read every application.
          </p>
        </header>

        {status === "sent" ? (
          <div className={styles.confirmation}>
            <span className={styles.confirmationTitle}>Thank you</span>
            <p className={sheetStyles.helpText} style={{ margin: 0 }}>
              Your application has been sent. We&apos;ll reach out by email if it&apos;s a good fit -
              there&apos;s nothing else you need to do right now.
            </p>
          </div>
        ) : (
          <div className={styles.form}>
            <div className={sheetStyles.field}>
              <span className={sheetStyles.label}>Your name</span>
              <input
                className={sheetStyles.input}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Whatever you go by"
                autoFocus
              />
            </div>
            <div className={sheetStyles.field}>
              <span className={sheetStyles.label}>Email</span>
              <input
                className={sheetStyles.input}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </div>
            <div className={sheetStyles.field}>
              <span className={sheetStyles.label}>What would you like to help with? (optional)</span>
              <input
                className={sheetStyles.input}
                value={areaOfInterest}
                onChange={(e) => setAreaOfInterest(e.target.value)}
                placeholder="e.g. support, moderation, resources, whatever's needed"
              />
            </div>
            <div className={sheetStyles.field}>
              <span className={sheetStyles.label}>Tell us a little about why you&apos;d like to help</span>
              <textarea
                className={sheetStyles.textarea}
                style={{ minHeight: 140 }}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="As much or as little as feels right"
              />
            </div>
            <label className={styles.honeypot} aria-hidden="true">
              Leave this field blank
              <input
                tabIndex={-1}
                autoComplete="off"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
              />
            </label>

            {status === "error" && (
              <p className={styles.error}>
                Something went wrong sending that. Please try again in a moment.
              </p>
            )}

            <button
              type="button"
              className={sheetStyles.primaryButton}
              style={{ alignSelf: "flex-start" }}
              disabled={!name.trim() || !email.trim() || !message.trim() || status === "sending"}
              onClick={submit}
            >
              {status === "sending" ? "Sending…" : "Send application"}
            </button>
          </div>
        )}
      </div>
    </main>
  );
}

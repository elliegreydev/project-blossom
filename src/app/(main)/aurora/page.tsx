"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import ScreenHeader from "@/components/ScreenHeader";
import { db, LOCAL_PROFILE_ID } from "@/lib/db";
import { createClient } from "@/lib/supabase/client";
import { CATEGORY_LABELS, resourcesForRegion, type RegionResource } from "@/lib/regionResources";
import styles from "./aurora.module.css";

type Tab = "guide" | "resources";
type Access = "checking" | "signed-out" | "not-in-beta" | "ok";
type ChatMessage = { id: string; role: "user" | "assistant"; content: string; createdAt: string; crisisSupportHref?: string | null };

const STORAGE_KEY = "blossom:aurora-ai-history:v1";
const CONSENT_KEY = "blossom:aurora-ai-consent:v1";

const QUICK_PROMPTS = [
  "Help me turn my notes into appointment questions",
  "How could I organise this in Blossom?",
  "Help me make a gentle plan for today",
];

function loadHistory(): ChatMessage[] {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    const value = stored ? JSON.parse(stored) : [];
    return Array.isArray(value) ? value.filter((item): item is ChatMessage =>
      item && (item.role === "user" || item.role === "assistant") && typeof item.content === "string"
    ).slice(-30) : [];
  } catch {
    return [];
  }
}

function resourceMatches(resource: RegionResource, query: string): boolean {
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return true;
  const haystack = [resource.orgName, resource.category, resource.contactInfo, resource.note, resource.cityName]
    .filter((value): value is string => Boolean(value))
    .join(" ")
    .toLowerCase();
  return terms.every((term) => haystack.includes(term));
}

export default function AuroraPage() {
  const profile = useLiveQuery(() => db.profiles.get(LOCAL_PROFILE_ID));
  const cachedResources = useLiveQuery(() => db.cachedRegionResources.toArray(), []);
  const [tab, setTab] = useState<Tab>("guide");
  const [access, setAccess] = useState<Access>("checking");
  const [consent, setConsent] = useState(false);
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [historyReady, setHistoryReady] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resourceQuery, setResourceQuery] = useState("");

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setConsent(window.localStorage.getItem(CONSENT_KEY) === "yes");
      setMessages(loadHistory());
      setHistoryReady(true);
    });

    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!historyReady) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-30)));
  }, [historyReady, messages]);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();
    void (async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        if (!cancelled) setAccess("signed-out");
        return;
      }
      const [{ data: betaData }, { data: staffData }] = await Promise.all([
        supabase.rpc("is_beta_tester"),
        supabase.rpc("is_staff"),
      ]);
      if (!cancelled) setAccess(betaData === true || staffData === true ? "ok" : "not-in-beta");
    })();
    return () => { cancelled = true; };
  }, []);

  const regionResources = useMemo(() => {
    if (!profile || !cachedResources) return [];
    return resourcesForRegion(cachedResources, profile.region, profile.subregion).filter((resource) => resourceMatches(resource, resourceQuery));
  }, [cachedResources, profile, resourceQuery]);

  function acceptConsent() {
    window.localStorage.setItem(CONSENT_KEY, "yes");
    setConsent(true);
  }

  function clearConversation() {
    if (!window.confirm("Delete this Aurora conversation from this device?")) return;
    window.localStorage.removeItem(STORAGE_KEY);
    setMessages([]);
  }

  async function send() {
    const message = draft.trim();
    if (!message || sending || !consent || access !== "ok") return;
    const userMessage: ChatMessage = {
      id: crypto.randomUUID(), role: "user", content: message, createdAt: new Date().toISOString(),
    };
    const nextMessages = [...messages, userMessage].slice(-6);
    setMessages((current) => [...current, userMessage]);
    setDraft("");
    setError(null);
    setSending(true);

    try {
      const response = await fetch("/api/aurora/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextMessages.map(({ role, content }) => ({ role, content })) }),
      });
      const payload = await response.json().catch(() => null) as { reply?: unknown; error?: unknown; crisisSupportHref?: unknown } | null;
      const reply = payload?.reply;
      if (!response.ok || typeof reply !== "string") {
        setError(typeof payload?.error === "string" ? payload.error : "Aurora could not reply just now. Nothing has been saved online.");
        return;
      }
      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: reply,
          createdAt: new Date().toISOString(),
          crisisSupportHref: typeof payload?.crisisSupportHref === "string" ? payload.crisisSupportHref : null,
        },
      ]);
    } catch {
      setError("Aurora could not connect just now. Nothing has been saved online.");
    } finally {
      setSending(false);
    }
  }

  if (!profile) return null;

  return (
    <div className={styles.screen}>
      <ScreenHeader title="Ask Aurora" backHref="/settings" />
      <p className={styles.intro}>
        Aurora is an optional guide, not a clinician, therapist, crisis service, or legal adviser.
      </p>

      <div className={styles.tabs} role="tablist" aria-label="Aurora tools">
        <button type="button" role="tab" aria-selected={tab === "guide"} className={tab === "guide" ? styles.tabActive : styles.tab} onClick={() => setTab("guide")}>Talk with Aurora</button>
        <button type="button" role="tab" aria-selected={tab === "resources"} className={tab === "resources" ? styles.tabActive : styles.tab} onClick={() => setTab("resources")}>Find support</button>
      </div>

      {tab === "resources" ? (
        <section className={styles.resources} aria-labelledby="resource-title">
          <span className={styles.eyebrow}>Blossom resource collection</span>
          <h2 id="resource-title">Find support for your region</h2>
          <p>
            This is not a live web search. These are the sources Blossom has in its resource collection for {profile.region ?? "your region"}. Always check the original link for current details.
          </p>
          {!profile.region ? (
            <p className={styles.notice}>Choose a country in Profile &amp; preferences first, then Aurora can show regional sources.</p>
          ) : (
            <>
              <input className={styles.search} value={resourceQuery} onChange={(event) => setResourceQuery(event.target.value)} placeholder="Search housing, legal, peer support…" aria-label="Search support resources" />
              <div className={styles.resourceList}>
                {regionResources.length === 0 ? (
                  <p className={styles.empty}>Nothing matches that search in Blossom’s collection yet. You can still use the crisis support page for urgent help.</p>
                ) : regionResources.map((resource) => (
                  <a key={resource.id} className={styles.resourceCard} href={resource.sourceUrl} target="_blank" rel="noreferrer">
                    <span className={styles.resourceCategory}>{CATEGORY_LABELS[resource.category]}</span>
                    <strong>{resource.orgName}</strong>
                    <span>{resource.contactInfo}</span>
                    {resource.availability && <span>{resource.availability}</span>}
                    <small>Last reviewed {new Date(resource.lastReviewedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</small>
                  </a>
                ))}
              </div>
            </>
          )}
          <Link href="/crisis-support" className={styles.crisisLink}>Need urgent support right now?</Link>
        </section>
      ) : (
        <section className={styles.guide} aria-labelledby="guide-title">
          <div className={styles.guideHeading}>
            <div>
              <span className={styles.eyebrow}>Private AI beta</span>
              <h2 id="guide-title">A calmer way to ask for help</h2>
            </div>
            {messages.length > 0 && <button type="button" className={styles.clearButton} onClick={clearConversation}>Clear this device</button>}
          </div>

          {access === "checking" ? null : access === "signed-out" ? (
            <p className={styles.notice}>Sign in to use the private Aurora AI beta. <Link href="/account">Open Account &amp; sync</Link>.</p>
          ) : access === "not-in-beta" ? (
            <p className={styles.notice}>Aurora AI is currently being tested with Blossom beta users.</p>
          ) : !consent ? (
            <div className={styles.consent}>
              <strong>Before you begin</strong>
              <p>Your typed messages will be sent to Anthropic so Aurora can reply. Blossom does not automatically send your journal, medication, weight, photos, voice notes, or private plans.</p>
              <p>Conversation history stays on this device unless you choose to paste it into a new message. You can clear it at any time.</p>
              <button type="button" className={styles.primaryButton} onClick={acceptConsent}>I understand, continue</button>
            </div>
          ) : (
            <>
              {messages.length === 0 && (
                <div className={styles.starter}>
                  <p>Try one of these, or write your own.</p>
                  <div className={styles.promptList}>
                    {QUICK_PROMPTS.map((prompt) => <button key={prompt} type="button" onClick={() => setDraft(prompt)}>{prompt}</button>)}
                  </div>
                </div>
              )}
              <div className={styles.messages} aria-live="polite">
                {messages.map((message) => (
                  <div key={message.id} className={message.role === "user" ? styles.userMessage : styles.auroraMessage}>
                    <span>{message.role === "user" ? "You" : "Aurora"}</span>
                    <p>{message.content}</p>
                    {message.crisisSupportHref && <Link href={message.crisisSupportHref}>Open crisis support</Link>}
                  </div>
                ))}
              </div>
              {error && <p className={styles.error} role="alert">{error}</p>}
              <div className={styles.composer}>
                <textarea value={draft} onChange={(event) => setDraft(event.target.value)} rows={3} maxLength={1800} placeholder="Ask Aurora something…" aria-label="Message Aurora" />
                <div className={styles.composerFooter}>
                  <span>Only what you type here is shared with Aurora.</span>
                  <button type="button" className={styles.primaryButton} disabled={sending || !draft.trim()} onClick={() => void send()}>{sending ? "Aurora is thinking…" : "Send"}</button>
                </div>
              </div>
            </>
          )}
        </section>
      )}
    </div>
  );
}

"use client";

import Link from "next/link";
import ScreenHeader from "@/components/ScreenHeader";
import { APP_VERSION } from "@/lib/changelog";
import formStyles from "@/components/settingsForm.module.css";
import styles from "../settings.module.css";

const CHEVRON = (
  <svg className={styles.chevron} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 5l7 7-7 7" />
  </svg>
);

const DISCORD_INVITE_URL = "https://discord.gg/jD3yS2HN7s";

function Row({ href, title, meta }: { href: string; title: string; meta?: string }) {
  return (
    <Link href={href} className={styles.row}>
      <div className={styles.rowText}>
        <span className={styles.rowTitle}>{title}</span>
        {meta && <span className={styles.rowMeta}>{meta}</span>}
      </div>
      {CHEVRON}
    </Link>
  );
}

function ExternalRow({ href, title, meta }: { href: string; title: string; meta?: string }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={styles.row}>
      <div className={styles.rowText}>
        <span className={styles.rowTitle}>{title}</span>
        {meta && <span className={styles.rowMeta}>{meta}</span>}
      </div>
      {CHEVRON}
    </a>
  );
}

/* Everything that is about Blossom rather than about you. These eleven rows used
   to sit in Settings alongside the actual settings, which is most of the reason
   that screen felt like a filing cabinet. */
export default function AboutBlossomPage() {
  return (
    <div className={formStyles.screen}>
      <ScreenHeader title="About Blossom" backHref="/settings" />

      <div className={styles.section}>
        <p className={styles.sectionLabel}>Get help</p>
        <div className={styles.group}>
          <Row href="/settings/support" title="Help & support" meta="Guides, and support services near you" />
          <Row href="/tickets" title="Contact support" meta="Open a ticket, we'll get back to you here" />
          <Row href="/ideas" title="Ideas & bug reports" meta="Suggest a feature or tell us what's broken" />
        </div>
      </div>

      <div className={styles.section}>
        <p className={styles.sectionLabel}>The project</p>
        <div className={styles.group}>
          <ExternalRow href={DISCORD_INVITE_URL} title="Join our Discord" meta="Chat with other people using Blossom" />
          <Row href="/support-blossom" title="Keep Blossom running" meta="Chip in, if you can and want to" />
          <Row href="/about" title="Who's building Blossom" />
          <Row href="/ai" title="How Blossom is made" meta="Where AI is used, and where it isn't" />
          <Row href="/blog" title="Blog" meta="Updates from the team" />
          <Row href="/roadmap" title="Roadmap" meta="What's here and what's next" />
          <Row href="/join" title="Join the team" meta="Apply to help build Blossom" />
          <Row href="/beta" title="Beta programme" meta="What beta testing looks like" />
        </div>
      </div>

      <div className={styles.section}>
        <p className={styles.sectionLabel}>Legal</p>
        <div className={styles.group}>
          <Row href="/legal/privacy" title="Privacy Policy" />
          <Row href="/legal/terms" title="Terms of Service" />
        </div>

        <p className={styles.versionStamp}>Blossom v{APP_VERSION}</p>
      </div>
    </div>
  );
}

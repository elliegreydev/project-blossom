"use client";

import { useState, useSyncExternalStore } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import ScreenHeader from "@/components/ScreenHeader";
import Toggle from "@/components/Toggle";
import {
  db,
  defaultHomeLayout,
  LOCAL_PROFILE_ID,
  updateDeviceProfile,
  type HomeBlockKey,
  type HomeLayoutConfig,
  type HomeShortcutKey,
} from "@/lib/db";
import styles from "@/components/settingsForm.module.css";
import local from "./home.module.css";

const BLOCKS: Record<HomeBlockKey, { title: string; description: string }> = {
  focus: { title: "What would help right now?", description: "The intention picker at the top of Home." },
  today: { title: "Today", description: "Medication and appointments you chose to see." },
  upcoming: { title: "Coming up", description: "Future appointments." },
  supplies: { title: "Supply heads-up", description: "Only appears when a practical supply check may help." },
  pinned: { title: "Pinned tools", description: "Quick links you choose for Home." },
  journey: { title: "Recent journey", description: "Private moments you have already recorded." },
  aurora: { title: "Aurora", description: "Optional gentle guidance from Aurora." },
  nudges: { title: "App reminders", description: "Optional add-to-home-screen and sync reminders." },
};

const SHORTCUTS: Array<{ key: HomeShortcutKey; label: string }> = [
  { key: "medication", label: "Medication" },
  { key: "calendar", label: "Calendar" },
  { key: "journal", label: "Journal & check-ins" },
  { key: "goals", label: "Goals" },
  { key: "journey", label: "Journey" },
];

const PRESETS: Array<{ key: "current" | "essentials" | "reflective" | "health" | "blank"; title: string; description: string }> = [
  { key: "current", title: "Blossom default", description: "Bring back the normal Home starting point." },
  { key: "essentials", title: "Essentials only", description: "Today, appointments and any tools you pin." },
  { key: "reflective", title: "Reflective space", description: "The intention picker, journal shortcuts and journey." },
  { key: "health", title: "Health-focused", description: "Medication, appointments and practical supplies." },
  { key: "blank", title: "Blank canvas", description: "Start with no optional Home blocks and add only what you want." },
];

function applyPreset(key: (typeof PRESETS)[number]["key"]): HomeLayoutConfig {
  const base = defaultHomeLayout();
  if (key === "current") return base;
  if (key === "essentials") return { ...base, visibleBlocks: ["today", "upcoming", "pinned"], order: ["today", "upcoming", "pinned", "focus", "supplies", "journey", "aurora", "nudges"] };
  if (key === "reflective") return { ...base, visibleBlocks: ["focus", "pinned", "journey"], pinnedTools: ["journal"], order: ["focus", "pinned", "journey", "today", "upcoming", "supplies", "aurora", "nudges"] };
  if (key === "health") return { ...base, visibleBlocks: ["today", "upcoming", "supplies", "pinned"], pinnedTools: ["medication", "calendar"], order: ["today", "upcoming", "supplies", "pinned", "focus", "journey", "aurora", "nudges"] };
  return { ...base, visibleBlocks: [], pinnedTools: [] };
}

function layoutsMatch(left: HomeLayoutConfig, right: HomeLayoutConfig): boolean {
  return (
    left.density === right.density &&
    left.todayContent === right.todayContent &&
    left.visibleBlocks.join("|") === right.visibleBlocks.join("|") &&
    left.order.join("|") === right.order.join("|") &&
    left.pinnedTools.join("|") === right.pinnedTools.join("|") &&
    left.order.every((key) => left.blockWidths[key] === right.blockWidths[key])
  );
}

function subscribeToScreenLayout(onChange: () => void): () => void {
  const query = window.matchMedia("(min-width: 720px)");
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

function currentScreenLayout(): "phone" | "desktop" {
  return window.matchMedia("(min-width: 720px)").matches ? "desktop" : "phone";
}

function serverScreenLayout(): "phone" {
  return "phone";
}

export default function HomeSettingsPage() {
  const profile = useLiveQuery(() => db.profiles.get(LOCAL_PROFILE_ID));
  const detectedDevice = useSyncExternalStore(subscribeToScreenLayout, currentScreenLayout, serverScreenLayout);
  const [chosenDevice, setChosenDevice] = useState<"phone" | "desktop" | null>(null);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  if (!profile) return null;

  // Start on the layout this screen is actually using. The separate layouts
  // are useful, but making everyone manually spot the right tab was not.
  const device = chosenDevice ?? detectedDevice;

  const layout = device === "phone" ? profile.homePhoneLayout : profile.homeDesktopLayout;

  async function save(next: HomeLayoutConfig) {
    setSaveStatus("saving");
    try {
      await updateDeviceProfile(device === "phone" ? { homePhoneLayout: next } : { homeDesktopLayout: next });
      setSaveStatus("saved");
      window.setTimeout(() => setSaveStatus("idle"), 1800);
    } catch {
      setSaveStatus("error");
    }
  }

  function patch(patchValue: Partial<HomeLayoutConfig>) {
    void save({ ...layout, ...patchValue });
  }

  function toggleBlock(key: HomeBlockKey, enabled: boolean) {
    patch({ visibleBlocks: enabled ? [...layout.visibleBlocks, key] : layout.visibleBlocks.filter((item) => item !== key) });
  }

  function move(key: HomeBlockKey, direction: -1 | 1) {
    const index = layout.order.indexOf(key);
    const nextIndex = index + direction;
    if (index < 0 || nextIndex < 0 || nextIndex >= layout.order.length) return;
    const order = [...layout.order];
    [order[index], order[nextIndex]] = [order[nextIndex], order[index]];
    patch({ order });
  }

  function toggleShortcut(key: HomeShortcutKey, enabled: boolean) {
    patch({ pinnedTools: enabled ? [...layout.pinnedTools, key] : layout.pinnedTools.filter((item) => item !== key) });
  }

  return (
    <div className={styles.screen}>
      <ScreenHeader title="Home screen" backHref="/settings" />
      <p className={styles.hint}>Make this device&apos;s Home exactly as useful or as quiet as you want. These choices stay here and never change another device.</p>

      <div className={local.deviceTabs} role="tablist" aria-label="Choose a Home layout to edit">
        {(["phone", "desktop"] as const).map((item) => (
          <button key={item} type="button" role="tab" aria-selected={device === item} className={`${local.deviceTab} ${device === item ? local.active : ""}`} onClick={() => setChosenDevice(item)}>
            {item === "phone" ? "Phone" : "Desktop"}
          </button>
        ))}
      </div>

      <p className={local.editingNote} aria-live="polite">
        You&apos;re editing the layout currently used on this <strong>{device}</strong>.
        {saveStatus === "saving" && " Saving…"}
        {saveStatus === "saved" && " Saved."}
        {saveStatus === "error" && " Couldn&apos;t save that change. Please try again."}
      </p>

      <div className={styles.field}>
        <span className={styles.label}>Start with a layout</span>
        <div className={styles.optionGrid}>
          {PRESETS.map((preset) => {
            const active = layoutsMatch(layout, applyPreset(preset.key));
            return (
            <button key={preset.key} type="button" aria-pressed={active} className={`${styles.optionCard} ${active ? styles.selected : ""}`} onClick={() => void save(applyPreset(preset.key))}>
              <span className={styles.optionTitle}>{preset.title}</span>
              <span className={styles.optionDesc}>{preset.description}</span>
            </button>
            );
          })}
        </div>
        {layout.visibleBlocks.length === 0 && <p className={local.blankCanvasNote}><strong>Blank canvas is active.</strong> Turn on the blocks you want below, or choose Blossom default to bring them all back.</p>}
      </div>

      <div className={styles.field}>
        <span className={styles.label}>Presentation</span>
        <div className={local.choiceRow}>
          {(["compact", "standard", "spacious"] as const).map((density) => (
            <button key={density} type="button" className={`${local.choice} ${layout.density === density ? local.selected : ""}`} onClick={() => patch({ density })}>
              {density[0].toUpperCase() + density.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.field}>
        <span className={styles.label}>What appears in Today</span>
        <div className={local.choiceRow}>
          {(["both", "medication", "appointments", "none"] as const).map((choice) => (
            <button key={choice} type="button" className={`${local.choice} ${layout.todayContent === choice ? local.selected : ""}`} onClick={() => patch({ todayContent: choice })}>
              {choice === "both" ? "Both" : choice === "medication" ? "Medication" : choice === "appointments" ? "Appointments" : "Nothing"}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.field}>
        <span className={styles.label}>Pinned tools</span>
        <p className={styles.hint}>These are Blossom shortcuts, not outside links.</p>
        <div className={styles.optionGrid}>
          {SHORTCUTS.map((shortcut) => {
            const selected = layout.pinnedTools.includes(shortcut.key);
            return <button key={shortcut.key} type="button" className={`${styles.optionCard} ${selected ? styles.selected : ""}`} onClick={() => toggleShortcut(shortcut.key, !selected)}><span className={styles.optionTitle}>{shortcut.label}</span></button>;
          })}
        </div>
      </div>

      <div className={styles.field}>
        <span className={styles.label}>Home blocks</span>
        <p className={styles.hint}>Show, hide and move sections. On desktop, choose whether a section takes a full row or half a row.</p>
        <div className={local.blockList}>
          {layout.order.map((key, index) => {
            const block = BLOCKS[key];
            const visible = layout.visibleBlocks.includes(key);
            return (
              <div key={key} className={local.blockRow}>
                <div className={local.blockCopy}><strong>{block.title}</strong><span>{block.description}</span></div>
                <div className={local.blockControls}>
                  <Toggle checked={visible} onChange={(enabled) => toggleBlock(key, enabled)} label={`Show ${block.title}`} />
                  {device === "desktop" && <button type="button" className={local.widthButton} onClick={() => patch({ blockWidths: { ...layout.blockWidths, [key]: layout.blockWidths[key] === "wide" ? "half" : "wide" } })}>{layout.blockWidths[key] === "wide" ? "Full width" : "Half width"}</button>}
                  <button type="button" className={local.moveButton} disabled={index === 0} onClick={() => move(key, -1)} aria-label={`Move ${block.title} up`}>↑</button>
                  <button type="button" className={local.moveButton} disabled={index === layout.order.length - 1} onClick={() => move(key, 1)} aria-label={`Move ${block.title} down`}>↓</button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <p className={styles.hint}><strong>Low-Energy Mode:</strong> temporarily swaps this layout for essentials only. Turning it off brings your layout back exactly as you left it.</p>
    </div>
  );
}

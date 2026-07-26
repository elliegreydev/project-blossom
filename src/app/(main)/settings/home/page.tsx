"use client";

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import ScreenHeader from "@/components/ScreenHeader";
import { db, defaultHomeLayout, LOCAL_PROFILE_ID, updateDeviceProfile, type HomeBlockKey, type HomeLayoutConfig, type HomeShortcutKey } from "@/lib/db";
import styles from "./home.module.css";

type Device = "phone" | "desktop";

const BLOCKS: Array<{ key: HomeBlockKey; title: string; description: string }> = [
  { key: "focus", title: "What would help right now?", description: "The temporary intention picker at the top of Home." },
  { key: "today", title: "Today", description: "Medication and appointments you choose to see." },
  { key: "upcoming", title: "Coming up", description: "Future appointments." },
  { key: "pinned", title: "Pinned tools", description: "Quick links you choose for Home." },
  { key: "supplies", title: "Supply heads-up", description: "Only appears when a practical supply check may help." },
  { key: "journey", title: "Recent journey", description: "Private moments you have already recorded." },
  { key: "aurora", title: "Aurora", description: "Optional gentle guidance from Aurora." },
  { key: "nudges", title: "Optional reminders", description: "App install, sync and beta reminders when relevant." },
];

const SHORTCUTS: Array<{ key: HomeShortcutKey; title: string }> = [
  { key: "medication", title: "Medication" }, { key: "calendar", title: "Calendar" }, { key: "journal", title: "Journal & check-ins" }, { key: "goals", title: "Goals" }, { key: "journey", title: "Journey" },
];

function preset(kind: "default" | "essentials" | "reflective" | "health" | "blank"): HomeLayoutConfig {
  const base = defaultHomeLayout();
  if (kind === "essentials") return { ...base, visibleBlocks: ["focus", "today", "upcoming", "pinned"], order: ["focus", "today", "upcoming", "pinned"], density: "compact" };
  if (kind === "reflective") return { ...base, visibleBlocks: ["focus", "pinned", "journey", "aurora"], order: ["focus", "pinned", "journey", "aurora"], pinnedTools: ["journal", "journey"], density: "spacious" };
  if (kind === "health") return { ...base, visibleBlocks: ["focus", "today", "upcoming", "supplies", "pinned"], order: ["focus", "today", "upcoming", "supplies", "pinned"], pinnedTools: ["medication", "calendar"], todayContent: "both" };
  if (kind === "blank") return { ...base, visibleBlocks: ["focus"], order: ["focus"], pinnedTools: [] };
  return base;
}

export default function HomeSettingsPage() {
  const profile = useLiveQuery(() => db.profiles.get(LOCAL_PROFILE_ID));
  const [device, setDevice] = useState<Device>("phone");
  if (!profile) return null;
  const layout = (device === "phone" ? profile.homePhoneLayout : profile.homeDesktopLayout) ?? defaultHomeLayout();

  function save(next: HomeLayoutConfig) {
    void updateDeviceProfile(device === "phone" ? { homePhoneLayout: next } : { homeDesktopLayout: next });
  }

  function patch(patchValue: Partial<HomeLayoutConfig>) {
    save({ ...layout, ...patchValue });
  }

  function toggleBlock(key: HomeBlockKey) {
    const visible = layout.visibleBlocks.includes(key)
      ? layout.visibleBlocks.filter((item) => item !== key)
      : [...layout.visibleBlocks, key];
    patch({ visibleBlocks: visible });
  }

  function move(key: HomeBlockKey, direction: -1 | 1) {
    const index = layout.order.indexOf(key);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= layout.order.length) return;
    const order = [...layout.order];
    [order[index], order[target]] = [order[target], order[index]];
    patch({ order });
  }

  function toggleShortcut(key: HomeShortcutKey) {
    patch({ pinnedTools: layout.pinnedTools.includes(key) ? layout.pinnedTools.filter((item) => item !== key) : [...layout.pinnedTools, key] });
  }

  return <div className={styles.screen}>
    <ScreenHeader title="Home screen" backHref="/settings" />
    <p className={styles.intro}>Make this device’s Home exactly as useful or quiet as you want. These choices stay here and never change another device.</p>
    <div className={styles.tabs}><button type="button" className={device === "phone" ? styles.activeTab : styles.tab} onClick={() => setDevice("phone")}>Phone</button><button type="button" className={device === "desktop" ? styles.activeTab : styles.tab} onClick={() => setDevice("desktop")}>Desktop</button></div>

    <section className={styles.section}><h2>Start with a layout</h2><div className={styles.presets}>
      {(["default", "essentials", "reflective", "health", "blank"] as const).map((kind) => <button key={kind} type="button" className={styles.preset} onClick={() => save(preset(kind))}><strong>{{ default: "Blossom default", essentials: "Essentials only", reflective: "Reflective space", health: "Health-focused", blank: "Blank canvas" }[kind]}</strong><span>{{ default: "A balanced Home starting point.", essentials: "Today, appointments and your pinned tools.", reflective: "Journey, writing and a little space.", health: "Medication, appointments and practical supplies.", blank: "Start with only the intention picker." }[kind]}</span></button>)}
    </div></section>

    <section className={styles.section}><h2>Presentation</h2><div className={styles.choices}>{(["compact", "standard", "spacious"] as const).map((density) => <button key={density} type="button" className={layout.density === density ? styles.choiceActive : styles.choice} onClick={() => patch({ density })}>{density[0].toUpperCase() + density.slice(1)}</button>)}</div></section>
    <section className={styles.section}><h2>What appears in Today</h2><div className={styles.choices}>{(["both", "medication", "appointments", "none"] as const).map((todayContent) => <button key={todayContent} type="button" className={layout.todayContent === todayContent ? styles.choiceActive : styles.choice} onClick={() => patch({ todayContent })}>{todayContent === "both" ? "Both" : todayContent[0].toUpperCase() + todayContent.slice(1)}</button>)}</div></section>
    <section className={styles.section}><h2>Pinned tools</h2><p className={styles.help}>These are Blossom shortcuts, not outside links.</p><div className={styles.toolList}>{SHORTCUTS.map((shortcut) => <button key={shortcut.key} type="button" className={layout.pinnedTools.includes(shortcut.key) ? styles.toolActive : styles.tool} onClick={() => toggleShortcut(shortcut.key)}>{shortcut.title}</button>)}</div></section>
    <section className={styles.section}><h2>Home blocks</h2><p className={styles.help}>Show, hide and move sections. On desktop, choose whether a section takes a full row or half a row.</p><div className={styles.blockList}>{BLOCKS.map((block, index) => <div className={styles.block} key={block.key}><div><strong>{block.title}</strong><span>{block.description}</span></div><div className={styles.blockControls}><button type="button" className={layout.visibleBlocks.includes(block.key) ? styles.toggleOn : styles.toggle} onClick={() => toggleBlock(block.key)} aria-label={`${layout.visibleBlocks.includes(block.key) ? "Hide" : "Show"} ${block.title}`}><span /></button><button type="button" className={styles.move} disabled={index === 0} onClick={() => move(block.key, -1)} aria-label={`Move ${block.title} up`}>↑</button><button type="button" className={styles.move} disabled={index === BLOCKS.length - 1} onClick={() => move(block.key, 1)} aria-label={`Move ${block.title} down`}>↓</button>{device === "desktop" && <button type="button" className={layout.blockWidths[block.key] === "wide" ? styles.widthActive : styles.width} onClick={() => patch({ blockWidths: { ...layout.blockWidths, [block.key]: layout.blockWidths[block.key] === "wide" ? "half" : "wide" } })}>{layout.blockWidths[block.key] === "wide" ? "Full" : "Half"}</button>}</div></div>)}</div></section>
  </div>;
}

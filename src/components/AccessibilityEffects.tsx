"use client";

import { useEffect } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, LOCAL_PROFILE_ID } from "@/lib/db";

export default function AccessibilityEffects() {
  const profile = useLiveQuery(() => db.profiles.get(LOCAL_PROFILE_ID));

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.textSize = profile?.textSize ?? "normal";
    root.dataset.reduceMotion = profile?.reduceMotion ? "true" : "false";
    root.dataset.highContrast = profile?.highContrast ? "true" : "false";
    root.dataset.largeTouchTargets = profile?.largeTouchTargets ? "true" : "false";
    root.dataset.readingComfort = profile?.readingComfort ? "true" : "false";
    root.dataset.reduceVisualNoise = profile?.reduceVisualNoise ? "true" : "false";
  }, [profile?.textSize, profile?.reduceMotion, profile?.highContrast, profile?.largeTouchTargets, profile?.readingComfort, profile?.reduceVisualNoise]);

  return null;
}

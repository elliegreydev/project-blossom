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
  }, [profile?.textSize, profile?.reduceMotion]);

  return null;
}

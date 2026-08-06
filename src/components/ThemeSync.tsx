"use client";

import { useEffect } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, LOCAL_PROFILE_ID } from "@/lib/db";
import { applyThemeToDocument, DEFAULT_APPEARANCE, DEFAULT_THEME, isAppearance, isThemeId } from "@/lib/themes";

// Renders nothing. Keeps the document's theme in step with the profile.
//
// The inline script in the root layout has already applied whatever was
// cached in localStorage, so this usually confirms what's on screen rather
// than changing it. It matters when the profile disagrees with the cache:
// first run on a device, or a theme picked on another device arriving
// through sync.
export default function ThemeSync() {
  const profile = useLiveQuery(() => db.profiles.get(LOCAL_PROFILE_ID));

  useEffect(() => {
    if (!profile) return;
    applyThemeToDocument(
      isThemeId(profile.theme) ? profile.theme : DEFAULT_THEME,
      isAppearance(profile.appearance) ? profile.appearance : DEFAULT_APPEARANCE
    );
  }, [profile]);

  return null;
}

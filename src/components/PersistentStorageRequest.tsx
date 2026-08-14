"use client";

import { useEffect } from "react";
import { ensurePersistentStorage } from "@/lib/persistentStorage";

// Asks the browser to stop treating Blossom's storage as disposable. See
// src/lib/persistentStorage.ts for what's at stake - briefly, the categories
// Blossom deliberately never syncs have no copy anywhere else, so an eviction
// loses them permanently and silently.
//
// Runs on every launch rather than once. Browsers decide this on engagement
// heuristics, so a refusal today can become a grant next week once the app is
// installed and being opened regularly - but only if we ask again.
//
// Deliberately renders nothing and says nothing. If the answer is no, the
// person reading their Home screen can't do anything about it, and the honest
// version of that lives in Privacy & security where it sits next to the
// export button that actually helps.
export default function PersistentStorageRequest() {
  useEffect(() => {
    void ensurePersistentStorage();
  }, []);

  return null;
}

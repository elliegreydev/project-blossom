/**
 * Asking the browser not to throw away someone's Blossom.
 *
 * Everything a person writes in Blossom starts life in IndexedDB, and by
 * default a browser is free to bin that whenever it feels like reclaiming
 * space. iOS is the sharp end: it clears a web app's storage after roughly a
 * week of the app not being opened.
 *
 * For most of Blossom that would be recoverable, because signing back in pulls
 * the synced categories down again. But the things Blossom deliberately never
 * syncs have no copy anywhere at all - euphoria entries and Time Capsules,
 * Aurora conversations, trips, photos and voice recordings. Those are kept on
 * the device on purpose, for people's safety, and that same decision means
 * there is nothing to restore them from.
 *
 * So the failure this exists to prevent is specific and quiet: somebody
 * doesn't open Blossom for a fortnight, opens it on a bad day to reread a
 * Time Capsule they wrote to themselves, and it isn't there. No error, no
 * warning, nothing reported to us. We would never know it happened.
 *
 * navigator.storage.persist() asks the browser to exempt this origin from
 * that. It is a request, not a command - browsers decide with their own
 * heuristics, and an installed app with real engagement is the strongest
 * case. That means it can be refused today and granted later, which is why
 * this asks on every launch rather than once.
 */

export type PersistenceState = "persisted" | "refused" | "unsupported";

/**
 * Ask once, cheaply, and never throw.
 *
 * Checks first: a browser that has already granted this shouldn't be asked
 * again, and on Firefox asking is a visible permission prompt.
 */
export async function ensurePersistentStorage(): Promise<PersistenceState> {
  if (typeof navigator === "undefined" || !navigator.storage?.persist) return "unsupported";

  try {
    if (await navigator.storage.persisted()) return "persisted";
    return (await navigator.storage.persist()) ? "persisted" : "refused";
  } catch {
    // Some browsers throw rather than return false in private windows. Not
    // being able to ask is the same outcome as being told no.
    return "unsupported";
  }
}

/** Read the current state without asking, for showing in Settings. */
export async function checkPersistentStorage(): Promise<PersistenceState> {
  if (typeof navigator === "undefined" || !navigator.storage?.persisted) return "unsupported";
  try {
    return (await navigator.storage.persisted()) ? "persisted" : "refused";
  } catch {
    return "unsupported";
  }
}

/**
 * What to tell someone, in words that are true and not frightening.
 *
 * "Refused" deliberately doesn't say "your data may be deleted". Somebody
 * reading their privacy settings can do nothing about a browser heuristic,
 * and alarming a person who has no lever to pull is just cruelty with extra
 * steps. It says the useful thing instead: install it, open it, export.
 */
export function persistenceMessage(state: PersistenceState): string {
  switch (state) {
    case "persisted":
      return "Your browser has agreed to keep Blossom's data on this device, rather than clearing it to free up space.";
    case "refused":
      return "Your browser hasn't agreed to protect Blossom's storage yet. Installing Blossom to your home screen and opening it regularly usually earns that. Exporting now and then is worth doing either way.";
    case "unsupported":
      return "This browser doesn't let apps ask for their storage to be protected. Installing Blossom to your home screen and exporting now and then is worth doing.";
  }
}

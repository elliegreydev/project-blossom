/**
 * Drafts for in-progress writing.
 *
 * Journal entries and check-in notes live in React state until someone presses
 * Save, so anything that ends the page - a forced restart for a new build, a
 * crash, a phone dying, a misplaced tap on the backdrop - takes the text with
 * it. In an app where the hard thing to do is write the entry in the first
 * place, losing it is worse than any bug we'd normally chase.
 *
 * localStorage rather than Dexie on purpose: this has to be readable and
 * writable synchronously on every keystroke, and it must never reach the sync
 * outbox. A draft is a thing on this device, not a record.
 *
 * Because drafts hold the same words the entry would have, they're covered by
 * the full data wipe - see clearAllDrafts, called from wipeAllData.
 */

const PREFIX = "blossom:draft:";

/** Storage is unavailable in private modes and some embedded webviews. Every
 *  call here fails quietly: a lost draft is a disappointment, a thrown error
 *  mid-keystroke would break the sheet someone is typing into. */
export function readDraft(key: string): string | null {
  try {
    return window.localStorage.getItem(PREFIX + key);
  } catch {
    return null;
  }
}

export function writeDraft(key: string, value: string): void {
  try {
    if (value.trim()) window.localStorage.setItem(PREFIX + key, value);
    else window.localStorage.removeItem(PREFIX + key);
  } catch {
    // Quota exceeded or storage blocked - nothing useful to do, and the
    // in-memory value is still on screen.
  }
}

export function clearDraft(key: string): void {
  try {
    window.localStorage.removeItem(PREFIX + key);
  } catch {}
}

export function clearAllDrafts(): void {
  try {
    const keys: string[] = [];
    for (let i = 0; i < window.localStorage.length; i += 1) {
      const k = window.localStorage.key(i);
      if (k && k.startsWith(PREFIX)) keys.push(k);
    }
    keys.forEach((k) => window.localStorage.removeItem(k));
  } catch {}
}

/** Editing an existing record keeps its own draft, so an interrupted edit
 *  doesn't reappear in the "new entry" sheet, and vice versa. */
export function draftKey(kind: "journal" | "checkin" | "voiceline", id?: string | null): string {
  return id ? `${kind}:${id}` : `${kind}:new`;
}

// Whether somebody has already read the voice safety note.
//
// Two separate flags on purpose. The first is "you have never practised here
// before". The second is "you have just put a reference range on screen for
// the first time", which can happen months later and is the moment the advice
// about not chasing a number actually starts to matter.
//
// Deliberately NOT a gate. Blossom does not gate anything, including
// self-directed HRT, which carries far more risk than this does. A checklist
// you must clear before you are allowed to practise would make voice the most
// locked-down thing in the app, and a checklist shown every time just teaches
// people to click past Blossom's safety text. So: shown once, never blocking,
// and permanently reachable from the practice screen afterwards.
//
// Device-local, because it describes what this person has read on this device
// and syncing it would mean a new profile field for no benefit.

const SEEN_KEY = "blossom-voice-safety-seen";
const RANGE_KEY = "blossom-voice-range-safety-seen";

function read(key: string): boolean {
  try {
    return localStorage.getItem(key) === "1";
  } catch {
    // Storage unavailable. Showing the note again is the safe failure.
    return false;
  }
}

function write(key: string): void {
  try {
    localStorage.setItem(key, "1");
  } catch {
    // It will be shown again next time. Not worth surfacing.
  }
}

export function hasSeenVoiceSafety(): boolean {
  return read(SEEN_KEY);
}

export function markVoiceSafetySeen(): void {
  write(SEEN_KEY);
}

export function hasSeenRangeSafety(): boolean {
  return read(RANGE_KEY);
}

export function markRangeSafetySeen(): void {
  write(RANGE_KEY);
}

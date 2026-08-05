// sessionStorage that can't take the app down with it.
//
// Reading or writing sessionStorage throws outright in Safari private
// browsing and wherever storage is blocked - which is exactly how a lot of
// Blossom's users will open it, since browsing privately is the whole point
// for someone who doesn't want the app leaving traces. The lock screens used
// to touch it bare, so the effect threw, state never resolved, and the gate
// rendered nothing at all: a blank screen with no way in.
//
// Reads fail CLOSED (treated as "not unlocked", so you get the PIN prompt
// rather than a free pass). Writes fail QUIETLY - if the unlock can't be
// remembered, the person just has to enter it again next time, which is
// annoying but not broken.

export function readSessionFlag(key: string): boolean {
  try {
    return sessionStorage.getItem(key) === "1";
  } catch {
    return false;
  }
}

export function writeSessionFlag(key: string): void {
  try {
    sessionStorage.setItem(key, "1");
  } catch {
    // Nothing to do - the unlock simply won't persist for this session.
  }
}

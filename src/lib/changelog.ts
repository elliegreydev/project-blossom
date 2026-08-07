// Blossom's in-app changelog. Newest entry first.
//
// Every shipped change bumps APP_VERSION and adds an entry here, kept in sync
// with package.json. Same discipline as Filthy Rich Tycoon, different tone:
// Blossom's whole design is quiet by default, so entries are written plainly
// and the popup that shows them never celebrates at someone who might have
// opened the app on a rough day.
//
// Tags colour the bullet:
//   "new"      what wasn't there before
//   "improved" something that already existed, working better
//   "fix"      something that was broken

export const APP_VERSION = "0.2.2";

export type ChangelogTag = "new" | "improved" | "fix";

export interface ChangelogItem {
  tag: ChangelogTag;
  text: string;
}

export interface ChangelogEntry {
  version: string;
  date: string;
  title: string;
  items: ChangelogItem[];
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: "0.2.2",
    date: "2026-08-07",
    title: "Opens straight away now",
    items: [
      { tag: "improved", text: "Blossom used to hold its opening screen for five seconds every time. It now opens as fast as your phone can manage - usually instantly - and only shows the loading screen if something is genuinely taking a moment." },
      { tag: "fix", text: "The buttons at the top of Home are proper icons now. Two of them were characters some Android phones don't have, so they could show as empty boxes with nothing to read." },
    ],
  },
  {
    version: "0.2.1",
    date: "2026-08-06",
    title: "Sync tells you what went wrong",
    items: [
      { tag: "improved", text: "If something can't be saved to your account, Account & sync now shows exactly what the server said and which records are waiting, instead of a vague apology." },
      { tag: "fix", text: "One category failing to download no longer stops everything else on your device from uploading." },
      { tag: "fix", text: "Blossom now updates itself properly in the background, so a device can't keep running an old version for weeks." },
    ],
  },
  {
    version: "0.2.0",
    date: "2026-08-06",
    title: "Choose how Blossom looks, and a tidier Settings",
    items: [
      { tag: "new", text: "Five themes to pick from, in Settings › Appearance." },
      { tag: "new", text: "A light and dark choice that's yours, separate from your phone's. Leave it on Automatic if you'd rather it follow along." },
      { tag: "improved", text: "Settings had grown to twenty-seven rows. It's ten now, in two groups, and nothing has been taken away." },
      { tag: "improved", text: "Trusted Circle, Blossom Bridge, safety check-ins, your support map, Passport and the HRT guide have moved to Track, with your other tools." },
      { tag: "improved", text: "Everything about the project - the blog, the roadmap, help, legal - now sits behind one About Blossom row." },
      { tag: "improved", text: "Settings shows how many people can currently see some of your data, so it's never something you have to go looking for." },
    ],
  },
  {
    version: "0.1.0",
    date: "2026-08-03",
    title: "A proper home, and a few fixes",
    items: [
      { tag: "new", text: "Blossom now lives at projectblossom.net." },
      { tag: "new", text: "Morning and evening check-in reminders, at times you choose. Off by default." },
      { tag: "new", text: "Check-ins can be tagged as morning or evening, and now show the time you wrote them." },
      { tag: "improved", text: "Blossom opens without a signal now. Everything you write is stored on your device, so it works on a train or anywhere else with no connection." },
      { tag: "fix", text: "Reminders no longer repeat every few minutes. A missed dose nudges you a couple of times and then leaves you alone." },
      { tag: "fix", text: "The app no longer disappears from your home screen after an update." },
      { tag: "fix", text: "You can't send messages on a support ticket that's already been resolved." },
    ],
  },
];

// Numeric compare so "0.10.0" is correctly newer than "0.9.0" - a plain string
// comparison gets that backwards.
export function isNewer(candidate: string, current: string): boolean {
  const a = candidate.split(".").map((n) => Number(n) || 0);
  const b = current.split(".").map((n) => Number(n) || 0);
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const diff = (a[i] ?? 0) - (b[i] ?? 0);
    if (diff !== 0) return diff > 0;
  }
  return false;
}

export const LAST_SEEN_VERSION_KEY = "blossom-last-seen-version";

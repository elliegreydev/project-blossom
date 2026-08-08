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

export const APP_VERSION = "0.4.2";

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
    version: "0.4.2",
    date: "2026-08-08",
    title: "Your sync choices hold",
    items: [
      { tag: "fix", text: "A device that had been offline could quietly undo your choice about what syncs, just by saving an unrelated setting. It can't now. Whichever device you last made the choice on is the one that counts." },
      { tag: "fix", text: "Turning a category back on now catches up properly. Anything you wrote on this device while it was off gets uploaded, and anything written on your other devices comes down. Before, both halves stayed missing." },
    ],
  },
  {
    version: "0.4.1",
    date: "2026-08-07",
    title: "Sync catches up faster, and says so",
    items: [
      { tag: "improved", text: "Syncing is a lot quicker, especially on mobile data. Blossom used to fetch each part of your account one after another, and now fetches them together." },
      { tag: "new", text: "A small \"Catching up\" note appears while Blossom is syncing, so you can tell it's working rather than wondering whether anything is happening." },
      { tag: "fix", text: "Closing the app now sends whatever you just wrote straight away, instead of waiting for the next check. Writing something on your phone and going to look at it on a laptop should now just work." },
      { tag: "fix", text: "Changes the server kept refusing are given another go every half hour on their own. Before this, only the Sync now button could rescue them." },
    ],
  },
  {
    version: "0.4.0",
    date: "2026-08-07",
    title: "Choose what leaves your device",
    items: [
      { tag: "new", text: "Sync used to be all or nothing. You can now keep any category - your journal, intimacy notes, budget, anything - on your devices only, while the rest still syncs. Account & sync, then Choose what syncs." },
      { tag: "new", text: "Turning a category off offers to remove what's already on the server. Nothing is ever removed from your phone or any other device you use." },
      { tag: "improved", text: "The same screen now says plainly what never leaves your device at all, whatever you choose." },
      { tag: "fix", text: "A change that failed to save five times used to be stuck forever - even Sync now skipped it. Sync now clears the count and tries again." },
    ],
  },
  {
    version: "0.3.1",
    date: "2026-08-05",
    title: "Blossom tells us when it breaks",
    items: [
      { tag: "improved", text: "When something goes wrong in Blossom, the app now tells us what broke and roughly where, so it can be fixed without you having to notice and report it." },
      { tag: "improved", text: "It never sends anything you have written. Not a journal entry, not a message, not a mood, not what you were reading or searching for. What travels is the shape of the failure: which part of the app, what kind of error, and an anonymous id so we can tell one person's bad day from everybody's. That id cannot be turned back into you." },
    ],
  },
  {
    version: "0.3.0",
    date: "2026-08-07",
    title: "Travel Mode",
    items: [
      { tag: "fix", text: "Blossom used to quietly move your reminders when you changed timezone. Fly London to Los Angeles and an 8am dose became 8am there - an eight hour shift, with nothing said. It now asks first, and shows you exactly what each choice does to your actual dose times." },
      { tag: "new", text: "Plan a trip: somewhere for the practical bits. A checklist for what to pack, what the time difference does to your schedule, and local support where we have information we've checked." },
      { tag: "new", text: "Trips live in Track. They stay on your device and are never uploaded." },
    ],
  },
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

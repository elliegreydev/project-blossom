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

export const APP_VERSION = "0.5.17";

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
    version: "0.5.17",
    date: "2026-08-17",
    title: "Just the essentials",
    items: [
      { tag: "new", text: "For harder days. Home keeps what's due and what's coming, and everything else steps back - no supply warnings, no journey history, no nudges, and nothing asking you for anything. Settings, then Home screen." },
      { tag: "new", text: "You choose how long: just today, a few days, or until you turn it off. When a timed one runs out your Home simply comes back, with no announcement about how your day is going." },
      { tag: "improved", text: "Your Home layout is never changed by this. It's kept exactly as you built it and returns the moment you turn it off - and there's a way to turn it off on Home itself, so you never have to go looking." },
    ],
  },
  {
    version: "0.5.16",
    date: "2026-08-17",
    title: "Your colour, actually colourful",
    items: [
      { tag: "improved", text: "The colour slider was washed out. Every shade was held at the same low intensity, which made purples and oranges far duller than they needed to be. They're as rich as your screen can show now, and the slider itself previews it properly." },
    ],
  },
  {
    version: "0.5.15",
    date: "2026-08-17",
    title: "Make it your colour",
    items: [
      { tag: "new", text: "A sixth theme called Your colour, with a slider for the whole colour wheel. Pick a colour you like and Blossom rebuilds itself around it, light and dark both." },
      { tag: "improved", text: "You can't make it unreadable. Only the colour changes; how light or dark the text and background are stays fixed wherever you put the slider. Crisis support keeps its own colour too, so nothing you choose can make it hard to spot." },
    ],
  },
  {
    version: "0.5.14",
    date: "2026-08-17",
    title: "The roadmap was behind the app",
    items: [
      { tag: "fix", text: "Six things Blossom already does were still listed as not built: the appointment prep space, source and review dates on support resources, syncing for more trackers, the euphoria journal, the Home screen layout editor, and the \"what would help right now\" picker. They're in Available now, where they belong." },
      { tag: "improved", text: "Finished work is labelled \"Recently shipped\" rather than \"Recently added\", which made things that were already built read like fresh promises." },
      { tag: "improved", text: "The local-first storage entry now names the only part still outstanding, encrypted backups, instead of listing three things that shipped months ago alongside it." },
    ],
  },
  {
    version: "0.5.13",
    date: "2026-08-14",
    title: "A proper welcome",
    items: [
      { tag: "improved", text: "The setup flow's module picker now shows everything Blossom can do - all eleven areas, not the original five. Blood tests, voice practice, presentation, body & progress, budget and intimacy were all there, but you had to find them in Settings afterwards." },
      { tag: "improved", text: "The sync step now says the important part out loud: syncing is per category, and photos, voice recordings, euphoria entries, Time Capsules, Aurora chats and trips never leave your device whatever you choose." },
      { tag: "new", text: "Setup ends with a new step showing how to put Blossom on your home screen, and why: it opens quicker, works offline, and your phone protects an installed app's data properly. If your phone is shared, it also says plainly that it's fine to skip." },
    ],
  },
  {
    version: "0.5.12",
    date: "2026-08-14",
    title: "One line on the donations page, said better",
    items: [
      { tag: "improved", text: "The \"if money's tight\" note described you rather than the situation. It doesn't now. Same meaning: if you can't spare anything, don't give anything, and don't feel bad about it." },
    ],
  },
  {
    version: "0.5.11",
    date: "2026-08-14",
    title: "Asking your phone to keep your Blossom",
    items: [
      { tag: "new", text: "Phones clear away app data they think is unused, and on iOS that can happen after about a week of not opening something. Blossom now asks your browser not to do that to it. Most of your things would come back when you signed in, but euphoria entries, Time Capsules, trips, Aurora chats, photos and voice notes never leave your device by design, so there'd be nothing to bring back." },
      { tag: "new", text: "Privacy & security now tells you whether your browser agreed. If it hasn't, installing Blossom to your home screen and opening it regularly is what usually earns it - and exporting now and then is worth doing whatever the answer." },
    ],
  },
  {
    version: "0.5.10",
    date: "2026-08-14",
    title: "Your crisis numbers can't be taken away by a bad connection",
    items: [
      { tag: "fix", text: "If our server ever answered with an empty list, Blossom would wipe the support resources saved on your device and replace them with nothing. Offline, that copy is the only one you have. It now keeps what it already had unless there's genuinely something newer to put there." },
    ],
  },
  {
    version: "0.5.9",
    date: "2026-08-14",
    title: "More crisis lines, in every country we cover",
    items: [
      { tag: "new", text: "Eight national crisis lines added. Every country Blossom covers now has three rather than one. That includes text-only options for anyone who can't face speaking on a phone: Shout in the UK, and text 988 in the US and Canada." },
      { tag: "new", text: "Australia had one LGBTIQ+ line that closes at 9pm and nothing after it. Lifeline and the Suicide Call Back Service are both there now, both round the clock." },
    ],
  },
  {
    version: "0.5.8",
    date: "2026-08-14",
    title: "The crisis page was hiding help it already had",
    items: [
      { tag: "fix", text: "Open the crisis page in the UK and you got one number. Switchboard's LGBT+ helpline was already in Blossom, open until 10pm every night, and the page wouldn't show it because of how it was filed. Ireland had three lines hidden the same way." },
      { tag: "improved", text: "The page now asks a better question. Not \"is this tagged as crisis\", but \"can you reach a person through this right now\". Those lines appear underneath the crisis ones, labelled for what they are, so the two are never blurred." },
    ],
  },
  {
    version: "0.5.7",
    date: "2026-08-14",
    title: "Crisis help moved to the top of Home",
    items: [
      { tag: "improved", text: "\"Need support right now?\" used to sit in small grey text at the very bottom of Home, below everything else. It's now at the top, right under the greeting, and you can actually see it. Nobody should have to scroll past their medication and their budget to find help." },
      { tag: "improved", text: "It's pink rather than red, and it stays that way on ordinary days too. Something that looks like an emergency every time you open an app makes the app hard to open." },
      { tag: "improved", text: "The Keep Blossom running link at the bottom is more visible as well. That was only safe to do once crisis help wasn't sitting underneath it competing for your attention." },
    ],
  },
  {
    version: "0.5.6",
    date: "2026-08-14",
    title: "Easier to find, not harder to ignore",
    items: [
      { tag: "new", text: "There's now a small, permanent \"Keep Blossom running\" link at the bottom of Home. If you want to chip in you can, from day one, without waiting to be asked or going hunting through Settings." },
      { tag: "improved", text: "It's called Keep Blossom running now rather than Support Blossom, because the app already had Help & support, Contact support and Need support right now, and one of those four was not like the others." },
      { tag: "improved", text: "Nothing about the ask itself has changed. The card that actually asks still stays away for your first week, still goes quiet for six weeks if you say maybe later, and if you've said you'd rather not be asked you don't get the link either." },
    ],
  },
  {
    version: "0.5.5",
    date: "2026-08-14",
    title: "A game sale is not a donation",
    items: [
      { tag: "fix", text: "Blossom shares a payment account with the other things we build, so the running-costs figure now counts only what came through Blossom's own donation link. Before this, a sale somewhere else could have made it look like Blossom's bills were paid when they weren't." },
      { tag: "improved", text: "The privacy policy now describes exactly what that involves: Stripe's reply is read for what each payment was worth and which payment it was, nothing about who paid, and only the monthly total is kept." },
    ],
  },
  {
    version: "0.5.4",
    date: "2026-08-14",
    title: "The running costs figure keeps itself honest",
    items: [
      { tag: "improved", text: "When Blossom shows what a month has raised towards its running costs, that number now comes from Stripe rather than being typed in by us. It can't drift, and it can't be quietly out of date." },
      { tag: "improved", text: "We still don't know who donated. Blossom's server asks Stripe for a total and gets a total: no names, no email addresses, no individual amounts. The privacy policy now spells that out." },
    ],
  },
  {
    version: "0.5.3",
    date: "2026-08-14",
    title: "Where the money goes once the bills are paid",
    items: [
      { tag: "new", text: "Support Blossom now answers what happens when a month's running costs are covered, rather than waiting to be asked. It goes into the next month: some months come up short and some don't, and a buffer means Blossom doesn't wobble when one does. Beyond that it goes back into the app, and the ideas board is where to say what you'd want built." },
    ],
  },
  {
    version: "0.5.2",
    date: "2026-08-14",
    title: "We went back through the privacy policy properly",
    items: [
      { tag: "fix", text: "Our last update took three things out of the privacy policy that belonged in it. Euphoria entries and Time Capsules stay on your device, and they're back on the list that says so. The details you prepare for an appointment do sync, and the policy says that again too." },
      { tag: "fix", text: "Aurora's consent screen said your typed message goes to Anthropic. It's the conversation that goes: your message plus the earlier ones in that same chat, so the reply makes sense. Nothing else, and it now says so before you agree to it." },
      { tag: "improved", text: "Choose what syncs now lists everything that never leaves your device. Euphoria entries, Time Capsules and Aurora chats were always device-only, but that screen only mentioned photos, recordings, trips and your PIN." },
      { tag: "new", text: "The policy now covers what happens when you write to support. That message is stored as ordinary text and staff can read it, and it's the one place in Blossom where something you write is visible to us by default. Worth knowing before you write it." },
      { tag: "improved", text: "It also names who's responsible for your data and how Blossom and Grey Studios relate, says our servers moved to Ireland so your synced data no longer crosses the Atlantic, and states plainly that there's no analytics or advertising code in Blossom at all." },
    ],
  },
  {
    version: "0.5.1",
    date: "2026-08-14",
    title: "The privacy policy now matches the app",
    items: [
      { tag: "fix", text: "Our privacy policy still described four things Blossom stopped collecting weeks ago. It doesn't now. It also explains, for the first time, that Blossom reports its own breakages to us, and exactly what those reports do and don't contain." },
      { tag: "improved", text: "It now says plainly where your synced data is stored and where it is processed, and the Terms cover donations, cancellation and refunds." },
    ],
  },
  {
    version: "0.5.0",
    date: "2026-08-07",
    title: "You can chip in, if you want to",
    items: [
      { tag: "new", text: "Blossom is free and stays free. If you can spare something, there's now a way to give once or monthly. It pays for checking the support services and rewriting the legal notes, not for features." },
      { tag: "new", text: "We don't record who donates. No supporter badge, no note on your account." },
    ],
  },
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
      { tag: "improved", text: "It never sends anything you have written. Not a journal entry, not a message, not a mood, not what you were reading or searching for. What travels is the shape of the failure: which part of the app, what kind of error, and your account reference, so we can tell one person hitting a problem repeatedly from a hundred people hitting it once. That reference is the same one your account uses, so we can connect a report back to an account if we need to. It is never shared outside Grey Studios." },
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

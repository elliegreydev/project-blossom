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

export const APP_VERSION = "0.5.36";

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
    version: "0.5.36",
    date: "2026-08-25",
    title: "You can delete your account",
    items: [
      { tag: "new", text: "There's a Delete your account button in Account and sync. It removes your account and everything synced to it, clears Blossom off the device you're on, and signs you out. It asks you to type a word first so it can't happen by accident. It doesn't ask why you're going, and there's nothing offered to keep you." },
      { tag: "fix", text: "The privacy policy and the terms both said you could delete a synced account, and there was no way to do it anywhere in the app. Support was doing it by hand. That gap is closed." },
      { tag: "improved", text: "Both documents now say what deleting your account actually reaches. The account, everything synced under it, your support tickets and any sharing you'd set up all go. Ideas, bug reports and applications you sent us don't, because they were never attached to your account, so email us if you want one of those taken down too." },
      { tag: "improved", text: "Delete all data in Settings now says outright that it clears this device and doesn't touch a synced account. If you'd wiped a device expecting the account to go with it, it hadn't." },
      { tag: "improved", text: "If any part of the deletion fails, Blossom says so and leaves your device alone rather than wiping it and hoping. You'd know either way, and you'd still have your data." },
    ],
  },
  {
    version: "0.5.35",
    date: "2026-08-25",
    title: "Setting up got shorter",
    items: [
      { tag: "fix", text: "Setup asked whether to lock the more private parts of Blossom behind your app lock, but ticking it did nothing at all, because setup never asked you to set a PIN. If you ticked that box expecting it to protect you, it wasn't protecting you. The tick is gone, and the App lock in Settings does the job properly." },
      { tag: "improved", text: "Setting up is six screens instead of nine. Three of them were asking you things that changed nothing about the app you were about to use, so they've gone. Nothing you'd already chosen has changed." },
      { tag: "improved", text: "Picking your country now tells you straight away what it got you, rather than apologising for the list. The support services for where you are were already saved on your device; now you can see how many." },
      { tag: "improved", text: "If you haven't put anything in Blossom yet, the first thing on Home is what's already in there for you, rather than four different things asking you to install it, make an account, or join Discord. Those come back once you've actually started using it." },
      { tag: "improved", text: "The support services page lets you pick your country and area on the page itself, instead of telling you more services exist and sending you somewhere else to say where you are." },
    ],
  },
  {
    version: "0.5.34",
    date: "2026-08-25",
    title: "The AI chat has gone",
    items: [
      { tag: "improved", text: "Blossom's optional AI chat has been removed. It was the only part of the app that sent anything you wrote outside the UK, and now nothing does. If that was the thing that made you unsure about Blossom, it isn't there any more." },
      { tag: "improved", text: "Aurora, the gentle suggestion on your Home screen, is staying exactly as it is. It was never the AI, whatever the shared name suggested: those suggestions are worked out on your own device and don't need a connection at all. Your Aurora setting is untouched." },
      { tag: "improved", text: "The closed beta programme has gone too, along with beta chat. Ideas and bug reports still work the same way, in Settings then About, or at the ideas board." },
      { tag: "improved", text: "The privacy policy is shorter as a result. The paragraph warning that one thing you typed could leave Europe, and the note saying the safeguards for it hadn't been reviewed yet, are both gone, because there's no longer anything for them to describe." },
    ],
  },
  {
    version: "0.5.33",
    date: "2026-08-18",
    title: "When the app wouldn't open at all",
    items: [
      { tag: "fix", text: "If your browser wouldn't let Blossom store anything on your device, the app got stuck on \"Opening your space\" and stayed there. No message, no way forward. It now explains what's happened, and that a private or incognito window is almost always the reason, since those block the storage Blossom needs." },
      { tag: "fix", text: "The same thing on the very first setup screen showed a blank page instead. That gets the same explanation now." },
      { tag: "improved", text: "It also says plainly that nothing has been deleted. Blossom just can't reach it, and it'll be there once it can." },
    ],
  },
  {
    version: "0.5.32",
    date: "2026-08-18",
    title: "Sharing the link without it saying too much",
    items: [
      { tag: "fix", text: "Sending someone the Blossom link used to produce a bare web address with no preview at all, anywhere you pasted it. There's a proper preview card now, so it looks like a real thing rather than a stray link." },
      { tag: "improved", text: "The card deliberately doesn't say what Blossom is for. It's the name, the flower and \"a gentle companion for your journey\", and nothing else. A preview turns up wherever a link gets pasted, including group chats you didn't pick, so it shouldn't be the thing that tells a room something about you." },
    ],
  },
  {
    version: "0.5.31",
    date: "2026-08-17",
    title: "Saying plainly where AI is used",
    items: [
      { tag: "new", text: "A new page, How Blossom is made, in Settings then About. It says outright that most of Blossom's code is written with AI, and separately explains Aurora AI: what it sends, what it never sends, and that it's optional. People asked, and they were right to ask." },
      { tag: "improved", text: "It also spells out what AI is never allowed to do here. No dosing guidance, nothing about where to buy anything, and no interpreting a blood result. That rule applied already; now it's written down where you can find it." },
    ],
  },
  {
    version: "0.5.30",
    date: "2026-08-17",
    title: "Getting in when the code is slow",
    items: [
      { tag: "fix", text: "If you asked for a sign-in code and then asked again before the first one arrived, Blossom refused and didn't explain itself. It now says a code is already on its way, shows you how many seconds until you can ask for another, and points at your spam folder, which is usually where the first one is." },
      { tag: "fix", text: "Behind the scenes, when something failed Blossom often couldn't say what it was, so problems arrived unnamed and unfixable. That's why the above went unnoticed. It can name them now, which means the next thing that breaks gets found faster." },
    ],
  },
  {
    version: "0.5.29",
    date: "2026-08-17",
    title: "That was a sun, not a gear",
    items: [
      { tag: "fix", text: "The Settings icon at the bottom of the screen was a small circle with eight lines radiating out of it, which is the brightness symbol in more or less every app ever made. Somebody spotted it within an hour of Blossom being shown to anyone outside the beta. It's a cog now." },
    ],
  },
  {
    version: "0.5.28",
    date: "2026-08-17",
    title: "Search that understands a question",
    items: [
      { tag: "new", text: "Trusted Circle, Blossom Bridge, Passport, safety check-ins and your Support Map are all in the Info tab now, under Sharing and safety, with a plain explanation of what each one actually does. They were built a while ago and were genuinely hard to find, which rather defeated the point of the safety ones." },
      { tag: "improved", text: "You can search in your own words instead of guessing at keywords. \"Share with my partner\" finds Trusted Circle, \"show my doctor\" finds Passport, and \"where do I put my needles\" finds the sharps section." },
      { tag: "improved", text: "If nothing matches everything you typed, Blossom shows the closest things rather than an empty screen, best match first. Typing only filler words still finds nothing, which is the correct answer to a question that wasn't one." },
    ],
  },
  {
    version: "0.5.27",
    date: "2026-08-17",
    title: "An Info tab, and you can search it",
    items: [
      { tag: "new", text: "Blossom's guides and reference material had ended up scattered across six unrelated corners of the app, and none of them was somewhere you'd think to look. There's now an Info tab in the bar at the bottom that gathers all of it." },
      { tag: "new", text: "You can search it. One box covers the guides, all the support services for every region we cover, and the regional legal notes together, because when you're looking for a helpline you don't know or care which part of the app it lives in." },
      { tag: "improved", text: "Anything belonging to a module you haven't switched on stays completely hidden, including from search. And if you've renamed a section, the Info tab uses your name for it too." },
    ],
  },
  {
    version: "0.5.26",
    date: "2026-08-17",
    title: "Practical things nobody tells you",
    items: [
      { tag: "new", text: "An information page inside Self-directed care. Bridging prescriptions and why your GP is allowed to write one, getting bloods done without a GP and roughly what that costs, storing vials, sharps disposal, and what actually happens if a package gets stopped at the border." },
      { tag: "new", text: "Still no dosing advice and nothing telling you where to buy anything. What is there was researched and sourced rather than written from memory, and anything we could not confirm was cut instead of hedged." },
      { tag: "new", text: "A short list of places that do cover the rest, kept clearly separate and clearly marked as other people's work rather than ours. The two that cover suppliers say so on the label." },
      { tag: "improved", text: "One thing worth pulling out: if a package is seized you have one month to respond, it is set in law, and there is no provision for late challenges. Sitting on the letter is the one move that costs you every option." },
    ],
  },
  {
    version: "0.5.25",
    date: "2026-08-17",
    title: "Looking after your own HRT",
    items: [
      { tag: "new", text: "A new section for people managing their own HRT, whether that's instead of a clinic, alongside one, or while you're still sat on a waiting list. When a clinic's involved, someone else keeps the schedule, holds the record and notices if something looks off. Without one, all three of those are yours, and this is somewhere to put them. Switch it on in Settings, under the modules list." },
      { tag: "new", text: "There's no dosing advice in it and there never will be, because that isn't ours to give. What's there is the boring stuff: when you started, how long it's been since your last bloods, and everything you've already recorded pulled into one place you can hand to a doctor." },
      { tag: "new", text: "You can rename the section to anything you like, and the description disappears when you do, so it's just a word on your Track screen and nothing else. You're also asked whether to keep it behind your app lock." },
      { tag: "new", text: "Optional nudge about bloods, on whatever interval you choose. Blossom only counts how long it's been since the last test you recorded. It doesn't know what you should be testing or how often and won't pretend to." },
      { tag: "new", text: "Nothing in this section syncs unless you switch it on yourself, in Account and sync. It's off by default." },
    ],
  },
  {
    version: "0.5.24",
    date: "2026-08-17",
    title: "Settings that were built but you couldn't reach",
    items: [
      { tag: "new", text: "Four accessibility settings existed in Blossom with no switch anywhere in the app, so nobody could ever turn them on: stronger contrast, bigger tap targets, easier reading, and less decoration. They all work now, in Settings then Accessibility." },
      { tag: "new", text: "There are presets there too, if going through them one at a time isn't what you need: low vision, easier reading, less to take in, migraine-friendly, and easier to tap. A preset is only a starting point, so you can change anything afterwards and nothing gets undone." },
      { tag: "new", text: "Gentle Mode can finally be switched on, in Settings then Aurora. For when tracking feels like pressure: Aurora stops mentioning progress, the Body page puts numbers and goals away, and the weight prompt stops. Nothing you've written is deleted or hidden from you." },
      { tag: "improved", text: "The privacy policy and terms now tell you how to actually reach us, at support@projectblossom.net, rather than saying contact details were still being finalised. They also point you at the ICO if we get something wrong and you'd rather go over our heads." },
    ],
  },
  {
    version: "0.5.23",
    date: "2026-08-17",
    title: "Two things called nearly the same name",
    items: [
      { tag: "improved", text: "The Home layout preset called \"Essentials only\" is now \"Day to day\". It sat right next to the Just the essentials setting and did almost the opposite thing: the preset rewrites your Home for good, while Just the essentials is temporary and puts itself back." },
    ],
  },
  {
    version: "0.5.22",
    date: "2026-08-17",
    title: "Somewhere to put the wait",
    items: [
      { tag: "new", text: "Waiting lists. A place for a referral: when it was sent, who sent it, the reference number, and what they said the last time you rang. If a service ever tells you there's no record of you, this is the thing you can point at. Switch it on in Settings, under the modules list." },
      { tag: "new", text: "You can log every call. Who you spoke to, how you contacted them, and what they actually said. \"I spoke to Sam on the 12th\" is a lot harder to wave away than \"I rang a while back\"." },
      { tag: "new", text: "Not knowing when you were referred is a proper answer, not a blank box. Loads of people don't. Blossom will suggest asking your GP, because that date is worth having." },
      { tag: "new", text: "Optional nudges to check in, every month, three months or six. Off unless you pick one, and the notification never names the service." },
      { tag: "improved", text: "Referrals and everything logged against them go into your PDF export, so you can print the lot and take it with you." },
    ],
  },
  {
    version: "0.5.21",
    date: "2026-08-17",
    title: "Local services you couldn't see",
    items: [
      { tag: "fix", text: "Most support services are listed for a specific state, province or nation, and if you hadn't picked yours you'd never have known they were there. In the US that was 88 of 91 services invisible. Both support pages now tell you how many are waiting and how to see them." },
      { tag: "fix", text: "One Las Vegas service had shut down and its website was gone. It's been replaced with The LGBTQ Center of Southern Nevada, which runs trans-specific groups and a health centre." },
    ],
  },
  {
    version: "0.5.20",
    date: "2026-08-17",
    title: "Seven new ideas on the roadmap",
    items: [
      { tag: "new", text: "Biggest one: somewhere to keep the wait itself - referral dates, which service, when you last chased, and what you're entitled to while you wait. Years of people's lives currently have nowhere to go in Blossom." },
      { tag: "new", text: "Also added: hair removal tracking, a nudge when your bloods were last done a long time ago, an emergency card for A&E, help for when a prescription doesn't arrive, and regular checks that every support service we list still exists." },
      { tag: "new", text: "And one about pausing, stopping or changing direction. Blossom assumes one direction of travel, and it shouldn't. Your pace means whatever pace you're going." },
    ],
  },
  {
    version: "0.5.19",
    date: "2026-08-17",
    title: "\"What would help right now?\" actually helps now",
    items: [
      { tag: "fix", text: "Two pairs of those options did exactly the same thing. Calm down and Check today's tasks gave you an identical Home, as did Celebrate and Record something quickly. Eight buttons, six real choices. They're merged, so every option now does something different." },
      { tag: "new", text: "Each one says what it does underneath, so you're not tapping to find out." },
      { tag: "new", text: "They're ordered by what's actually going on - a dose due, an appointment coming up, a Time Capsule ready - and by which ones you tend to reach for. Never by guessing how you're feeling, and all of them are always there." },
      { tag: "improved", text: "Tapping around the app no longer highlights text blue, and taps register immediately instead of waiting to see if you meant to double-tap. Pinch zoom still works everywhere, and everything you've written is still yours to copy." },
    ],
  },
  {
    version: "0.5.18",
    date: "2026-08-17",
    title: "Calm down can stay",
    items: [
      { tag: "new", text: "Pick \"Calm down\" on Home and it now offers to keep things that way - just today, or a few days - instead of going back to normal the next time you open the app. Nothing appears until you've chosen it." },
    ],
  },
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

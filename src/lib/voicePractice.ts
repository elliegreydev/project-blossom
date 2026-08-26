/**
 * Voice practice: things to read out loud, and where to go to learn properly.
 *
 * All of this ships in the bundle. It is plain text, it weighs almost nothing,
 * and somebody practising in a bedroom with the door shut should not need a
 * signal, an account, or a request to a server that somebody has to pay for.
 * It works on a train, in a bathroom, and on a phone with no data left.
 *
 * THE LINE THIS FILE DOES NOT CROSS. Blossom does not teach voice technique.
 * A passage here carries a title, a one-line blurb and a reading time, and
 * nothing else. No "good for resonance", no "builds projection", no marking
 * one as a warm-up and another as a stretch. Labelling a passage that way is a
 * clinical judgement about what somebody's voice should be doing, and we are
 * not qualified to make it, so the labels simply do not exist rather than
 * being hedged.
 *
 * For the same reason the shelf is not ordered easy to hard. A ladder is a
 * ranking, the person reading is always somewhere on it, and Blossom does not
 * rank anybody against anybody, including against themselves last week.
 *
 * What Blossom can do is hand over something worth reading and point at the
 * people who do know how this works: speech and language therapists, and
 * organisations run by trans people who have been through it.
 * LEARNING_RESOURCES is that list. Every link on it was opened and checked by
 * hand rather than recalled, and anything that turned out to be paywalled,
 * members-only or dead was cut instead of included with a caveat.
 *
 * Anything not written by us is out of copyright and named in `source`.
 */

export type PassageKind = "prose" | "poem" | "practical" | "sentences";

export interface ReadingPassage {
  id: string;
  title: string;
  /** One plain line about what the thing is. Never about what it is for. */
  blurb: string;
  /** Roughly how long it takes to read aloud, at an unhurried pace. */
  minutes: number;
  kind: PassageKind;
  /** Who wrote it and when, for anything Blossom did not write itself.
   *  Absent means it is ours. */
  source?: string;
  /** The full text, ready to read. Paragraphs and lines are split on \n. */
  text: string;
}

export interface LearningResource {
  id: string;
  name: string;
  /** One sentence on what is actually there when you open it. */
  what: string;
  url: string;
  /** Who made it. Said plainly, including when the answer is "not a
   *  clinician", because that is worth knowing before you take advice. */
  who: string;
}

export interface VoiceSafetyPoint {
  title: string;
  body: string;
}

export const READING_PASSAGES: ReadingPassage[] = [
  {
    id: "forecast",
    title: "The forecast for nowhere in particular",
    blurb: "Made up, and dull on purpose.",
    minutes: 1,
    kind: "practical",
    text:
      "Good morning. Here is the forecast for the next twenty-four hours.\n\n" +
      "Cloud over most of the country first thing, thick enough in the west to bring some drizzle before nine. It should thin out through the morning, and by lunchtime there will be brighter spells in the south and along the east coast.\n\n" +
      "Temperatures today, fourteen degrees in the north, seventeen or eighteen further south, which is about average for the time of year.\n\n" +
      "Wind coming in from the south-west, light to moderate, picking up a little on exposed coasts through the afternoon.\n\n" +
      "Rain arrives in the far west by early evening and works its way inland overnight, so a wet end to the day for a lot of places. Clear spells behind it before dawn, and it will feel cooler than last night, down to about nine degrees in sheltered spots.\n\n" +
      "Tomorrow, showers to start with, then drier and steadier by the afternoon. That is the forecast.",
  },
  {
    id: "kitchen-window",
    title: "The view from the kitchen window",
    blurb: "A description of not very much.",
    minutes: 2,
    kind: "prose",
    text:
      "The kitchen window faces a narrow garden and the backs of the houses opposite. Early on there is not a great deal to see. The grass holds the damp until the sun comes round the edge of the roof, which happens later in the day than you would expect, and by then the kettle has usually been on twice.\n\n" +
      "A blackbird works along the top of the fence most mornings, stopping every few steps as though it has remembered something. The fence itself is going soft at one end and will need doing at some point, though not this year.\n\n" +
      "Beyond it there are six gardens in a row, all roughly the same shape and none of them alike. One is mostly gravel. One has a trampoline that has not been used since the summer and now holds a small pool of rainwater in the middle. One has a shed painted a green that must have looked much darker on the tin.\n\n" +
      "Somebody's washing goes out at about half eight whatever the forecast says. Somebody else's cat sits on the flat roof of an extension and watches all of it without moving.\n\n" +
      "The sounds arrive in a fairly reliable order. Bins first, if it is the right day. Then a car that needs looking at. Then the steady noise of the main road, which is always there and only really noticeable on the mornings it stops.\n\n" +
      "None of this is remarkable, and that is more or less the point. It is the same view every day with small differences, and the small differences are the whole of it.",
  },
  {
    id: "out-loud",
    title: "Things people say out loud",
    blurb: "Ordinary lines, the sort you actually use in a day.",
    minutes: 2,
    kind: "sentences",
    text:
      "A flat white, please. To take away.\n" +
      "Just this, thanks. And a bag as well, please.\n" +
      "Can I pay by card?\n" +
      "Morning. I have got a two o'clock booked.\n" +
      "That's me, yes.\n" +
      "Hello, you're through to the office, how can I help?\n" +
      "Yes, speaking.\n" +
      "Sorry, I didn't catch that. Could you say it again?\n" +
      "Could you put me through to accounts, please?\n" +
      "Hello, I'd like to book an appointment.\n" +
      "Excuse me, do you know if the number twelve stops here?\n" +
      "Sorry, could I get past?\n" +
      "Is this seat taken?\n" +
      "Do you have this in a bigger size?\n" +
      "Sorry to bother you, whereabouts are the tins?\n" +
      "Could you check if there are any in the back?\n" +
      "I'd like to return this. I've got the receipt here.\n" +
      "I'm here to collect a parcel.\n" +
      "Hello, I've got a delivery for number nine.\n" +
      "Could I have a glass of tap water too?\n" +
      "One large and one small, please.\n" +
      "Excuse me, is there a table free?\n" +
      "Hello, I'm new here. I started on Monday.\n" +
      "Nice to meet you. I work with Sam on the second floor.\n" +
      "I'll take the second one, please.\n" +
      "That's all, thanks.\n" +
      "Sorry, I think somebody called me earlier.\n" +
      "Can I leave a message?\n" +
      "Right, I'll leave you to it.\n" +
      "Thanks very much. Have a good day.",
  },
  {
    id: "slow-train",
    title: "A slow train, west out of the city",
    blurb: "An hour on a train, described in order.",
    minutes: 3,
    kind: "prose",
    text:
      "The train leaves from the far platform, the short one at the end where the canopy runs out, so the last two carriages sit in the open whatever the weather is doing.\n\n" +
      "It is never busy at this time. A handful of people get on, spread themselves out, and settle in for the hour and a bit it takes to reach the coast.\n\n" +
      "For the first ten minutes there is nothing much to look at but the backs of things. Depots, a scrapyard, the blank side wall of a supermarket with a faded advert on it for something that closed years ago. Then the houses thin out, the line lifts onto an embankment, and quite suddenly there are fields on both sides.\n\n" +
      "The route follows a river for a while without ever quite meeting it. You see it in pieces, a flat grey stretch behind a hedge, then gone, then back again on the other side of a bridge. There are herons on that river most days if you know to look, standing still in the shallows in a way that makes them easy to miss until they move.\n\n" +
      "Halfway along, the train stops at a station with two platforms, a shelter, and a car park with room for about twelve cars. Nobody gets off. Nobody gets on. The doors stand open for a minute anyway, and you can hear the wind and a bit of birdsong and the engine ticking over, and then they close and the whole thing starts up again.\n\n" +
      "After that the land flattens right out. Drainage ditches instead of hedges, big skies, the occasional line of pylons marching off towards the horizon. There is a stretch where the track runs dead straight for about three miles and the carriage settles into a rhythm that puts most people to sleep.\n\n" +
      "You know you are getting close when the light changes. It goes brighter and slightly white, the way it does near the sea before you can see any of it, and then there is a gap in the dunes and a strip of water, and it is there and gone in about two seconds.\n\n" +
      "The last few minutes are back streets and caravan parks and a level crossing with a short queue of cars waiting at it. The train slows to walking pace, crawls in under the roof of the terminus, and stops with a small jolt.\n\n" +
      "Everyone stands up at once, which they did not need to, because the doors take another half a minute.",
  },
  {
    id: "cup-of-tea",
    title: "How to make a cup of tea",
    blurb: "Instructions, start to finish.",
    minutes: 2,
    kind: "practical",
    text:
      "Fill the kettle with fresh cold water, and only as much as you need, because water that has already been boiled once tends to taste flat.\n\n" +
      "While it heats, get the mug down and put the teabag in. If you are using a pot, warm it first with a splash of hot water, swirl it round and tip it out. It makes more difference than it sounds like it should, because a cold pot takes the heat straight back out of the water.\n\n" +
      "Pour the water on as soon as it boils. Ordinary black tea wants it properly boiling. Green tea is happier a little cooler, so leave the kettle to stand for a minute or two first.\n\n" +
      "Then leave it alone. Two minutes gives you something pale and mild, four gives you something you could stand a spoon up in, and most people land somewhere in the middle. Squeezing the bag against the side of the mug speeds it up and makes it more bitter, which is a fair trade if you are in a hurry.\n\n" +
      "Take the bag out before the milk goes in, not after. Milk cools the water, and cooler water pulls less out of the leaves, so a bag left in afterwards is mostly just sitting there.\n\n" +
      "Sugar, if you are having it, goes in while the tea is still hot enough to dissolve it properly.\n\n" +
      "And that is it, apart from the part nobody agrees on, which is how long a cup can stand on the side before it stops being tea and starts being something you tip down the sink.",
  },
  {
    id: "four-poems",
    title: "Four short poems",
    blurb: "Weather, mostly, and a sky at night.",
    minutes: 2,
    kind: "poem",
    source:
      "Fog by Carl Sandburg (Chicago Poems, 1916), Who Has Seen the Wind? by Christina Rossetti (Sing-Song, 1872), Rain by Robert Louis Stevenson (A Child's Garden of Verses, 1885) and Stars by Sara Teasdale (Flame and Shadow, 1920). All out of copyright.",
    text:
      "Fog\nby Carl Sandburg\n\n" +
      "The fog comes\non little cat feet.\n\n" +
      "It sits looking\nover harbor and city\non silent haunches\nand then moves on.\n\n" +
      "Who Has Seen the Wind?\nby Christina Rossetti\n\n" +
      "Who has seen the wind?\nNeither I nor you.\nBut when the leaves hang trembling,\nThe wind is passing through.\n\n" +
      "Who has seen the wind?\nNeither you nor I.\nBut when the trees bow down their heads,\nThe wind is passing by.\n\n" +
      "Rain\nby Robert Louis Stevenson\n\n" +
      "The rain is raining all around,\nIt falls on field and tree,\nIt rains on the umbrellas here,\nAnd on the ships at sea.\n\n" +
      "Stars\nby Sara Teasdale\n\n" +
      "Alone in the night\nOn a dark hill\nWith pines around me\nSpicy and still,\n\n" +
      "And a heaven full of stars\nOver my head,\nWhite and topaz\nAnd misty red;\n\n" +
      "Myriads with beating\nHearts of fire\nThat aeons\nCannot vex or tire;\n\n" +
      "Up the dome of heaven\nLike a great hill,\nI watch them marching\nStately and still,\n\n" +
      "And I know that I\nAm honored to be\nWitness\nOf so much majesty.",
  },
  {
    id: "leek-and-potato",
    title: "Leek and potato soup",
    blurb: "A method, in the order you would do it.",
    minutes: 2,
    kind: "practical",
    text:
      "Enough for four.\n\n" +
      "Trim the leeks, split them down the middle and rinse them under the tap, because grit hides in the layers and it is easier to find now than later. Slice them into half moons about a centimetre thick. Peel two large potatoes and cut them into rough chunks, all about the same size so they cook at the same rate.\n\n" +
      "Melt a knob of butter in a large pan over a low heat. Add the leeks and a pinch of salt, put the lid on, and let them soften for about ten minutes, stirring now and then. You are not trying to colour them, so if they start to catch, turn the heat down and add a splash of water.\n\n" +
      "Add the potatoes and a litre of stock. Bring it up to a simmer, then turn it down until it is barely bubbling and leave it for twenty minutes or so, until a knife goes into a chunk of potato without any resistance.\n\n" +
      "Take it off the heat and let it cool for a few minutes before you blend it, because hot soup in a blender expands and finds its way out around the lid. Blend it smooth, or leave it half rough if you would rather have something to chew on.\n\n" +
      "Season at the end rather than the beginning. Stock varies a lot, and it is much easier to add salt than to take it back out. A spoonful of cream is optional and so is a grind of pepper.\n\n" +
      "It keeps three days in the fridge and it freezes well.",
  },
];

export const LEARNING_RESOURCES: LearningResource[] = [
  {
    id: "vocal-congruence",
    name: "The Vocal Congruence Project",
    what: "Free written guides on what voice work involves and how to work with a provider, plus a searchable directory of several hundred voice trainers.",
    url: "https://vocalcongruence.org/",
    who: "Voice-specialist speech therapists, built with the trans community",
  },
  {
    id: "genderkit-voice",
    name: "Gender Construction Kit: working on your voice",
    what: "A plain UK guide covering pitch, resonance and intonation, warming up, and practising with other people rather than alone.",
    url: "https://genderkit.org.uk/article/working-on-your-voice/",
    who: "Volunteer-run trans community project",
  },
  {
    id: "transactual-speech",
    name: "TransActual: speech therapy",
    what: "How speech and language therapy actually works in the UK, on the NHS and privately, and what happens in the appointments.",
    url: "https://transactual.org.uk/medical-transition/speech-therapy/",
    who: "Trans-led UK organisation",
  },
  {
    id: "trans-voice-lessons",
    name: "TransVoiceLessons",
    what: "A long-running free video series that works through pitch, weight and resonance in a lot of detail.",
    url: "https://www.youtube.com/@TransVoiceLessons",
    who: "A trans voice teacher, not a clinician",
  },
  {
    id: "nidcd-voice-care",
    name: "Taking Care of Your Voice",
    what: "The basics of vocal health, what an overused voice feels like, and when hoarseness is worth getting looked at.",
    url: "https://www.nidcd.nih.gov/health/taking-care-your-voice",
    who: "US National Institute on Deafness and Other Communication Disorders",
  },
  {
    id: "bva-voice-care",
    name: "British Voice Association voice care leaflets",
    what: "Short free leaflets on hydration, warming up, resting a tired voice and throat clearing.",
    url: "https://britishvoiceassociation.org.uk/free.htm",
    who: "UK voice clinicians, therapists and teachers",
  },
];

export const VOICE_SAFETY_POINTS: VoiceSafetyPoint[] = [
  {
    title: "A minute or two of warming up first",
    body: "Voices work better warm, and that goes for anybody's, singers and teachers and people practising quietly at home alike. Gentle humming, easy sliding up and down, a bit of ordinary talking before anything more effortful. It is not a rule, it is just what voice clinicians tend to suggest before asking a voice to do something new.",
  },
  {
    title: "If it hurts, that is the signal to stop",
    body: "Pain in the throat, a scratchy or hoarse voice afterwards, a voice that gives out much sooner than usual, or a feeling that you are pushing against something. None of that is progress and none of it is worth working through. Stopping for the day, having some water and coming back to it later is the ordinary response. Hoarseness that hangs about for more than a couple of weeks is worth getting looked at by a doctor whatever the cause.",
  },
  {
    title: "A pitch you have to hold onto probably is not the one",
    body: "A voice that takes constant effort to keep in place tends to tire quickly, and it tends not to survive a real conversation with somebody. Comfort at the point you actually use it matters more than what you can reach for a moment on your own. If holding it feels like gripping, that is worth noticing rather than pushing past.",
  },
  {
    title: "You do not have to do this on your own",
    body: "Voice and communication therapy is a real service with real specialists in it. In the UK it can come through a gender service or a GP referral, though waits vary and some areas cannot offer it at all. Privately, and in the US, you would be looking for a speech and language therapist who does gender-affirming voice work. It is the safest route by a distance, because somebody is listening to what your voice is doing while you do it. There is a directory in the resources above if you want to see who is near you.",
  },
];

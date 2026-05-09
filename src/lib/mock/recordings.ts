/**
 * lib/mock/recordings.ts
 * Mock recordings for the Meetings frontend prototype.
 * No backend wiring — these power the design exploration only.
 */

import type { Recording, Plan } from "@/types/meeting";

export const RECORDINGS: Recording[] = [
  {
    id: "rec-marie-apr17",
    contactId: "marie-chen",
    contactName: "Marie Chen",
    contactRole: "VP, Sequoia Capital",
    title: "Coffee chat — first call",
    date: "Apr 17, 2026",
    relativeDate: "3 days ago",
    duration: "28:14",
    durationMin: 28,
    medium: "video",
    location: "Google Meet",
    source: "live",
    status: "recapped",
    topics: [
      "Bain to Sequoia transition",
      "SEA fintech thesis",
      "Consulting skill gap",
      "INSEAD network",
    ],
    sentiment: "warm",
    summaryRich:
      "Marie shared candid reflections on her own pivot from Bain consulting into Sequoia in 2022. The opening landed well, she explicitly named the shared trajectory as the thing that caught her attention.\n\nThe most useful thing she said was that the skill that doesn't transfer from consulting is sitting with ambiguity. She framed her own breakthrough as having written a forty-page memo on SEA fintech, on weekends, that two partners read cold. Her advice was direct: stop polishing the CV, develop a real view on one space.\n\nShe asked you to **send the Atomico State of European Tech report**, specifically the section on B2B SaaS round sizes in H2 2025. You should also **write a one-page view on a single sub-sector** — payments or AI infra, your pick — defensible for thirty minutes against a partner. The next move with Marie is to **share that one-pager at the +3 week mark**, and to **ask Priya for the warm intro to her ex-Bain peer at General Catalyst at +6 weeks**, not before.",
    actions: [
      { id: "a1", what: "Send the Atomico State of European Tech report", who: "Alex", due: "Today", done: true },
      { id: "a2", what: "Write a one-page view on a single sub-sector", who: "Alex", due: "+1 week", done: false },
      { id: "a3", what: "Share that one-pager at the +3 week mark", who: "Alex", due: "+3 weeks", done: false },
      { id: "a4", what: "Ask Priya for the warm intro to her ex-Bain peer at General Catalyst at +6 weeks", who: "Alex", due: "+6 weeks", done: false },
    ],
    mentions: [
      { name: "Priya Raman", reason: "Source of warm intro at +6 weeks", contactId: "priya-raman" },
      { name: "General Catalyst", reason: "Marie's ex-Bain peer works there" },
      { name: "Atomico report", reason: "She asked for the B2B SaaS section" },
    ],
    transcript: [
      { t: "00:42", who: "Alex", text: "Thanks again for making the time. I know thirty minutes is generous on a Wednesday." },
      { t: "00:51", who: "Marie", text: "It's fine. I read your note. The Bain to Sequoia line caught me, it's the same path I took, basically." },
      { t: "01:24", who: "Alex", text: "That's actually what I wanted to ask about. Coming out of Bain, what made Sequoia take a chance on you without a VC track record?" },
      { t: "01:38", who: "Marie", text: "Honestly? I had a real view on one space. I'd written a forty-page memo on SEA fintech, just for myself, on weekends. I sent it to two partners cold. One of them was here." },
      { t: "02:22", who: "Marie", text: "The advice I'd give anyone trying to make this jump: stop polishing your CV. Develop a view on something. A real one." },
      { t: "03:05", who: "Alex", text: "That's helpful. So when you say 'a view', concretely, what's the bar? A memo? A blog post? A thread of conversations?" },
      { t: "03:18", who: "Marie", text: "It's not the format. It's whether you can defend it for thirty minutes against a partner who's been investing in that space for ten years. If you can, you're hireable. If you can't, no INSEAD ranking will save you." },
      { t: "04:08", who: "Alex", text: "Honestly, I'm still pretty broad. I've been doing diligence on European AI infra and SEA payments, different worlds." },
      { t: "04:31", who: "Marie", text: "Pick one. Genuinely pick one. Even if you're wrong, you'll learn faster than reading a hundred decks across both." },
    ],
    coachNotes:
      "Strong first interaction. Marie was warm and gave concrete tactical advice, that's high-investment behaviour. The skill-gap framing is a gift; it tells you exactly what to demonstrate next time. Don't overplay the follow-up cadence, the +3w / +6w rhythm we set is right.",
  },
  {
    id: "rec-priya-mar28",
    contactId: "priya-raman",
    contactName: "Priya Raman",
    contactRole: "Partner, Balderton",
    title: "Quarterly mentor catch-up",
    date: "Mar 28, 2026",
    relativeDate: "3 weeks ago",
    duration: "47:32",
    durationMin: 48,
    medium: "in-person",
    location: "Modern Pantry, Clerkenwell",
    source: "upload",
    status: "recapped",
    topics: [
      "Career strategy",
      "Job search progress",
      "INSEAD alumni intros",
      "Q2 outlook",
    ],
    sentiment: "warm",
    summaryRich:
      "Long, generous catch-up over breakfast. Priya pushed hard on the breadth of your current pitch, \"growth VC in Europe\" tells her nothing, and she said as much, twice. Her central point: you need a sub-sector and a defensible view, not a list of firms.\n\nShe was generous with intros. She'll **make warm intros to David Okafor at Atomico and Helena Voss at HV Capital this week**, both of whom she said are \"actively reading their inbox.\"\n\nThe real action is on your side: **tighten the pitch to one sub-sector with a thesis** before either intro lands, otherwise they'll be wasted. You should also **share progress with Priya at the +6 week mark, without asking for anything**, because the rule with Priya is that you only ask once you've made progress on her last advice.",
    actions: [
      { id: "c1", what: "Make warm intros to David Okafor at Atomico and Helena Voss at HV Capital this week", who: "Priya", due: "Done", done: true },
      { id: "c2", what: "Tighten the pitch to one sub-sector with a thesis", who: "Alex", due: "+1 week", done: false },
      { id: "c3", what: "Share progress with Priya at the +6 week mark, without asking for anything", who: "Alex", due: "+6 weeks", done: false },
    ],
    mentions: [
      { name: "David Okafor", reason: "Promised intro", contactId: "david-okafor" },
      { name: "Helena Voss", reason: "Promised intro" },
    ],
    transcript: [
      { t: "12:04", who: "Priya", text: "Alex, your pitch is still too broad. 'Growth VC in Europe' tells me nothing. What's the sub-sector? What's your view? You can't get hired against a generic interest." },
      { t: "12:38", who: "Alex", text: "I hear you. I've been hesitant to commit because I don't want to close doors." },
      { t: "12:46", who: "Priya", text: "You're closing doors by being everywhere. The opposite of what you think." },
    ],
    coachNotes:
      "Priya is your highest-value mentor right now, she's already opened two doors this quarter. The next interaction with her must show progress, not ask for more. Update at +6w with what you've learned, not what you need.",
  },
  {
    id: "rec-david-apr10",
    contactId: "david-okafor",
    contactName: "David Okafor",
    contactRole: "Principal, Atomico",
    title: "Intro call — referred via Priya",
    date: "Apr 10, 2026",
    relativeDate: "10 days ago",
    duration: "22:08",
    durationMin: 22,
    medium: "video",
    location: "Zoom",
    source: "live",
    status: "recapped",
    topics: ["Parloa Series B", "European AI infra", "Engineering to business path"],
    sentiment: "neutral",
    summaryRich:
      "Quick intro call, David was professional but reserved, and visibly mid-sprint on Parloa diligence. He gave generous thoughts on European AI infra in the few minutes he had, and was clear that the right time to re-engage is once his current sprint settles.\n\nHe explicitly suggested **re-engaging in roughly three weeks**, once the Parloa work has shipped. Before then, **send a short follow-up referencing the specific Parloa thesis angle** he mentioned, voice-AI in enterprise contact centers, to keep the thread warm without asking for anything.",
    actions: [
      { id: "b1", what: "Send a short follow-up referencing the specific Parloa thesis angle", who: "Alex", due: "Today", done: true },
      { id: "b2", what: "Re-engage in roughly three weeks", who: "Alex", due: "+3 weeks", done: false },
    ],
    mentions: [
      { name: "Parloa", reason: "Atomico's recent Series B" },
      { name: "Priya Raman", reason: "Referrer", contactId: "priya-raman" },
    ],
    transcript: [
      { t: "00:12", who: "David", text: "Priya said good things. What's on your mind?" },
      { t: "00:31", who: "Alex", text: "Honestly, I've been reading everything I can on Parloa since you led the round. The voice-AI angle for enterprise contact centers is fascinating." },
    ],
    coachNotes:
      "Reserved call, but he opened the door for re-engagement. The +3w timing is his suggestion, so honour it exactly.",
  },
  {
    id: "rec-sara-apr03",
    contactId: "sara-lindqvist",
    contactName: "Sara Lindqvist",
    contactRole: "Head of Platform, EQT Ventures",
    title: "Discovery call — platform role",
    date: "Apr 3, 2026",
    relativeDate: "17 days ago",
    duration: "31:45",
    durationMin: 32,
    medium: "video",
    location: "Google Meet",
    source: "live",
    status: "recapped",
    topics: ["Platform team scoping", "Consulting to platform fit", "EQT hiring outlook"],
    sentiment: "warm",
    summaryRich:
      "Sara walked through how she built EQT's platform team from zero and what she actually screens for in hires. The role is more product-and-ops than most candidates assume, and she was direct that consulting backgrounds tend to over-index on strategy and under-index on execution muscle.\n\nThere's no formal opening, but she'll keep you in mind for Q3. The right move now is to **send a short case study of one platform problem you've solved end-to-end**, concrete, with a result. The coach will also **set a reminder for the Q3 EQT hiring window** so the thread doesn't drift.",
    actions: [
      { id: "d1", what: "Send a short case study of one platform problem you've solved end-to-end", who: "Alex", due: "+1 week", done: false },
      { id: "d2", what: "Set a reminder for the Q3 EQT hiring window", who: "Coach", due: "+8 weeks", done: false },
    ],
    mentions: [{ name: "EQT Platform team", reason: "Built from zero by Sara" }],
    transcript: [],
    coachNotes:
      "Platform roles are a real fit for your consulting skillset. Sara's signal is positive but soft, Q3 is the window, not now.",
  },
];

export const PLAN: Plan = {
  tier: "free",
  freeMinutesUsed: 62,
  freeMinutesCap: 90,
};

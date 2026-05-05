// Additional modules: Onboarding, Manual Entry, Artifact Drawer, Dense Directory

// ========== Artifact content (what opens in the drawer) ==========
window.ARTIFACT_CONTENT = {
  meeting_prep_marie: {
    type: "meeting_prep",
    title: "Meeting prep — Marie Chen",
    subtitle: "Coffee chat · 30 min · video · tomorrow 3:00 PM",
    sections: [
      { label: "Strongest hook", body: "You both pivoted from strategy consulting into venture — her Bain → Sequoia move in 2022 is the closest analog to what you're trying to do. Lead with curiosity about *how she positioned herself*, not about her firm." },
      { label: "Four anchor questions", list: [
        "Coming out of Bain, what made Sequoia take a chance on someone without a VC track record? What did you emphasise in your narrative?",
        "Sequoia's SEA fintech thesis has gotten sharper in the last year — how did your own thinking on the space evolve in your first 18 months?",
        "Three years in, what's the skill you wish you'd built more of in consulting before making the jump?",
        "If you were me — 8 months from graduation, strategy consulting background, targeting growth VC in Europe — what would you do differently in how I'm spending my time right now?",
      ]},
      { label: "Company context · last 90 days", list: [
        "Sequoia SEA led Series B in Kredivo ($120M) — Marie was on the deal team (LinkedIn post, Feb).",
        "Published perspective on SEA consumer fintech in Asian Private Banker — useful to read before the call.",
        "Team grew by 3 hires in Singapore in Q1; suggests capacity for more associates soon.",
      ]},
      { label: "What NOT to do", body: "Don't ask for a referral or an associate role on this call. Don't open with INSEAD — it's weaker than the shared transition. Don't use the word 'networking' — frame it as learning." },
      { label: "Post-call move", body: "Thank-you within 24h referencing one specific thing she said. No ask. See the follow-up draft artifact in this thread." }
    ]
  },
  outreach_marie: {
    type: "outreach",
    title: "Follow-up — thank-you + Atomico report",
    subtitle: "LinkedIn message · warm tone · 142 words",
    body: `Hi Marie,

Thank you for the 30 minutes yesterday — especially for the honesty about the first year at Sequoia. Your point about "the skill that doesn't transfer from consulting is sitting with ambiguity" has been rattling around in my head since.

As promised, here's the Atomico State of European Tech piece on growth rounds (attached). The section on B2B SaaS round sizes collapsing in H2 2025 feels directly relevant to your point on pricing discipline.

No ask — just wanted to close the loop, and I'll be thinking about your advice to spend less time optimising my CV and more time developing a real view on one sector.

If it's ever useful, I'd be happy to share what I land on.

Warmly,
Alex`
  },
  meeting_prep_first: {
    type: "meeting_prep",
    title: "Meeting prep — first coffee chat",
    subtitle: "Coffee chat · 30 min · in-person · Singapore · last Tuesday",
    sections: [
      { label: "Strongest hook", body: "Shared Bain → VC pivot. Stronger than the INSEAD connection — signals real thinking, not warm-contact collection." },
      { label: "Three questions to anchor the first half", list: [
        "Coming out of Bain, what made Sequoia take a chance on someone without a VC track record?",
        "What's the skill you wish you'd built more of in consulting before making the jump?",
        "What are you excited about in SEA fintech right now that nobody else is talking about?",
      ]},
      { label: "First-meeting strategy", body: "Learning mode, not pitching mode. Your job is to ask questions that demonstrate you've done the work — not to prove you belong in VC." }
    ]
  },
};

// ========== Onboarding script ==========
window.ONBOARDING_STEPS = [
  {
    agentMsg: "Hi. Before we start working together, let me get to know you — and you can get to know me. This should take about 4 minutes.\n\nFirst thing — what should I go by? Most users give their coach a name so that when I show up in reminders or drafts, it feels like a person, not a tool.",
    field: "agentName",
    label: "Coach name",
    placeholder: "e.g. Ada, Orbit, Nori…",
    quickPicks: ["Ada", "Nori", "Orbit", "Warmly"],
  },
  {
    agentMsg: "Nice. So — who am I working with? I'll start from your own career story. You can paste a CV or a bio, or just tell me the shape of it.",
    field: "about",
    label: "About you",
    placeholder: "Or drop your CV / LinkedIn / cover letter…",
    multiline: true,
    uploadOk: true,
  },
  {
    agentMsg: "Good. Now — what are you networking *for*? Be as specific as you can. 'I want a growth VC role in Europe' is more useful to me than 'I want to explore'.",
    field: "goal",
    label: "Networking goal",
    placeholder: "What outcome are you reaching for?",
    multiline: true,
  },
  {
    agentMsg: "How do you prefer to communicate? This tunes every message I draft for you.",
    field: "style",
    label: "Communication style",
    options: [
      { k: "warm", label: "Warm & personal", hint: "First names, some humour, like writing to a friend" },
      { k: "professional", label: "Polished & professional", hint: "Formal, precise, zero emoji" },
      { k: "concise", label: "Concise & direct", hint: "Short sentences, no filler" },
      { k: "adaptive", label: "Adapt to each recipient", hint: "I'll read the contact and match" },
    ],
  },
  {
    agentMsg: "Where is your network weakest? I'll weight discovery toward what's missing.",
    field: "gaps",
    label: "Weak spots in your network",
    options: [
      { k: "industry", label: "Target industry", hint: "You don't know people in the space you want to enter" },
      { k: "seniority", label: "Senior people", hint: "Your peers are mostly at your level" },
      { k: "geography", label: "A target geography", hint: "You're strong at home, weak abroad" },
      { k: "type", label: "A specific role type", hint: "e.g. investors, founders, platform roles" },
    ],
    multi: true,
  },
  {
    agentMsg: "Last thing — the Chrome extension. This is how I help you find people on LinkedIn. It runs in your own browser, reads only what you can already see, and never sends messages on its own. Takes 30 seconds.",
    field: "extension",
    label: "Chrome extension",
    custom: "extension",
  },
];

// ========== Dense directory sample enrichment ==========
// extend CONTACTS with a few more fields used by dense view
window.CONTACTS.forEach((c) => {
  c.school = c.tags.find(t => /(INSEAD|HEC|NUS|IESE|LSE|LBS)/i.test(t)) || (["INSEAD '20","HEC '19","LSE '18"][Math.floor(Math.random()*3)]);
  c.industry = c.tags.find(t => /(VC|PE|Consulting|Fintech|Deep tech|SaaS|Consumer)/i.test(t)) || "VC";
});

# Warmly — Strategy & Open Threads

**Last updated:** May 14, 2026 (Session 12)
**Purpose:** Capture all open strategic threads so we never lose track. Companion to `docs/STATUS.html` (visual tracker) and `docs/PROJECT_MEMORY.md` (session-by-session history).

This doc is the **decision register**. Each thread has: where we are, the options on the table, my recommendation, the call we need from Liyang.

---

## Thread 1 — Onboarding completeness

### Where we are
Onboarding captures: coach name, about-you free text, goal free text, style preference, weak-spot tags, extension install. Runs `buildInitialProfile()` → writes `profile_md`.

### What's missing
- **CV file upload** — flag exists, handler doesn't. User has to paste CV as text.
- **Past message samples** — no voice sample upload. Voice quality depends entirely on what gets generated later through Warmly itself.
- **Career assessment ingestion** — e.g., the user's CareerLeader profile lists strengths (Strategic Thinking 90, Quantitative Analysis 90, etc.) — none of this reaches the agent.
- **Structured target fields** — `users.goals.target_industries[]`, `target_companies[]`, `target_roles[]`, `target_geographies[]` exist in the schema but are never populated. Goal is captured as free text only.
- **Transition narrative** — implicit in profile_md but not structured. Affects discovery: "Find people who did the Bain → growth VC pivot you're targeting" requires structured FROM and TO.

### Recommended next steps (in order)
1. **CV upload** (~1h) — file input → text extraction (pdf-parse for PDF, mammoth for docx) → feed into `buildInitialProfile.cv_text`. Already accepted by the builder, just needs the UI.
2. **Structured targets step** (~1h) — add an onboarding step "Where are you trying to go?" with autocomplete for industries / role types / geographies. Populate `users.goals.*`. Discovery filters can then pre-fill from these.
3. **Voice samples upload** (~2h) — drag-drop area for "paste 2-3 messages you've written in the past month." Treated as `voice_samples` text, fed into profile builder. Cold-start voice quality.
4. **Career assessment ingestion** (~3h) — optional later. Could accept a CareerLeader PDF or structured paste. Lower priority because most users don't have one.

### Call needed
Confirm priority order. My take: CV upload + structured targets are quick wins that materially improve discovery and outreach. Voice samples is medium-effort high-value. Career assessment is nice-to-have.

---

## Thread 2 — Is chat the right primary UX?

### The question
You're right to challenge this. Chat-first feels modern but it has real costs: hard to scan, slow for tactical operations, requires the user to know what to ask.

### Options on the table

**A) Chat-first (current direction)**
Everything starts as conversation. Tactical actions are surfaced as artifact cards inside the chat. Already partially built.

**B) Dashboard-first with chat as augment**
Three-tab dashboard (Contacts / Discovery / Meetings) with prominent metrics + cards. A chat panel docks on the right for "ask the coach" moments. Like Linear's command bar or Notion's AI assist.

**C) Hybrid command-driven**
Single text input at the top of every page (like Raycast / Linear's `Cmd+K`). User types what they want — "find McKinsey alumni" or "draft follow-up to Paul" — and the system routes to the right surface (extension trigger, draft modal, contact list filter). Chat history accessible but not the primary UI.

### My take
**B or C, not A.** Pure chat is great for strategy moments ("how should I approach this contact?") but bad for review-many-things moments (reviewing 25 scraped profiles, picking who to outreach). The pattern across professional tools (Linear, Notion, Granola) is dashboard + chat panel, not chat-only.

The "session-per-contact" architecture we built fits this — each contact has its own thread. But the GENERAL chat ("help me with my networking strategy") is probably overused for things that should be dashboard actions.

### Call needed
Decision on default surface. My recommendation: keep Contacts/Goals/Meetings dashboards as primary navigation, keep contact-session chats for working on specific people, REDUCE the role of general chat to "strategic conversation only," add a `Cmd+K` command bar for fast tactical actions.

---

## Thread 3 — Conversation management at scale

### The question
A single coaching conversation can hit 100+ messages over weeks. How do we keep it useful?

### Existing infra
PRD section 5.4.2 specifies rolling summarization. The `coaching.ts` library has stubs for it. Not yet implemented.

### Strategy proposed

| Layer | Mechanism | When it fires |
|---|---|---|
| 1 | Rolling summarization | When conversation exceeds ~30 messages, summarize the oldest 20 into 1 "earlier context" message |
| 2 | Per-contact session split | Already there — working on a specific contact opens a dedicated thread |
| 3 | Pinned facts | User can "pin" a message ("Remember I'm targeting €120K") which never gets summarized away |
| 4 | Search | Full-text search across all conversations from the chat header — "find where we talked about Marie" |
| 5 | Cross-session learnings | `user_memory` already accumulates persistent facts — keep + expand |

**Auto-compact UX:** when we summarize, surface it visibly. A small chip "📋 Earlier context summarized" so the user knows the agent has memory but it's compressed. Click to expand the summary.

### Call needed
Approve the layered approach. Implementation order: 1 → 4 → 3 → 5 (lazy: build 2 already, build 4 once we have multi-conversation reality).

---

## Thread 4 — Chat → Extension trigger artifact

### The vision
User in chat says "I want to find McKinsey alumni in Paris." Coach detects intent → surfaces a confirmation artifact:

```
┌─────────────────────────────────────────────────┐
│  ✦ Discovery plan                                │
│                                                  │
│  Company:   McKinsey & Company                   │
│  School:    INSEAD                               │
│  Location:  Paris                                │
│  Function:  Strategy & operations                │
│  Max:       25 profiles                          │
│                                                  │
│  [Confirm and start] [Adjust filters] [Cancel]   │
└─────────────────────────────────────────────────┘
```

On confirm, the chat triggers the extension via `chrome.runtime.sendMessage` and the discovery runs. Progress streams back into chat ("Found 25 profiles. 8 are INSEAD alumni. Top 5 by relevance...").

### Why it matters
Closes the loop. Today the user has to: tell the coach about their goal → leave the app → click the extension icon → re-enter the company + filters → wait. The artifact approach makes it ONE action from chat.

### Implementation sketch
1. Add `discovery_plan` artifact type to the existing 6 artifact types
2. Chat coaching prompt detects discovery-intent (Liyang says "find" + a company) → returns a discovery_plan JSON
3. Frontend renders the plan card with Confirm/Adjust/Cancel
4. On Confirm: web app POSTs to a new endpoint OR uses the existing extension messaging protocol to trigger discovery
5. Extension streams progress back via a server-sent events channel or polling

Total effort ~6-8h. The pieces all exist; it's mostly wiring.

### Call needed
Approve the discovery_plan artifact pattern. It also extends naturally to other actions: "outreach_plan" (confirm before sending), "meeting_prep_plan" (gather web intel before drafting prep doc).

---

## Thread 5 — Tinder-style profile review

### The vision
After discovery scrapes 25 profiles, instead of dumping all into the contact list, show them ONE at a time as a swipe deck:

- **Right (save)** → becomes a contact with full profile card
- **Left (skip)** → discarded
- **Up (super-interested)** → save + immediately open outreach drafter

Each swipe is also a signal — feeds the ranking model so future discoveries surface better candidates.

### Why it matters
Reduces decision fatigue when reviewing many profiles. Also captures preference data passively. Mobile-friendly out of the box.

### Tradeoffs
- Tinder pattern can feel game-y for serious networking — needs to be tasteful
- Linear swipe is slow if you have 100+ to review — should support keyboard shortcuts (←/→/↑) for power users
- Need an "I'm not sure yet" parking lot, or pre-decision swipes get stuck

### Effort
~3-4h. The contacts already have all data needed. Just need the swipe UI + keyboard shortcuts.

### Call needed
Approve or defer. My take: ship this — it's a fun, brand-defining moment for the product.

---

## Thread 6 — Post-save pipeline (Outreach → Prep → Nurture)

### Status
- **Outreach drafting** — built. Works in chat (in-app) and in LinkedIn compose (new feature this week).
- **Meeting prep** — `meeting_prep` artifact exists, prompt exists. Web search for company intel exists. The Meetings page is built.
- **Nurture / Maintain** — only the schema is there (`relationship_stage`, `last_interaction_at`). No reminder system. No proactive nudges.

### What's left
Build out the Maintain step properly. See Thread 10.

---

## Thread 7 — Goal-driven proactive nudges

### The vision
User sets "I want to reach out to 3 new contacts per week" in onboarding. The coach proactively:
- On Monday: "You have 12 unreached contacts. Here are the top 3 to reach this week, drafts ready."
- Mid-week: "You're at 1 of 3 this week. Want me to draft the next two?"
- Friday: "Hit your goal. Here's who's responded since."

### Existing infra
`users.networking_preferences.contacts_per_week` is in the schema (default 2). No system uses it yet.

### Implementation
Email digest (daily / weekly) + in-app dashboard widget. A Vercel cron job fires the digest. The dashboard widget reads contact statuses.

### Effort
~4h for the digest. Cron + template + email service (Resend or Postmark, both have free tiers).

### Call needed
Approve. Also decide: email digest, in-app, or both? My recommendation: in-app first (zero infra), then email digest in v2.

---

## Thread 8 — Gmail / Outlook integration for direct send

### The question
Today the user has to copy the draft and switch to LinkedIn / their email client. Could we send directly?

### Tradeoffs

**Pros**
- Closes the loop end-to-end
- Logs the send automatically (so we know who's been contacted)
- Cleaner UX for first-time outreach via email (vs LinkedIn DM)

**Cons**
- Google OAuth scopes are intrusive (`gmail.send` requires verification, security review)
- Trust ask is large — users hesitate to give an app send access
- Sent messages need to be tracked back to artifacts somehow
- Outlook OAuth is its own world (Microsoft Graph API)

### Phased approach

| Phase | Effort | Trust ask |
|---|---|---|
| **a)** `mailto:` link buttons everywhere drafts appear | ~1h | Zero — opens user's default mail client with prefilled body |
| **b)** Gmail OAuth + direct send (with verification) | ~2 weeks | Large but standard |
| **c)** Microsoft Graph for Outlook | ~1 week after Gmail | Same as Gmail |

### Call needed
Phase a) is a clear win — ship it. Phase b/c is v2 once we have paid users and the trust budget for an OAuth dialog.

---

## Thread 9 — Meeting summary / memory

### Status
Parked per Liyang's direction. The `meeting_notes` artifact type exists. The Meetings view exists. No transcription, no AI summarization yet.

### Future direction (when we revisit)
Integrate with Granola (existing tool) for transcription. We don't rebuild meeting recording — we read Granola's output and feed it into our memory layer. Cleaner than reinventing.

### Effort if/when we tackle
~3h for the import flow (paste Granola URL or upload transcript). Plus prompt work for summary extraction.

---

## Thread 10 — Relationship cadence / nurturing

### The question
How do we keep relationships warm without becoming spammy?

### Proposed model

| Stage | Default cadence | Trigger for next touch |
|---|---|---|
| **Cold** (initial outreach sent, no reply yet) | Follow up at day 7, then day 21 | Polite nudge |
| **Warm** (one back-and-forth) | Check-in every 6 weeks | Light context update |
| **Engaged** (meeting booked or 3+ exchanges) | Every 2 months | Meaningful share — article, intro |
| **Ongoing** (long-term relationship) | Quarterly | Project update or substantive question |
| **Dormant** (>6 months since last touch) | Re-engagement template | "It's been a while…" |

### Smart override
The cadence is the DEFAULT. The coach can override based on:
- Signals from LinkedIn (they got promoted, changed companies — trigger congrats)
- Meeting notes — if they mentioned an event coming up
- User goal context — if user is actively job-searching, accelerate

### Implementation
Vercel cron job. Reads `last_interaction_at` + `relationship_stage` per contact, generates reminders. Renders in a "Nurture queue" view in the web app.

### Effort
~6-8h for the basic system. Smart overrides add another 6h.

### Call needed
Approve the cadence model. Adjust the intervals if you disagree (my numbers are starting points, not gospel).

---

## Thread 11 — Job opportunities aggregator

### The proposal
Use the same extension infrastructure to scrape:
- INSEAD CareerGlobe
- MBA-Exchange
- LinkedIn Jobs

…and surface relevant openings against `profile_md` + `goals.target_*` filters. After identification, help with: CV tailoring, cover letter, interview prep.

### Why this is interesting
- The INSEAD MBA job-search audience genuinely uses 4-5 platforms. Aggregation has real value.
- Hand-in-hand with networking: "you have an INSEAD alum at this company — want me to draft an intro request?"
- Cross-sell into the existing product: every job → potential outreach targets.

### Why this is risky
- Different product surface, different value prop. Could distract from the core networking thesis.
- Compliance — CareerGlobe and MBA-Exchange both have terms of service. Need to check.
- The first 3 months of building this are pure cost, no compounding effect on the networking flywheel.

### My take
**Not now, but capture the vision.** The networking-product MVP isn't proven yet. Adding a job aggregator means splitting attention. BUT — once Warmly proves out as a networking tool inside INSEAD, "+ job aggregator" becomes an obvious extension because the user already has us in their workflow daily. So: keep on roadmap, build after networking proves out (post-IVC, post-launch, post-100-users).

### Call needed
Confirm "later, not now." Document the vision clearly so we don't forget.

---

## Summary — what needs Liyang's call

| # | Thread | Decision needed | My recommendation |
|---|---|---|---|
| 1 | Onboarding completeness | Priority of CV upload / structured targets / voice samples | CV → targets → voice samples |
| 2 | Chat as primary UX | Stay chat-first or shift to dashboard-first? | Dashboard-first + Cmd+K + per-contact chat |
| 3 | Conversation management | Approve layered approach | Yes |
| 4 | Chat → extension trigger | Build the discovery_plan artifact? | Yes, high-leverage |
| 5 | Tinder profile review | Ship or defer? | Ship — brand-defining |
| 6 | Post-save pipeline | (Status only — no decision) | — |
| 7 | Goal-driven nudges | In-app, email digest, or both? | In-app first, email v2 |
| 8 | Email/calendar integration | Phase a now, b/c later? | Phase a (mailto:) now |
| 9 | Meeting memory | (Parked) | Integrate with Granola when we revisit |
| 10 | Relationship cadence | Approve the stage model? | Yes |
| 11 | Job aggregator | Now or later? | Later — after networking proves out |

---

## Reading order for next session

If you only have 10 minutes: read threads 1, 2, 4, 11. Those are the highest-leverage strategic calls.

If you have an hour: read everything, mark which threads to tackle this month vs Q3.

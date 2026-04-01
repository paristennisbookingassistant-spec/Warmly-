# Product Requirements Document (PRD)
# AI Networking Coach — MVP

**Version:** 1.1 (post pressure-test update)
**Author:** Liyang Guo
**Date:** March 31, 2026
**Status:** Draft — Revised after Gemini/Copilot/ChatGPT review
**Target Development Start:** April 2026
**Target MVP Launch:** June 2026 (INSEAD beta)

---

## 1. Executive Summary

### 1.1 Product Vision
Build an AI-powered networking coach that guides professionals through the entire networking lifecycle — from discovering the right contacts, to crafting strategic outreach, to preparing for meaningful conversations, to maintaining long-term relationships. The product replaces fragmented manual workflows (LinkedIn search + ChatGPT + Excel tracking) with a single intelligent companion that accumulates context over time.

### 1.2 Core Narrative — "Democratizing Networking"
Networking is the single most important skill for career success — and the most unequally distributed. Some people are naturally gifted: they intuitively remember to follow up, know exactly what to say, and sense when to reach out. Everyone else faces an invisible barrier — they know networking matters, but the anxiety of doing it poorly keeps them from trying.

This product is the great equalizer. For the naturally gifted networker, it amplifies their capability — handling the tedious searching, tracking, and scheduling so they can focus on the human connection. For everyone else, it acts as a personal coach, guiding them through every step: who to talk to, what to say, how to prepare, and when to follow up. The goal is not to turn people into calculating optimizers of relationships — it's to give everyone access to the social intelligence that the best networkers have intuitively.

### 1.3 Working Name
TBD — Candidates under consideration: Orbit, Kova, Nexus, Warmly, Weave, Relayo

### 1.4 One-Liner
"Your AI networking coach that finds the right people, helps you reach out, prepares you for conversations, and keeps your relationships alive."

### 1.5 Why Now
Three converging forces make this product possible — and timely — in a way it wouldn't have been even 18 months ago:

1. **AI as a personalized coach (2024-2026):** For the first time, AI can reason through complex personal context — your background, your goals, your strengths, your gaps — and deliver genuinely tailored strategic advice. This goes far beyond drafting messages. An LLM in 2024 could write a decent outreach template. Today's models can take your specific career trajectory, map it against a contact's experience, and advise you: "lead with your deal analysis experience, not your engineering background, because this person values analytical rigor." That's coaching, not text generation — and it only became reliable in the last 12-18 months as models developed the ability to hold multi-variable personal context and reason through it strategically.

2. **The "agent" paradigm shift:** Until 2025, AI tools were passive — you ask, they answer. The emergence of AI agents that can act autonomously in your browser (searching, reading, evaluating, navigating) is genuinely new. Browser-based agents (Claude Code, OpenClaw, Cowork) have normalized the concept of AI operating on behalf of users. This product couldn't have existed 18 months ago — not because LLMs weren't smart enough, but because the agent infrastructure (browser control, tool use, persistent context) didn't exist at consumer level.

3. **Generational acceptance of AI assistance:** Today's MBA and MiM students grew up with AI tools. Using an AI coach for networking doesn't feel like "cheating" — it feels natural, like using Google Maps instead of memorizing directions. The stigma barrier is gone, which means adoption friction is dramatically lower than it would have been even 2-3 years ago. This generation expects AI to handle tedious work so they can focus on the human connection.

### 1.6 MVP Scope
The MVP covers the full 4-step networking framework. Steps 1-3 are fully built; Step 4 is included as a lightweight but functional version to demonstrate the complete vision.

- **Step 1 — Discover:** AI-powered contact discovery via browser companion
- **Step 2 — Strategize:** Personalized outreach message drafting
- **Step 3 — Prepare:** Pre-meeting briefing and discussion question generation
- **Step 4 — Maintain (MVP version):** Post-meeting relationship progression — after a first conversation, the agent suggests concrete next steps (e.g., "send a thank-you within 24 hours," "share that article you discussed," "follow up in 3 weeks when their hiring cycle opens"). Lightweight but functional — shows the full loop.

The full Step 4 (proactive nudges based on external signals, event-triggered follow-ups, long-term relationship scoring) is expanded in v2. But even in the MVP, users should experience the transition from "I just had a great coffee chat" to "here's exactly what to do next to deepen this relationship." That's the moment where our product stops being a one-shot outreach tool and becomes a long-term companion.

---

## 2. Problem Statement

### 2.1 The Core Problem
Professionals navigating career transitions (MBA students, career pivoters, job seekers) know that networking is critical to achieving their goals, but lack the tools, skills, and time to do it effectively. The result: missed opportunities, anxiety about outreach, and relationships that decay from neglect.

### 2.2 Current User Workflow (Pain Points)

| Step | Current Behavior | Pain Point |
|------|-----------------|------------|
| Finding contacts | Manual LinkedIn search, asking classmates, scrolling alumni directories | Time-consuming, incomplete, no strategic prioritization |
| Deciding who to contact | Gut feeling, random selection | No framework for identifying high-leverage contacts |
| Writing outreach messages | Copy-paste templates, ad-hoc ChatGPT prompts | Generic messages, low response rates, no personalization |
| Preparing for meetings | Google the person 5 minutes before the call | Superficial preparation, forgettable conversations |
| Following up | Forget entirely, or send awkward "just checking in" messages | Relationships decay, opportunities lost |
| Tracking contacts | Excel spreadsheets, Notion tables, mental notes | Fragmented, quickly outdated, no intelligence layer |

### 2.3 Why Existing Solutions Fail

| Solution | What It Does | Why It's Not Enough |
|----------|-------------|-------------------|
| **Dex** ($12/mo) | Contact database + keep-in-touch reminders | Passive database — tells you "talk to John" but not why, what to say, or how to prepare. No discovery. |
| **Mesh (Clay.earth)** | Auto-sync contacts from email/calendar/social | Data aggregator — drowns you in contacts without strategic guidance. Deduplication issues. |
| **ChatGPT / Claude** | Ad-hoc message drafting and advice | Stateless — forgets everything between sessions. No accumulated context. No proactive nudges. |
| **LinkedIn Sales Navigator** ($99-180/mo) | Advanced search filters, InMail credits | Expensive, designed for B2B sales teams, no coaching or preparation features. |
| **Careerflow / Teal** | Job application tracking + LinkedIn optimization | Transactional — used during job hunt, abandoned after. No relationship building. |
| **Excel / Notion** | Manual contact tracking | High friction, no intelligence, dies after 2 weeks of non-use. |

### 2.4 The Gap We Fill
No existing product covers the full networking lifecycle with AI intelligence at every step. Discovery tools don't help with outreach. Outreach tools don't help with preparation. CRMs don't help with any of the above — they just store data. Our product is the connective tissue that makes the entire workflow intelligent and proactive.

---

## 3. Target Users

### 3.1 Primary Persona: The MBA Networker

**Name:** "Alex" — MBA student at a top European business school
**Age:** 27-32
**Background:** 4-6 years of work experience (consulting, engineering, finance), now pivoting to a new industry
**Context:** Needs to build a new professional network from near-zero in their target industry within 6-12 months
**Behavior:**
- Attends 3-5 networking events per month
- Conducts 5-10 informational interviews ("coffee chats") per month
- Spends 3-5 hours/week on LinkedIn searching and messaging
- Uses ChatGPT occasionally for message drafting
- Tracks contacts in a spreadsheet that becomes outdated within weeks

**Goals:**
- Land a job at a target company (e.g., BCG, Bain, Google, Sequoia)
- Build genuine relationships, not just transactional connections
- Make the most of the limited MBA networking window

**Frustrations:**
- "I don't know who to talk to — there are thousands of alumni, where do I start?"
- "My messages all sound the same and nobody responds"
- "I had a great coffee chat but forgot to follow up and now it's awkward"
- "I know networking is important but I'm just not naturally good at it"
- "Even when I get a meeting, I don't know how to prepare properly, how to animate the discussion, or how to make myself referral-worthy rather than just another informational interview"
- "I want to be helpful to my contacts too, not just extract value — but I don't know how to provide value when I'm the junior person"

**Willingness to pay:** €9.99/month (equivalent to a couple of coffees — low compared to MBA tuition ROI)

### 3.2 Secondary Persona: The MiM Student

**Name:** "Sophie" — Master in Management student
**Age:** 22-25
**Background:** Fresh from undergrad, limited professional network
**Context:** Beginning to understand the importance of networking but unsure how to start
**Key difference from MBA:** Less career urgency, smaller budget, needs more guidance on networking fundamentals
**Willingness to pay:** €9.99/month (but more price-sensitive; may need freemium hook)

### 3.3 Future Persona (Post-MVP): The Career Professional

**Name:** "Marie" — Mid-career professional exploring new opportunities
**Age:** 30-45
**Background:** Established career, strong but dormant network
**Context:** Considering a career move, needs to reactivate old connections and build new ones
**Willingness to pay:** €19.99/month (professional tier)

---

## 4. Product Scope — MVP Features

### 4.1 Priority Framework

- **P0 (Must-Have for MVP):** Without this, the product has no value. Ship-blocking.
- **P1 (Should-Have):** High value, significant impact on user experience. Include if feasible within timeline.
- **P2 (Nice-to-Have):** Enhances the product but can ship without it. Target for v1.1.
- **P3 (Future):** Deferred to v2 or beyond.

### 4.2 Feature Map

#### FEATURE 1: User Onboarding & Profile Builder — P0

**Description:** Guided onboarding flow that builds a deep user profile including career history, education, goals, target companies/roles, and networking style preferences. This profile is the foundation for all AI recommendations.

**User Stories:**
- As a new user, I want to quickly set up my profile so the agent understands my background and goals.
- As a user, I want to connect my LinkedIn profile so the agent can auto-populate my career history and education.
- As a user, I want to specify my target companies, roles, and industries so the agent knows what to search for.

**Requirements:**

| ID | Requirement | Priority | Details |
|----|------------|----------|---------|
| ONB-01 | Profile questionnaire | P0 | Structured form: name, current role, career history (auto-import from LinkedIn if possible), education, target companies (up to 10), target roles, target industries, target geographies, networking goals (free text) |
| ONB-02 | LinkedIn data import | P1 | User uploads LinkedIn profile data export (CSV) or connects via browser extension to auto-populate profile fields. Not a hard dependency — manual entry must work as fallback. |
| ONB-03 | Goal-setting wizard | P0 | Guided selection: "What are you networking for?" Options: Job search, Industry exploration, Relationship building, Fundraising, Other. This drives the agent's recommendation logic. |
| ONB-04 | Networking style preference | P1 | Quick assessment: How comfortable are you with cold outreach? (Scale 1-5). How many new contacts do you want to reach per week? This calibrates the agent's aggressiveness. |
| ONB-05 | Profile completeness indicator | P1 | Progress bar showing how complete the profile is, with prompts to fill gaps. More complete profile = better recommendations. |

**Acceptance Criteria:**
- User can complete basic onboarding (ONB-01, ONB-03) in under 5 minutes
- Profile data is stored and accessible to the AI scoring engine
- User can edit their profile at any time

---

#### FEATURE 2: Intelligent Contact Discovery (Browser Companion) — P0

**Description:** The flagship feature. An AI-powered browser extension that helps users discover relevant professional contacts by intelligently searching LinkedIn on the user's behalf. The agent plans search strategies based on the user's goals, executes searches in the user's browser at human-like speed, evaluates profile relevance, and presents a curated shortlist.

**User Stories:**
- As a user, I want to tell the agent my networking goal and have it find relevant people for me, so I don't spend hours manually searching LinkedIn.
- As a user, I want to receive a curated list of recommended contacts with explanations of why each person is relevant to my goals.
- As a user, I want to run discovery in batches (e.g., 5 companies at a time) so I can review results incrementally.
- As a user, I want to approve or reject recommended contacts, so the agent learns my preferences over time.

**Requirements:**

| ID | Requirement | Priority | Details |
|----|------------|----------|---------|
| DIS-01 | Search strategy planner | P0 | Given user's goals and target companies, the AI generates a search plan: which companies to search, what roles/seniority to target, what keywords to use. User reviews and approves the plan before execution. |
| DIS-02 | Browser automation engine | P0 | Browser extension controls the user's LinkedIn tab to execute searches. Must simulate human browsing behavior: randomized delays (15-45s between actions), natural scroll patterns, organic navigation paths. |
| DIS-03 | Batch execution | P0 | User initiates a discovery batch (default: 5 companies). Extension runs searches, views profiles, and collects data. Estimated time per batch: 15-20 minutes. User can pause/stop at any time. |
| DIS-04 | Profile relevance scoring | P0 | AI evaluates each discovered profile against user's goals using a multi-criteria scoring rubric. Criteria include: career path similarity, shared alma mater, geographic match, seniority relevance, transition path relevance, recency of career move. Returns a score (1-10) and a one-line explanation. |
| DIS-05 | Tiered recommendations | P0 | Results presented in tiers: Tier 1 (Strong match — very similar background/transition), Tier 2 (Good match — relevant but different path), Tier 3 (Worth considering — adjacent relevance). |
| DIS-06 | Results presentation | P0 | Discovery results appear in two places: (a) Agent summarizes results in the General Chat with tiered breakdown and one-line reasons, (b) Contacts automatically appear in the Contacts tab with full profile cards. User can save/dismiss from either surface. "Reach Out" opens a Contact Session. |
| DIS-07 | User feedback loop | P1 | User can mark contacts as "Great match" or "Not relevant" to improve future recommendations. Feedback stored for future scoring model refinement. |
| DIS-08 | Rate limiting & safety | P0 | Hard limits on LinkedIn activity: max 25 profile views per session, max 2 sessions per day, mandatory 2+ hour cooling period between sessions. User warned if approaching limits. |
| DIS-09 | Session status indicator | P1 | Discovery progress shown as: (a) status bar in Chat view header when discovery is running, (b) progress updates from the agent in the chat ("Searching Blackstone... 4 profiles found"), (c) Chrome extension popup badge showing count. User can stop from chat or extension. |
| DIS-10 | Offline mode fallback | P2 | If user prefers not to use browser automation, they can manually paste LinkedIn profile URLs for the AI to analyze. Reduced functionality but zero platform risk. |
| DIS-11 | Manual contact entry | P0 | Three methods to add contacts without discovery: (a) Tell the agent in chat ("Add John Smith, VP at Goldman"), (b) Paste a LinkedIn URL in chat — agent creates contact and captures data when available, (c) Click "Save to [product]" in extension popup while viewing a LinkedIn profile. All methods create a Contact record and open a Contact Session. |

**Acceptance Criteria:**
- Discovery batch of 5 companies completes in under 20 minutes
- Relevance scoring accuracy: >70% of Tier 1 recommendations judged as "relevant" by user (measured via feedback loop)
- Zero automated messages sent — discovery is read-only
- Rate limits enforced; no user account flags in testing

**Technical Notes:**
- Browser extension built with Chrome Extension Manifest V3
- Profile data extracted from visible DOM elements only (no API calls to LinkedIn)
- Scoring engine uses Claude Haiku (Tier 1 model, see Section 5.4.1) with structured prompt — fast and cheap enough for batch scoring during discovery
- All profile data stored locally on user's device + encrypted cloud backup

---

#### FEATURE 3: Outreach Message Drafting — P0

**Description:** AI drafts personalized connection requests and outreach messages based on the user's profile, the target contact's profile, and the mutual context between them. Messages are crafted to maximize response rates while maintaining authenticity.

**User Stories:**
- As a user, I want the agent to draft a personalized outreach message for a specific contact, so I can send a compelling first impression.
- As a user, I want to choose the message tone (formal, friendly, casual) and channel (LinkedIn message, LinkedIn connection note, email).
- As a user, I want to edit the draft before sending — the agent should never send messages automatically.

**Requirements:**

| ID | Requirement | Priority | Details |
|----|------------|----------|---------|
| OUT-01 | Context-aware message generation | P0 | AI synthesizes: user profile, target profile, mutual connections, shared experiences (school, company, industry), and user's networking goal to draft a message. |
| OUT-02 | Message type selection | P0 | Support three types: (a) LinkedIn connection request (max 300 chars), (b) LinkedIn message (longer, for existing connections), (c) Email draft. |
| OUT-03 | Tone calibration | P1 | User selects tone: Professional, Warm, Casual. Agent adapts language, formality, and length accordingly. Default: Warm. |
| OUT-04 | Hook identification | P0 | AI identifies the strongest "hook" — the specific shared context point most likely to get a response (e.g., "We both transitioned from engineering to consulting" or "I saw your recent post about PE deal sourcing"). |
| OUT-05 | Multiple draft variants | P1 | Generate 2-3 message variants for user to choose from or combine. |
| OUT-06 | Copy-to-clipboard / direct paste | P0 | One-click copy. If browser extension is active and user is on LinkedIn messaging, option to auto-fill the message field (user still clicks Send). |
| OUT-07 | Message history | P1 | Store all drafted messages (sent and unsent) linked to the contact record. This builds the context for future follow-ups. |
| OUT-08 | Style learning | P1 | Agent learns user's writing style from edit patterns (see Section 5.9 — Agent Learning System). After 5+ edits, the agent adapts tone, vocabulary, and message structure. After 15+ outreach artifacts with outcomes tracked, the agent recommends hooks and approaches based on what historically got responses. |

**Acceptance Criteria:**
- Message generation completes in under 5 seconds
- Draft includes at least one specific mutual context hook (not generic)
- Connection request drafts are within LinkedIn's 300-character limit
- No message sent without explicit user action (click Send)

**AI Quality Requirements:**
- Hallucination rate: <2% — Messages must not reference events, roles, or details that don't exist on the target's profile
- Personalization: >90% of messages must contain at least one specific reference to the target's actual career history
- Human review: mandatory for every message before sending

---

#### FEATURE 4: Meeting Preparation Briefing — P0

**Description:** Before a scheduled meeting or coffee chat, the agent generates a unified "meeting prep" document combining: person briefing, company intelligence, tailored discussion questions, and strategic coaching. This is a single artifact that gives the user everything they need to walk into a conversation feeling fully prepared.

**User Stories:**
- As a user, I want a briefing before my coffee chat so I can ask insightful questions and make a great impression.
- As a user, I want the briefing to include specific questions based on the contact's career path — not generic interview questions.
- As a user, I want to understand what the contact's company does, their recent news, and what's happening in their business — so I can have an informed conversation, not just ask about their personal career.
- As a user, I want strategic advice on what to ask for (e.g., referral, introduction, advice) based on where I am in my networking journey with this person.

**Requirements:**

| ID | Requirement | Priority | Details |
|----|------------|----------|---------|
| PREP-01 | Contact summary | P0 | Name, current role, career trajectory, education, mutual connections, key highlights, previous interactions (if any). |
| PREP-02 | Company intelligence | P0 | Succinct summary of the contact's current company: what the company does, size/stage, recent news or developments (funding rounds, product launches, leadership changes, market moves), key strategic priorities. For example, if the contact works at Sequoia, the user should know about their latest fund, recent investments, and any relevant news from the past 3 months. Sources: web search at briefing generation time. |
| PREP-03 | Tailored discussion questions | P0 | AI generates 5-8 questions specific to the contact's experience AND their company context. Questions should demonstrate preparation and genuine curiosity — not generic "tell me about your role" questions. Some questions should reference company-level context (e.g., "I saw Sequoia recently led a round in [company] — how is the SE Asia deal pipeline looking?"). |
| PREP-04 | Strategic coaching | P0 | Agent advises on meeting strategy: what to ask for (advice vs. referral vs. introduction), how to frame the ask, what NOT to do (e.g., "Don't ask for a referral on a first call — focus on learning about their experience"). |
| PREP-05 | Conversation themes | P1 | Group questions into 2-3 themes (e.g., "Their career transition," "Their company's strategic direction," "Advice for your path") so the user can navigate the conversation organically. |
| PREP-06 | Time-aware briefing | P1 | Adjust briefing length/depth based on meeting duration. 15-min call → 3-4 key questions. 45-min coffee → full briefing with themes and company deep-dive. |
| PREP-07 | Exportable briefing | P1 | One-click export to PDF or mobile-friendly view for quick reference before the meeting. |
| PREP-08 | Post-meeting notes prompt | P2 | After the scheduled meeting time, prompt user to capture key takeaways (free text or voice memo). Store in contact record. |

**Acceptance Criteria:**
- Briefing generated in under 15 seconds (slightly longer than before due to web search for company intel)
- Questions are specific to the contact (reference their actual roles, companies, transitions)
- Company intelligence section includes at least one recent development (within 3 months)
- Strategic coaching advice is appropriate to the relationship stage (first contact vs. follow-up)

---

#### FEATURE 5: Contact Management (Profile Hub) — P1

**Description:** The Contacts view is the permanent record of every person in the user's network. Each contact card is an artifact hub — it aggregates everything produced across all conversations related to that contact: outreach drafts, discussion guides, meeting notes, action plans. Clicking a contact card shows the full relationship history and links back to the conversation sessions where artifacts were created.

**Requirements:**

| ID | Requirement | Priority | Details |
|----|------------|----------|---------|
| CRM-01 | Contact database | P1 | Store: name, role, company, LinkedIn URL, profile snapshot (raw data from extension), discovery date, relevance score + breakdown, relationship status, all linked artifacts, user notes. |
| CRM-02 | Card grid view (default) | P1 | Cards showing: name, role, company, score badge, relationship stage indicator, count of artifacts, last interaction date. Sortable by score, date, stage. |
| CRM-03 | Search and filter | P1 | Filter by company, industry, relationship stage, relevance score tier, tag. |
| CRM-04 | Contact detail page | P0 | Full profile view showing: (a) Profile summary (career, education, mutual context), (b) All artifacts grouped by type (messages, briefings, notes, action plans) with timestamps, (c) Conversation history links — click to re-open the contact session where each artifact was produced, (d) Relationship timeline (discovered → contacted → met, with dates), (e) User notes and tags. This is the single source of truth for everything about this contact. |
| CRM-05 | "Open session" action | P0 | From any contact card, one click opens (or resumes) a Contact Session in the Chat view, pre-loaded with the contact's full context. |
| CRM-06 | Stage auto-progression | P1 | Relationship stage updates automatically based on artifact status: new artifact of type "outreach_draft" with status "sent" → stage becomes "contacted"; artifact of type "meeting_notes" created → stage becomes "met". User can also manually override. |

---

#### FEATURE 6: Relationship Progression Coach (MVP Step 4) — P1

**Description:** After a first meeting or successful outreach, the agent shifts from "hunting mode" to "nurturing mode." It suggests concrete, context-aware next steps to deepen the relationship — moving beyond a one-time interaction into an ongoing professional connection. This is the MVP version of the full relationship maintenance system; it demonstrates the complete vision without requiring the full proactive nudge infrastructure.

**User Stories:**
- As a user who just had a coffee chat, I want the agent to tell me what to do next so I don't lose momentum.
- As a user, I want follow-up message drafts that reference what we actually discussed — not generic "nice to meet you" templates.
- As a user, I want to see a clear progression path for each relationship: where am I now, and what's the next step?

**Requirements:**

| ID | Requirement | Priority | Details |
|----|------------|----------|---------|
| REL-01 | Post-meeting action plan | P1 | After user logs post-meeting notes (or simply marks "meeting happened"), agent generates 2-3 suggested next actions with timing. E.g., "Send thank-you within 24 hours," "Share the article on PE trends you discussed — here's a draft," "Follow up in 3 weeks when Q2 hiring cycle starts." |
| REL-02 | Follow-up message drafting | P1 | Agent drafts follow-up messages that reference actual meeting context (from user's post-meeting notes or briefing content). Must feel like a natural continuation of the conversation, not a cold restart. |
| REL-03 | Relationship stage tracking | P1 | Each contact has a visible progression: Discovered → Contacted → Connected → Met → Ongoing. After "Met," the agent suggests actions to advance to "Ongoing" (warm relationship with regular touchpoints). |
| REL-04 | Simple reminder system | P1 | User can set or accept agent-suggested follow-up reminders (e.g., "Remind me to check in with Marie in 3 weeks"). Basic calendar-style reminders — not yet the full proactive nudge system. |
| REL-05 | Relationship health indicator | P2 | Simple visual: green (recent interaction), yellow (getting stale — 30+ days), red (dormant — 60+ days). Based purely on last interaction date for MVP. |
| REL-06 | Next-step coaching tips | P1 | Contextual coaching advice on relationship deepening. E.g., after a first coffee chat: "Don't ask for a referral yet — next step is to provide value. Share an insight or introduction that helps them." This is the coaching layer that differentiates from Dex's simple "time to reconnect" reminders. |

**How this differs from Dex:**
Dex tells you "You haven't talked to John in 90 days." That's a calendar alert. Our agent tells you "John mentioned his team is expanding in Q2. Here's a follow-up message that references your conversation about PE deal flow and asks about the new role — this is the right moment to re-engage because you can offer genuine value." The difference is context-aware coaching vs. arbitrary time-based reminders.

**Acceptance Criteria:**
- Post-meeting action plan generated within 10 seconds of user logging meeting notes
- Follow-up drafts reference at least one specific detail from the meeting/previous interactions
- Relationship stage automatically updates based on user actions (sent message → "Contacted", logged meeting → "Met")
- Coaching tips are stage-appropriate (don't suggest "ask for referral" on a first interaction)

---

### 4.3 Features Deferred to v2 (Full Maintenance System)

| Feature | Priority | Rationale for Deferral |
|---------|----------|----------------------|
| Proactive follow-up nudges (signal-based) | P3 | Full version monitors external signals (job changes, company news, content posts) to trigger timely follow-ups. Requires event monitoring infrastructure; MVP uses simple time-based reminders instead. |
| Meeting recording & transcription | P3 | Complex (audio processing, privacy concerns); can integrate Granola/Otter later |
| Multi-platform integration (WhatsApp, WeChat, email) | P3 | Multiplies complexity; LinkedIn-first is the right MVP scope |
| Relationship strength scoring | P3 | Needs interaction data from v1 to calibrate |
| Team/group features (shared networking goals) | P3 | B2B expansion; not relevant for initial B2C focus |
| Fine-tuned recommendation model | P3 | Requires training data from v1 user interactions |
| Calendar integration (auto-detect meetings) | P2 | Valuable but not critical for MVP launch |

---

## 5. Technical Architecture

### 5.1 System Overview

The product has two user-facing surfaces: a **web application** (primary) and a **Chrome extension** (companion for LinkedIn discovery). The web app is where users spend most of their time — chatting with the agent, reviewing contacts, and preparing for meetings. The extension is activated only during discovery sessions.

```
┌─────────────────────────────────────────────────────────────┐
│               WEB APPLICATION (Next.js on Vercel)            │
│                                                              │
│  ┌────────────┐  ┌────────────────┐  ┌──────────────┐      │
│  │   Chat      │  │   Contacts     │  │   Goals      │      │
│  │  (primary)  │  │  (profile hub) │  │  (tracking)  │      │
│  │             │  │                │  │              │      │
│  │ General     │  │ Card grid with │  │ Progress vs  │      │
│  │ sessions +  │  │ scores, stages,│  │ targets,     │      │
│  │ Contact     │  │ linked         │  │ computed     │      │
│  │ sessions    │  │ artifacts      │  │ from data    │      │
│  └──────┬─────┘  └───────┬────────┘  └──────┬───────┘      │
│         └────────────────┼───────────────────┘              │
│                          │ All share same API / DB           │
└──────────────────────────┼──────────────────────────────────┘
                           │
          ┌────────────────┼────────────────┐
          ▼                ▼                ▼
┌─────────────────────────────────────────────────────────────┐
│                    BACKEND (Supabase + API Routes)            │
│                                                              │
│  ┌──────────────┐  ┌───────────────┐  ┌──────────────────┐  │
│  │ Auth + User   │  │ Conversation  │  │ AI Engine        │  │
│  │ Management    │  │ Manager       │  │ (Claude API)     │  │
│  │ (Supabase     │  │ (session      │  │ - Scoring        │  │
│  │  Auth)        │  │  routing,     │  │ - Message gen    │  │
│  └──────────────┘  │  context       │  │ - Briefing gen   │  │
│                    │  loading)      │  │ - Coaching       │  │
│  ┌──────────────┐  └───────────────┘  └──────────────────┘  │
│  │ PostgreSQL    │                                           │
│  │ (Users,       │                                           │
│  │  Contacts,    │                                           │
│  │  Conversations│                                           │
│  │  Artifacts)   │                                           │
│  └──────────────┘                                           │
└─────────────────────────────────────────────────────────────┘
          ▲
          │ API calls (profile data, discovery status)
          │
┌─────────────────────────────────────────────────────────────┐
│               CHROME EXTENSION (Manifest V3)                 │
│                                                              │
│  ┌──────────────────┐    ┌─────────────────────────────┐    │
│  │  Content Script   │    │  Background Service Worker   │    │
│  │  (LinkedIn DOM    │    │  - API auth (same session)   │    │
│  │   reader +        │───►│  - Rate limit enforcement    │    │
│  │   navigation      │    │  - Profile data upload       │    │
│  │   controller +    │    │  - Discovery status sync     │    │
│  │   behavior sim)   │    └─────────────────────────────┘    │
│  └──────────────────┘                                        │
│                                                              │
│  Minimal UI: small floating badge showing discovery progress │
│  (e.g., "Discovering... 8/25 profiles"). No side panel.     │
│  All rich interaction happens in the web app.                │
└─────────────────────────────────────────────────────────────┘
```

### 5.2 Technology Stack (Recommended for MVP)

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| **Browser Extension** | Chrome Extension (Manifest V3), React + TypeScript | Standard, well-documented, covers 65%+ of browser market. React for the side panel UI. |
| **Frontend (Web App)** | Next.js + React + TypeScript + Tailwind CSS | Fast to build, great DX, SSR for SEO (landing page), easy deployment on Vercel. |
| **Backend API** | Next.js API Routes (MVP) | Keeps stack unified — one codebase, one deploy. API routes handle auth, LLM calls, database operations. If latency becomes an issue with long-running LLM calls, extract AI engine into a separate service (Node.js/Express or Python/FastAPI) in v2. For MVP, Next.js API routes + Vercel serverless functions are sufficient. |
| **Database** | PostgreSQL (via Supabase or Neon) | Relational data (users, contacts, messages, interactions). Supabase adds auth, real-time, and storage out of the box. |
| **Authentication** | Supabase Auth or NextAuth.js | Email + Google OAuth. LinkedIn OAuth if possible (adds profile import). |
| **AI/LLM** | Anthropic Claude API (primary) or OpenAI GPT-4 (fallback) | Best reasoning quality for scoring and message generation. Structured output for scoring rubric. |
| **Hosting** | Vercel (frontend) + Supabase (backend/DB) or Railway | Low-ops, auto-scaling, generous free tiers for MVP. |
| **Monitoring** | PostHog (product analytics) + Sentry (error tracking) | Open-source friendly, generous free tiers. |

### 5.3 Browser Extension Architecture

The extension is intentionally lightweight — it handles LinkedIn data capture and nothing else. All rich features (chat, contact management, message drafting) live in the web app. This separation reduces extension complexity, minimizes LinkedIn detection risk (smaller content script footprint), and keeps the web app as the single source of truth.

```
Extension Components:
├── Content Script (runs on LinkedIn pages only)
│   ├── DOM reader — extracts visible profile data:
│   │   name, headline, current role, company, career history,
│   │   education, location, profile URL, mutual connections
│   │   (reads only what's visible on the page, no hidden API calls)
│   ├── Navigation controller — executes search queries,
│   │   scrolls results, opens profiles, navigates back
│   └── Human behavior simulator:
│       ├── Randomized delays: 15-45s between actions
│       ├── Natural scroll patterns (variable speed, pauses)
│       ├── Organic click positions (not exact center of elements)
│       └── Session duration variance (don't always stop at exactly 25)
├── Content Script (also handles orchestration — see note below)
│   ├── Discovery orchestrator — manages batch execution state
│   │   CRITICAL: Manifest V3 service workers are killed after 30s of
│   │   inactivity. Discovery sessions last 15-20 minutes. Therefore,
│   │   the orchestration loop (next profile, wait, scroll, extract)
│   │   MUST run in the content script, which stays alive as long as
│   │   the LinkedIn tab is open. The service worker handles only
│   │   short-lived tasks (API calls, storage, alarms).
│   └── Heartbeat mechanism — content script pings service worker
│       every 25s to keep it alive for API calls during discovery
├── Background Service Worker (short-lived tasks only)
│   ├── Auth — shares Supabase session with web app (same user)
│   ├── API client — sends extracted profile data to backend
│   ├── Rate limit enforcer — hard-coded, cannot be overridden:
│   │   max 25 profile views/session, max 2 sessions/day,
│   │   min 2 hours between sessions
│   ├── chrome.alarms API — schedules keepalive and rate limit checks
│   └── Status broadcaster — sends progress updates to web app
│       via Supabase Realtime (web app shows live discovery status)
├── Popup (minimal)
│   ├── Login status indicator
│   ├── "Start Discovery" / "Pause" / "Stop" buttons
│   └── Progress: "12/25 profiles • Company 3/5 • ~6 min left"
└── Storage
    ├── chrome.storage.local — current session state, cached data
    └── chrome.storage.sync — user preferences only (no profile data)

DOM Fragility Mitigation:
LinkedIn changes its DOM structure frequently. The content script must:
  ├── Use multiple selector strategies per field (class-based, aria-label,
  │   text content matching, structural position) — if primary fails, try fallback
  ├── Implement a selector configuration layer (JSON map of field → selector list)
  │   so selectors can be updated without rewriting extraction logic
  ├── Log extraction failures with DOM snapshots for debugging
  ├── Gracefully degrade — if a field can't be extracted, mark it as null
  │   rather than failing the entire profile. name + current_role + linkedin_url
  │   are the minimum viable extraction; other fields are best-effort
  └── Version the selector config so updates can be pushed via extension update
      without requiring a full code deploy

Error Handling & Recovery:
  ├── LinkedIn session expired → detect login wall, pause discovery, notify user
  ├── Extension loses connection → content script stores progress locally,
  │   resumes from last successful profile when reconnected
  ├── Rate limit approached → exponential backoff, then graceful stop with
  │   summary of what was completed
  ├── Tab closed during discovery → save state to chrome.storage.local,
  │   offer to resume when user re-opens LinkedIn
  └── DOM structure changed → log failure pattern, attempt fallback selectors,
      if >50% of fields fail on 3+ profiles, pause and alert user

Data captured per profile (sent to backend):
{
  "linkedin_url": "https://linkedin.com/in/...",
  "name": "Marie Chen",
  "headline": "VP of Investments at Sequoia Capital",
  "current_role": { "title": "VP", "company": "Sequoia Capital", "duration": "2y" },
  "previous_roles": [ ... ],   // from Experience section
  "education": [ ... ],         // from Education section
  "location": "Singapore",
  "mutual_connections": 3,
  "captured_at": "2026-04-15T10:23:00Z",
  "source_session_id": "disc_abc123"
}
```

### 5.4 AI Scoring Engine — Prompt Architecture

The scoring engine uses a structured prompt with the following components:

```
SYSTEM PROMPT:
You are a professional networking advisor. Given a user's profile and
networking goals, evaluate a potential contact's relevance.

INPUT:
- User Profile: {career_history, education, goals, target_companies, target_roles}
- Contact Profile: {name, current_role, company, career_history, education, location}
- Scoring Rubric: {weighted criteria}

SCORING RUBRIC:
1. Career Path Similarity (weight: 25%) — Has this person made a similar
   career transition to what the user wants?
2. Shared Background (weight: 20%) — Shared alma mater, previous employer,
   nationality, or geography?
3. Seniority Relevance (weight: 15%) — Is this person at the right level
   to be helpful (not too senior to be unreachable, not too junior to be uninformed)?
4. Industry Match (weight: 20%) — Does this person work in the user's
   target industry/company?
5. Accessibility Signals (weight: 10%) — Does this person show signs of
   being open to networking (active on LinkedIn, mentor roles, content creator)?
6. Recency (weight: 10%) — How recently did this person make their
   transition? (More recent = more relevant tactical advice)

OUTPUT (Structured JSON):
{
  "overall_score": 8.2,
  "tier": 1,
  "scores": {
    "career_path_similarity": 9,
    "shared_background": 7,
    "seniority_relevance": 8,
    "industry_match": 9,
    "accessibility_signals": 7,
    "recency": 8
  },
  "recommendation_reason": "One-line explanation of why this person is relevant",
  "suggested_hook": "The strongest angle for outreach based on mutual context"
}
```

### 5.4.1 LLM Model Tiering (Cost/Quality Optimization)

Different tasks require different levels of AI capability. Using the most powerful model for every task wastes money; using the cheapest model for complex tasks degrades quality. The following tiering reduces LLM costs by ~40% while maintaining quality where it matters:

```
TIER 1 — Fast Model (Claude Haiku or equivalent)
  Use for: Contact scoring, connection note drafts (300 chars),
           simple follow-up drafts, session summaries, style preference extraction
  Cost: ~$0.25/1M input tokens
  Latency: <2 seconds
  Why: These tasks follow a clear rubric with structured output.
       Quality difference between Haiku and Sonnet is <5% for scoring.

TIER 2 — Reasoning Model (Claude Sonnet or equivalent)
  Use for: Meeting prep (person briefing + company intel + coaching),
           outreach drafts (longer, nuanced), action plans,
           strategic coaching, conversational onboarding
  Cost: ~$3/1M input tokens
  Latency: 3-8 seconds
  Why: These tasks require multi-variable reasoning, personalization,
       and strategic thinking. Quality gap is significant.

ROUTING LOGIC:
  artifact_type → model mapping:
    connection_note    → Tier 1 (Haiku)
    outreach_draft     → Tier 2 (Sonnet)
    meeting_prep       → Tier 2 (Sonnet)
    meeting_notes      → Tier 1 (Haiku) — mostly extraction/formatting
    action_plan        → Tier 2 (Sonnet)
    follow_up_draft    → Tier 1 (Haiku) for simple, Tier 2 if referencing meeting context
  scoring             → Tier 1 (Haiku)
  conversation        → Tier 2 (Sonnet) for coaching, Tier 1 for factual Q&A
```

### 5.4.2 Context Window Management

Contact sessions can accumulate hundreds of messages over weeks of interaction. Loading full history into each prompt is unsustainable (cost + context window limits). Solution: rolling summarization.

```
CONTEXT LOADING STRATEGY:
1. After every N messages (default: 15) in a contact session, the agent
   generates a structured summary of the conversation so far:
   { key_decisions, user_preferences_expressed, artifacts_produced,
     open_questions, relationship_stage_changes }
2. This summary is stored on the Conversation record (summary field)
3. On session resume, the prompt receives:
   - Contact profile (always full)
   - Conversation summary (compressed history)
   - Last 5 messages (recent context for continuity)
   - All artifact metadata (types, statuses, dates — not full content)
   - Full content of the most recent artifact of each type
4. If user references a specific old artifact or conversation point,
   the agent can request a "context expansion" — loading the relevant
   messages or artifact from the database on demand.

ESTIMATED TOKEN BUDGET PER PROMPT:
  System prompt + scoring rubric:     ~800 tokens
  User profile:                       ~500 tokens
  Contact profile:                    ~400 tokens
  Conversation summary:               ~300 tokens
  Last 5 messages:                    ~500 tokens
  Artifact metadata:                  ~200 tokens
  Total baseline:                     ~2,700 tokens (well within limits)
```

### 5.4.3 Web Search for Company Intelligence

Meeting prep (PREP-02) requires up-to-date company information. The LLM should NOT browse the web directly — this adds latency, unreliability, and cost. Instead, the backend performs the web search and injects results into the LLM prompt.

```
ARCHITECTURE:
1. User requests meeting prep → backend receives contact_id
2. Backend extracts company name from contact's current_role
3. Backend calls a dedicated search API:
   - Primary: Perplexity API (structured answers, good for company intel)
   - Fallback: SerpAPI or Exa (raw search results)
   - Query template: "{company_name} recent news funding leadership 2026"
4. Backend receives search results (3-5 snippets, ~500 tokens)
5. Backend constructs the meeting prep prompt:
   - Contact profile + user profile + search results + coaching rubric
6. LLM generates the full meeting_prep artifact with company_intel section
7. Search results cached per company for 7 days (company news doesn't change hourly)

COST: ~$0.003 per search (Perplexity) — negligible vs. LLM cost
LATENCY: Adds ~2-3 seconds to meeting prep generation (acceptable given 15s target)
```

### 5.5 Data Model (Core Entities)

The data model is designed around two core concepts: (1) **conversations** are the primary interaction — everything happens through chat sessions with the AI agent, and (2) **contact profiles** are the permanent record — all artifacts produced in conversations get linked to the relevant contact.

```
Users
├── id, email, name, created_at
├── career_history (JSON)
├── education (JSON)
├── goals (JSON: target_companies, target_roles, target_industries)
├── networking_preferences (JSON: style, frequency, tone)
├── user_memory (JSON — agent's accumulated understanding, see Section 5.9)
│   This is the agent's "long-term memory" about this user — writing style
│   preferences, successful outreach patterns, networking approach, etc.
│   Updated incrementally as the agent learns from user edits and outcomes.
└── subscription_status, subscription_tier

Conversations
├── id, user_id, created_at, updated_at
├── type: "general" | "contact_session"
│   ├── "general" — Main chat. Strategy discussions, discovery requests,
│   │    general networking coaching. Not tied to a single contact.
│   └── "contact_session" — Dedicated to one contact. Opened when user
│        says "let's work on outreach to Marie" or clicks a contact card.
│        All artifacts produced here link to the contact.
├── contact_id (nullable — null for general, set for contact_session)
├── title (auto-generated from first message or contact name)
├── status: "active" | "archived"
└── summary (AI-generated recap, updated after each session)

ConversationMessages
├── id, conversation_id, created_at
├── role: "user" | "agent"
├── content (text — the message body)
└── artifacts_generated (JSON array of artifact_ids created by this message)

Contacts
├── id, user_id, linkedin_url (UNIQUE per user_id), name, current_role, company
├── career_history (JSON), education (JSON), location
├── profile_snapshot (JSON — raw data captured from LinkedIn DOM)
├── relevance_score, tier, scoring_breakdown (JSON)
├── source: "discovery" | "manual_chat" | "manual_url" | "extension_bookmark"
│   (how this contact was added — affects what data is available)
├── status: discovered → contacted → connected → met → ongoing
├── discovered_at, last_interaction_at
├── user_feedback (great_match | not_relevant | null)
├── discovery_session_id (FK — nullable, only set for discovery-sourced contacts)
└── notes (free text — user's own annotations)

UNIQUE CONSTRAINT: (user_id, linkedin_url) — prevents duplicate contacts
  when same person found in multiple discovery sessions or added manually.
  If a contact with the same linkedin_url already exists for this user,
  merge: update profile_snapshot with newer data, keep existing artifacts/status.

MANUAL CONTACT ENTRY (3 methods):
  1. Chat entry: User tells agent "Add John Smith, VP at Goldman Sachs" →
     Agent creates contact with minimal data, asks for LinkedIn URL if available.
     Profile data populated from whatever user provides in conversation.
  2. LinkedIn URL paste: User pastes a LinkedIn profile URL in chat →
     Agent extracts the URL, calls backend which uses extension (if active)
     or prompts user to visit the profile so extension can capture data.
     If no extension, agent creates contact with URL only and populates
     data when user provides it or extension captures it later.
  3. Chrome extension bookmark: While browsing LinkedIn, user clicks a
     "Save to [product]" button in the extension popup → extension captures
     full profile data from the current page and creates a contact record.
     Similar to how Dex's extension works.

Artifacts
├── id, user_id, contact_id, conversation_id, created_at
├── type: "connection_note" | "outreach_draft" | "meeting_prep" |
│         "meeting_notes" | "action_plan" | "follow_up_draft"
├── content (JSON — structure varies by type, see below)
├── status: "draft" | "finalized" | "sent" | "archived"
├── version (integer — increments when user edits in conversation)
├── artifact_outcome: "no_response" | "response_received" | "meeting_booked" |
│                     "referral_received" | null (tracked for outreach types)
│   Used by the agent learning system (Section 5.9) to identify which
│   outreach approaches, hooks, and tones produce the best results.
├── user_edit_distance (integer — how many characters the user changed
│   from the AI draft before sending. Lower = better AI quality.)
└── metadata (JSON — type-specific: tone, hook_used, meeting_date, etc.)

Artifact content structures by type (6 types):
  connection_note:  { message, hook, char_count }  (LinkedIn 300-char limit)
  outreach_draft:   { message, tone, hook, channel, char_count }
  meeting_prep:     { person_summary, company_intel: { description, recent_news,
                      strategic_priorities }, discussion_themes: [{ name,
                      questions: [] }], coaching: { do_list, dont_list,
                      positioning_advice } }
  meeting_notes:    { key_takeaways, next_steps, user_raw_notes }
  action_plan:      { actions: [{ description, timing, priority }] }
  follow_up_draft:  { message, reference_to_meeting, timing_suggestion }

DiscoverySessions
├── id, user_id, conversation_id (FK — which chat session triggered this)
├── started_at, ended_at
├── target_companies (JSON array)
├── search_strategy (JSON — the plan the agent proposed, user approved)
├── profiles_viewed, profiles_scored, profiles_saved
├── status: running → paused → completed
└── rate_limit_remaining

NetworkingGoals
├── id, user_id, created_at
├── goal_type: "job_search" | "industry_exploration" | "relationship_building" | "other"
├── description (text)
├── target_companies (JSON array), target_roles (JSON array)
├── target_contacts_per_month, target_meetings_per_month
├── progress (JSON — computed: contacts_found, messages_sent, meetings_held)
└── status: "active" | "paused" | "achieved"
```

### 5.6 Data Flow — How Information Moves Through the System

This section answers three questions: where does data originate, where is it stored, and how does it surface across views.

**Flow 1: Discovery → Contacts**
```
Chrome Extension (LinkedIn DOM)
  │  Content script extracts: name, role, company, education,
  │  career history, location, profile URL from visible page elements
  ▼
Backend: AI Scoring Engine
  │  Receives profile_snapshot + user profile + scoring rubric
  │  Returns: relevance_score, tier, recommendation_reason, suggested_hook
  ▼
Database: Contacts table
  │  New row created with status="discovered", profile data, score
  │  Linked to the DiscoverySession that found them
  ▼
Web App: Contacts view (card grid)
  │  Contact appears with score badge, tier indicator, and action buttons
  │  Also mentioned in the General Chat where discovery was initiated
  ▼
User action: clicks "Work on outreach" → opens Contact Session
```

**Flow 2: Conversation → Artifacts → Contact Profile**
```
User opens Contact Session (from Contacts view or from General Chat)
  │  Agent loads: contact profile, all previous artifacts, conversation history
  ▼
Conversation: User + Agent collaborate
  │  "Draft a connection note for Marie" → Agent produces artifact
  │  Artifact saved to Artifacts table with contact_id + conversation_id
  │  User edits, agent revises → new version of same artifact
  ▼
Contact Profile Card (Contacts view)
  │  Shows all artifacts linked to this contact, grouped by type:
  │  Messages (drafts, sent), Briefings, Meeting Notes, Action Plans
  │  User can click any artifact to re-open the conversation where it was created
```

**Flow 3: Chrome Extension ↔ Web App Sync**
```
Chrome Extension captures profile data → sends to Backend API
Backend stores in Contacts table → Web App reads from same DB
Both extension and web app authenticate via same Supabase session
Extension side panel shows lightweight discovery progress
Web app shows full contact management + chat interface
```

**Flow 4: Goal Tracking (computed, not manual)**
```
NetworkingGoals table stores targets
Progress is computed from real data:
  contacts_found = COUNT(Contacts WHERE discovered_at in period)
  messages_sent = COUNT(Artifacts WHERE type='outreach_draft' AND status='sent')
  meetings_held = COUNT(Artifacts WHERE type='meeting_notes')
Goals view displays progress bars computed from these counts
```

### 5.7 Web App UI Architecture

The web app has three views, accessible from a left sidebar:

**Chat (primary view, default landing page)**
- Left panel: list of conversation sessions (like ChatGPT/Claude sidebar)
  - General sessions show by title (e.g., "PE networking strategy", "Discovery: Blackstone")
  - Contact sessions show contact name + avatar (e.g., "Marie Chen — Sequoia")
  - Sessions sorted by last activity, pinnable
- Right panel: active conversation
  - Chat messages (user + agent)
  - Inline cards for artifacts (collapsible previews of drafts, briefings, etc.)
  - Quick action buttons below input: "Find contacts", "Prepare for meeting", "Draft message"
  - When discovery is running: status bar at top ("Discovering... 8/25 profiles")

**Contacts (outcome dashboard)**
- Card grid layout, each card showing: name, role, company, score, stage, artifact count
- Filters: stage, company, score tier, date range
- Click card → contact detail page (full profile + all artifacts + session links)
- "Open session" button on each card → opens/resumes Contact Session in Chat view

**Goals (progress tracking)**
- User's networking goals with progress bars
- Stats computed from real data (contacts found, messages sent, meetings held)
- Target vs. actual for the current period
- Lightweight — this view is informational, not interactive

### 5.8 Prototype Configuration (Founder Testing)

For the initial prototype, the product is configured with the founder's actual data to demonstrate the full workflow end-to-end. This section documents the personal configuration needed for the prototype to work.

**API Keys (environment variables, never committed to code):**
```
ANTHROPIC_API_KEY=sk-...     # Claude API for AI engine
SUPABASE_URL=...             # Supabase project URL
SUPABASE_ANON_KEY=...        # Supabase public key
SUPABASE_SERVICE_KEY=...     # Supabase server-side key (backend only)
```

**Founder Profile (seeded into Users table on first run):**
```
{
  "name": "Liyang Guo",
  "education": [
    { "school": "INSEAD", "degree": "MBA", "year": "2026", "campus": "Singapore/Fontainebleau" }
  ],
  "career_history": [to be populated from LinkedIn],
  "goals": {
    "type": "job_search",
    "target_industries": ["Private Equity", "Venture Capital", "Strategy Consulting"],
    "target_companies": ["Sequoia", "KKR", "Blackstone", "Apollo", "BCG", "McKinsey", "Bain"],
    "target_roles": ["Associate", "Senior Associate", "VP"],
    "target_geographies": ["Singapore", "Hong Kong", "London", "Paris"]
  },
  "networking_style": "warm",
  "outreach_comfort": 3
}
```

**LinkedIn Configuration:**
- Extension authenticates via the founder's LinkedIn session (already logged in)
- No separate LinkedIn API keys needed — the extension reads from the DOM
- Founder should have LinkedIn Premium or Sales Navigator for broader search results (recommended but not required)

**Development Notes for Coding Agent:**
- Use Claude API (Anthropic) as the primary LLM — the founder has an existing API key
- Supabase for auth + database + realtime (the founder is familiar with the platform)
- Deploy on Vercel (Next.js) — the founder has an account
- Chrome Extension uses Manifest V3 — test on Chrome, support Edge as secondary
- All sensitive data (API keys, profile data) via environment variables, never in code
- The prototype should work with one user (the founder) — multi-user auth flows exist but don't need stress testing

### 5.9 Agent Learning System — How the Agent Improves Over Time

The agent accumulates understanding of each user through three complementary mechanisms. This is a core differentiator: unlike stateless tools (ChatGPT, generic CRMs), the agent gets meaningfully better with use.

**Layer 1: Explicit User Memory (MVP — P0)**

Every time the user edits an AI-generated draft, the agent extracts a learning signal. What did the user change? Was the tone wrong? Did they remove jargon? Did they add a personal anecdote? These signals are accumulated into a `user_memory` JSON field on the Users table, structured as follows:

```
user_memory: {
  "writing_style": {
    "tone": "warm but professional",        // extracted from edit patterns
    "avoids": ["corporate jargon", "exclamation marks"],
    "preferred_hooks": ["shared experience references", "mutual connection mentions"],
    "message_length_preference": "concise, under 100 words",
    "signature_phrases": ["would love to connect", "keen to learn more"],
    "last_updated": "2026-05-15T..."
  },
  "networking_approach": {
    "comfort_with_cold_outreach": 3,         // from onboarding, updated over time
    "preferred_channels": ["LinkedIn", "email"],
    "follow_up_cadence": "every 2-3 weeks",  // learned from actual behavior
    "last_updated": "2026-05-20T..."
  },
  "learned_patterns": {
    "successful_hooks": [                     // from artifact_outcome tracking
      { "hook_type": "shared_alma_mater", "success_rate": 0.72, "sample_size": 7 },
      { "hook_type": "mutual_connection", "success_rate": 0.60, "sample_size": 5 }
    ],
    "best_performing_tone": "warm",           // correlated with response_received outcomes
    "optimal_message_length": 85,             // avg chars of messages that got responses
    "last_updated": "2026-06-01T..."
  }
}
```

**How it updates:** After each user edit of an AI draft, a lightweight Haiku call compares the original draft to the user's edited version and extracts any new style preferences. These are merged into user_memory (append new, update existing, never delete). The user_memory is injected into the system prompt for all future message generation, so the agent's next draft is already calibrated to the user's style.

**Layer 2: Outcome Memory (MVP — P1)**

When the user marks an artifact's outcome (response_received, meeting_booked, no_response), the agent can correlate outreach approaches with results. This doesn't require ML — it's structured logging with periodic analysis:

- `artifact_outcome` field on the Artifacts table tracks what happened
- Every 20 outreach artifacts (or monthly), a Haiku call reviews all outcomes and generates an updated "what works" summary → stored in user_memory.learned_patterns
- This summary gets injected into future outreach prompts: "Based on your history, messages referencing shared INSEAD experience get 3x more responses than generic industry references."

**Layer 3: Proactive Intelligence (MVP-light — P1, full version v2)**

MVP version: When the user opens the app, the agent scans all contacts and surfaces the top 3 follow-up suggestions based on:
- Contacts with upcoming `next_action_date` from action plans
- Contacts with status "contacted" but no response after 10+ days
- Contacts with status "met" but no interaction in 30+ days

The agent generates these suggestions using contact context + user_memory, so the nudge is personalized: "Marie mentioned KKR is hiring in Q3 — now's the time to follow up."

Full v2 version: Background jobs monitor external signals (LinkedIn activity, company news) and trigger proactive notifications even when the user isn't in the app. Requires scheduled jobs infrastructure.

**What the user experiences:**
- Week 1: Agent drafts are generic but competent
- Week 4: Agent matches the user's tone and avoids things they always edit out
- Week 8: Agent suggests hooks based on what's historically worked best
- Week 12: Agent proactively surfaces follow-up opportunities with context-aware timing

---

## 6. Non-Functional Requirements

### 6.1 Performance

| Metric | Target | Notes |
|--------|--------|-------|
| Message generation latency | <5 seconds | Streaming response preferred for perceived speed |
| Briefing generation latency | <10 seconds | More complex; involves multiple profile lookups |
| Profile scoring latency | <3 seconds per profile | Batch scoring during discovery sessions |
| Discovery batch (5 companies) | <20 minutes | Primarily limited by human-speed simulation |
| Web app page load | <2 seconds | Standard SaaS performance |

### 6.2 Security & Privacy

| Requirement | Details |
|------------|---------|
| Data encryption | All data encrypted at rest (AES-256) and in transit (TLS 1.3) |
| LinkedIn data | Profile data extracted from visible DOM only — no unauthorized API calls. Data stored encrypted; user can delete at any time. |
| User authentication | Email + password with 2FA option. OAuth for Google/LinkedIn. |
| GDPR compliance | Required for EU users. Data portability, right to deletion, consent management. Must be compliant from day one. |
| No autonomous messaging | System-level enforcement: no automated message sending. All outreach requires explicit user action. |
| Rate limit enforcement | Hard-coded limits on LinkedIn browsing activity. Cannot be overridden by user. |

### 6.3 Reliability

| Metric | Target |
|--------|--------|
| Uptime | 99.5% (allow for maintenance windows during MVP) |
| Data backup | Daily automated backups |
| Error handling | Graceful degradation — if LLM API is down, show cached data and allow manual workflows |

### 6.4 AI Quality Metrics

| Metric | Target | Measurement Method |
|--------|--------|-------------------|
| Recommendation relevance | >70% of Tier 1 rated "relevant" by user | User feedback buttons |
| Message personalization rate | >90% contain specific mutual context | Automated check: message references actual profile data |
| Hallucination rate | <2% | Automated: cross-reference generated content against source profile data. Manual: sample 50 messages/week for factual accuracy |
| User edit distance | Decreasing over time | Measure how much users edit AI-drafted messages. Lower edits = better quality. |
| Response rate (outreach) | Track but no target for MVP | Long-term metric; need baseline data first |

---

## 7. User Flows

All primary interaction happens through the chat interface. The user talks to the agent; the agent takes actions, produces artifacts, and updates contact profiles. The Contacts and Goals views are outcome dashboards — they display results of conversations, not separate workflows.

### 7.1 First-Time User Flow (Chat-First Onboarding)

```
1. User signs up (email or Google OAuth)
2. Lands in their first General Chat session
3. Agent greets them conversationally:
   "Welcome! I'm your networking coach. Let's get to know each other
    so I can help you make the right connections. What's your
    current role and what are you looking to do next?"
4. Conversational onboarding (replaces traditional form):
   Agent asks questions naturally, one at a time:
   - "What's your background?" → career history
   - "Where did you study?" → education
   - "What kind of roles are you targeting?" → goals
   - "Any specific companies you're interested in?" → target list
   - "How comfortable are you with cold outreach, 1-5?" → style
   Agent builds the user profile from this conversation.
   User can also paste their LinkedIn profile URL for auto-import.
5. Once profile is built, agent suggests next step:
   "Great — I have a good picture of your background. Ready to find
    some contacts? I can search LinkedIn for people at your target
    companies who share your consulting background. You'll need to
    install the browser extension first — here's how."
6. User installs Chrome extension, returns to web app
7. Agent proposes a discovery plan in the chat:
   "I'd suggest starting with BCG and McKinsey alumni who pivoted
    to PE. I'll search 5 companies, look for people with consulting
    backgrounds who made the transition in the last 3 years. Sound good?"
8. User approves → discovery begins (extension runs on LinkedIn)
9. As contacts are found, they appear in the Contacts tab
10. Agent summarizes results in the chat:
    "Found 12 relevant contacts across 5 companies. 3 are strong
     matches — want me to walk you through them?"
```

**Onboarding Fallback:** If conversational onboarding stalls (user gives vague answers, agent misinterprets, or user just wants to get started), offer a "quick setup" option: a minimal structured form (name, target industry, 3 target companies, goal type) that captures the essentials in 60 seconds. The agent can refine the profile through conversation later. The worst outcome is a user who abandons onboarding entirely — the fallback prevents this.

**Extension Installation Handoff:** Steps 6-8 involve the user leaving the web app to install a Chrome extension. This is a high-friction transition. Mitigations:
- Show a clear, visual step-by-step guide (3 screens: click install → pin extension → return here)
- Detect extension installation automatically (extension sends a "hello" message to the web app on install)
- If user returns without extension, the agent offers alternative: "No extension? No problem — you can paste LinkedIn profile URLs directly and I'll work with those."

### 7.2 Working on a Specific Contact (Contact Session)

This is the core loop that makes the product valuable.

```
Trigger: User says "Let's work on outreach to Marie Chen" in General Chat,
         OR clicks "Open session" on Marie's contact card

1. A new Contact Session opens (like opening a new chat thread)
2. Agent loads Marie's full context:
   - Profile data (role, career history, education)
   - Relevance score and why she was recommended
   - Any previous artifacts (drafts, notes, plans)
   - Any previous conversation history about Marie
3. Agent provides an opening assessment:
   "Marie is a VP at Sequoia, INSEAD '22. She transitioned from
    McKinsey, similar to your path. She's active on LinkedIn and
    recently posted about deal sourcing in SE Asia. Here's my
    suggested approach..."
4. User and agent collaborate on outreach:
   User: "Draft a connection note"
   Agent: produces a 300-char connection note → saved as Artifact
   User: "Too formal, make it warmer"
   Agent: revises → new version of same Artifact
   User: "Perfect, I'll send this"
   Agent: marks artifact as "finalized", updates contact status to "contacted"
5. Later, user returns to this session before a meeting:
   User: "I have a call with Marie tomorrow, help me prepare"
   Agent: generates a discussion guide (Artifact) tailored to Marie's
          specific background, the user's goals, and their previous
          interaction (the connection note, any response received)
   Agent also provides coaching: "Marie values direct questions about
          her transition — don't start with small talk, lead with your
          specific question about PE deal sourcing in emerging markets."
6. After the meeting:
   User: "Great call — she offered to intro me to her colleague at KKR,
          and mentioned they're hiring in Q3"
   Agent: creates meeting_notes artifact, creates action_plan artifact:
          "1. Send thank-you within 24h referencing the KKR intro
           2. Follow up on KKR opportunity in 2 weeks
           3. Share that article on SE Asia PE she mentioned"
   Agent: drafts each follow-up message as separate artifacts
7. All artifacts are now visible on Marie's contact card in the Contacts tab.
   Anyone looking at Marie's card sees: connection note (sent), discussion
   guide, meeting notes, action plan, follow-up drafts — the complete history.
```

### 7.3 Discovery Session Flow

```
1. In General Chat, user requests discovery:
   "Find me people at Blackstone and Apollo who have consulting backgrounds"
2. Agent proposes a search strategy (displayed in chat):
   "I'll search for senior associates to VPs at both firms who came from
    MBB consulting. I'll look at up to 25 profiles across both companies.
    Estimated time: ~15 minutes. Ready?"
3. User approves
4. Agent signals Chrome extension to begin (via Supabase Realtime)
5. Extension takes control of a LinkedIn tab:
   - Executes search queries with human-like behavior
   - Extracts profile data from each result
   - Sends data to backend for scoring
   - Backend creates Contact records with status="discovered"
6. Web app shows live progress in chat:
   "Searching Blackstone... 4 profiles found so far (2 strong matches)"
   Progress also visible as a small status bar in the chat header
7. User can continue chatting or switch to other tabs while discovery runs
8. When complete, agent summarizes in chat:
   "Done! Found 14 profiles. Here's the breakdown:
    - 3 Tier 1 (strong match): [names with one-line reasons]
    - 5 Tier 2 (good match): [names]
    - 6 Tier 3 (worth considering): [names]
    Want to start working on outreach for any of them?"
9. User says "Let's start with [name]" → opens a Contact Session
```

### 7.4 Returning User — Relationship Maintenance

```
1. User opens the app, lands in General Chat
2. Agent proactively surfaces:
   "Hey — it's been 3 weeks since your call with Marie. She mentioned
    KKR is hiring in Q3, which is now. Want me to draft a follow-up?"
   Also: "You have 2 contacts you reached out to but haven't heard back
    from in 10+ days. Want me to suggest follow-up approaches?"
3. User: "Yes, let's follow up with Marie"
   → Opens Marie's Contact Session with full context loaded
4. Agent drafts follow-up referencing the actual meeting:
   "I can reference the KKR hiring timeline she mentioned and your
    shared interest in SE Asia deal flow. Here's a draft..."
```

---

## 8. Success Metrics

### 8.1 North Star Metric
**"Meaningful Connections Made"** — defined as: a contact where the user has (a) sent a personalized outreach AND (b) received a response OR (c) had a meeting. This measures actual networking outcomes, not vanity metrics.

### 8.2 Primary Metrics (MVP)

| Metric | Target (3 months post-launch) | Measurement |
|--------|-------------------------------|-------------|
| Weekly Active Users (WAU) | >60% of registered users | App/extension opens per week |
| Discovery sessions per user/week | >1.5 | Extension usage tracking |
| Messages drafted per user/month | >8 | In-app tracking |
| Meaningful connections per user/month | >3 | Composite: outreach sent + response/meeting |
| Net Promoter Score (NPS) | >40 | Monthly survey to beta users |

### 8.3 Secondary Metrics

| Metric | Purpose |
|--------|---------|
| Onboarding completion rate | Measures friction in setup flow |
| Time from signup to first discovery batch | Measures activation speed |
| AI message edit rate | Measures AI quality — lower is better |
| Tier 1 recommendation acceptance rate | Measures scoring accuracy |
| User-reported response rate on outreach | Measures real-world effectiveness |
| Monthly churn rate | Target: <10% |
| Referral rate | Word-of-mouth coefficient |

---

## 9. Go-to-Market Strategy (MVP Launch)

### 9.1 Launch Plan

| Phase | Timeline | Activities |
|-------|----------|-----------|
| **Alpha** | April-May 2026 | Internal testing with 5-10 INSEAD classmates. Focus on bug-fixing and UX refinement. |
| **Private Beta** | June 2026 | Expand to 50-100 INSEAD MBA students. Recruit via personal network + class WhatsApp groups. Collect intensive feedback via weekly surveys and 1:1 interviews. |
| **Expanded Beta** | July-August 2026 | Open to 200+ users across INSEAD + HEC + IESE. Introduce referral program. |
| **Public Launch** | September 2026 | Coincides with recruiting season kickoff. IVC submission. Expand to 5 target schools. |

### 9.2 Pricing (MVP)

| Tier | Price | Features | Target |
|------|-------|----------|--------|
| **Free** | €0 | Profile builder, 1 discovery batch/week (max 2 companies), 3 message drafts/month, 2 briefings/month | Trial / lead generation |
| **Student** | €9.99/month | Unlimited discovery, unlimited messages, unlimited briefings, contact database, priority support | MBA & MiM students |
| **Professional** | €19.99/month | Everything in Student + advanced analytics, multi-platform outreach, priority AI processing | Career professionals (v2) |

---

## 10. Risks & Mitigations

| Risk | Severity | Likelihood | Mitigation |
|------|----------|-----------|------------|
| LinkedIn detects and blocks browser extension | High | Medium | Conservative rate limits, human-behavior simulation, modular architecture to swap data source (third-party APIs) if needed |
| Low user adoption / engagement | High | Medium | Tight feedback loop with INSEAD beta users. Pivot features based on actual usage patterns. |
| AI hallucinations damage user credibility | High | Low | Strict human-in-the-loop. Cross-reference all generated content against source data. Quality monitoring dashboard. |
| High churn post-recruiting season | High | High | Build relationship maintenance features (v2) before first cohort's recruiting season ends. Introduce "career management mode." |
| Competitor launches similar feature | Medium | Medium | Speed to market + embedded community (INSEAD network) as initial moat. Accumulated user context as long-term moat. |
| LLM API costs exceed budget | Medium | Medium | Model tiering (Section 5.4.1): Haiku for scoring + simple tasks, Sonnet for complex reasoning. Reduces costs ~40%. Cache company intel searches for 7 days. Monitor per-user costs with PostHog. Budget: €2.50/user/month Year 1, declining with optimization. |
| GDPR compliance gaps | High | Low | Engage legal counsel before public launch. Build data deletion flows from day one. |
| Solo founder bandwidth | High | High | Leverage AI development tools (Claude Code). Recruit technical co-founder by beta phase. Prioritize ruthlessly — ship P0 only. |

---

## 11. Development Roadmap

### Phase 1: MVP Core (Weeks 1-4)
- [ ] Project setup (Next.js, Supabase, Chrome Extension scaffold)
- [ ] User auth + onboarding flow
- [ ] Browser extension: LinkedIn content script + DOM reader
- [ ] Browser extension: Human-behavior simulation engine
- [ ] AI scoring engine (prompt-based, structured output)
- [ ] Discovery session orchestrator (batch execution)
- [ ] Results dashboard (side panel UI)

### Phase 2: Outreach & Prep (Weeks 5-6)
- [ ] Message drafting engine (connection requests, LinkedIn messages, email)
- [ ] Message UI (tone selection, variants, copy-to-clipboard)
- [ ] Meeting preparation briefing generator
- [ ] Briefing UI (summary card, questions, coaching advice)

### Phase 3: Polish & Beta (Weeks 7-8)
- [ ] Contact database + pipeline view
- [ ] Rate limiting and safety guardrails
- [ ] Error handling and edge cases
- [ ] Landing page + waitlist
- [ ] Basic analytics (PostHog)
- [ ] Alpha testing with 5-10 users, bug fixes

### Phase 4: Beta Launch (Weeks 9-10)
- [ ] Private beta with 50-100 INSEAD users
- [ ] Feedback collection system (in-app surveys, NPS)
- [ ] Performance optimization
- [ ] Iterate based on feedback

---

## 12. Open Questions (To Resolve Before Development)

| # | Question | Status | Owner | Notes |
|---|----------|--------|-------|-------|
| 1 | Product name — final decision | Open | Liyang | Shortlist: Orbit, Kova, Nexus, Warmly, Weave, Relayo |
| 2 | LinkedIn data import via CSV vs. extension-only | Open | Liyang + Tech | CSV is safer but less seamless; extension is better UX but adds complexity |
| 3 | Claude API vs. OpenAI API (or both) | Open | Tech | Claude preferred for reasoning quality; OpenAI as fallback. Cost comparison needed. |
| 4 | Technical co-founder recruitment timeline | Open | Liyang | Ideally before beta launch (June 2026) |
| 5 | Free tier limits — too generous or too restrictive? | Open | Liyang | Need to balance acquisition vs. conversion. Test with beta users. |
| 6 | Mobile experience priority | Open | All | Web-first or responsive design sufficient? Native mobile app is v2. |
| 7 | Data storage: fully cloud vs. local-first with sync | Open | Tech | Privacy implications for GDPR. Local-first is safer but harder to build. |

---

## 13. Appendices

### Appendix A: Competitive Landscape Summary

See: `Personal CRM Deep Research - Gemini.md` in project folder.

Key competitors: Dex ($12/mo, passive CRM), Mesh/Clay.earth (auto-sync Rolodex), Granola ($14-18/mo, meeting capture), Careerflow/Teal (job search CRM), Monica CRM (open-source personal).

**Our differentiator:** Only product covering the full networking lifecycle (Discover → Strategize → Prepare → Maintain) with AI intelligence at every step. Competitors address at most 1-2 steps.

### Appendix B: Financial Model Summary

See: `Financial_Model_AI_Networking_Coach.xlsx` in project folder.

| Metric | Year 1 | Year 3 | Year 5 |
|--------|--------|--------|--------|
| Paying Users | 550 | 4,600 | 20,000 |
| Annual Revenue | €44K | €496K | €2.8M |
| LTV/CAC Ratio | 3.5x | 10.2x | 22.9x |
| EBITDA | €17K | €200K | €1.9M |

Note: Year 1 updated post pressure-test with boosted projections (550 users vs. 440), adjusted LLM costs (€2.50/user/month with model tiering), and €12K engineering tools budget. See Excel model for full detail.

### Appendix C: User Research Inputs

Based on founder's experience as MBA26D at INSEAD:
- Direct observation of classmates' networking workflows
- Pain points identified through informal conversations and MBA networking workshops
- Founder's own workflow using ad-hoc AI agents (OpenClaw, Claude Code) as proof of concept

Formal user research (surveys, structured interviews) to be conducted during alpha/beta phase.

### Appendix D: Glossary

| Term | Definition |
|------|-----------|
| Discovery batch | A single execution run of the AI contact finder, typically covering 3-5 target companies |
| Scoring rubric | The weighted criteria the AI uses to evaluate contact relevance |
| Human-in-the-loop | Design principle: the AI never takes autonomous action. All outreach requires user approval. |
| Browser companion | The Chrome extension that operates as an overlay on the user's LinkedIn browsing |
| Coffee chat | Informal informational interview, standard networking practice among MBA students |
| Hook | The specific mutual context point used to personalize an outreach message |

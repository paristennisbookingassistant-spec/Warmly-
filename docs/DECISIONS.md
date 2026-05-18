# Warmly — Decisions Register

**Purpose:** One screen per decision. You read it, pick an option, write your call. I execute.

**How to use:** Fill in the `Your call:` line below each decision. Anything you want to add as nuance goes under `Notes:`. When done, ping me and I'll start executing in order.

Companion: `STRATEGY.md` has the full thinking behind each option if you want depth on any one.

---

## Decision 01 — Onboarding completeness

**The gap:** Today's onboarding asks for coach name, about-you free text, goal, style, weak-spots. It builds `profile_md` from those. Missing: CV upload (the `uploadOk` flag exists but no handler), voice samples (past messages), structured target fields (`target_industries[]`, `target_companies[]`, etc. exist in the DB schema but nothing populates them), career-assessment ingestion.

**Options for sequencing:**
- **A)** CV upload → structured targets → voice samples → career-assessment
- **B)** Structured targets first (biggest discovery-filter impact)
- **C)** Voice samples first (biggest outreach-quality impact)
- **D)** Don't add to onboarding — put it all in a post-onboarding Settings page

**My recommendation:** **A**. CV unlocks structured targets (we can suggest industries/companies from it), which unlocks better discovery, which produces past messages that feed voice. Compounding chain.

**Your call:** __We need to ask if users want to upload his / her CV, past voice samples, and target industry / company, and any other materials that can help the agent better know about him / her (e.g., career assessment, or any othe material). Does this make sense? ____
**Notes:** _______

---

## Decision 02 — Chat as primary UX

**The question:** Is conversational chat really the best primary surface, or are dashboards better for tactical work?

**Options:**
- **A)** Stay chat-first — everything happens through conversation (current direction)
- **B)** Dashboard-first with chat as augment — three primary tabs (Contacts/Discovery/Meetings) + docked chat panel for strategic moments
- **C)** Hybrid command-driven — single text input top of every page (Cmd+K like Linear/Raycast), routes to the right surface. Chat history accessible but not the primary interface

**My recommendation:** **B with C sprinkled in.** Pure chat is great for "how should I approach this contact?" but bad for "I have 25 profiles to triage." Dashboards are better for scan-and-review work. Per-contact chats (already built) stay. General chat shrinks to strategy-only.

**Your call:** ____I haven't decided yet, I do see the value of a main chat interface, but I also like the way you put it, especially B? Let's park this. I need to think more about it___
**Notes:** _______

---

## Decision 03 — Long-conversation memory

**The question:** Chats get long. What do we build to keep them useful at 100+ messages?

**Options:**
- **A)** Auto-compact silently after N messages (LLM summarizes earlier context)
- **B)** Auto-compact with visible chip ("📋 Earlier context summarized" — clickable to expand)
- **C)** No auto-compact — just better search across all conversations
- **D)** Both B + C + pinned facts (user can pin a message that never gets summarized away)

**My recommendation:** **D**. Building all three is ~6h total. Auto-compact is the immediate need, search becomes valuable as conversations accumulate, pinned facts handle the edge case (e.g., "remember I'm targeting €120K").

**Your call:** ____I think there is need for compact anyway, so i'd probably leaning towards B? How would C work? If no autocompact, at one point the conversation will just become so long and not effective I guess___
**Notes:** _______

---

## Decision 04 — Chat → extension trigger artifact

**The vision:** User in chat says "find McKinsey alumni in Paris." Coach detects intent → surfaces a confirmation card with company / school / location / function / max-profiles → on Confirm, extension fires. Progress streams back into chat.

**The pattern:** A new `discovery_plan` artifact type. Extends naturally to `outreach_plan` (confirm before sending), `prep_plan` (gather web intel before drafting prep).

**Options:**
- **A)** Build it — closes the loop end-to-end
- **B)** Skip — keep the extension popup as the primary discovery entry point
- **C)** Build a minimal version first (manual filters only, no LLM intent detection)

**My recommendation:** **A**. This is the moment that proves the AI-coach thesis — the agent makes a plan, the user approves, the agent executes. High leverage.

**Your call:** ____Yeah go for A, but how would the underlying system work, e.g., should there be prompt of having user open their linkedin page? or log in their linkedin account? if it's not open, what to do? We need to carefully think about this___
**Notes:** _______

---

## Decision 05 — Tinder-style profile review

**The vision:** After discovery scrapes 25 profiles, instead of dumping them all into Contacts, show them as a swipe deck. Right = save, left = skip, up = save + open outreach drafter. Each swipe trains the ranker.

**Options:**
- **A)** Ship as proposed (swipe + keyboard shortcuts ←/→/↑)
- **B)** Ship but call it "Review queue" — less game-y framing
- **C)** Skip — let users review in the regular contacts list with a "new from this session" filter
- **D)** Defer — interesting but not P0

**My recommendation:** **A or B**. Brand-defining moment, captures preference data passively, ~4h work. The pattern (one card at a time, fast decision) is genuinely better for triaging many candidates than a long list.

**Your call:** ___Yeah i'd go for A! ____
**Notes:** _______

---

## Decision 06 — Goal-driven weekly nudges

**The vision:** User sets "3 reachouts per week" in onboarding. Monday: "You have 12 unreached contacts. Top 3 for this week, drafts ready." Mid-week: "1 of 3 done." Friday: "Hit goal. Here's who responded."

**Options:**
- **A)** In-app digest only (zero infra, zero trust ask)
- **B)** Email digest only
- **C)** Both in-app and email
- **D)** Skip — manual review is fine

**My recommendation:** **A first, C eventually.** In-app is free, builds the habit. Email digest is good when users stop opening the app daily. Skip is wrong — proactive nudges are core to "AI coach" positioning.

**Your call:** __I'd go for In-APP digest._____
**Notes:** _______

---

## Decision 07 — Email / calendar integration

**The question:** Should Warmly be able to send messages directly (not just LinkedIn DMs)?

**Phased options:**
- **A)** Phase a only: `mailto:` links everywhere drafts appear (opens default mail client with prefilled body). 1h, zero trust ask.
- **B)** Phase a + b: also build Gmail OAuth direct-send. 2 weeks effort, larger trust ask, requires Google verification.
- **C)** Full: a + b + c (Outlook via Microsoft Graph). 4 weeks total.
- **D)** Skip — LinkedIn DM is the only channel we support

**My recommendation:** **A now, B post-100-users.** Mailto is a freebie that closes a real workflow gap. OAuth is meaningful effort + trust budget — wait until we have proven users who want it.

**Your call:** ___What's mailto? I don't think we need to have the agent to send messages directly? But one question might be, is there a way to connect to gmail MCP for example, so we can send email or invitation google meet directly form our interface. But how costly is that? ____
**Notes:** _______

---

## Decision 08 — Relationship cadence model

**The proposal:** Stage-based default cadence, with smart overrides on LinkedIn signals (promotion, role change).

| Stage | Default cadence | Trigger for next touch |
|---|---|---|
| Cold (outreach sent, no reply) | Day 7, then Day 21 | Polite nudge |
| Warm (one back-and-forth) | Every 6 weeks | Light context update |
| Engaged (meeting booked or 3+ exchanges) | Every 2 months | Meaningful share |
| Ongoing (long-term) | Quarterly | Substantive question |
| Dormant (>6mo) | Re-engagement template | "It's been a while…" |

**Options:**
- **A)** Approve the model as-is
- **B)** Approve but adjust intervals (specify in Notes)
- **C)** Different stages entirely (specify in Notes)
- **D)** Defer — too early to lock cadence

**My recommendation:** **A** with the caveat that the user can override per-contact. The defaults exist so the user doesn't have to think; the override is the escape hatch.

**Your call:** ______Can we do some additional research on this? What's the best way of maintaining / building a network. I heard recently from a speaker, network is a 'concious effort' to make, so our goal is to steer this conciousness out of the user, and help them do it! _
**Notes:** _______

---

## Decision 09 — Meeting memory (currently parked)

**Status:** Schema + view exist. No transcription, no AI summary. Granola exists as a separate product.

**Options:**
- **A)** Keep parked — revisit Q3
- **B)** Build Granola integration (import their transcripts, never rebuild recording) — ~3h
- **C)** Build our own transcription + AI summary — ~3 weeks
- **D)** Skip entirely — let users paste meeting notes manually into the app

**My recommendation:** **A or B.** Building our own is wasteful when Granola exists and 80% of MBA folks already use it. If we touch this, integrate.

**Your call:** __Yeah park this for the moment_____
**Notes:** _______

---

## Decision 10 — Job opportunities aggregator

**The vision:** Same extension infra scrapes CareerGlobe, MBA-Exchange, LinkedIn Jobs → AI-scores against `profile_md` + `goals.target_*` → pushes 3 best matches/week. Ties to network: "you have an INSEAD alum at this company — want me to draft an intro request?"

**Options:**
- **A)** Build now (compete head-on with career platforms)
- **B)** Research-only this quarter, build Q3 after networking proves out (my pick)
- **C)** Build a minimal version: just LinkedIn Jobs aggregation (skip CareerGlobe/MBA-Exchange compliance work)
- **D)** Skip — keep Warmly focused on networking, not jobs

**My recommendation:** **B**. The networking product isn't proven yet. Splitting attention now risks both. But the user is at INSEAD literally surrounded by this problem — there's a real wedge. Capture the vision, build later.

**Your call:** ___Park this for the moment____
**Notes:** _______

---

## Decision 11 — Three-agent development loop

**The proposal:** Adopt a disciplined orchestrator → developer → tester loop for every feature going forward. (Detailed in `docs/AGENT_LOOP.md`.)

**Options:**
- **A)** Approve and use it for the next feature we build (CV upload would be a good first run)
- **B)** Approve but trial on a smaller feature first to make sure the workflow doesn't add too much overhead
- **C)** Modify the roles (specify in Notes)
- **D)** Skip — current "I do everything and you verify" workflow is fine

**My recommendation:** **A**. The loop costs ~15min more per feature in orchestration overhead but catches issues that would otherwise eat 1-2h of back-and-forth ("button appeared but click does nothing"). Pays for itself within 2 features.

**Your call:** ___A____
**Notes:** _______

---

## Quick summary — what I'll do once you respond

Once you fill in your calls:

1. I'll process them in priority order (onboarding cluster first, then chat→ext trigger, then nurture)
2. For each, I'll use the three-agent loop (if you approved Decision 11): brief myself with a spec, implement, run `/qa-only` against the live URL, fix issues, re-test, declare done only when tester passes
3. After every 2-3 features, I'll update `STATUS.html` so the dashboard stays current
4. Anything I'm uncertain about, I'll bring back as a new decision in this file rather than guessing

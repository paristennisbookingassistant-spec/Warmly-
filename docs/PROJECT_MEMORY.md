# Project Memory — AI Networking Coach
## Long-Lived Context File

**Purpose:** This file preserves the accumulated context, decisions, debates, and learnings from all working sessions on this project. Read this file at the start of every new session to restore context. Update it at the end of every session with new learnings.

**Last updated:** April 1, 2026 (Session 3)

---

## 1. Founder Context

**Who:** Liyang Guo, MBA26D at INSEAD (Singapore/Fontainebleau campuses)
**Background:** Strategy consulting. No technical/engineering background, but an active and proficient user of AI coding tools (Claude Code, OpenClaw, Gemini, Copilot).
**Email:** b00611490@essec.edu
**Role in this project:** Solo founder (seeking technical co-founder). Uses AI agents as development partners.
**Working style:** Thinks out loud, challenges assumptions, pushes back productively. Values honest debate over agreement. Prefers to iterate on strategy/architecture before coding — "measure twice, cut once."

---

## 2. Product Vision & Core Narrative

### The One-Liner
"Your AI networking coach that finds the right people, helps you reach out, prepares you for conversations, and keeps your relationships alive."

### The Core Narrative — "Democratizing Networking"
This was a breakthrough moment in our conversations (Session 1). Liyang articulated that the product isn't just a CRM or a LinkedIn tool — it's about making networking accessible to everyone, not just the naturally gifted. Some people intuitively know how to network; everyone else faces an invisible barrier. This product is the great equalizer.

**Key insight from Liyang:** "It's not about turning people into calculating optimizers of relationships — it's about giving everyone access to the social intelligence that the best networkers have intuitively."

### The 4-Step Framework
The product covers the full networking lifecycle:
1. **Discover** — Find the right contacts (Chrome extension on LinkedIn)
2. **Strategize** — Personalized outreach messages
3. **Prepare** — Meeting briefings and discussion guides
4. **Maintain** — Relationship progression and follow-ups

This framework is the core differentiator vs. all competitors. No existing product covers all 4 steps with AI intelligence.

---

## 3. Key Design Decisions & Why

### 3.1 Chat-First Interface (not dashboard-first)
**Decision:** The primary interaction is a conversation with an AI agent, not a traditional dashboard.
**Why:** Liyang's vision is that the agent is a "personal networking coach." You talk to it, it gives advice, it takes actions. The chat is where strategy happens. Contacts and Goals are outcome views — they display results of conversations, not separate workflows.
**How we got here:** Initially the wireframe had 5 tabs (Coach, Contacts, Discovery, Meeting Prep, Goals). Liyang pushed back that "Coach" is just the main chat, Meeting Prep should be generated in conversation not a static tab, and Discovery is just a progress tracker. We simplified to 3 views: Chat, Contacts, Goals.

### 3.2 Session-Per-Contact Architecture
**Decision:** When working on a specific person, the user opens a dedicated "Contact Session" — a separate chat thread focused entirely on that person.
**Why:** Liyang proposed this: "I wonder if the action of 'draft message' in the main chat should trigger creation of a complete new session dedicated to this contact?" This mirrors how people actually think — you have a general networking strategy, and then individual threads of effort for each person.
**How it works:** General Chat for strategy + discovery. Contact Sessions for working on a specific person. Everything produced in a contact session (drafts, briefings, notes) becomes an "Artifact" linked to that person's profile card. The contact card is the permanent record.

### 3.3 Browser Companion (not API, not server-side scraping)
**Decision:** Chrome Extension (Manifest V3) that simulates human browsing behavior on LinkedIn.
**Why:** We explored three architectures:
- Architecture A (Third-party APIs like Proxycurl) — Proxycurl was sued and shut down July 2026. Apollo.io and Seamless.ai banned March 2025. Too risky.
- Architecture B (Server-side with Sales Navigator accounts) — Liyang proposed buying Sales Navigator accounts for server use. Researched and determined this won't work: SNAP API is closed to new partners, doesn't provide raw data, and license prohibits third-party distribution.
- Architecture C (Browser companion) — The extension runs in the user's own browser, using their own LinkedIn session. Simulates human behavior (randomized delays, natural scrolling). This is the hiQ Labs approach — reading publicly visible data in a user's own session.
**Constraints:** Max 25 profile views per session, max 2 sessions/day, 15-45s randomized delays, read-only (never sends messages automatically).
**Long-term:** Modular architecture allows swapping to third-party data APIs (People Data Labs, Bright Data) at scale if/when they become viable.

### 3.4 Prompt-Based Scoring (not fine-tuned)
**Decision:** Use Claude API with structured prompts and a weighted scoring rubric for contact relevance scoring.
**Why:** Fine-tuning requires proprietary training data we don't have yet. The MVP uses a prompt-based approach with explicit scoring criteria (career path similarity 25%, shared background 20%, industry match 20%, seniority 15%, accessibility 10%, recency 10%).
**Future:** Fine-tuning becomes valuable at ~5,000+ users when we have enough proprietary outcome data (which contacts actually led to meetings, referrals, jobs). The moat is the data flywheel, not the model.

### 3.5 Human-in-the-Loop Always
**Decision:** The agent never takes autonomous action. All outreach requires explicit user approval. Discovery is read-only.
**Why:** From Liyang's original briefing document. This is both a trust principle and a LinkedIn risk mitigation.

---

## 4. Decisions We Debated and Resolved

### 4.1 "Why Now" Section — What Got Rejected
**Original draft had three points:**
1. AI quality → message generation
2. LinkedIn crackdown creates market opportunity
3. MBA boom = growing addressable market

**Liyang's feedback (and corrections):**
- Point 1: "Not sure it's just about message quality." The real leap is AI's ability to do *coaching and strategy personalization* — reasoning through your specific background, goals, and a contact's experience to give tailored strategic advice. Not just text generation.
- Point 2: "LinkedIn crackdown should be a risk, not a why-now." If LinkedIn is cracking down on data access, that makes our job harder, not easier. Moved to Risks section.
- Point 3: "MBA boom isn't really a trend, it's just how MBA works." Every year there are new MBA students who need to network. That's not a timing argument.

**What we replaced them with:**
1. AI as a personalized coach (contextual reasoning, multi-variable strategic advice)
2. The agent paradigm shift (browser-based AI agents are genuinely new infrastructure)
3. Generational acceptance of AI assistance (no stigma barrier)

### 4.2 MVP Scope — Full Loop Required
**Initial recommendation:** Focus MVP on Steps 1-3 (Discover, Strategize, Prepare), defer Step 4 (Maintain).
**Liyang's pushback:** "As a prototype, I think it's equally important to show how we imagine the relationship maintenance feature." The prototype needs to demonstrate the full vision — a lightweight Step 4 that shows the complete loop from first contact to ongoing relationship.
**Resolution:** MVP includes a lightweight Step 4: post-meeting action plans, follow-up message drafting, simple reminder system, relationship stage tracking. Full proactive nudge system (signal-based triggers) deferred to v2.

### 4.3 Discovery — Agent Must Be Proactive
**Initial framing:** Browser extension as an overlay while the user manually browses LinkedIn.
**Liyang's pushback:** "The agent must find profiles and push them to the user, not just help while user manually browses." The whole point is that the agent does the tedious searching so the user can focus on the human connection.
**Resolution:** Agent plans and executes search strategies. User approves the plan, then the extension runs autonomously (with rate limits). User reviews results after.

### 4.4 Professional Tier Differentiation
**Status:** Partially resolved. Student tier (€9.99) is clear. Professional tier (€19.99) needs more work.
**Research so far:** Dex differentiates with LinkedIn sync (9K connections), bulk email, API/Zapier, priority support. Granola differentiates with unlimited history, integrations (Slack/Notion/HubSpot), advanced AI models.
**Current thinking:** Professional tier adds: unlimited contacts (vs. 50 student), unlimited discovery sessions (vs. 2/day), advanced relationship analytics, CRM integrations (Salesforce/HubSpot export), priority AI processing. But this needs more discussion — Liyang explicitly said "I'm struggling to see how we distinguish the professional tier."

---

## 5. Competitive Intelligence

### Key Competitors Studied
- **Dex** ($12-20/mo): Passive CRM with keep-in-touch reminders. Premium vs Professional tiers differentiated by LinkedIn sync (9K connections), bulk email, API/Zapier. Strength: simplicity. Weakness: tells you "talk to John" but not why, what to say, or how to prepare. No discovery.
- **Mesh/Clay.earth**: Auto-sync contacts from email/calendar/social. Drowns users in contacts without strategic guidance.
- **Granola** ($1.5B unicorn, $14-35/mo): Meeting capture and transcription. Different problem space but adjacent — we should integrate with it rather than rebuild recording/transcription.
- **Careerflow/Teal**: Job application tracking. Transactional — used during job hunt, abandoned after.
- **Monica CRM**: Open-source personal CRM. Niche.

### Key Market Events
- **March 2025:** Apollo.io and Seamless.ai banned from LinkedIn
- **July 2026:** Proxycurl sued and shut down
- **hiQ Labs v. LinkedIn:** Established that scraping public data isn't a CFAA violation but IS a terms of service violation. Our browser companion approach (user's own session, visible data only) is the safest architecture.
- **LinkedIn SNAP API:** Closed to new partners. Cannot be used as a data source.

### Our Differentiator (one sentence)
Only product covering the full networking lifecycle (Discover → Strategize → Prepare → Maintain) with AI intelligence at every step. Competitors address at most 1-2 steps.

---

## 6. Financial Model Summary

Built in `Financial_Model_AI_Networking_Coach.xlsx` with 4 tabs: Market Sizing, Unit Economics, P&L Projection, Key Assumptions. All formulas (not hardcoded values).

**Key numbers (post pressure-test, v1.1):**
- SAM: ~24,150 students across top EU business schools (MBA + MiM)
- Pricing: €9.99/month (student), €19.99/month (professional, v2)
- Year 1: 550 paying users, €44K revenue, 4.5x LTV/CAC, €9K EBITDA
- Year 5: 20,000 users, €2.8M revenue, 23.8x LTV/CAC, €1.9M EBITDA
- LLM costs: €2.50/user/month Year 1 (model tiering), declining to €0.80 by Year 5
- Engineering: €12K Year 1 (AI tools + APIs), scaling to €300K Year 5

**Iteration notes:** Initial Year 1 was €10K (too conservative). Updated to €35K (Session 1) then €44K (Session 2) with 10% conversion rate, 550 users, and honest cost assumptions (€2.50 LLM, €12K engineering tools). Year 2 EBITDA slightly negative (-€1K) reflecting growth investment — Liyang comfortable with this.

---

## 7. Technical Decisions for Prototype

- **Frontend:** Next.js + React + TypeScript + Tailwind CSS
- **Backend/DB:** Supabase (auth + PostgreSQL + Realtime + storage)
- **AI Engine:** Claude API (Anthropic) — Liyang has an existing API key
- **Browser Extension:** Chrome Manifest V3
- **Hosting:** Vercel
- **Analytics:** PostHog
- **Development tool:** Claude Code (Liyang's primary development partner)

The prototype is built for one user (Liyang) with his actual LinkedIn account and API keys. Multi-user auth exists but doesn't need stress testing.

---

## 8. Files in This Project

| File | Description | Status |
|------|-------------|--------|
| `BRIEFING.md` | Original founder's product brief (read-only reference) | Complete |
| `Personal CRM Deep research - Gemini.md` | Competitive analysis from Gemini (read-only reference) | Complete |
| `Startup bootcamp material/` | IVC 4-pager examples (Speak-Easy, Hiya, INSEACT) | Reference |
| `Financial_Model_AI_Networking_Coach.xlsx` | Financial projections, 4 tabs | Complete, may iterate |
| `PRD_AI_Networking_Coach_v1.md` | Full PRD, v1.1 | Updated March 31 — post pressure-test revision |
| `UI_Wireframe_Prototype.html` | Interactive wireframe (5-tab version) | Outdated — needs update to reflect 3-view architecture |
| `PRD_Visual_Guide.html` | Interactive visual guide: user journey, UI mockups, data model diagram, data flows, artifact types | Current — Liyang reviewed and approved |
| `PRD_Pressure_Test_Prompt.md` | Detailed prompt for sending PRD + financials to other LLMs for review (8 dimensions) | Ready to use |
| `Pressure_Test_Synthesis.html` | Interactive consolidation of Gemini/Copilot/ChatGPT reviews with verdicts | Complete |
| `# PRD & Financial Model Pressure-Test Summary.md` | Gemini review (uploaded by Liyang) | Reference |
| `PRD pressure test - Copilot.md` | Copilot review (uploaded by Liyang) | Reference |
| `PROJECT_MEMORY.md` | This file | Living document |
| `claude-code-setup/` | Complete Claude Code agent setup package | Ready to use |
| `claude-code-setup/CLAUDE.md` | Master instructions for all coding agents | Ready |
| `claude-code-setup/.claude/agents/` | 5 agent definitions: architect, backend, frontend, extension, reviewer | Ready |
| `claude-code-setup/.claude/skills/` | Project-specific skills: project-context, conventions | Ready |
| `claude-code-setup/SETUP_GUIDE.md` | Step-by-step guide for launching the build | Ready |
| `.env.local` | API keys (Supabase + Anthropic) — NOT committed to git | Active |
| `.claude/agents/` | 5 agent definitions copied into project | Active |
| `.claude/skills/` | 2 project skills copied into project | Active |
| `CLAUDE.md` (project root) | Master instructions for all coding agents | Active |

---

## 9. Open Questions & Next Steps

### Unresolved Questions
1. **Product name** — Shortlist: Orbit, Kova, Nexus, Warmly, Weave, Relayo
2. **Professional tier differentiation** — What specifically justifies €19.99 vs €9.99?
3. **Meeting link generation + recording** — Defer recording to v2 or integrate with Granola.
4. **Mobile experience** — Web-first with responsive design, or native app in v2?
5. **Agent learning UX** — How does the user see/control what the agent has learned? Should there be a "my preferences" view, or is it invisible? What if the agent learns something wrong?
6. **Perplexity API vs. SerpAPI** — Need to evaluate cost/quality for company intelligence search. Budget ~$0.003/search.

### Immediate Next Steps
1. ~~Send pressure-test prompt + PRD to Gemini, Copilot, and Perplexity~~ ✅ Done (Session 2)
2. ~~Synthesize feedback from LLM reviews~~ ✅ Done (Session 2 — Pressure_Test_Synthesis.html)
3. ~~Apply pressure-test findings to PRD~~ ✅ Done (Session 2 — PRD v1.1)
4. ~~Prepare Claude Code agent setup~~ ✅ Done (Session 2 — claude-code-setup/)
5. **Execute the build** — Follow `claude-code-setup/SETUP_GUIDE.md`:
   - ~~Phase 0: Environment setup~~ ✅ Done (Session 3)
   - ~~Phase 1: Run architect agent~~ ✅ Done (Session 3 — 65 files, 0 tsc errors after encoding fix)
   - ~~Phase 2: Run backend agent~~ ✅ Done (Session 3 — API routes, AI engine, Supabase helpers, tests)
   - ~~Phase 2b: Run extension agent~~ ✅ Done (Session 3 — Chrome extension with content scripts, service worker, popup)
   - ~~Phase 3: Run frontend agent~~ ✅ Done (Session 3 — Chat, Contacts, Goals views + all components)
   - **Phase 4: Review + QA + security audit + ship** ← YOU ARE HERE
6. **Update the UI wireframe** (low priority — agents build from PRD/CLAUDE.md, not the old wireframe)

### Future Workstreams
- **IVC 4-pager submission** (~September 2026) — Market sizing, financials, competitive differentiation, team, narrative
- **Technical co-founder recruitment** — Ideally before beta launch (June 2026)
- **User research** — Formal surveys and interviews during alpha/beta phase

---

## 10. Session Log

### Session 1 — March 30-31, 2026
**Topics covered:**
- Initial product briefing and context download
- Deep dive into LinkedIn data access feasibility (Apollo ban, Proxycurl lawsuit, hiQ Labs case, SNAP API closure)
- Explored and rejected three architectures before settling on browser companion
- Explored and rejected Sales Navigator account-sharing workaround
- Discussed fine-tuning vs. prompt-based scoring (prompt for MVP, fine-tuning at scale)
- Built financial model (Market Sizing, Unit Economics, P&L, Key Assumptions)
- Iterated on financial projections (initial too conservative, updated with MiM data)
- Created full PRD v1 (13 sections)
- Iterated on PRD: "Why Now" corrections, MVP scope expansion, core narrative addition
- Deep product design discussion: chat-first interface, session-per-contact architecture, simplified navigation
- Rewrote data model with Conversations, Artifacts, and data flow documentation
- Added Chrome extension data pipeline specification
- Added prototype configuration section
- Created this memory file
- Built interactive visual guide (PRD_Visual_Guide.html) with 5 tabs: User Journey, UI Architecture, Data Model, Data Flows, Artifacts — because Liyang found the text-based PRD hard to review as a non-technical builder
- Liyang reviewed visual guide and confirmed: user journey works, UI architecture works, data model makes sense, data flows are clear
- Merged artifact types from 8 to 6: combined discussion_guide + meeting_briefing + coaching_advice into a single "meeting_prep" artifact
- Added company intelligence to meeting prep (PREP-02): agent pulls recent news, strategic priorities, and company context — not just person's career. Liyang's insight: "when I'm preparing a discussion, it's not only about the person's own experience, but also about their company"
- PRD now ready for pressure-testing with other LLMs
- Created detailed pressure-test prompt (PRD_Pressure_Test_Prompt.md) with 8 review dimensions for sending to Gemini/Copilot/Perplexity
- Added financial model data (Dimension 8) to the pressure-test prompt — all key numbers extracted from Excel so LLMs can challenge assumptions directly
- Liyang refined the product positioning: not "particularly MBA/MiM students" but "anyone who wants to build a network to achieve a specific goal but lacks the right skills or tools." MBA/MiM is the beachhead market, not the product definition.

**Key learnings:**
- Liyang thinks in terms of user experience and narrative, not technical architecture. Frame everything through "what does the user see/feel?"
- When Liyang says "I'm not sure about X," it means X needs to be rethought, not just explained better
- The "democratizing networking" narrative is the emotional core of the product — keep coming back to it
- Liyang values thoroughness before action — "iterate a lot on the PRD before sending to coding agent, which is gonna save a lot of time afterwards"
- Liyang wants to learn from the process, not just get deliverables — explain the reasoning, not just the answer
- Visualizations > text for Liyang's review process. For technical concepts (data model, data flows, architecture), always build a visual representation rather than expecting Liyang to review text descriptions
- Liyang's product instincts are strong — the company intel addition, the session-per-contact model, and the artifact simplification all came from his feedback, not from the technical side
- Product positioning matters: Liyang doesn't want the product framed as a "student tool" — it's a universal networking tool that starts with students. Always frame the vision broadly and the GTM narrowly.

### Session 2 — March 31, 2026
**Topics covered:**
- Pressure-tested PRD with 3 LLMs: Gemini, Copilot, and ChatGPT (Liyang ran these, uploaded results)
- Created Pressure_Test_Synthesis.html consolidating all 3 reviews with side-by-side analysis and verdicts
- Triaged findings: 7 must-fix, 6 should-fix, 4 pushback (dismissed), 5 confirmed-good
- Applied all agreed changes to PRD (now v1.1):
  - **Manifest V3 fix**: Moved discovery orchestration from background service worker to content script (service workers die after 30s inactivity)
  - **DOM fragility mitigation**: Added multi-selector strategy, fallback selectors, graceful degradation, error handling for LinkedIn DOM changes
  - **LLM model tiering**: Added Section 5.4.1 — Haiku for scoring/simple tasks, Sonnet for complex reasoning. ~40% cost reduction.
  - **Context window management**: Added Section 5.4.2 — Rolling summarization after every 15 messages, summary + last 5 messages loaded on resume
  - **Web search decoupling**: Added Section 5.4.3 — Backend calls Perplexity/SerpAPI for company intel, injects results into Claude prompt. Claude never browses directly.
  - **Agent Learning System**: Added Section 5.9 — Three layers: (1) explicit user memory from edit patterns, (2) outcome memory from artifact results, (3) proactive intelligence from contact timeline scanning
  - **Manual contact entry**: Added DIS-11 with 3 methods — chat entry, LinkedIn URL paste, Chrome extension bookmark
  - **Data model updates**: Added UNIQUE constraint on (user_id, linkedin_url), added `source` field on Contacts, added `artifact_outcome` and `user_edit_distance` on Artifacts, added `user_memory` on Users
  - **Error handling**: Added comprehensive error/recovery specs for extension (session expired, tab closed, connection lost, DOM changed)
  - **Onboarding fallback**: Added "quick setup" structured form as fallback if conversational onboarding stalls
  - **Extension handoff**: Added installation detection and no-extension fallback flow
  - **Backend clarity**: Specified Next.js API Routes for MVP, separate AI service in v2
  - **Style learning**: Elevated OUT-08 from P2 to P1, linked to Agent Learning System
- Updated financial model:
  - Year 1 users: 440 → 550 (10% conversion with referral boost)
  - LLM costs: €1.50 → €2.50/user/month Year 1 (more realistic with model tiering)
  - Engineering budget: €0 → €12K Year 1 (AI tools, API subs, hosting)
  - Gross margin: 70% → 65% Year 1 (honest about higher LLM costs)
  - Year 1 revenue: €35K → €44K
  - Year 1 EBITDA: €18K → €9K (lower but still positive)
  - Year 2 EBITDA: slightly negative (-€1K) — realistic growth investment
  - Churn: noted seasonal model (7% during recruiting, 15% post-season, 10% blended)

**Key decisions made:**
- Agent learning is a core product feature, not a nice-to-have. It goes in the PRD as Section 5.9 with clear MVP scope (Layers 1-2) and v2 scope (Layer 3 full proactive nudges)
- Manual contact entry is P0 — users must be able to add contacts without running a discovery session
- Financial model should be honest about costs (higher LLM, real engineering budget) while showing strong unit economics trajectory
- Timeline is flexible — focus on shipping a usable prototype for Liyang + 1-5 testers, not hitting arbitrary dates
- Churn modeling: keep simple for now (blended average), note seasonal dynamics for v2 refinement

**Key learnings:**
- Liyang engages deeply with technical architecture when presented as product impact ("what breaks for the user") rather than engineering complexity
- The agent learning question is central to Liyang's product vision — this isn't a feature, it's the moat. The product should get meaningfully better with use.
- Liyang prefers reasonable assumptions over optimistic ones for financials — "boost Year 1 with reasonable underlying assumptions" not "make the numbers bigger"
- The pressure-test process (send PRD to multiple LLMs, synthesize, triage) was highly productive — Liyang might want to repeat this for future major decisions

### Session 2 (continued) — April 1, 2026
**Topics covered:**
- Researched Claude Code Agent Teams vs. Subagents — concluded subagents are the right starting point, Agent Teams add coordination overhead not justified for MVP scale
- Designed 5-agent architecture: architect → backend + extension (parallel) → frontend → reviewer
- Researched available skills and plugins: official Anthropic plugins (32 internal), gstack (23+ skills from Garry Tan), community marketplaces
- Analyzed Garry Tan's gstack — selected 6 key skills for our workflow: /plan-eng-review, /review, /qa, /investigate, /cso, /ship
- Clarified file structure: user-level (~/.claude/) vs project-level (.claude/) — gstack and plugins go user-level, our agents and skills go project-level
- Clarified skills vs. commands: skills = knowledge files, commands = triggers that can invoke skills. gstack packages both together.
- Created complete Claude Code setup package (claude-code-setup/):
  - CLAUDE.md: master instructions covering tech stack, project structure, coding conventions, design system, key architectural decisions
  - 5 agent definitions: architect (scaffold), backend (API + AI engine), frontend (views + beautiful UI), extension (Chrome Manifest V3), reviewer (read-only audit)
  - 2 project skills: project-context (PRD summary for agent context), conventions (code patterns and naming rules)
  - SETUP_GUIDE.md: step-by-step from environment setup to deployment
- Liyang emphasized: prototype must be functioning AND beautiful — updated frontend agent with detailed design system (colors, typography, animations, component quality standards)

**Key decisions:**
- Subagents (not Agent Teams) for MVP build — simpler, cheaper, sufficient for our codebase size
- 4-phase build: scaffold → backend+extension → frontend → review+QA
- Frontend AFTER backend (needs real API endpoints, not mocks)
- gstack /qa and /design-review as quality gates before sharing with testers
- Design quality is P0, not P2 — the prototype must look like a premium product (Linear/Notion quality)

**Recommended plugin stack:**
- User-level: gstack, typescript-lsp, code-review, frontend-design, security-guidance, supabase
- Project-level: architect.md, backend.md, frontend.md, extension.md, reviewer.md + project-context skill + conventions skill

**Key learnings:**
- Liyang gets confused by the layered file structure (user vs project, skills vs commands vs agents vs plugins) — always explain with concrete file paths
- "I wanna a prototype that looks good" — design quality matters as much as functionality for Liyang. This is about investor/tester impression, not just technical correctness.
- Liyang learns by asking questions, then getting clear analogies. "Skills = textbook, commands = button, agents = specialized worker" worked well.

### Session 3 — April 1, 2026
**Topics covered:**
- Completed Phase 0: Environment Setup
  - Verified prerequisites: Node v22.22.0, npm 10.9.4, Claude Code 2.1.45
  - gstack installed at ~/.claude/skills/gstack/ (verified all skill folders present)
  - Installed 3 of 5 official Anthropic plugins: code-review, frontend-design, security-guidance (typescript-lsp and supabase skipped — marketplace schema compatibility issue with Claude Code 2.1.45)
  - Created Next.js 14 project at C:\Users\glygs\Documents\ai-networking-coach
  - Installed all dependencies: @anthropic-ai/sdk, @supabase/supabase-js, @supabase/ssr, zod + dev deps (vitest, playwright, @types/*)
  - Copied setup files into project: CLAUDE.md, 5 agents, 2 skills, PRD, PROJECT_MEMORY.md
  - Created Supabase project: "Network AI" on NANO plan, West Europe/London region (URL: bdwrpfattfyyzmftmtqf.supabase.co)
  - Explained what Supabase is and what the Anthropic API key is for (Liyang asked — he understands now)
  - Created .env.local with all 4 keys (Project URL, anon key, service role key, Anthropic API key)
  - Confirmed .env.local is in .gitignore (safe)
  - Fixed corrupted .git/config (was filled with whitespace), removed stale config.lock
  - First git commit: "feat: project setup with PRD, agent definitions, and skills" (12 files, 3,455 insertions)

**Key decisions:**
- Supabase NANO plan is sufficient for prototype (free tier equivalent)
- West Europe/London region chosen for Supabase (closest to INSEAD Fontainebleau)
- Git identity set to Liyang's ESSEC email

**Issues encountered and resolved:**
- Plugin install schema errors for typescript-lsp and supabase — marketplace.json format incompatibility with Claude Code 2.1.45. Not blocking; skipped.
- .git/config file was corrupted (whitespace only) with a stale config.lock file. Fixed by rewriting config and deleting lock file.
- Git author identity not configured — set user.email and user.name in project-level git config

**Status:** Phase 0 complete. Ready for Phase 1 (architect agent).

### Session 3 (continued) — April 2, 2026
**Topics covered:**
- Added validation rules to CLAUDE.md (16 checks by category) and all 5 agent files (agent-specific bash checks)
- Created .claude/settings.json with hooks:
  - PostToolUse hook: auto-runs `tsc --noEmit` after every file edit
  - Stop hook: blocks Claude from stopping until `tsc + build` pass (self-correction loop)
- Researched Claude Code hooks vs /loop — hooks are the relevant feature for validation, /loop is for scheduled polling
- Executed Phase 1 (architect agent with Opus): 65 files generated, all types/migrations/stubs/extension scaffold. Fixed 2 file encoding issues (trailing null bytes on layout.tsx and page.tsx). 0 tsc errors after fix. RLS on all 8 tables, Zod in all 13 API routes, UNIQUE constraint present, Manifest V3 confirmed.
- Executed Phase 2 (backend agent with Sonnet): Implemented all API routes, AI engine (5 files), Supabase helpers, web search, tests
- Executed Phase 2b (extension agent with Sonnet): Built Chrome extension — content scripts, service worker, popup, DOM reader, orchestrator, behavior simulation
- Executed Phase 3 (frontend agent with Sonnet): Built all 3 views (Chat, Contacts, Goals), auth pages, all shared components, root layout with sidebar
- All phases committed to git

**Key decisions:**
- Skip /plan-eng-review after architect (manual review sufficient, saves tokens)
- Skip piecemeal code reviews between phases (one combined review at end is more efficient)
- Hooks provide 3-layer quality assurance: real-time (PostToolUse), end-of-task (agent validation), final audit (reviewer agent)

**Issues encountered:**
- File encoding: layout.tsx and page.tsx had trailing null bytes from Windows file system. Fixed by rewriting clean files.
- Next.js build fails in sandbox VM (no internet to download SWC compiler). Not a real issue — only affects sandboxed environment.

**Status:** Phases 1-3 complete. Running Phase 4 (reviewer agent) now.

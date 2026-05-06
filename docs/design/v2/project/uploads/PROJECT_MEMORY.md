# Project Memory — AI Networking Coach
## Long-Lived Context File

**Purpose:** This file preserves the accumulated context, decisions, debates, and learnings from all working sessions on this project. Read this file at the start of every new session to restore context. Update it at the end of every session with new learnings.

**Last updated:** April 3, 2026 (Session 4)

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

### Session 3 (continued) — April 2, 2026 (Phase 4)
**Topics covered:**
- Ran reviewer agent (Haiku) — full codebase audit with automated checks + 7-point manual review
- All automated checks passed: 0 tsc errors, successful build, 131 tests passing, Zod on all routes, Manifest V3 valid, no eval(), RLS on all 8 tables, no hardcoded keys
- 15 issues found: 3 critical, 5 high, 4 medium, 3 low
- Fixed 3 critical + 5 high priority issues:
  - ModelTier enum updated to correct model IDs (claude-haiku-4-5-20251001 / claude-sonnet-4-6) — was showstopper for all AI calls
  - Replaced all 8 `any` types with concrete types from database.ts
  - Added DELETE RLS policy to contact_scores table (GDPR right-to-deletion)
  - Fixed supabase:any in async helpers, model ID usage in scoring.ts, misleading parameter name in generation.ts, null checks in ContactCard.tsx
- 4 medium + 3 low issues deferred (not blockers for prototype demo)
- Discussed Playwright browser testing — already installed, will activate via gstack /qa command
- Architecture confirmed correct on all 6 questions: chat endpoint flow, scoring dual-write, discovery orchestration (content script ✅), RLS, rolling summarization, extension rate limiter

**Remaining Phase 4 steps:**
1. Commit fixes → `git add . && git commit -m "fix: resolve reviewer findings — model IDs, any types, RLS"`
2. Run Supabase migration → paste SQL into Supabase dashboard SQL editor
3. Run `/qa` in Claude Code → Playwright browser-based testing
4. Run `/cso` in Claude Code → security audit (OWASP + extension threat model)
5. Deploy → `npx vercel --prod` in terminal
6. Test live app end-to-end as Liyang

**Status:** Phase 4 in progress — fixes done, ready to commit and deploy.

### Session 4 — April 3-5, 2026
**Topics covered:**
- Completed Supabase migration (successfully applied all 8 tables with RLS)
- Ran /qa (Playwright E2E against localhost:3000) — passed
- Ran /cso (security audit) — 2 findings: (1) HIGH: no rate limiting on AI chat endpoint (fixed — message-count check before any Claude call), (2) MEDIUM: wrong env var name SUPABASE_SERVICE_KEY vs SUPABASE_SERVICE_ROLE_KEY in server.ts (fixed — 5 min rename)
- Post-fix validation: `npx tsc --noEmit && npm run build` run in Claude Code terminal
- Discussed and resolved agentic debugging strategy for post-deploy feature testing
- Added scientific positioning (homophily, weak ties, social capital) to PRD Section 1.2a
- Added v2 roadmap to PRD (Twitter/X + Substack monitoring, user-assisted enrichment, network structure analysis)
- Prepared technical co-founder pitch (how to describe the stack concisely)
- Installed VoltAgent/awesome-design-md — 50+ premium company design systems as DESIGN.md reference files

**Decisions on agentic debugging:**
- The LinkedIn extension extraction failure was a **test fidelity** problem, not a loop depth problem
- Claude Code wrote mock tests that tested fake data — they passed but didn't catch real DOM selector failures
- Correct fix: write Playwright tests that load a real saved LinkedIn HTML fixture, run content script extraction logic against it, and assert on real fields (name, title, photo, experience)
- For web app features: Playwright E2E against the deployed Vercel URL is the correct approach — tell Claude Code "keep fixing and re-running until the test passes, do not stop until green"
- Karpathy's autoresearch is a research loop, not a debugging loop — the concept of "loop until fixed" is valid and Claude Code supports it natively, but the loop is only as good as the test it's running
- Key prompt pattern for Claude Code: give it one feature at a time, tell it to write a REAL E2E test (not mocks), run it, fix failures, and loop until green

**Decisions on scientific positioning (homophily):**
- Homophily (McPherson 2001), weak ties (Granovetter 1973), and social capital theory are the scientific underpinnings of the product's AI reasoning
- Decision: embed science in product behavior, don't lead with it in marketing. Primary narrative stays "democratizing networking." Secondary credibility layer: "built on relationship science, not guesswork"
- Key product feature: AI explicitly surfaces homophily signals to the user in plain language ("You both made a non-traditional pivot from consulting — that shared experience is a strong opening"). This is differentiated from competitors and grounded in the science.
- Added Section 1.2a to PRD: Scientific Foundation — covering homophily, weak ties, and social capital principles

**Decisions on Instagram / multi-platform expansion:**
- Instagram NOT included in v2 due to: technical protection against scraping, privacy expectations mismatch (personal social ≠ professional networking), unreliable data
- v2 roadmap added to PRD covering: Twitter/X + Substack monitoring (professional/public), user-assisted profile enrichment (opt-in), network structure analysis (bridge identification, gap analysis)
- Right approach for personal context: user provides it ("she mentioned she loves hiking") rather than automated extraction

**Technical co-founder pitch (how to describe the stack):**
- TypeScript + Next.js 14 App Router (full-stack, one codebase, Vercel deploy)
- Supabase (managed Postgres + auth + RLS — no DevOps needed)
- Anthropic Claude API with model routing (Haiku for scoring, Sonnet for reasoning)
- Chrome Extension Manifest V3 (content script only — legally defensible LinkedIn reading)
- Architecture highlights: session-per-contact data model, 6 typed artifact schemas, rolling context summarization, Zod validation on all 13 routes

**Design system setup:**
- Installed VoltAgent/awesome-design-md (GitHub: https://github.com/VoltAgent/awesome-design-md) — 50+ DESIGN.md files extracted from premium company websites
- Files installed at project level: `.claude/skills/design-references/` (52 files)
- Also copied to user level: `~/.claude/skills/design-references/` (available across all projects)
- Created unified `SKILL.md` that defines our app's design system derived from Linear (dark sidebar), Notion (content areas), Supabase (dashboards), Vercel (status UI)
- Updated `CLAUDE.md` to instruct Claude Code to read design references before any frontend work
- Primary references: Linear, Notion, Supabase, Vercel, Superhuman, Stripe, Figma
- Full library available for "make it look like [Company]" prompts

**Key learnings:**
- Liyang is actively exploring cutting-edge AI dev workflows (Karpathy's autoresearch, loop skills) — stay current on these and give honest assessments of what works vs. hype
- The mock test vs. real test distinction is critical and likely to recur — always push for E2E tests against real data/DOM, not mocked interfaces
- Design reference files are high-leverage — they give Claude Code specific, concrete design specs instead of vague "make it professional" instructions

**Status:** Build complete. Security issues fixed. Design system installed. Ready for deploy + feature debugging.

### Session 5 — April 2-3, 2026
**Topics covered:**
- Deployed to Vercel successfully. Tested the live app.
- Chrome extension bookmark flow ("Save this profile") — debugged extensively:
  - LinkedIn 2025 switched to CSS-in-JS with hashed class names (`_880950ad`, `_9dd60b11`). ALL CSS selectors (`.text-heading-xlarge`, `.artdeco-card`, `section#experience`, etc.) broken.
  - JSON-LD (`<script type="application/ld+json">`) is NOT present on logged-in LinkedIn pages. The JSON-LD fallback strategy was built on a wrong assumption.
  - Reverse-engineered Dex Chrome extension (v2.0.13) — their selectors are also broken on 2025 LinkedIn. They work via their injected sidebar panel, not LinkedIn's native DOM.
  - Built `extractFromTextStructure()` — parses `main.innerText` for name, headline, company, location. Works because text order is a UX pattern LinkedIn won't change.
  - Fixed photo extraction: `aria-label="Profile photo"` as anchor, falls back to `img[src*="media.licdn"]` inside `main` (skips nav avatar).
  - Fixed experience/education: content script scrolls page before extracting to trigger lazy-loaded sections. Parses section headings ("Experience", "Education") as delimiters.
  - Fixed pronouns: "She/Her" was being picked as name. Added pronoun skip list.
  - Fixed description bullet points: lines starting with "- ", "•", or >80 chars filtered out.
  - User saved real LinkedIn HTML via DevTools `copy(document.documentElement.outerHTML)` — this captures the full rendered DOM including lazy-loaded content (unlike "Save As" which only gets initial HTML).
  - Wrote JSDOM test against real saved HTML (`tests/extraction-real-dom.test.ts`) — 6 tests, all passing.
- Added delete contact feature (API + UI button on contact detail page).
- Added manual URL entry callout in add-contact modal.
- First deploy with working extension extraction.

**Key learnings:**
- LinkedIn's 2025 DOM is fundamentally different from everything documented online. No CSS selectors work. Must use text-structure parsing or LLM extraction.
- "Save As HTML" does NOT capture lazy-loaded DOM content. Must use `copy(document.documentElement.outerHTML)` from DevTools.
- Playwright E2E tests against mock fixtures don't validate real LinkedIn extraction. Only real saved HTML fixtures work.
- User wants tested, working features before shipping. Multiple rounds of "try it and see" with broken code frustrated the user. Must verify before presenting.
- Build in small, testable modules. Quality-check each before moving to the next.

### Session 6 — April 5-7, 2026
**Topics covered:**

**Frontend Design Refresh (ElevenLabs-inspired):**
- Created `docs/DESIGN.md` based on ElevenLabs design system: near-white canvas (#fafafa), warm neutrals, pill buttons, multi-layered subtle shadows, clean Inter typography.
- Applied design tokens to layout, sidebar (#111111), ContactCard, ContactDetail, ContactGrid, contacts page.
- Deployed to Vercel.

**Discovery Architecture Decision:**
- Spawned 3 debate agents: Extension Orchestrator Engineer, OpenClaw-style Browser Agent, Pragmatic CTO (Proxycurl API).
- Key findings from debate:
  - Extension orchestrator has a fundamental navigation-death problem (content scripts die on page navigation).
  - Proxycurl can't do school-filtered LinkedIn search — core to our use case.
  - OpenClaw-style CDP agent runs locally on user's browser (same trust/detection profile as extension).
- Researched Stagehand (Browserbase, 22K stars, TypeScript) — hybrid Playwright + LLM extraction.
- User held roundtable with 5-person technical panel (systems architect, security analyst, fullstack dev, LLM architect, performance engineer).
- **Final architecture decision: `chrome.debugger` CDP from the extension service worker.**
  - No local Node.js process, no CLI flags, no Stagehand dependency.
  - `chrome.debugger.attach()` keeps service worker alive (Chrome 118+).
  - CDP `Page.navigate` for navigation, `Runtime.evaluate` for JS execution.
  - LLM extraction on backend (Claude Haiku) — keeps API keys server-side.
  - Same pattern as Claude Code Chrome extension and OpenClaw Browser Relay.
  - Full architecture documented in `docs/DISCOVERY_ARCHITECTURE_FINAL.md`.

**Discovery Implementation (modular build):**
- Module 1: CDP Helper — `chrome.debugger` attach/navigate/evaluate/detach. Tested, works.
- Module 2: Company ID Resolution — slug guess with name validation + LinkedIn search + Claude Haiku LLM fallback for disambiguation. Tested with McKinsey (slug), Jeito Capital (LLM), Bain & Company (slug).
- Module 3: Search + Collect Profile URLs — structured LinkedIn filter URLs (`currentCompany=["ID"]&schoolFilter=["5176"]`), href-based link extraction, mutual connection filtering. Tested with Parloa → 4 correct INSEAD alumni.
- Module 4: Visit Profiles + Extract + Save — IN PROGRESS.
  - Built inline text parser for CDP `Runtime.evaluate` extraction.
  - **Blocking issue:** `Runtime.evaluate("window.scrollBy()")` does NOT trigger LinkedIn's lazy loading. The page doesn't visually scroll. Experience/Education sections don't load.
  - Root cause: `window.scrollBy()` via `evaluate` fires no input events. LinkedIn uses `wheel` event listeners and IntersectionObservers that require real input events.
  - **Fix (researched, ready to implement):** Use CDP `Input.dispatchMouseEvent` with `type: "mouseWheel"` — same approach Playwright, Puppeteer, and Claude Code Chrome extension all use. This goes through Chrome's real input pipeline and fires native `wheel` events.

**Key decisions:**
- Discovery uses structured LinkedIn filter URLs from user's existing LinkedIn search skill (company ID + school ID), not free-text keyword search.
- Company resolution: try slug guess first (fast for common companies), fall back to LinkedIn company search + LLM disambiguation for tricky names.
- Profile extraction: for ≤25 results, visit all profiles. For >25, add more LinkedIn filters (location, seniority) to narrow down.
- For MVP: all discovered contacts save to existing contacts table via `POST /api/contacts`.

**Key learnings:**
- `chrome.debugger` API is the right tool for extension-based browser automation. It keeps the service worker alive and provides full CDP access without user-facing setup steps.
- Company slug guessing is unreliable ("Jeito Capital" → `jeito-life`, "Wonderful" → `wonderfulcx`). LinkedIn search + LLM resolution is the robust fallback.
- Mutual connection links on LinkedIn search results are false positives. Filter by checking if grandparent element text contains "mutual connection".
- CDP `Runtime.evaluate` can run JS and extract data, but CANNOT trigger real scroll events. Must use `Input.dispatchMouseEvent(mouseWheel)` for scrolling — this is what all major automation tools use.
- Discuss approach before coding. The user got frustrated when code was written and rewritten multiple times for the scrolling problem without first aligning on the solution.

**Status:**
- Manual save via extension: WORKING (name, photo, headline, experience, education, location)
- Delete contacts: WORKING
- Discovery Modules 1-3: WORKING (CDP helper, company ID, search + URLs)
- Discovery Module 4: mouseWheel scroll fix built, needs testing
- Frontend design: partially applied (ElevenLabs tokens on main components)
- Chat/scoring: NOT WORKING (needs Anthropic API key in Vercel env + user onboarding)

**Immediate next steps:**
1. Test Module 4 (mouseWheel scrolling) with Parloa
2. If scrolling works → profiles extract with full data → contacts saved
3. Wire the "Start Discovery" button in popup to the full chain (Modules 2→3→4)
4. Test end-to-end: type "Parloa" + INSEAD → 4 contacts appear in web app with full details

### Session 7 — April 7-8, 2026
**Topics covered:**
- Discovery Module 4 (visit profiles + extract + save):
  - mouseWheel scrolling confirmed working (all 4 Parloa profiles: 15K-23K chars, Experience:true)
  - Rule-based text parser produces too many errors on complex profiles (company headers as titles, "On-site"/"Hybrid"/"5 yrs 9 mos" as titles, descriptions slipping through)
  - Switched to MiniMax M2.7-highspeed LLM for extraction ($0.002/profile)
  - Anthropic API key was invalid (authentication_error) — root cause of all 500 errors
  - Switched both discovery endpoints (`/api/discovery/extract` and `/api/discovery/resolve-company`) from Anthropic to MiniMax
  - MiniMax API URL: `https://api.minimaxi.com/v1/chat/completions`, model: `MiniMax-M2.7-highspeed`
  - MiniMax uses `<think>` reasoning tags — must strip before parsing JSON response
  - Auth middleware was blocking `/api/discovery/*` routes — added to PUBLIC_ROUTES
  - Page text truncation at 8000 chars was cutting off Experience section — fixed by extracting only relevant sections (header + Experience + Education) from innerText before sending to MiniMax
  - CDP session drops during long MiniMax API calls — added session recovery (detach old + re-attach)
  - Company name validation too strict — "Wonderfulcx" slug lands on correct page but name "Wonderful" doesn't match input. Fixed: accept any valid company page from slug guess without name validation.

**Key decisions:**
- MiniMax LLM extraction is the primary approach for discovery (not filters). Filters are unreliable on complex profiles.
- Cost is acceptable: ~$0.002/profile, ~$0.05/session of 25 profiles
- Anthropic API key needs to be fixed/replaced for chat and scoring features to work
- MiniMax is used ONLY for discovery extraction; manual "Save this profile" button still uses the rule-based content script parser

**Known issues to tackle later:**
1. **Company slug validation** — currently accepts any valid company page from slug guess. Could match wrong company if slug is ambiguous (e.g. "jeito" matches "Jeito" instead of "Jeito Capital"). Need smarter disambiguation for ambiguous slugs while still accepting exact slugs.
2. **MiniMax empty responses** — Dmitry's profile sometimes returns empty content (all tokens spent on `<think>` reasoning). max_tokens=4000 may need increase, or need to add retry logic.
3. **Anthropic API key** — needs to be replaced with a valid key for chat/scoring/coaching features.
4. **CDP session stability** — service worker restarts during long API calls cause session loss. Recovery works but adds latency. Consider keeping API calls shorter or adding heartbeat.

**Status:**
- Discovery end-to-end: WORKING (Parloa: 3/4 profiles saved with full experience + education via MiniMax, 1 had empty MiniMax response but was saved from prior run)
- Manual save: WORKING (content script text parser)
- Company ID resolution: WORKING (slug guess + LLM search fallback)
- Search + URL collection: WORKING (mutual connection filtering)
- CDP scrolling: WORKING (mouseWheel events)
- Frontend design: Partially applied (ElevenLabs tokens on main components)
- Chat sessions: WORKING (contact-specific naming, delete, routing from contact cards)
- Chat messaging: NOT WORKING (still uses invalid Anthropic key — needs Module 8: switch to MiniMax)

**Future feature ideas (second priority):**
1. **LinkedIn Chat AI Assistant (Module 10)** — Inject an AI button into LinkedIn's messaging compose area (like Dex's "D AI" button). Content script uses MutationObserver to detect `.msg-form__contenteditable`, injects button, scrapes chat history from DOM (`.msg-s-event-listitem__body`), sends to backend for LLM reply generation, inserts response via `document.execCommand('insertText')`. Proven pattern used by Dex, Reepl, and multiple open-source extensions. Would allow users to get AI-drafted replies directly inside LinkedIn without switching to our web app.

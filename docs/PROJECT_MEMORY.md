# Project Memory — AI Networking Coach
## Long-Lived Context File

**Purpose:** This file preserves the accumulated context, decisions, debates, and learnings from all working sessions on this project. Read this file at the start of every new session to restore context. Update it at the end of every session with new learnings.

**Last updated:** May 18, 2026 (Session 13)

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

### Session 8 — April 26 – May 5, 2026

**Topics covered:**

**Cleanup + auth recovery (April 26):**
- Removed all Anthropic SDK references from the codebase (kept the model-tier routing constants but rewired everything through MiniMax). MiniMax is now the only LLM provider.
- Added `/forgot-password` and `/reset-password` flow with Supabase recovery — addresses gap discovered when Liyang got locked out (no recovery flow existed).
- All 137 tests rewired to mock `callMiniMax` instead of `@anthropic-ai/sdk`. Build clean.
- Vercel/GitHub reconnection saga: Vercel's GitHub App had lost access to the Warmly repo, so `git push` was firing webhooks Vercel was rejecting. Reauthorized GitHub App, project picked up commits, preview deploys came back online.

**Tech-partner collaboration model (April 26):**
- Liyang recruited a tech co-founder. Agreed working agreement: PR-based GitHub flow, validation gate (tsc + build + tests) non-negotiable, conventional commits, `docs/PROJECT_MEMORY.md` as shared brain, weekly architecture sync, async daily Slack updates.
- Ownership split: tech partner owns backend / AI engine / extension stability / Supabase / auth / deploy infra. Liyang owns product / design / prompts / GTM. Frontend is shared (Liyang prototypes with AI agents, partner refactors / hardens).
- Co-founder sync planned for Thursday May 7 to confirm Warmly brand name, Phase split, and unblock the outreach skill port.

**Warmly editorial design overhaul — Phase 1 + 2 (April 30 – May 4):**

Liyang generated a new design in Claude Design (`docs/design/v2/`) — full React-style JSX prototypes with a warm/editorial aesthetic and "Warmly" as the new product name. Three strategic decisions confirmed before implementation:
1. Warmly is the new production name (pending co-founder confirmation Thursday).
2. Full editorial overhaul (not hybrid) — adopt the warm cream/serif aesthetic.
3. Goals view will use the gamified design (streaks/habits/quests) but with hardcoded sample data; real gamification deferred to v2.

Detailed plan saved at `~/.claude/plans/ok-all-downloaded-here-humming-finch.md`. Implementation across 4 commits on branch `claude/zen-robinson-233760`:

- **Phase 1 — `d49db07` — design tokens + shell:** New OKLch warm palette + Instrument Serif display font + Geist UI. Sidebar gets "Warmly" italic wordmark with cream accent dot. globals.css migrated to Tailwind v4 `@theme inline` with all design tokens. Drawer-slide-in keyframes + `.hook-block` class added. DESIGN.md fully rewritten as the new system spec. Design source-of-truth saved to `docs/design/v2/`.
- **Phase 2.1 — `f58a2b9` — ArtifactDrawer:** New right-side slide-in editor for AI artifacts. ArtifactCard simplified to compact "Open in full ↗" preview. Drawer renders editable primary text + read-only structured sections (discussion topics, action items, etc.). Footer: Copy / Edit / Mark as sent (outreach types) or Mark as final. ESC + backdrop-click dismiss. Body scroll locks. Hits existing `PUT /api/artifacts/:id` (already supported partial updates with `user_edit_distance` for style learning).
- **Phase 2.2 — `94a70ee` — ContactDetail 2-column rebuild:** Major view rewrite. Left: hero + prominent hook-block (italic serif quote with accent left-bar, "Why this person · why now") + 5-node stage track + career & education timelines (collapsed by default with show-more) + artifacts list + notes (notes now actually save — fixed the prior TODO). Right: Coach's take + Why-this-match (4 derived bullets via new `lib/utils/matchSignals.ts`) + relevance score with collapsed breakdown + discovery metadata. Health indicator (green/yellow/red/gray) derived from `last_interaction_at`.
- **Phase 2.3 — `10802e6` — Today feed + editorial hero:** Contacts page gets editorial hero ("YOUR NETWORK / *A deliberate network.*") with stats + Today section showing 3 lanes (Re-warm / Follow-up / Reach-out), each surfacing the most-actionable contact in that intent. Pure logic over `status` + `last_interaction_at` + `tier` — no backend changes, no LLM call. Empty lanes show friendly placeholders.

**Vercel deployment saga:**
- Production branch on Vercel was set to `master` but the GitHub repo's default is `main`. After reconnecting GitHub access, Vercel started auto-deploying preview URLs for the feature branch. Phase 1 hit production via PR #1 merge ~10h before the rest. Phases 2.1–2.3 visible only on preview URLs (e.g. `FLCCPCVFR`) until merged.
- Liyang verified the new design works on the latest preview URL (`A deliberate network.` hero, Today lanes, italic display headings, Warmly wordmark, contact detail 2-column with hook block + coach sidebar).

**Artifact double-generation bug discovered (May 5):**
- When a coaching message triggers an artifact (keyword in user message + active contact session), the backend runs **two LLM calls in parallel**: one for the chat reply (`processCoachingMessage`), one for the artifact (`generateArtifact`). Both fire, both render. Users see two surfaces with different content.
- Worse than duplication: the two calls don't share generation context, so the chat reply and the artifact body produce **different drafts** for the same request. Liyang spotted this in a test on Dominik's contact session — chat reply gave a 2-message strategy (LinkedIn note + follow-up), artifact gave a single different email mentioning RWZ + virtual coffee.
- The system prompt politely tells the LLM "the system handles generation separately" but MiniMax M2.7 doesn't reliably comply.
- **Fix proposed (Option B, recommended):** Skip the coaching call entirely when `trigger_artifact && contact`. Replace the chat reply with a deterministic short message like *"Drafted your outreach to {name} — opening it in the drawer."* Auto-open drawer for one smooth gesture. Saves tokens, ensures consistency, eliminates the conflict. ~30 min of work — not yet shipped.

**Key decisions:**
- Goals view: defer real gamification to v2; ship the visual design now with hardcoded sample data so the demo feels complete (per Liyang's explicit choice).
- Tweaks panel + Type Lab from the design ref: NOT shipped to production. They're designer-iteration tools only.
- Branch naming: working on `claude/zen-robinson-233760` — long-lived feature branch through the design overhaul. Will need to merge to main before May 7 co-founder sync.
- "⌘K Quick find" button in design: deferred to v2.

**Key learnings:**
- The Claude Design bundle's React-style JSX files (`docs/design/v2/project/src/`) are an excellent source-of-truth — interaction patterns (drawer slide, inline-confirm delete, expand toggles) are encoded in the code, not just the screenshots. Always read the matching `.jsx` file when implementing a component.
- Tailwind v4 has a different mental model than v3: no `tailwind.config.ts`, all design tokens go through `@theme inline { ... }` in `globals.css`. CSS variables drive everything.
- The `match_signals` field expected by the design didn't need a schema change — it's pure derivation from existing fields (career history, education, status, location). `lib/utils/matchSignals.ts` does this client-side with no LLM call.
- `next_steps` and `coach_summary` from the design also don't need new columns — they map to existing `action_plan` artifacts and `recommendation_reason` respectively.
- When triggering artifacts: parallel LLM calls without shared output context produce inconsistent drafts. This is a coordination bug, not a prompt bug — needs to be fixed in code, not just in the prompt.
- The 5-node stage track from the design (Discovered → Contacted → Connected → Met → Ongoing) maps cleanly to our existing `ContactStatus` enum — no migration required.

**Status:**
- Auth recovery flow: WORKING (forgot/reset password live)
- MiniMax-only stack: COMPLETE (no Anthropic SDK references in source code)
- Warmly Phase 1 (design tokens + shell): SHIPPED — sidebar wordmark, warm canvas, Instrument Serif on production
- Warmly Phase 2.1 (ArtifactDrawer): SHIPPED — right-side slide-in editor, working in preview
- Warmly Phase 2.2 (ContactDetail rebuild): SHIPPED — 2-column with hook block + coach sidebar
- Warmly Phase 2.3 (Today feed + hero): SHIPPED — editorial hero + 3-lane daily action feed
- Warmly Phase 2.4 (chat surface refresh): NOT STARTED — session sidebar, conversation header, composer chips, message bubbles, empty state still on old hex colors
- Warmly Phase 3 (Goals + auth polish): NOT STARTED
- Artifact double-generation fix: NOT SHIPPED (Option B agreed, ~30 min of work)
- Tech partner onboarding: tasks queued (forgot-password polish, ContactCard token refresh, scoring backfill) but not assigned yet — Thursday sync

**Immediate next steps:**
1. **Fix the artifact double-generation bug.** Skip the coaching LLM call when an artifact is triggered; emit a deterministic short reply; auto-open the drawer. This is the highest-leverage open issue — every artifact interaction is currently confusing.
2. **Phase 2.4 — chat surface refresh.** SessionSidebar, conversation header, ChatInput chips ("Prep a meeting / Paste LinkedIn / Run discovery" + "⌘↵ to send" hint), message bubble visual polish, empty state. ~3 commits, ~3 hours.
3. **Phase 3 — Goals + auth polish.** Goals: build the gamified visual (StreakWidget, RingTarget, HabitsHeatmap, QuestCard, LevelBadge) with sample data. Auth pages: token-only refresh.
4. **Merge `claude/zen-robinson-233760` to `main`** before Thursday co-founder sync so production reflects the new design.
5. **Co-founder sync agenda (Thursday May 7):** confirm Warmly brand, agree Phase split, hand off backend tasks (artifact dedup fix, scoring backfill, outreach skill port).

**Outstanding TODOs (not blockers, but worth tracking):**
- ContactCard.tsx still hardcodes old hex colors (`bg-[#2563eb]`, blue accent bar) — token-only refresh in Phase 2.4.
- Goals view still on old design — Phase 3.
- Auth pages still on old design — Phase 3.
- Tweaks panel from `docs/design/v2/` could be ported as a `NODE_ENV === "development"` dev tool — useful for design iteration, never ship to prod.
- "⌘K Quick find" button placeholder in topbar (design ref includes it; we deferred to v2).
- Empty Today lanes currently say "Nothing waiting in this lane today. {hint}." — copy could be warmer.
- Re-score button on contact cards (for old contacts saved before MiniMax was wired up — they have null scores).

**Open questions for Thursday co-founder sync:**
- Confirm "Warmly" as the production brand — affects domain registration, GTM, contracts.
- Equity discussion (was flagged as "early month" priority).
- Validate the phased rollout split (frontend with Liyang, backend hardening + AI engine with partner).
- Decide on artifact double-generation fix priority vs. Phase 2.4 chat refresh.

**Queued for after Phase 3 — prompt audit + outreach skill port:**

[Status May 6 evening: ALL FOUR PHASES SHIPPED + MERGED TO MAIN. See Session 9 below for the full implementation log.]

Liyang flagged on May 6 that he wants a deep-dive audit of every LLM prompt
in the codebase before pushing further on AI features. Two-part scope:

1. **Prompt inventory.** Map every place a prompt is constructed:
   - `lib/ai/scoring.ts` → `buildScoringPrompt` (contact relevance scoring)
   - `lib/ai/coaching.ts` → `buildCoachingSystemPrompt` + `buildCoachingUserPrompt` (chat coaching)
   - `lib/ai/generation.ts` → `buildGenerationPrompts` (6 artifact types)
   - `lib/ai/context.ts` → `summarizeConversation` + `extractStylePreferences`
   - `app/api/discovery/extract/route.ts` (LinkedIn profile parsing)
   - `app/api/discovery/resolve-company/route.ts` (company disambiguation)
   - `app/api/conversations/[id]/messages/route.ts` → `ARTIFACT_INTRO` (deterministic, not LLM, but worth documenting)
   For each: what input shape, what output shape, which user-facing feature it powers, when does it fire. Output: `docs/PROMPT_INVENTORY.md`.

2. **Outreach skill port.** Take the prompts and adaptive-question logic from
   the gstack `/outreach` skill (LinkedIn scrape → profile card → adaptive
   clarifying questions → draft in user's voice) and bake them into
   `lib/ai/generation.ts` for the `outreach_draft` artifact type. Then layer
   on the self-improving voice-matching architecture:
     - Phase 1: After every artifact gets marked sent, store the *final edited*
       text in a `sent_messages` table or in the existing artifacts row
       (`content` already has the user's edits — we just need to flag accepted)
     - Phase 2: Background job (cron or threshold) extracts style features
       (tone, sentence length, formality, opener/closer patterns) into
       `users.user_memory.learned_patterns` (PRD Section 5.9 already specified)
     - Phase 3: Every `generateArtifact` call reads `user_memory` and biases
       output toward the user's actual voice. Already partially wired —
       `extractStylePreferences` runs on every PUT /api/artifacts/[id] when
       `user_edit_distance` is provided. Verify this is firing correctly.

   Optional accelerator for new users: onboarding asks "paste 2-3 messages
   you've sent in your real voice" so the system has a baseline before any
   real artifacts are generated.

### Session 9 — May 6, 2026

**Topics covered:**

The full Warmly redesign + AI-skill architecture overhaul shipped today.
20 commits, all merged to main, production at `f160faf`. Roughly five
distinct workstreams:

**1. Warmly editorial design rollout (Phases 1-3) — already on main earlier today**
- Phase 1 (`d49db07`): tokens + shell — OKLch warm palette, Instrument Serif, "Warmly" wordmark, Tailwind v4 @theme
- Phase 2.1 (`f58a2b9`): ArtifactDrawer right-side slide-in editor for AI artifacts
- Phase 2.2 (`94a70ee`): ContactDetail 2-column with hook block + coach sidebar
- Phase 2.3 (`10802e6`): Today feed (re-warm/follow-up/reach-out) + editorial hero on contacts page
- Phase 2.4 (`6b9d04d`): chat surface refresh (sidebar, header, composer chips, message bubbles, empty states)
- Phase 2.5 (`966ef9e`): table list view for contacts + filter pills (All/Tier 1/Met/ongoing/Going cold/New) + list/grid layout toggle
- Phase 2.5 polish (`3992e07`): lighter row dividers + explicit pointer cursor on contact rows
- Phase 3 (`7a5b509`): Goals gamified visual (sample data) + auth pages refresh

**2. Artifact double-generation bug fix (`754af8a`)**
- Discovered Liyang's chat reply and artifact body were producing CONFLICTING drafts (not just duplicate). Coaching call + generation call were running in parallel without shared output context.
- Fix: `messages/route.ts` calls `detectArtifactTrigger()` first (no LLM, just keyword match). If trigger fires AND there's a contact, skip coaching entirely — artifact becomes single source of truth. Replace chat reply with deterministic `ARTIFACT_INTRO` map.
- Side benefits: ~50% LLM cost reduction on artifact-triggering messages, faster response, trigger now visible to user.

**3. Documentation pass**
- `docs/COFOUNDER_SYNC.md` (`427528a`): 90-min meeting plan for the Thursday co-founder sync — agenda with 8 sections, time estimates, decisions-needed flags, ownership split, first-week task handoff, pre-read checklist for partner
- `docs/PROMPT_INVENTORY.md` (`ffd2b27`): full reference for every LLM prompt site — schemas, triggers, costs, tuning levers, reverse-lookup table, 5 open quality questions, "how to change a prompt safely" protocol
- This Session 8/9 entry in PROJECT_MEMORY.md

**4. Outreach skill port (Phase A — `9958940`)**
Universal content from `~/.claude/skills/outreach-messages/SKILL.md` ported as TypeScript constants in `src/lib/ai/skills/outreach.ts`. Used by all three outreach-family artifact types (`connection_note`, `outreach_draft`, `follow_up_draft`). Includes:
- OUTREACH_PHILOSOPHY (peer-level sense-checking, 2-step approach, no-transaction framing)
- CONNECTION_POINTS_PRIORITY (mutual contact > school > transition > geo > sector > content)
- HARD_GATES (no em-dashes, no "I came across", no "I hope this finds you well", no "leverage" / "synergy" / "furthermore", organic-not-research framing of recipient's company, presumption gate, repetition gate)
- VOICE_PRINCIPLES (specific beats flattering, one sharp question, confidence without neediness, apologize for cold outreach, keep ask small, lead with your interest then bridge, read-aloud test)
- LEARNED_PATTERNS (cross-reference all schools, generic fallback worse than no message, organic vs research framing, one-question rule, honor previous role, follow-ups continue, technical depth in connection request)
- TEMPLATES per channel (connection request 300 chars, outreach draft, follow-up after-meeting + no-reply nudge)
- JSON schemas

**5. AI skill architecture full rollout (`b2446b8` + `f160faf`)**

The "skill architecture" is the unified pattern: each artifact family has (a) a universal skill file in `src/lib/ai/skills/<family>.ts` carrying philosophy + structure + templates, and (b) a per-family prompt builder in `src/lib/ai/prompts/build<Family>Prompt.ts` that composes universal content with per-user data (profile_md + approved learnings + writing style).

**Phase B — `users.profile_md`** (auto-built identity narrative):
- Migration `20260506000000_add_user_profile_md.sql` adds `users.profile_md TEXT`
- `lib/ai/profile.ts`: `buildInitialProfile(data)` generates markdown from onboarding fields + optional CV/cover-letter + voice samples; `enrichProfile(existing, newContext)` refines on identity disclosure; `looksLikeIdentityDisclosure(message)` is the cheap rule-based gate
- Wiring: `buildPerUserIdentitySection()` in `buildOutreachPrompt.ts` injects profile_md as high-priority section
- `GenerationContext.user_profile_md` (optional, backwards-compat)
- `messages/route.ts` pulls and passes it

**Phase C — `user_learnings` table** (closed self-improvement loop):
- Migration `20260506000001_add_user_learnings.sql` adds the table with status (pending/approved/rejected/archived), confidence (1-10), source_artifact_id, category (voice/strategy/gate/hook/tone/other), excerpts, RLS
- `lib/ai/learnings.ts`: `distillLearnings(...)` runs MiniMax to extract 1-3 generalizable patterns from original_draft vs sent_version; `shouldAutoApprove()` requires confidence>=8 + no_conflict; `shouldDiscard()` filters confidence<5
- Trigger: `app/api/artifacts/[id]/route.ts` PUT handler — when `status='sent'` on outreach-family type, fires `triggerLessonDistillation()` async; pulls existing approved learnings to prevent duplicates and catch conflicts
- Auto-approval gate: confidence≥8+no_conflict → status='approved' immediately; otherwise pending for user review
- API endpoints: `GET /api/learnings` (list), `PATCH /api/learnings/[id]` (approve/reject/archive), `DELETE /api/learnings/[id]`
- Wiring: `buildApprovedLearningsSection()` injects top 30 approved learnings into outreach prompt; "user has approved these — APPLY THEM" framing makes them outrank universal voice rules when conflict

**Phase D — meeting + action skill files**:
- `skills/meeting.ts`: philosophy (value exchange, anchor in their world), research framework, discussion topic taxonomy, do/don't coaching, meeting notes capture structure, JSON schemas for meeting_prep + meeting_notes
- `skills/action.ts`: philosophy (momentum > activity, specificity is the whole game, don't invent obligations), priority lattice (now/soon/later), draft inclusion guide, coaching note guide, JSON schema for action_plan
- `prompts/buildMeetingPrompt.ts` and `prompts/buildActionPrompt.ts` mirror the outreach builder pattern
- `generation.ts` router now picks: outreach family → buildOutreachPrompts; meeting family → buildMeetingPrompts; action_plan → buildActionPrompts; else → generic fallback

**Final prompt structure (every outreach-family artifact gets this composed):**
```
SYSTEM
├─ Universal: PHILOSOPHY + CONNECTION_POINTS + HARD_GATES + VOICE_PRINCIPLES + LEARNED_PATTERNS + TEMPLATE
├─ Per-user (Phase B): profile_md identity narrative
├─ Per-user (Phase C): top 30 approved learnings
├─ Per-user (existing): user_memory.writing_style
└─ JSON schema

USER PROMPT
├─ Sender (career + education + goals + networking_preferences)
├─ Recipient (name + role + company + career + education + location)
├─ Conversation summary + recent messages
├─ Company intel (meeting_prep only)
└─ "Draft a {type}" + the user's exact request
```

**Key decisions:**
- Profile is AUTO-BUILT, not user-typed. Generated from onboarding answers + optional CV upload + ongoing conversation enrichment. User can edit anytime via Settings (UI not yet built but API ready).
- Auto-approval threshold: confidence ≥ 8 AND no_conflict. Anything else surfaces to user.
- Universal skill content lives in code as TypeScript string constants (no DB tables for templates / philosophy / gates). Edit a file → ship a commit → next draft uses new content. Per-user content lives in DB (profile_md text column, user_learnings table). This keeps the architecture simple while supporting per-user personalization.
- Learnings are read in batches of 30 max — keeps the prompt size bounded as the library grows.

**Key learnings:**
- Reading the gstack skill files surfaced ~80% universal content (philosophy, gates, templates, learned patterns) and ~20% Liyang-specific content (his school, career, hooks, specific phrases). The split mapped cleanly to the static-code-constants vs per-user-DB-data architecture.
- The biggest practical UX shift was understanding that the chat reply and the artifact body were producing CONFLICTING drafts (not duplicate). Once that was fixed, the artifact card became the unambiguous single source of truth.
- Tailwind v4 has a different mental model than v3: no `tailwind.config.ts`, all design tokens go through `@theme inline { ... }` in `globals.css`. Took a moment to recognize.
- The Vercel + GitHub App flow had a connection break that took some debugging — preview URLs come from Vercel auto-deploys per branch, but production only updates on merges to `main`. The branch was at PR #2 merge for a while before the rest of the work landed.

**Status (end of May 6):**
- Production: at `f160faf`. All Warmly design + skill architecture is live.
- Branch: clean working tree, identical to main.
- All 137 unit/API tests passing.
- Build clean. tsc clean.
- 20 commits shipped today. None reverted. None broken in production.

**Immediate next steps (next session):**
1. **Onboarding flow rebuild** — the new design has a 2-column conversational onboarding with live `user.md` preview. Liyang's existing onboarding still uses old design + simple stepper. Higher leverage than auth polish, and it's the natural place to invoke `buildInitialProfile()` for the first time.
2. **CV upload endpoint** — `buildInitialProfile()` accepts `cv_text` but there's no upload UI yet. Adding this lets users seed `profile_md` with their actual resume in 5 seconds.
3. **Settings UI for profile_md + pending learnings** — view + edit profile, approve/reject pending learnings. APIs exist; just frontend.
4. **Wire `enrichProfile()` into chat route** — currently the rule-based gate exists in `profile.ts` but the LLM call isn't fired. Wants to test cost impact first.
5. **Tester recruitment** — get 5-10 INSEAD MBA classmates signed up on the live URL.

**For Thursday's co-founder sync:**
- See `docs/COFOUNDER_SYNC.md` for the agenda. Production matches the demo experience the partner will see. The skill architecture is documented in `docs/PROMPT_INVENTORY.md` (extended with Phase B/C/D content). First-week task split for partner is in the COFOUNDER_SYNC.md.
- Partner's first PR candidates: onboarding rebuild, CV upload endpoint, Settings UI for profile/learnings. All natural backend + frontend work, all unblocked by what shipped today.

### Session 10 — May 9, 2026

**Topics covered:**

Big-shipment day. The "Meetings + full editorial refresh" plan and a long
chain of follow-on bug fixes. 8 commits on `claude/zen-robinson-233760`,
all passing tsc + build, ready to merge to main.

**1. Diagnose + fix chat silent failure (`a5c731d`)**

Liyang opened a chat session, sent a message, nothing happened — no agent
reply, no error, no spinner. Two compounding bugs:
- The `/api/conversations/[id]/messages` POST had no try/catch around
  `processCoachingMessage()`. When MiniMax threw (e.g. quota / network /
  payload), Next.js returned a bare 500 with no JSON body.
- `useChat.sendMessage` only handled `json.data` on success. On any error
  response (no `json.data`), the optimistic user bubble stayed orphaned and
  no error UI rendered.

Fix: detect non-OK responses in the hook, remove the orphan bubble, render
a contextual error banner above the composer (status-specific copy: 429 /
500 / generic / network), add a Retry button that re-sends the failed
message verbatim. Independent of any backend root cause — even if MiniMax
recovers, future failures won't disappear silently.

**2. Surface real LLM error reason (`aff9c6f`)**

After Part 1, banner still showed "trouble responding" — too generic.
Wrapped the coaching path in try/catch in the route, deletes the orphan
user message from DB on failure (so the conversation doesn't end up with
a hanging user-only bubble), and returns the actual error string in the
JSON envelope: `{ error: { message: "Coach is unavailable: <reason>" } }`.
Banner copy now says "Click Retry to resend your message" so user knows
their text isn't lost.

**3. Meetings view + onboarding gate + detail/contacts polish (`5d2343d`)**

Full implementation of the "Meetings + full editorial refresh" plan
(scope chosen by Liyang via AskUserQuestion). All on mock data per
explicit user direction ("backend later").

Files added/changed (16):
- `src/types/meeting.ts` — Recording, Action, Mention, TranscriptSegment
- `src/lib/mock/recordings.ts` — 4 sample recordings (Marie, Priya, David, Sara)
- `src/app/(views)/meetings/page.tsx` — tabs orchestrator (library | recap | capture)
- `src/components/meetings/Library.tsx` — list rows with sentiment dots, topics, action counts
- `src/components/meetings/Recap.tsx` — rich summary with inline action checkboxes (parsed from `**bold**` markers in summaryRich), expandable transcript, mentions sidebar with deep-links to contacts, coach's read
- `src/components/meetings/Capture.tsx` — live mode with running timer + animated CSS waveform; upload mode with progress bar and 4-step status
- `src/components/meetings/EmptyState.tsx`
- `src/components/meetings/UsageMeter.tsx` — free-tier minutes meter (cosmetic)
- `src/components/meetings/SentimentDot.tsx`
- `src/components/contacts/MeetingStrip.tsx` — meetings-for-this-contact section in detail page
- `src/components/contacts/ContactGroupedView.tsx` — Progress layout (Needs attention / In motion / Recently discovered) replaces the old grid mode
- `src/components/onboarding/Onboarding.tsx` — 6-step conversational flow with live ~/memory/user.md preview on the right; Skip button on top-right strip; localStorage gate via `warmly.onboarded`
- Sidebar gets Meetings nav (G M shortcut) + Replay-onboarding hover button
- Contact detail gets the meetings strip and a generated Next-steps sidebar block (deterministic from contact stage)

Deep-link via `?id=rec-xxx` on the meetings route, used from contact pages.
All recap action-checkbox state is local React state — backend wiring
deferred. The "free 90 min/month" usage meter is purely cosmetic.

**4. Coaching context + artifact triggers (`b870f80`)**

Liyang reported two real bugs:
- Contact-session coach asked "who are you?" even after he'd shared
  extensive identity in the general thread.
- Draft outreach kept appearing as inline chat text instead of an artifact
  card despite the prior Session 8 fix.

Root causes:
- Contact sessions only loaded `recent_messages` from their own
  conversation. Identity disclosures live in the general thread (or in
  `users.profile_md`, which the coaching path also never read). Fresh
  contact session = zero context.
- `detectArtifactTrigger()` was a narrow keyword list. Phrases like
  "draft me an intro", "write him something", "compose a note", or bare
  "draft" failed to match — coaching LLM produced inline drafts despite
  the system prompt discouraging it.

Fixes:
- Added `user_profile_md` and `general_thread_excerpt` to `CoachingContext`
- Inject identity narrative under "WHO THE USER IS" header in system
  prompt so the LLM treats it as load-bearing, not optional flavour
- For contact sessions, load latest 15 messages from the user's most-recent
  general thread and surface them as cross-session memory
- Strengthened anti-inline-draft rule in system prompt
- Skip empty structured-profile JSON (was tempting the LLM to ask user to
  fill it in)
- Broadened `detectArtifactTrigger`: "prep", "write me/him/her", "compose",
  "intro message", "first message", "reach out", "send him", bare "draft"
  anchored at start of message, etc., across all six artifact types

**5. Wire profile_md properly (`b497555`)**

The cross-thread excerpt from #4 was a band-aid — the right answer was
`profile_md`. The infrastructure for it had existed since Phase B
(Session 9): `buildInitialProfile`, `enrichProfile`,
`looksLikeIdentityDisclosure` in `lib/ai/profile.ts`. But: NEVER CALLED
ANYWHERE. `users.profile_md` stayed NULL forever.

Three wiring points landed in this commit:

a) **Auto-bootstrap on first chat** — in `messages/route.ts`, after
saving the user message, schedule `buildInitialProfile()` via Next 16's
`after()` hook if `profile_md` is empty AND user has ≥3 prior user
messages. Reads structured fields + last 30 messages from the user's
general thread (concatenated as `about_text` seed). Idempotent — re-reads
profile_md before writing as a race guard. Fixes the existing user
(Liyang) on his very next message.

b) **Ongoing enrichment on identity disclosure** — same route. If
`profile_md` exists AND `looksLikeIdentityDisclosure()` matches the new
message (regex gate on phrases like "I'm pivoting", "my career", "I
studied at"), schedule `enrichProfile()` via `after()`. Fires on roughly
5-10% of messages.

c) **Onboarding completion endpoint** — new `POST /api/users/me/onboarding-complete`
accepts the answers JSON, updates `networking_preferences.style`, builds
initial `profile_md` from structured fields + the free-text "about/goal/gaps"
answers, persists. The Onboarding component now POSTs to it on done in
addition to the localStorage write. Future users get profile_md immediately.

All async via `after()` so chat latency unchanged. Failures log + leave
profile_md untouched.

Cost: bootstrap fires once per user lifetime (~$0.01). Enrichment ~$0.005
per fire. Onboarding ~$0.01 per new user.

**6. Empty artifact + dash-in-coaching (`4f0b98f`)**

Liyang shipped a screenshot: connection_note artifact card was empty;
agent then drafted inline ("It looks like the draft didn't come through")
WITH em-dashes. Two issues compounded.

The empty-card cause: `generation.ts` assumed the LLM always returns
`{ "message": "..." }`. If MiniMax used an alternate key (`note`, `body`,
`draft`, `text`) or omitted the field entirely, the artifact got saved
with `content.message` missing and `ArtifactCard` fell back to "Open to
view full content" — looked empty.

Fixes:
- Strip ` ```json ... ``` ` code fences before regex JSON extraction
- On JSON parse failure, log first 500 chars of raw response so future
  cases are diagnosable from Vercel logs
- Try fallback keys (`note`, `body`, `text`, `draft`, `content`) when
  message is missing/empty after parse — hoist whichever non-empty value
  exists into `message` and continue
- After sanitization, **throw** if outreach-family artifact has empty/missing
  message. The route's existing catch turns this into the deterministic
  "I tried to draft something but it failed" reply — far better UX than
  saving a broken card and letting the user discover it
- Run `stripDashes()` on coaching `agent_message` before returning. Both
  artifact JSON and coaching prose are now em-dash-free regardless of
  which path the user's request took

**7. Open-session bug (`ce232c0`)**

Clicking "Open session" on a different contact kept showing the first
contact you ever opened. Cause: `chat/page.tsx` guarded the `?contact=ID`
handler with a boolean ref (`contactHandled`) that latched true on first
navigation, so subsequent contact params were ignored.

Replaced the boolean with last-handled contact ID — the handler fires
again whenever the URL contact ID differs from what we processed last.
Also `router.replace("/chat")` after handling so back-button + revisit
don't re-trigger the same contact.

**8. Drop cross-thread excerpt (`<this commit>`)**

Now that profile_md is auto-built and enriched, the cross-thread
band-aid from #4 is redundant AND was contaminating contact sessions
with general-thread chatter ("when discussing Marie, I see you mentioned
Dominik earlier..."). Removed:
- `general_thread_excerpt` field from `CoachingContext`
- The 15-message general-thread loader in `messages/route.ts`
- The "cross-session memory" injection in `coaching.ts` user prompt
- The reference to it in the system prompt's anti-re-introduce rule

profile_md is now the canonical identity source. Contact sessions stay
scoped to their own conversation.

**Key decisions:**
- Onboarding answers go to BOTH localStorage AND a backend endpoint that
  builds profile_md. Two writes is cheap and gives us a usable mock-mode
  flow even if the LLM call fails.
- Used Next 16's `after()` (now stable, was `unstable_after`) for both
  profile bootstrap and enrichment. Confirmed available by inspecting
  `node_modules/next/dist/server/web/exports/index.d.ts`.
- For contact-session memory: profile_md > cross-thread excerpts. The
  excerpts work as a band-aid but break scope (the contact session
  shouldn't know about other contacts the user has discussed).
- For artifact JSON robustness: prefer fallback-key hoisting + post-sanitize
  validation over retry. Cheaper than re-prompting; better UX (user gets
  a clear "try again" message instead of a broken card).
- Defense-in-depth dash policy: prompt + sanitizer for artifacts, sanitizer
  also runs on coaching prose. The model will misbehave occasionally; the
  sanitizer is the only deterministic gate.

**Key learnings:**
- Today's biggest single insight: **infrastructure that exists in code but
  is never wired is worse than no infrastructure at all** — it creates the
  illusion of capability without the function. `profile_md`, `enrichProfile`,
  `looksLikeIdentityDisclosure` were all production-grade since Session 9
  but dead code in the live request path. Wiring them was 30 mins of work
  and unlocked the entire "coach has memory" experience.
- Silent UI failures are far worse than loud errors. Liyang assumed the
  whole stack was broken when in fact the backend was fine — the chat just
  ate the error response. The fix is cheap (10 lines of error UI), the cost
  of NOT having it is user trust.
- Plan mode is high-leverage when a session has many moving parts. Today's
  Meetings + editorial refresh started with a 6-part plan, scope was locked
  via AskUserQuestion before any code, all 6 parts shipped in one merge.
- `useRef(false)` as a "did this fire?" guard is a recurring foot-gun. Two
  separate bugs caught today (`contactHandled` and the implicit re-fire
  guard logic). Default to ID-comparison or just letting the effect re-run
  honestly.

**Status (end of May 9):**
- 8 commits on `claude/zen-robinson-233760`. tsc + build clean.
- Vercel preview URL has been the rolling test surface all day.
- Ready to merge to main and roll forward.

**Immediate next steps (next session):**
1. **Settings UI for profile_md** — let user inspect + edit what the coach
   knows about them. Already flagged as Part 5 in today's plan, deferred.
2. **CV upload endpoint** — `buildInitialProfile` accepts `cv_text` but
   there's no upload UI yet.
3. **Wire meetings backend** — currently mock data only. Backend = Whisper
   transcription + action extraction + Supabase persistence. Big chunk of
   work; good co-founder PR candidate.
4. **Test the dash sanitizer in production** — the coaching strip should
   eliminate em-dashes from chat replies, but watch logs for edge cases.
5. **Profile preview in onboarding** — the live `~/memory/user.md` preview
   on the right side of onboarding is currently rendered from local answers.
   It would be more truthful to fetch the actually-built profile_md after
   completion. Polish, not blocker.

### Session 11 — May 10-13, 2026

**Topics covered:**

Four-day arc that started as "make discovery smarter" and ended as a
deep diagnostic saga uncovering that LinkedIn's earliest company IDs
are 4 digits, not 5+. Two distinct phases:

**Phase A (May 10) — Smarter discovery feature work:**

1. **Smart company resolution with LLM disambiguation** (`7c27680`).
   Previous flow tried `linkedin.com/company/<naive-slug>` first and
   often landed on the wrong company (e.g., "Wonderful" → some random
   company called Wonderful instead of `wonderfulcx` the AI startup).
   New flow: navigate to LinkedIn search, scrape structured candidates
   from each row (name + slug + rawText + location + followers),
   send to MiniMax with optional user-hint ("AI agent startup"), LLM
   picks. Low-confidence → popup picker UI. New `company_slug_cache`
   Supabase table to make repeat lookups instant (zero LLM call).
   Files: `extension/service-worker/index.ts` (new
   `SCRAPE_COMPANY_CANDIDATES_JS`), `extension/popup/Popup.tsx` (hint
   input + picker UI), `src/app/api/discovery/resolve-company/route.ts`
   (restructured), `supabase/migrations/20260509000000_add_company_slug_cache.sql`.

2. **Batch contact ranking with profile_md + per-pick rationale** (`f036568`).
   Existing `/api/ai/score` scored contacts one at a time, can't
   compare. New `/api/ai/rank-batch` accepts contact_ids[], makes ONE
   MiniMax REASONING call comparing all candidates against each other
   AND against the user's profile_md narrative, returns ranked top-N
   with per-pick reasoning. Service worker fires it after discovery
   saves N candidates. Popup completed view renders top 5 with the
   LLM's specific reasoning ("Picked because: shared INSEAD class,
   same Bain → growth VC pivot you're targeting, Paris-based").
   ~3¢ per call. Fixed pre-existing bug in `apiFetch` — it was
   returning the full `{data, error}` envelope but type-casting as T,
   so every caller's typed access was secretly broken.
   Files: `src/app/api/ai/rank-batch/route.ts` (new),
   `src/lib/ai/scoring.ts` (new `rankContactsBatch`),
   `extension/service-worker/api-client.ts` (apiFetch fix + new
   `rankContactsBatch` helper), `extension/popup/Popup.tsx`
   (rankings UI in completed view + display-data enrichment via
   new `FETCH_CONTACTS_FOR_RANKINGS` SW handler), `src/app/api/contacts/route.ts`
   (new `ids` query param).

3. **Location + function filters in popup** (`3ac1999`).
   16 cities (geoUrn) + 12 functions mapped to LinkedIn search
   keywords. `extension/shared/linkedin-filters.ts` carries the maps.
   Functions use search keywords ("consultant OR consulting") rather
   than industry codes — keywords match person titles, not company
   industries, far more precise.

**Phase B (May 11-13) — The Bain saga:**

User reported discovery for "Bain" landed on Bain Brazil / Bain
Brussels (regional sub-entities) and returned 0 results because no
INSEAD alumni in Paris work specifically under those regional pages.
Six failed attempts to fix:

| # | Approach | Why it failed |
|---|---|---|
| 1 | First-match `fsd_company:N` regex on page HTML | Picked first sidebar URN |
| 2 | Most-frequent URN counting | Picked most-mentioned regional Bain |
| 3 | Match all 3 URN formats | Page had 0 `fs_company` URNs |
| 4 | Navigate to `/about/` not `/` | Page was empty stub with Affiliated-pages sidebar of regional Bains |
| 5 | Deeplink meta tags (`al:ios:url`) | Missing on /about/ pages |
| 6 | Search-row URN scrape | Row HTML had NO URN at all (React props only) |

Plan-mode re-baseline with a Plan agent surfaced the correct approach:
**LinkedIn's internal voyager API** (`/voyager/api/organization/companies?q=universalName&universalName=SLUG`).
Called from inside the LinkedIn tab via CDP `Runtime.evaluate` so the
user's session cookies + CSRF token (from JSESSIONID="ajax:N" cookie)
auth the request automatically. Returns the canonical entity URN.
Shipped in `d36b319`.

**Final root cause uncovered via diagnostic logging** (`70deb7f` →
`f39ee98`): voyager had been returning Bain's real ID `2114` the
whole time, but my URN parser required `\d{5,12}` digits. Bain joined
LinkedIn in 2003-2004 when company IDs were small auto-incrementing
integers. Every major brand from that era has a 3-4 digit ID:
- Microsoft: 1035
- LinkedIn itself: 1337
- Google: 1441
- Bain: 2114

The 5-12 digit constraint silently dropped exactly the companies that
matter most for MBA networking. Fix in `f39ee98`: relaxed
`\d{5,12}` → `\d{2,12}` in 8 places (3 extension regexes, 2 Zod
schemas, 3 tracking patterns) + added `fs_normalized_company` to URN
format alternations (the format voyager actually returns).

**Other Phase B work:**
- Bug fix: "Open session" on different contact kept showing the first
  contact ever opened (`ce232c0`). Cause: `useRef(false)` boolean
  guard latched true on first navigation, ignored subsequent contact
  params. Replaced with last-handled-contact-ID comparison.
- Bug fix: chat silent failure — server errors swallowed by UI
  (`a5c731d`, `aff9c6f`). Added contextual error banner with Retry,
  wrapped coaching path in try/catch to surface real error reasons,
  delete orphan user message from DB on failure.
- Bug fix: empty artifact cards (`4f0b98f`). When LLM returned JSON
  with field `note`/`body`/`draft` instead of `message`, artifact
  saved empty. Added field-fallback hoisting + post-sanitize empty
  guard that throws so route's catch produces "I tried to draft
  something but it failed" instead of saving a broken card.
- Restored Warmly branding (`adfbc04`). The previous Warmly rebrand
  (224 lines) was uncommitted local changes in parent repo, never
  pushed to main. Got rolled back during a stash conflict resolution.
  Recovered from stash, merged with new logic, all restyled with T
  tokens.
- Onboarding gate, Meetings view, detail/contacts polish all
  unaffected — already on main from Session 10.

**Key decisions / learnings:**

- **The diagnostic-first principle.** After 5 failed iterations on
  the Bain bug, I added `[CDP DIAG]` logging at every step in the
  critical path. The very next test surfaced "voyager (slug=...)
  could not extract numeric ID from urn `urn:li:fs_normalized_company:2114`"
  — fix was 1 line. Lesson: when an iteration fails, INSTRUMENT before
  GUESSING. The diagnostic commit was the most valuable code I wrote
  all week.

- **Plan mode for genuinely hard problems.** After 4 iterations on
  ID extraction, user explicitly said "pause and plan properly." The
  Plan agent's analysis surfaced voyager API as the structural fix,
  which I'd missed across all 4 patches. Should've reached for it
  sooner.

- **Don't impose constraints you can't justify.** The `\d{5,12}`
  regex was added in the very first commit with no rationale. I
  assumed all company IDs were 5+ digits. They aren't. Every
  arbitrary numeric range in code should have a "why this bound"
  comment, or be unbounded.

- **LinkedIn's three URN formats:** `urn:li:fs_company:N` (older,
  page-level), `urn:li:fsd_company:N` ("feed shared data", widgets),
  `urn:li:fs_normalized_company:N` (voyager API responses). The
  numeric portion is the same canonical company ID across all three —
  they're different views on the same DB row.

- **Voyager API is the right primary signal for slug→ID.** Used by
  LinkedIn's own frontend, returns canonical entities, requires only
  the user's existing session cookies. Endpoint:
  `/voyager/api/organization/companies?q=universalName&universalName=<slug>`.
  CSRF token comes from `JSESSIONID="ajax:..."` cookie (the entire
  quoted value including the `ajax:` prefix).

- **The "Affiliated pages" sidebar problem.** Global parents of
  multinational firms (Bain, McKinsey, BCG, Deloitte) render a
  prominent sidebar of regional sub-entities. URN-counting on those
  pages is structurally broken — the sidebar contributes more URN
  references than the page's own. Any future scrape-based ID
  extraction needs to be row-scoped, not page-scoped.

- **apiFetch envelope bug:** `apiFetch<T>()` was returning the full
  `{data, error}` envelope but typed as T. Every caller's typed access
  was secretly broken. Caught while wiring rank-batch. Fixed; legacy
  callers were already accommodating the bug by accessing fields
  via optional chaining.

**Status (end of May 13):**
- 14 commits shipped to main. Production at `f39ee98`.
- Voyager-based discovery confirmed working — user verified Bain
  resolves to ID 2114, matching the URL they constructed manually.
- Diagnostic `[CDP DIAG]` logs still in production code — should be
  cleaned in a follow-up commit once stability is confirmed.
- Supabase migration `20260512000000_add_company_id_to_slug_cache.sql`
  added a `resolved_company_id` column to `company_slug_cache`. Not yet
  applied to production Supabase. Until applied, cache writes fail
  silently and fall through to /about/ (harmless but no repeat-discovery
  speedup). Apply via Supabase SQL editor when convenient.

**Immediate next steps:**

1. **Clean up `[CDP DIAG]` logs** — they were instrumentation, can be
   removed or downgraded to `console.debug` behind a verbose flag.
2. **Apply the slug-cache migration** to production Supabase. One-line
   ALTER TABLE in the SQL editor.
3. **LinkedIn conversation history capture** — highest-impact unbuilt
   feature on the backlog. Content script for `/messaging/thread/...`
   URLs, scroll-up extraction, "Draft reply from this thread" button
   injected into LinkedIn's messaging UI. Coach reads thread when
   drafting follow-ups. ~3-4h, deserves its own focused session.
4. **Settings UI for profile_md** — let user inspect + edit what the
   coach knows about them. APIs exist, just need a Settings view.
5. **CV upload endpoint** — `buildInitialProfile` accepts `cv_text`
   but no upload UI yet. ~1h.

### Session 12 — May 14, 2026

**Topics covered:**

Strategy-and-infrastructure session, no shipped features but several
foundational decisions documented:

1. **Visual progress tracker rebuild** — replaced text-heavy STATUS.html
   with a properly-visual dashboard: 4-step pipeline cards with progress
   bars, session timeline with pulsing "now" marker, feature status grid,
   8-week Gantt, open strategic threads as cards, full-loop vision
   flowchart. Files: `docs/STATUS.html` (rewritten).

2. **Strategy register** — captured 11 open strategic threads with
   options + recommendations + decisions-needed format. Files:
   `docs/STRATEGY.md` (new, full elaboration), `docs/DECISIONS.md` (new,
   one-screen-per-decision for Liyang to fill in inline).

3. **Three-agent loop adopted** — orchestrator (me) writes spec +
   validates with user, developer (sub-agent or me) implements,
   tester (independent, no codebase access) verifies via headless
   browser. Codified in `docs/AGENT_LOOP.md` with spec template, dev
   brief template, tester brief template. Max 3 fail iterations before
   escalating to user.

4. **Liyang's 11 strategic answers** captured inline in DECISIONS.md.
   Greenlit: 01 onboarding completeness, 04 chat→ext trigger, 05
   tinder review, 06 in-app digest, 11 adopt loop. Parked: 02 chat
   vs dashboard, 09 meeting memory, 10 job aggregator. Research:
   08 cadence model.

### Session 13 — May 18, 2026

**Topics covered:**

First session running the three-agent loop end-to-end. Shipped the
"multi-material upload" onboarding feature AND uncovered/fixed multiple
silent infrastructure failures along the way.

**Phase A — Test infrastructure setup:**

1. **Headless extension testing solved** (`8286c2e`, `ccc9040`).
   gstack `/browse` headless+extension is broken by design — uses
   `chromium.launch() + newContext()` which Playwright docs explicitly
   say can't load extensions. The headed `connect` path uses the
   right API (`launchPersistentContext()`) but only loads the gstack
   scout extension. Built `tests/ext-tester.mjs` — standalone
   Playwright script using `launchPersistentContext()` + off-screen
   window (`--window-position=-9999,-9999 --window-size=1,1`) for
   "fake headless" that supports extensions. Verified: all 4 [WARMLY]
   boot logs captured, service worker registered, content script
   firing on LinkedIn. One-time LinkedIn login seeded into
   `.playwright-profile/` (gitignored).

2. **LinkedIn safety guardrails codified** (`ae30343`).
   `docs/LINKEDIN_GUARDRAILS.md` documents hard rules (NEVER send DM,
   never post, never edit profile/settings, never click Send even on
   pre-filled drafts) and allowed read-only operations. CLAUDE.md
   surfaces summary. Tester agent NEVER authorized to perform
   hard-rule actions. /linkedin skill verified working (cookie auth
   alive, navigated to feed, screenshot of authenticated state).

3. **Test account separation.** Created dedicated test user
   `b00611490@essec.edu` to isolate test mutations from Liyang's real
   account. Credentials in `.env.test` (gitignored). Test account
   logged in via Playwright persistent profile.

**Phase B — Migration automation:**

4. **Auto-apply Supabase migrations via GitHub Actions**
   (`dc0951e`, `1b6fc73`). Workflow at
   `.github/workflows/supabase-migrations.yml` runs `supabase db push`
   on every push to main with path filter on `supabase/migrations/**`.
   Requires three repo secrets (`SUPABASE_ACCESS_TOKEN`,
   `SUPABASE_PROJECT_REF`, `SUPABASE_DB_PASSWORD`). Setup
   documented in `.github/workflows/README-supabase-migrations.md`.

5. **Major infrastructure discovery.** First workflow run revealed
   that FIVE migrations had never been applied to production
   Supabase despite the migration files existing:
   - `20260506000000_add_user_profile_md.sql` (profile_md column)
   - `20260506000001_add_user_learnings.sql` (user_learnings table)
   - `20260509000000_add_company_slug_cache.sql` (cache table)
   - `20260512000000_add_company_id_to_slug_cache.sql` (column)
   - `20260514000000_add_voice_md_and_onboarding.sql` (today's)
   
   This explains earlier user complaints: "coach doesn't remember me"
   (profile_md column didn't exist → silent write failures),
   learning system silently dropping data, every company resolution
   recomputing because cache table didn't exist. PROJECT_MEMORY only
   flagged ONE of these as pending. Bootstrapped migration tracker
   via SQL (mark already-applied migrations in
   `supabase_migrations.schema_migrations` so CLI skips them), then
   all 5 applied cleanly. **Lesson: schema drift between repo and
   prod is dangerous and silent. Auto-migration workflow prevents
   this going forward.**

**Phase C — Feature: multi-material onboarding step:**

6. **Profile / voice file split** (`caeb1d5`). Architecture change
   per Liyang's directive: `profile_md` = identity (slow-changing
   narrative from CV/About/Goal/Career assessment), `voice_md` =
   tone/style (continuously updated from past message uploads /
   cover letter samples / future edits). Splitting prevents voice
   updates from drifting identity content.

7. **Three new columns** on users table: `onboarded` boolean
   (replaces broken localStorage-per-domain check), `voice_md` text,
   `onboarding_materials` JSONB.

8. **MaterialsStep component** (`src/components/onboarding/MaterialsStep.tsx`).
   5 toggle cards (CV / Past messages / Targets / Career assessment /
   Cover letter), each with badge showing which file it feeds
   (IDENTITY / VOICE / TARGETS). Text input only (file upload
   deferred). TagInput sub-component for target preferences (4
   tag-input fields).

9. **Endpoint changes:**
   - `POST /api/users/me/onboarding-complete` — accepts materials,
     routes CV+About+Goal+assessment to `buildInitialProfile`,
     routes past_messages+cover_letter to `buildInitialVoice`, saves
     both files atomically, sets `onboarded=true`.
   - `GET /api/users/me` (new) — exposes user state so frontend
     reads from DB not localStorage.
   - `POST /api/dev/reset-onboarding` (new) — dev-only, env-gated
     by `TEST_USER_EMAILS`, resets test account state.

10. **`buildInitialVoice()`** — new prompt in `src/lib/ai/profile.ts`.
    System prompt explicitly tells LLM to capture HOW the user
    writes (tone register, salutations, sign-offs, cadence,
    vocabulary, signature phrases) NOT what they write about.

11. **Frontend onboarded check** migrated from localStorage to API
    (`src/app/(views)/layout.tsx`). Fixes per-browser-domain bug
    where multiple accounts inherited each other's onboarded state.

12. **Draft-reply prompt updated** to read `voice_md` as a
    higher-priority voice signal than `user_memory.writing_style`.

**Phase D — Test loop validation:**

13. **First end-to-end agent-loop run.** Spawned `general-purpose`
    sub-agent with the success criteria spec (no codebase access).
    Sub-agent autonomously:
    - Logged in as test user via the live URL
    - Called `/api/dev/reset-onboarding` to reset state
    - Walked the new onboarding wizard step-by-step
    - Filled MaterialsStep with sample CV + past messages
    - Completed the wizard
    - Verified post-state via `/api/users/me`
    
    **All 17 criteria PASS.** profile_md (2964 chars) correctly
    extracted Bain/INSEAD/Paris/M&A/AI-health from CV. voice_md
    (2212 chars) correctly identified "Hi Sarah" / "Hey Marc"
    salutation patterns from past messages. No console errors.

**Key learnings:**

- **The three-agent loop works.** Total cycle time from spec
  to "this feature is verified shipped": ~50 minutes including
  implementation. Would have been multiple hours of back-and-forth
  manual testing otherwise. The independence of the tester matters —
  it has no implementation context, so it can't rationalize bugs
  as features.

- **Async onboarding submit creates a UX gap.** The wizard's POST
  to `/onboarding-complete` is fire-and-forget — `onDone()` fires
  on a 1.2s timeout regardless of whether the LLM finished building
  profile_md and voice_md (~5s total). For ~3-4s after the wizard
  closes, the user is "onboarded" client-side but server still has
  null profile_md / voice_md. Not blocking but worth a "Building
  your profile..." chip in the memory panel for the first ~10s.
  Surfaced by tester, captured for follow-up.

- **Schema drift is silent and expensive.** Migration files existed
  in the repo for FIVE schema changes that were never applied to
  production. Auto-apply workflow now prevents this. Lesson: never
  trust "the migration is in the repo" as evidence it ran.

**Status (end of May 18):**
- 6+ commits shipped to main, latest `1b6fc73`
- All 5 pending migrations applied via automated workflow
- Multi-material onboarding step LIVE in production
- Tester verified end-to-end PASS on live URL
- profile_md / voice_md split working as designed
- LinkedIn auth seeded in ext-tester persistent profile for
  future extension testing
- TEST_USER_EMAILS env var live on Vercel

**Immediate next steps (Liyang's call):**
1. **Decide on async-onboarding UX** — A (wizard waits ~5s), B
   (memory panel chip), or C (block first chat message). My pick: B.
2. **Tinder-style profile review** (Decision 05, greenlit) — fun
   brand-defining moment, ~4h
3. **Chat → extension trigger artifact** (Decision 04, greenlit) —
   high-leverage, ~6-8h
4. **In-app weekly nudge digest** (Decision 06, greenlit) — ~3h
5. **Research network-cadence best practices** (Decision 08) before
   building the nurture engine

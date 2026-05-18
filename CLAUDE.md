# AI Networking Coach — Project Instructions

## What We're Building
An AI-powered networking coach that guides professionals through the full networking lifecycle: Discover → Strategize → Prepare → Maintain. Chat-first interface where users talk to an AI agent that accumulates context over time.

**Full PRD:** `docs/PRD_AI_Networking_Coach_v1.md` — READ THIS before making architectural decisions.

## Tech Stack (Non-Negotiable)
- **Frontend:** Next.js 14+ (App Router), React 18+, TypeScript, Tailwind CSS
- **Backend:** Next.js API Routes (serverless functions on Vercel)
- **Database:** Supabase (PostgreSQL + Auth + Realtime + Storage)
- **AI:** Anthropic Claude API (Haiku for scoring/simple tasks, Sonnet for complex reasoning)
- **Chrome Extension:** Manifest V3 (content script + service worker)
- **Hosting:** Vercel
- **Analytics:** PostHog (add later, not blocking)

## Project Structure
```
ai-networking-coach/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (auth)/             # Auth pages (login, signup)
│   │   ├── (views)/            # Main app views
│   │   │   ├── chat/           # Chat view (primary)
│   │   │   ├── contacts/       # Contacts view (profile hub)
│   │   │   └── goals/          # Goals view (progress tracking)
│   │   ├── api/                # API routes
│   │   │   ├── ai/             # AI engine endpoints
│   │   │   │   ├── score/      # Contact scoring (Haiku)
│   │   │   │   ├── generate/   # Message/artifact generation (Sonnet)
│   │   │   │   └── search/     # Company intel web search
│   │   │   ├── contacts/       # Contact CRUD
│   │   │   ├── conversations/  # Conversation management
│   │   │   ├── artifacts/      # Artifact CRUD
│   │   │   ├── discovery/      # Discovery session management
│   │   │   └── goals/          # Goal tracking
│   │   ├── layout.tsx          # Root layout with sidebar nav
│   │   └── page.tsx            # Landing / redirect to chat
│   ├── components/             # Shared React components
│   │   ├── ui/                 # Base UI components (buttons, cards, inputs)
│   │   ├── chat/               # Chat-specific components
│   │   │   ├── MessageBubble.tsx
│   │   │   ├── SessionSidebar.tsx
│   │   │   ├── ArtifactCard.tsx
│   │   │   └── ChatInput.tsx
│   │   ├── contacts/           # Contact-specific components
│   │   │   ├── ContactCard.tsx
│   │   │   ├── ContactDetail.tsx
│   │   │   └── ContactGrid.tsx
│   │   └── goals/              # Goal-specific components
│   ├── lib/                    # Shared utilities
│   │   ├── supabase/           # Supabase client + helpers
│   │   │   ├── client.ts       # Browser client
│   │   │   ├── server.ts       # Server client
│   │   │   └── middleware.ts   # Auth middleware
│   │   ├── ai/                 # AI engine
│   │   │   ├── scoring.ts      # Contact scoring prompts + logic
│   │   │   ├── generation.ts   # Artifact generation (messages, prep, etc.)
│   │   │   ├── coaching.ts     # Strategic coaching logic
│   │   │   ├── context.ts      # Context window management (rolling summarization)
│   │   │   └── models.ts       # Model routing (Haiku vs Sonnet)
│   │   ├── search/             # Web search for company intel
│   │   └── utils/              # General helpers
│   ├── types/                  # TypeScript type definitions
│   │   ├── database.ts         # Supabase/DB types (generated + custom)
│   │   ├── ai.ts               # AI engine types (prompts, responses)
│   │   ├── artifacts.ts        # Artifact content structures (6 types)
│   │   └── api.ts              # API request/response types
│   └── hooks/                  # Custom React hooks
├── extension/                  # Chrome Extension (Manifest V3)
│   ├── manifest.json
│   ├── content-script/         # Runs on LinkedIn pages
│   │   ├── dom-reader.ts       # Profile data extraction
│   │   ├── navigator.ts        # Search + scroll + navigation
│   │   ├── orchestrator.ts     # Discovery session loop (NOT in service worker!)
│   │   └── behavior-sim.ts     # Human-like delays + patterns
│   ├── service-worker/         # Background (short-lived tasks only)
│   │   ├── api-client.ts       # Backend API calls
│   │   ├── rate-limiter.ts     # Hard-coded limits
│   │   └── auth.ts             # Supabase session sharing
│   ├── popup/                  # Minimal popup UI
│   │   └── Popup.tsx
│   └── shared/                 # Shared between content + worker
│       └── types.ts
├── supabase/
│   ├── migrations/             # SQL migration files
│   └── seed.sql                # Founder profile seed data
├── docs/
│   ├── PRD_AI_Networking_Coach_v1.md
│   └── PROJECT_MEMORY.md
├── public/                     # Static assets
└── tests/                      # Test files mirror src/ structure
```

## Coding Conventions

### TypeScript
- Strict mode always on. No `any` types unless explicitly justified with a comment.
- Use Zod for runtime validation of API inputs and AI outputs.
- Prefer `interface` for object shapes, `type` for unions/intersections.
- All API routes must validate input with Zod before processing.

### React / Next.js
- Use Server Components by default. Add `"use client"` only when needed (interactivity, hooks, browser APIs).
- Keep components small — under 150 lines. Extract sub-components when a component grows.
- Use Tailwind for all styling. No CSS modules, no styled-components.
- Every component that fetches data must handle loading and error states.

### Design & UI Quality
- This prototype MUST look polished and professional. We're showing it to testers and IVC judges.
- **BEFORE any frontend work**, read `.claude/skills/design-references/SKILL.md` for our complete design system (colors, typography, spacing, component patterns).
- **Design reference files** in `.claude/skills/design-references/`: LINEAR_DESIGN.md (sidebar/nav patterns), NOTION_DESIGN.md (content areas/cards), SUPABASE_DESIGN.md (dashboards/tables), VERCEL_DESIGN.md (status/deploy UI). Read the relevant reference when building that type of component.
- Color palette: dark sidebar (#1a1a2e), white content area, accent blue (#3b82f6), success green (#10b981), warning amber (#f59e0b), error red (#ef4444).
- Typography: Inter or system font stack. Clear hierarchy with font sizes. Negative letter-spacing on headings 24px+.
- Borders: whisper-thin (1px, rgba(0,0,0,0.08) on light, rgba(255,255,255,0.06) on dark). No heavy borders.
- Animations: subtle transitions on hover/focus (150ms ease). No jarring movements.
- Responsive: must work on laptop screens (1280px+). Mobile is v2.
- Refer to the frontend-design plugin and gstack /design-review for quality standards.

### Supabase
- Use Row Level Security (RLS) on ALL tables. No exceptions.
- All queries go through the Supabase client, never raw SQL in API routes.
- Use Supabase Auth for user management. Support email + Google OAuth.

### AI Engine
- Model routing: Haiku for scoring + simple tasks, Sonnet for complex reasoning. See PRD Section 5.4.1.
- Always use structured output (JSON) for scoring and artifact generation.
- Implement rolling summarization for long conversations. See PRD Section 5.4.2.
- Company intel via backend web search API, NOT Claude browsing. See PRD Section 5.4.3.
- All AI prompts live in `/src/lib/ai/` as named, version-controlled functions.

### Chrome Extension
- CRITICAL: Discovery orchestration runs in content script, NOT service worker. Service workers die after 30s inactivity (Manifest V3 limitation).
- DOM extraction uses multi-selector fallback strategy. See PRD DOM Fragility section.
- Hard-coded rate limits: max 25 profiles/session, max 2 sessions/day, min 2h between sessions.
- Extension has minimal UI (popup only). All rich features are in the web app.

### Testing
- Write tests for: API routes, AI prompt functions, Supabase queries, critical UI flows.
- Use Vitest for unit tests, Playwright for E2E.
- Test AI outputs with snapshot tests (expected structure, not exact content).

### Git
- Conventional commits: `feat:`, `fix:`, `refactor:`, `test:`, `docs:`
- One feature per branch. PR before merge to main.
- Never commit API keys, .env files, or user data.

## Key Architectural Decisions (Do Not Override)
1. Chat-first interface — everything happens through conversation, not forms/dashboards
2. Session-per-contact — each contact gets a dedicated conversation thread
3. 6 artifact types: connection_note, outreach_draft, meeting_prep, meeting_notes, action_plan, follow_up_draft
4. Agent learning via user_memory JSON field on Users table (see PRD Section 5.9)
5. Manual contact entry via 3 methods: chat, URL paste, extension bookmark (PRD DIS-11)

## Validation Rules (Self-Check Before Reporting Done)
After completing ANY task, run these checks. If any fail, fix the issue and re-check. Do NOT report completion until all relevant checks pass.

### Always Run (every task)
1. `npx tsc --noEmit` — Zero TypeScript errors. No exceptions.
2. `npm run build` — Full Next.js build must succeed.

### After Backend Changes (API routes, lib/, supabase/)
3. `npx vitest run` — All tests must pass.
4. Verify every API route has Zod input validation (grep for `z.object` in each route file).
5. Verify every API route returns typed responses matching `src/types/api.ts`.
6. Verify no raw SQL — all queries go through Supabase client.

### After Frontend Changes (components/, app/(views)/, hooks/)
7. Every component that fetches data must have a loading skeleton and error state.
8. No inline colors or font sizes — everything uses Tailwind classes from the design system.
9. No `any` types — grep for `: any` and fix.

### After Extension Changes (extension/)
10. `manifest.json` is valid Manifest V3 (`"manifest_version": 3`).
11. No `eval()` calls anywhere in extension code.
12. Rate limit constants are present: `MAX_PROFILES_PER_SESSION = 25`, `MAX_SESSIONS_PER_DAY = 2`.
13. Orchestration logic is in content script, NOT in service worker.

### After Database Changes (supabase/)
14. Every table has Row Level Security enabled.
15. UNIQUE constraint exists on `(user_id, linkedin_url)` in contacts table.
16. All JSON columns have a comment describing their expected structure.

### Full Project Validation (run before committing)
```bash
npx tsc --noEmit && npm run build && npx vitest run
```
If this command fails, do NOT commit. Fix first.

## What NOT To Do
- Do NOT use ChatGPT, OpenAI, or any non-Anthropic LLM in the codebase
- Do NOT send automated messages on LinkedIn. The extension is READ-ONLY.
- Do NOT store API keys in code. Use environment variables only.
- Do NOT build a mobile app. Web-first, laptop screens.
- Do NOT add features not in the PRD without explicit approval.
- Do NOT use CSS frameworks other than Tailwind.
- Do NOT skip TypeScript types for "speed." Types prevent bugs.

## LinkedIn Safety Guardrails (CRITICAL)
Read `docs/LINKEDIN_GUARDRAILS.md` before invoking any tool that touches LinkedIn (`/linkedin` skill, `tests/ext-tester.mjs`, gstack `/browse` on linkedin.com, or the Warmly extension itself).

**NEVER without explicit user approval:**
- Send a LinkedIn message (DM or InMail)
- Send / accept / reject a connection request
- Create a post, share, comment, like, or react
- Edit profile (name, headline, about, photo, experiences, education, skills)
- Change account settings (privacy, notifications, subscription)
- Click "Send" on any compose form, even pre-filled

**Allowed:** view profiles / messages / companies / jobs / connections, search, screenshot, navigate. Pre-fill drafts (text into compose box) is OK — submit is NOT.

The tester agent is NEVER authorized to perform hard-rule actions. The orchestrator proposes; the user approves; only then execute.

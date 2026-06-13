# HANDOFF, Warmly V2 build (current)

_Last updated: 2026-06-13. Self-contained: a fresh agent should be able to read ONLY this
(plus `docs/VISION.md`) and continue. Supersedes the prior LinkedIn-sync handoff, that
deep detail now lives in `docs/LINKEDIN_SYNC_HOW_IT_WORKS.md` +
`docs/EXTENSION_SPEED_HANDOFF_2026-06-11.md`._

> ⭐ **Read `docs/VISION.md` FIRST**, the durable product spec (full user journey, gap
> assessment, phased roadmap, locked decisions). This HANDOFF is the operational + status
> layer on top of it.

---

## Goal
Build the Warmly V2 product, an AI networking coach, per `docs/VISION.md`. V2 is a real
`/v2/*` route segment **built on top of the existing V1 app** (NOT from scratch): it reuses
MiniMax (the AI layer), Supabase (DB/auth/RLS), Vercel (deploy), the LinkedIn Chrome
extension, and V1's design tokens. V1 (`/chat`, `/contacts`, `/review`…) stays untouched
and running. Stack: Next.js 16 (App Router) + React 19 + Tailwind v4.

## Current progress (all live at `ai-networking-coach.vercel.app/v2`, on `main`, tester-verified)
- **Phase 0**, `/v2` shell (dark sidebar Home/Discover/Contacts/Settings) + ported design primitives (`src/components/v2/`).
- **Phase 1**, Discovery stabilized: swipe deck never hangs; the "refine with your coach" chat **really re-filters/re-ranks** the deck; INSEAD + LinkedIn doors live.
- **Phase 2**, Real onboarding: `/v2/onboarding` CV upload → parse (PDF/DOCX/txt) → "here's what we pulled from your CV" prefill → "Build my coach" → real `profile_md`/`voice_md`. An `OnboardingGate` redirects non-onboarded users there.
- **Phase 3a**, Goal-driven discovery: INSEAD first batch filtered by the user's target industry/geo, then LLM-ranked best-first, with a **per-user score cache** (`directory_scores`) so tiers + rationale render instantly and reliably.
- **Phase 5a**, Meeting synthesis: prep live-notes "Save & synthesize" → `meeting_notes` artifact (key takeaways + next steps) on the contact timeline.
- **Reliability**, cold-start AI 500 (#12) masked on every surface (draft + prep silent-retry; scoring caches+degrades); Invalid-Date fixed; test-account profile seeded.

The core loop works end to end: **CV → profile → goal-filtered, scored discovery → save → draft → meeting prep → synthesized notes.**

## Architecture / key files
- **V2 app:** `src/app/v2/**` (layout, Sidebar, OnboardingGate, pages) + `src/components/v2/**` (discover/, contacts/, prep/, onboarding/, settings/, home/, primitives.tsx, icons.tsx, palette.ts, Toast.tsx).
- **Discovery:** `src/components/v2/discover/DiscoverScreen.tsx` (state machine, goal-filter keyword→canonical map, scoring with AbortController, refine). Endpoints: `GET /api/directory` (filtered; case-insensitive multi-value `overlaps`), `POST /api/directory/save`, `POST /api/directory/rank` (read-through cached).
- **Shared INSEAD directory:** `directory_profiles` table (961 alumni, shared/RLS-read) + `directory_scores` (per-user cache). Loaded via `tests/ingest-directory.mjs`.
- **Onboarding:** `POST /api/onboarding/parse-cv` (unpdf/mammoth + MiniMax field extraction) → reuses `POST /api/users/me/onboarding-complete` (builds profile_md/voice_md via `src/lib/ai/profile.ts`).
- **AI:** `src/lib/ai/minimax.ts` (`callMiniMax`), `scoring.ts` (`rankContactsBatch`), `generation.ts`, `src/app/api/ai/{generate,rank-batch,score}`.
- **Specs written this build:** `docs/specs/V2_P1_DISCOVER.md`, `V2_P2_CONTACTS.md`, `V2_P3.md`, `V2_P4_DISCOVERY_ENGINE.md`, `V2_PHASE2_ONBOARDING.md`. **CRM proposal:** `docs/CRM_PROPOSAL.md`.

## Operational (how to build/test/ship)
- **Deploy:** push to `main` → Vercel auto-deploys (~2 min). Wait ~140s before testing the live URL.
- **Tester account (`.env.test`):** `liyang.guo@essec.edu` / `123456789`. Supabase user_id `deed7f54-3c3c-40a9-bf20-2e17bc6192e0`. (Email+password login at `/login`, NOT Google.)
- **Supabase:** creds in `.env.local` (`NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` for REST/data). **DDL needs `SUPABASE_ACCESS_TOKEN` (sbp_...) in `.env.local`** → run migrations via `node tests/apply-migration.mjs supabase/migrations/<file>.sql` (Management API). Project ref `bdwrpfattfyyzmftmtqf`.
- **MiniMax:** `MINIMAX_API_KEY` in `.env.vercel` (the entire AI layer; NOT Anthropic, the CLAUDE.md "Anthropic only" line is stale, the user chose MiniMax).
- **Validation gate (every change):** `npx tsc --noEmit` + `npm run build` clean, no `: any`, `npx vitest run` (2 known-pre-existing failures: a conversations `after()` test + an extension Playwright spec, unrelated).
- **Three-agent loop (MANDATORY):** orchestrator writes a per-screen spec with success criteria → spawn a `frontend`/`backend` dev agent → spawn an **independent `tester`** (headless browser, live URL, `.env.test`, PASS/FAIL + screenshots). **Nothing ships without tester PASS.** Tester never reads code / never fixes bugs / never does LinkedIn actions.

## What worked
- Build-on-top-of-V1 (reused all infra) instead of from scratch.
- Tester-gated phases caught real bugs tsc can't (paginated-shape misread, empty-profile 500, refine-empties-deck).
- Root-causing before patching: the recurring discovery 500s were an **empty `profile_md`** (model refuses to rank with no user context), not token budget.
- **Score caching** (`directory_scores`, read-through) fixed the flaky scoring permanently, first successful rank sticks; server completes + caches even if the client aborts.
- CV parse via `unpdf` (PDF) + `mammoth` (DOCX), serverless-friendly; MiniMax field extraction is fast (~5s) and accurate.

## What didn't work / gotchas (don't repeat)
- **MiniMax-M2.7-highspeed is a reasoning model** (~15-45s, highly variable; emits `<think>`; NO working disable-thinking param, `thinking=false`→400, `reasoning_effort` no-op). **Never block UI on it.** Score in the background + cache; for one-shot calls (draft/prep) use a silent retry + loading state.
- Rank token budget: 1500 **truncates the JSON → 500**; 2500 is the sweet spot; 4000 runs ~30s+ and intermittently fails. `rank-batch` caps `top_n` at 20, don't send more. Score only ~8 cards, not the whole deck.
- A new user with no `profile_md` → scoring AND drafts AND prep degrade/500 → Phase 2 onboarding is a **prerequisite**, not polish.
- The independent `tester` sub-agent sometimes stalls (watchdog ~600s), keep tester prompts **narrow** (one flow, bounded waits).
- `thewarmly.com` works everywhere EXCEPT INSEAD's network (Cato web filter blocks new domains, an IT allowlist request, not a code bug). DNS already points to Vercel.
- DDL can't go through the service-role REST API (PostgREST), needs the Management API token.

## Next steps (all decision-gated, pick one; none are blockers)
1. **CRM build (most build-ready)**, approve `docs/CRM_PROPOSAL.md` and build the MVP: add `relationship_category` + `cadence_days` + `next_touch_at` to `contacts`; per-contact category dropdown; "Due to reconnect" surfacing reusing the Today/contacts views; reuse the `follow_up_draft` engine for re-touch. (Decided design: AI-suggest + one-tap-confirm, NOT a swipe game; 6 job-search categories with per-category cadence.)
2. **Phase 4, cross-user 2nd-degree warm-intro graph (the differentiator)**, run a schema/architecture spike first. Consent is **explicit opt-in** (decided). Needs: capture each user's own LinkedIn URN at sync; `users.share_network_for_intros` flag; Warmly-user adjacency detection; a matching query (peers A is connected to whose connections match A's goal) → "ask B for an intro" cards.
3. **Phase 3b, proactive company discovery**, wire the extension's existing `CDP_DISCOVER` (company → live scrape, already built, driven from the extension popup today) into the V2 chat: name a company → validate criteria → trigger → results stream into the deck.
4. **#15 company-intel**, `searchCompanyIntel` needs a `PERPLEXITY_API_KEY` (paid) or an alternative search source; currently degrades to "no recent news" in meeting prep.
5. **Domain wiring (thewarmly.com)**, set `NEXT_PUBLIC_APP_URL` + add the domain to Supabase Auth redirect URLs + the extension manifest/auth-bridge allowed-origins (rebuild extension). Partly needs Liyang (Supabase dashboard + reload the extension).
6. **Minor polish**, the onboarding processing "0 of 2" step counter reads oddly.

**Recommended top next action:** confirm with Liyang whether to **build the CRM MVP** (`docs/CRM_PROPOSAL.md`, approval pending) or **run the Phase 4 spike**, then proceed via the three-agent tester-gated loop.

# Warmly, Product Vision, Gap & Roadmap

> **READ THIS FIRST before any Warmly work.** It is the durable product spec, the
> intended end-to-end user journey, an honest assessment of what's built vs missing,
> and the phased roadmap. Update it as phases land. (Source: the plan approved
> 2026-06-11; gap verified by three read-only code investigations the same day.)

---

## The vision, full user journey

1. **Sign up**, a fresh user creates an account.
2. **Onboarding**, easy flow: upload CV (+ optional cover letter / assessment). The
   tool **reads the CV**, generates the user's identity (`profile_md`, and `voice_md`
   from writing samples), and **pre-fills the goal form** (prior industry/function,
   nationality, work authorization, INSEAD class; target industry/role/companies/
   geography) inferred from the CV, which the user edits → "Build my coach".
3. **Home → discovery engine** with two doors: INSEAD CV book and LinkedIn.
4. **INSEAD door**, a first batch of alumni pushed **based on the user's goal**; save/
   skip; the user can **refine in chat** ("find people in AI") and get a new batch.
5. **LinkedIn door**, guide the user through **installing the extension**, then
   "Connect" → the extension **syncs their connections to a central database**. The
   power is **cross-user 2nd-degree warm intros**: if User A ↔ User B are both on
   Warmly and connected, and B has many connections in A's target industry, Warmly
   surfaces B's connections to A with "ask B for a warm intro".
6. **Proactive discovery**, the user names a company in chat → Warmly validates the
   criteria (e.g. Bain, Paris, INSEAD) → triggers the **Chrome-debugger scrape** of
   that company → pushes matching profiles gradually.
7. **Save → Contacts**, each saved profile becomes a contact card. The user **drafts
   outreach in their own voice**, edits directly or via chat; **every sent message is
   logged**; voice is captured to `voice_md`.
8. **Meeting prep**, ask for context/length/objective → structured research → **take
   notes in the artifact** → on save, an **LLM synthesizes the notes** into the
   contact's history.
9. **Relationship maintenance / CRM**, categorize contacts (warm / professional / …)
   and set **per-category follow-up reminders/cadence**.

---

## Gap assessment (Built / Partial / Missing)

| Journey step | Status | Detail |
|---|---|---|
| 1. Sign up | ✅ Built | Supabase Auth (email+password + Google), `/signup`. |
| 2. Onboarding → profile/voice | ⚠️ Partial | Conversational onboarding + `profile_md`/`voice_md` from **pasted text** works. Missing: file upload (disabled), PDF/DOCX parsing, CV→structured-field extraction, the "here's what we pulled from your CV" prefill screen, processing animation. V2 onboarding **not ported** (still V1). |
| 3. Prefill goals from CV | ❌ Missing | All target fields typed manually; nothing parses the CV into them. |
| 4. Discovery engine | ⚠️ Built-but-buggy | Both doors live; **scoring 504s + refine empties deck** (Phase 1 fixes). |
| 5a. INSEAD goal-based batch + chat | ⚠️ Partial | Directory can filter by goal params, but the initial deck is **not** pre-filtered by goal (first N, then LLM-rank). Ranking = pure LLM (MiniMax reasoning vs `profile_md`). |
| 5b. LinkedIn extension install guidance | ⚠️ Partial | Setup checklist is local-boolean, not real install detection/guidance. |
| 5c. **Cross-user 2nd-degree warm intros** | ❌ **Missing (biggest gap)** | Contacts strictly per-user; **no cross-user graph, no "via peer", no warm-intro matching**. `mutual_connections` is display-only. |
| 6. Proactive company discovery | ⚠️ Partial | The extension's **CDP_DISCOVER is fully functional** (company → live scrape) but driven from the **extension popup**, NOT wired to the V2 web chat. |
| 7. Save → contacts → draft → log → voice | ✅ Built | Contacts/detail/draft (real MiniMax + voice loop); sent artifacts logged; `voice_md` + edit→`user_memory` loop. |
| 8. Meeting prep → synthesis | ⚠️ Partial | Prep + live notes built; `meeting_notes` artifact type exists but the **synthesis step isn't wired** (notes save as raw text). |
| 9. CRM / relationship maintenance | ✅ Built (MVP) | Phase 5b: 4 relationship categories (nurturing/keep_warm/inner_circle/dormant) with per-category cadence + per-contact override; `next_touch_at` recomputed at categorize/outreach-sent/meeting-logged; "Due to reconnect" surfaces in the V2 Contacts list + a brief V2 home strip; one-tap "Draft re-touch" reuses `follow_up_draft`. Deferred: AI auto-suggest, swipe-to-sort, inferred cadence. |
| (cross-cutting) Custom domain | ⚠️ Partial | `thewarmly.com` resolves to Vercel + works off-INSEAD-network; login + extension still hardcode the old origin (env / Supabase redirect / extension manifest+auth-bridge need the new domain). INSEAD network blocks it (Cato filter, an IT allowlist request, not code). |

---

## Roadmap (phased; each phase tester-gated via the three-agent loop)

**Phase 1, Stabilize discovery, ✅ DONE (2026-06-12).** No infinite spinner
(AbortController, non-blocking scoring); INSEAD refine works (case-insensitive
multi-value `industries` overlap + keyword→canonical map, city→`location` ilike, in-place
refine state, never empties on 0 results); LinkedIn refine honest on no-match; scoring
lands real tier + rationale (~10-30s). **Key learning:** the AI features all depend on the
user having a `profile_md`, with none, scoring 500s and drafts/prep return clarifying-
question stubs (so Phase 2 onboarding is a *prerequisite*, not polish). MiniMax-M2.7 is a
reasoning model (~15-30s, no disable-thinking param) → a real perf item: consider a faster
model for scoring or pre-computing/caching scores on save (tracked under reliability #12).
Rank routes now degrade to unscored (200) instead of 500 when the model can't return JSON.

**Phase 2, Real onboarding (CV → profile), ✅ DONE (2026-06-12).** `/v2/onboarding`:
drag-drop CV upload → `POST /api/onboarding/parse-cv` (PDF via `unpdf`, DOCX via
`mammoth`, txt direct; + MiniMax field extraction ~5-9s) → the "here's what we pulled from
your CV" review/prefill screen (background + targets, editable) → "Build my coach" →
existing `onboarding-complete` builds `profile_md`/`voice_md` (~22s). An `OnboardingGate`
redirects non-onboarded users from `/v2/*` to onboarding; Settings has a "Rebuild profile
from CV" link. Tester-verified end to end (prefill accurate, build lands on `/v2`).
Minor polish left: the processing "0 of 2" step counter.

**Phase 3a, Goal-driven discovery, ✅ DONE (2026-06-12).** The INSEAD first batch is
filtered by the user's goal (target_industries → canonical directory industries via
overlap) then LLM-ranked best-first, hybrid retrieval + ranking. Scoring is now
**per-user cached** (`directory_scores` table, read-through in `/api/directory/rank`):
first successful rank persists, repeat opens are instant + scored, and a client timeout
no longer loses the result (server finishes + caches). This resolved the recurring
scoring-latency flakiness. Verified: deck leads with the strongest match, "Strong" badge
+ rationale render <1s.

**Phase 3b, Proactive company discovery (PENDING).** Wire the extension's `CDP_DISCOVER`
into the V2 chat: user names a company → validate-criteria step → trigger the existing
extension discovery → results stream into the deck. Reuses the built
`CDP_DISCOVER`/`discovery_sessions` plumbing; net-new is the web-app trigger + results
channel. (Bigger; design pass needed.)

**Phase 4, Cross-user 2nd-degree warm-intro graph (the differentiator; explicit
opt-in).** Net-new: (1) capture each user's own LinkedIn URN at sync; (2) a consent flag
`users.share_network_for_intros` (default off, only opted-in networks are matchable);
(3) detect Warmly-user adjacency (A and B both opted-in AND connected); (4) a matching
query, for User A, find opted-in peers B that A is connected to whose connections match
A's goal → surface as 2nd-degree cards with "ask B for a warm intro" provenance (makes
the design's "via peer · N mutual" real); (5) a warm-intro request draft type. Needs a
short design/schema spike first. Consent is **explicit opt-in** (decided).

**Phase 5a, Meeting synthesis, ✅ DONE (2026-06-13).** The prep live-notes panel has a
"Save & synthesize" → `/api/ai/generate {meeting_notes}` → a `{key_takeaways, next_steps,
user_raw_notes}` artifact on the contact's timeline, shown inline as a simple summary card
(lightweight per request; generate's instruction cap raised 1000→8000 for full notes).
Tester-verified. **Reliability (#12):** the cold-start generate 500 is now masked on every
AI surface, draft editor + meeting prep both silent-retry once, and directory scoring
caches + degrades. Underlying cause (reasoning-model cold latency) remains but never
reaches the user.

**Phase 5b, CRM MVP, ✅ DONE (2026-06-15).** Manual-first relationship maintenance, spec
`docs/specs/V2_P5B_CRM_MVP.md`. Taxonomy revised with Liyang from the proposal's 6 to **4
buckets** (nurturing 14d / keep_warm 30d / inner_circle 60d / dormant off; null =
uncategorized), with the **inverted-cadence** insight (close ties get the *lightest* cadence;
the maintenance budget goes to the warm-professional ties that decay silently). 3 schema
columns (`relationship_category`/`cadence_days`/`next_touch_at`); `next_touch_at` recomputed
at the 3 write points (categorize, outreach→sent, meeting-logged) so acting on someone
auto-clears their reminder, no cron. Surfaces in BOTH the V2 Contacts list (filter pill +
capped section, most-overdue first) AND a brief V2 home reminder strip; per-contact category
dropdown + cadence override on the detail; one-tap "Draft re-touch" reuses the
`follow_up_draft` engine. Shared logic in `src/lib/crm/cadence.ts` (19 unit tests).
Tester-verified end to end on the live URL (categorize persists → due surfaces in list + home
→ deep-link → re-touch draft generated; V1 clean). Deferred to a later round: AI auto-suggest
category, swipe-to-sort bulk triage, automatic (inferred) cadence.

**Cross-cutting (low effort):** domain wiring for `thewarmly.com`, env
`NEXT_PUBLIC_APP_URL`, Supabase redirect URLs, extension manifest + `auth-bridge`
allowed-origins, so login + sync work there.

---

## Decisions (locked)
- **Sequence:** stabilize discovery first.
- **Cross-user intros:** explicit opt-in.

## Deferred decisions (resolve in-phase)
- PDF-vs-DOCX parser choice (Phase 2).
- Warmly-user-adjacency detection + whether to store a normalized connection graph (Phase 4 spike).
- CRM category taxonomy + cadence model (Phase 5 research output).

---

## How it's built (non-negotiable process)
Every phase ships only on a **three-way green**: `tsc` + `build` clean, V1 + extension
regression intact, and an **independent tester PASS** (headless browser, live URL,
screenshots) against that phase's observable success criteria. Per the three-agent loop
in `~/Documents/Obsidian Vault/_claude/reference/claude-code-build-playbook.md`:
orchestrator specs → dev agent builds → independent tester validates. Guardrails:
LinkedIn read-only (no state-changing calls), MiniMax-only for AI.

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
| 9. CRM / relationship maintenance | ❌ Missing | Only `status` + `last_interaction_at` + a hardcoded 30-day follow-up flag. No categories, cadence, reminders, or relationship timeline. |
| (cross-cutting) Custom domain | ⚠️ Partial | `thewarmly.com` resolves to Vercel + works off-INSEAD-network; login + extension still hardcode the old origin (env / Supabase redirect / extension manifest+auth-bridge need the new domain). INSEAD network blocks it (Cato filter, an IT allowlist request, not code). |

---

## Roadmap (phased; each phase tester-gated via the three-agent loop)

**Phase 1, Stabilize discovery (current).** Fix scoring (score only ~8 visible cards,
`top_n ≤ 20`, AbortController client timeout so the spinner always resolves, trim
candidate payloads in `scoring.ts`); fix the INSEAD refine (case-insensitive multi-value
`industries` overlap with a keyword→canonical map, city terms → `location` ilike, an
in-place "refining" state instead of the full-screen skeleton, never empty the deck on
0 results); LinkedIn refine honesty. Plus reliability: generate cold-start 500,
company-intel search 500/404, populate the test-account profile.

**Phase 2, Real onboarding (CV → profile).** Port the V2 onboarding: drag-drop file
upload → `POST /api/onboarding/parse-cv` (PDF/DOCX→text + a MiniMax extraction into
structured fields) → the review/prefill screen (inferred-from-CV background + targets) →
"Build my coach" → processing animation. Reuse `src/lib/ai/profile.ts`. Net-new: upload
+ parse + structured extraction + the review UI. Side benefit: a rich `profile_md` fixes
the thin-profile draft/scoring quality.

**Phase 3, Goal-driven + proactive discovery.** (a) Pre-filter the INSEAD first batch
by the user's goal (target industry/geo → `/api/directory` params) **then** LLM-rank,
i.e. hybrid: structured retrieval to narrow + LLM to rank/justify (the answer to "LLM or
other": both). (b) Wire the extension's `CDP_DISCOVER` into the V2 chat: user names a
company → validate-criteria step → trigger the existing extension discovery → results
stream into the deck. Reuses the built `CDP_DISCOVER`/`discovery_sessions` plumbing.

**Phase 4, Cross-user 2nd-degree warm-intro graph (the differentiator; explicit
opt-in).** Net-new: (1) capture each user's own LinkedIn URN at sync; (2) a consent flag
`users.share_network_for_intros` (default off, only opted-in networks are matchable);
(3) detect Warmly-user adjacency (A and B both opted-in AND connected); (4) a matching
query, for User A, find opted-in peers B that A is connected to whose connections match
A's goal → surface as 2nd-degree cards with "ask B for a warm intro" provenance (makes
the design's "via peer · N mutual" real); (5) a warm-intro request draft type. Needs a
short design/schema spike first. Consent is **explicit opt-in** (decided).

**Phase 5, Meeting synthesis + CRM.** (a) Wire meeting synthesis: a "Save & synthesize"
action POSTing raw notes to `/api/ai/generate {artifact_type:"meeting_notes"}` → a
structured artifact on the contact's timeline (type already exists). (b) CRM/relationship
maintenance, **research-first**: a dedicated proposal (category taxonomy, per-category
cadence, schema additions like `contacts.relationship_category` + `cadence_days` +
`next_touch_at`, a low-friction classification UX reusing the swipe deck + Today view,
AI auto-categorize + due-message drafting). Build only after the proposal is approved.

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

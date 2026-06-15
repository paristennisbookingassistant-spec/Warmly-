# Spec, V2 Phase 3b: Proactive company discovery (V2 chat → extension scrape → deck)

> Orchestrator spec. Wire the already-built extension `CDP_DISCOVER` (company → live LinkedIn
> scrape) into the V2 web app: user names a company in chat → validate criteria → trigger the
> scrape over the existing web↔extension bridge → matching profiles stream into the Discover
> deck. **Reuses** the auth-bridge transport, `CDP_DISCOVER`, and `discovery_sessions`.
> Net-new is the web-app trigger + a discovery results channel. MiniMax-only; LinkedIn
> read-only.

## What already exists (do not rebuild)
- **Web↔extension bridge:** web app `window.postMessage` → `extension/content-script/
  auth-bridge.ts` (runs on the Warmly origin) → `extension/service-worker/sync-coordinator.ts`
  forwards `WEBAPP_*` messages to the SW. Network-sync already uses this end to end
  (`handleStartNetworkSync` → finds/creates a LinkedIn tab → triggers a content script).
- **`CDP_DISCOVER`** (`extension/service-worker/index.ts` ~L1100): resolves a company via LLM
  disambiguation, navigates the school-filtered company People page, scrapes alumni. Driven
  today from `extension/popup/Popup.tsx` (form: company + hint + school + location + function;
  with a low-confidence company picker). Writes contacts tagged with `discovery_session_id`.
- **`discovery_sessions`** table + `GET /api/contacts?discovery_session_id=…` style filtering.
- **V2 Discover deck** (`src/components/v2/discover/DiscoverScreen.tsx`), the surface results
  land in.

## The testability split (READ, shapes the slice)
The standard independent tester (headless browser, live URL, `.env.test`) **cannot run the
Chrome extension or scrape LinkedIn**, and per `docs/LINKEDIN_GUARDRAILS.md` must not. So:
- **Tester-gated (web-app half):** chat trigger → validate-criteria card → dispatch attempt →
  the deck correctly renders discovery results that already exist in the DB for a seeded
  `discovery_session_id` (we seed a fake session's contacts the way we backdated a contact for
  CRM). The tester verifies the UI + the results-streaming render, NOT a live scrape.
- **Founder-verified (scrape half):** the actual `WEBAPP_DISCOVER` → SW → live CDP scrape →
  new contacts appearing, verified by Liyang with the real extension installed + a logged-in
  LinkedIn session. Document a short manual checklist for this.

## Success criteria
**Tester-gated:**
A. In V2 chat (or the Discover screen), the user can name a company and a **validate-criteria
   card** appears prefilled (company + school=INSEAD default + location + function), editable,
   with a "Find them" CTA.
B. Pressing "Find them" with no extension present shows an **honest install/connect state**
   (not a silent hang), "Connect the Warmly extension to run live discovery."
C. Given a seeded `discovery_session` with N contacts in the DB for the test user, the Discover
   deck **renders those results** (streamed/poll-loaded) under a "Discovered at <Company>"
   grouping, with a progress→done indicator.
D. No V1 regression; no console errors on the V2 discover/chat flow.

**Founder-verified (manual checklist in the spec output):**
E. With the extension installed + logged into LinkedIn, "Find them" dispatches `WEBAPP_DISCOVER`,
   the SW runs the existing CDP scrape, and real alumni appear in the deck within the session.

## Modules

### Module 1, Extension: WEBAPP_DISCOVER bridge handler (extension)
- `auth-bridge.ts`: relay a new inbound `WEBAPP_DISCOVER` message (company, hint, schoolId,
  location, function, user_id) from the web app to the SW, mirroring the network-sync relay.
- `sync-coordinator.ts`: add `handleStartCompanyDiscovery(payload)` that invokes the **existing**
  `CDP_DISCOVER` path (do not duplicate scrape logic, call the same internal entry the popup
  triggers). Post progress/results events back to the web app via the same auth-bridge channel
  used by `connections-sync.ts` (e.g. `WARMLY_EXTENSION` events: `DISCOVERY_STARTED`,
  `DISCOVERY_PROGRESS`, `DISCOVERY_DONE`).
- Keep all rate limits + read-only guarantees. No new scrape code. `manifest_version` stays 3.

### Module 2, Backend: discovery session + results read (backend)
- Ensure a `POST /api/discovery` (or reuse existing) creates a `discovery_session` for the web
  trigger and returns its id; the extension tags scraped contacts with it (existing behavior).
- Ensure `GET /api/contacts?discovery_session_id=<id>&user_action=…` returns the freshly
  discovered contacts for the deck to poll. Add Zod validation + typed responses if net-new.
- No raw SQL; RLS intact.

### Module 3, Frontend: chat trigger + validate-criteria card (frontend)
- In the V2 Discover/chat surface, detect a "find people at <company>" intent (a simple
  command/affordance is fine for MVP, e.g. a "Discover at a company" entry that opens the card;
  do NOT block on NLU). Show a **validate-criteria card**: company (required), school (INSEAD
  default), location, function, all editable. "Find them" CTA.
- Extension presence detection: if the bridge doesn't ack, show the honest connect state (B).
- On dispatch: `window.postMessage` `WEBAPP_DISCOVER` + create the discovery_session, then
  enter a streaming state.

### Module 4, Frontend: results stream into the deck (frontend)
- Listen for the auth-bridge `DISCOVERY_*` events AND/OR poll `GET /api/contacts?
  discovery_session_id=…` on an interval; append new contacts into the Discover deck under a
  "Discovered at <Company>" group with a progress→done indicator. Loading + error + empty
  ("no alumni found at <Company>") states.
- Reuse existing deck card + save/skip; scored via the existing cache path.

## Build order
Extension agent: Module 1. Backend agent: Module 2. Frontend agent: Modules 3 → 4. Then:
seed a fake `discovery_session` + contacts for the test user → independent tester for A–D on
the live URL. Then Liyang runs the manual checklist (E) with the real extension.

## Validation gate
`npx tsc --noEmit` + `npm run build` clean; extension `manifest.json` valid MV3, no `eval()`,
rate-limit constants intact, orchestration stays in content script not SW (per CLAUDE.md
extension checks); `npx vitest run` (2 known failures excepted); Zod + typed responses on any
net-new route; tester PASS on A–D before merge; founder checklist for E.

## Open design choices (resolve at build start)
1. Results channel: bridge events vs. polling `discovery_session_id`. **Lean: poll** (simpler,
   robust to dropped events; the deck already fetches). Use bridge events only for the
   progress indicator.
2. Chat trigger UX: lightweight affordance/command for MVP vs. real NLU intent detection.
   **Lean: affordance** ("Discover at a company" → card), add NLU later.
3. Whether to gate the trigger behind extension-installed detection or always show the card
   with the connect state on dispatch. **Lean: always show the card**, surface connect state on
   "Find them".

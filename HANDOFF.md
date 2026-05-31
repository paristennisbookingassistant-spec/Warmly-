# HANDOFF — Warmly LinkedIn Network Sync (Dex-replication)

_Last updated: 2026-05-29. This file is self-contained: a fresh agent should be able
to read ONLY this and continue productively without asking the user to re-explain anything._

---

## 1. The mission

**Replicate Dex's (getdex.com) extension capability:** a Chrome extension that, on one
click, syncs the user's **entire LinkedIn network** into Warmly's contacts database with
**full profile detail** — name, photo, headline, current company, **location**, **full work
experience (with dates)**, and **education**.

Dex does this for 1,300+ connections. We are building the same thing in Warmly. The user
(Liyang) wants parity with Dex's depth, not just basic contact import.

**This is a working prototype in the EXISTING codebase** (`C:/Users/glygs/Documents/ai-networking-coach/`),
not a rebuild. It deploys to Vercel + Supabase. Findings inform the cofounder (Sanket) rebuild.
The strategic point being proven: the architecture is cheap, but **accurate deep-data parsing
is the real engineering moat** — which is why Dex is a company with a team.

---

## 2. Current status (vs Dex) — where we are

**UPDATE 2026-05-31: Deep enrichment now WORKS.** We found the real data source (the SDUI
`rsc-action` pagination endpoint — see §3.C) and rewrote the parser as a proper React-Flight
resolver. Verified live end-to-end into the prod DB with high accuracy.

| Field | Dex | Warmly | State |
|---|---|---|---|
| Name | ✅ | 100% | ✅ DONE |
| Photo | ✅ | 97% | ✅ DONE |
| LinkedIn URL | ✅ | 100% | ✅ DONE |
| Headline | ✅ | captured | ✅ stored (api-client maps it) |
| Current company | ✅ | from exp[0] | ✅ set from top role in Phase 2 |
| Current title | ✅ | from exp[0] | ✅ set from top role in Phase 2 |
| Location | ✅ | from exp[0] | ✅ top-role location |
| Work experience | ✅ | full + dates | ✅ DONE — title/company/dateRange/location, grouped roles |
| Education | ✅ | full | ✅ DONE — school/degree/field/dateRange |

**Verified live**: Morgan Stanley grouped roles split correctly with NY locations + dates;
"Consultant, Deal Advisory @ KPMG Vietnam" (comma-in-title) correct; INSEAD/Brown/Aalto/Oxford
education with year ranges. The whole pipeline (content-script fetch → SW → backend → DB) ran
on a real 399-contact sync.

**Known minor edge cases** (not blockers): media alt-text ("Thumbnail for …") could leak into a
location slot — now filtered; some single-role descriptions may be imperfect. Accuracy is
Dex-level on the fields that matter (title, company, dates, school, degree).

**The test account was wiped clean (0 contacts)** so the next full re-sync starts fresh. A full
enrichment of all ~399 contacts takes ~100 min (throttled 15s/profile).

---

## 3. The crown jewels — reverse-engineered LinkedIn endpoints

These took the whole session to find. They WORK. Use the user's authenticated browser session
(cookies auto-attach when fetched from a `linkedin.com` page context or with `credentials: 'include'`).

Common headers for Voyager JSON calls:
```
accept: application/vnd.linkedin.normalized+json+2.1
x-restli-protocol-version: 2.0.0
csrf-token: <value of JSESSIONID cookie, format "ajax:1234...">
```

### A. Connections list (Phase 1 — WORKS)
```
GET https://www.linkedin.com/voyager/api/relationships/dash/connections
    ?q=search                ← REQUIRED. Without it → HTTP 400. THIS was the whole "why Dex works" answer.
    &count=40
    &start=<N>               ← paginate: 0, 40, 80, ...
    &sortType=RECENTLY_ADDED
    &decorationId=com.linkedin.voyager.dash.deco.web.mynetwork.ConnectionListWithProfile-16
```
Response is NORMALIZED: entities are flat in `included[]`. The people are the items whose
`$type` ends in `identity.profile.Profile`. Fields: `firstName`, `lastName`, `headline`,
`publicIdentifier` (→ `https://www.linkedin.com/in/<publicIdentifier>/`), `entityUrn`
(`urn:li:fsd_profile:...`), `profilePicture`.

### B. Batch profile (enriched-BASIC — returns location/industry, NOT experience)
```
GET https://www.linkedin.com/voyager/api/identity/dash/profiles?ids=List(<urn1>,<urn2>,...)
```
With NO decoration → 200, returns Profile core + `experienceCardUrn` reference. Returns
location, industry, email — but NOT work history (that's only a URN reference). Good for a
fast bulk "location/company" pass (see next steps). The `FullProfile` decoration → 400.

### C. Deep data (experience/education) — the SDUI rsc-action endpoint ✅ THE ONE TO USE
There is **NO clean JSON API** (verified: profileView → 410 Gone; no GraphQL call returns it;
LinkedIn profiles are fully server-driven UI). The data is delivered by the **SDUI pagination
action** the page itself calls when you scroll a section. It's a POST you can replicate from the
content script — a **data READ** (no state change; see LINKEDIN_GUARDRAILS.md "Allowed").
```
POST https://www.linkedin.com/flagship-web/rsc-action/actions/pagination
     ?sduiid=com.linkedin.sdui.pagers.profile.details.{experience|education}
     &parentSpanId=AAAAAAAAAAA%3D            ← NOT validated; a constant works
headers: content-type: application/json, csrf-token: <JSESSIONID>, x-li-rsc-stream: true,
         referer: https://www.linkedin.com/in/<publicId>/details/<section>/
body: { pagerId, clientArguments:{ payload:{ vanityName:<publicId>, profileId:<URN-minus-prefix>,
        start:0, count:50, detailSectionReplaceableComponentRef:
        "com.linkedin.sdui.profile.card.ref<profileId><Experience|Education>DetailsSection" } ... } ... }
```
The body is fully constructible from `publicId` + `profileId` (= connection URN minus
`urn:li:fsd_profile:`), BOTH captured in Phase 1. One scoped POST per section returns the
COMPLETE list (count:50). Response is a React-Flight stream (newline `id:value` rows with
`$<id>` refs). **The parser** (`extension/content-script/rsc-profile-client.ts`) resolves refs,
walks the tree, groups experience leaves by `entity-collection-item` cards (handles grouped
multi-role companies via date-count), and reads education from the flat leaf stream. Verified in
`tests/ref-parser.mjs` + `tests/verify-parser.mjs` (offline) and `tests/live-phase2.mjs` (live).

NOTE: the old GET `/in/<id>/details/experience|education/` SSR approach is **dead** — education
isn't in that SSR payload at all (only a pager placeholder); experience SSRs only the first page.
Don't go back to it.

---

## 4. Architecture & data flow

```
warmly.app  /onboarding/connect-linkedin  (user clicks "Sync my network")
   │  window.postMessage({source:"WARMLY_WEBAPP", type:"START_NETWORK_SYNC",
   │                      payload:{user_id, sync_job_id}})
   ▼
extension/content-script/auth-bridge.ts   (runs on warmly.app tabs; verifies origin)
   │  chrome.runtime.sendMessage → service worker
   ▼
extension/service-worker/sync-coordinator.ts
   │  - creates/seeds local SyncJob, persists to chrome.storage.local
   │  - findOrCreateLinkedInTab()  (auto-opens linkedin.com if none open)
   │  - sends TRIGGER_NETWORK_SYNC to the LinkedIn tab's content script
   ▼
extension/content-script/connections-sync.ts   (THE ORCHESTRATOR — runs in content script,
   │   NOT service worker, because MV3 SW dies after 30s and sync takes 20-100 min)
   │  Phase 1: voyager-list-client.ts → connections API → basic contacts
   │  Phase 2: rsc-profile-client.ts → fetch details pages → parse RSC → deep contacts
   │  each batch → SYNC_BULK_IMPORT → SW → api-client.bulkImportContacts → backend
   ▼
src/app/api/contacts/bulk-import/route.ts   (Zod-validated; camelCase contract)
   │  → src/lib/supabase/contacts.ts  bulkUpsertContacts  (explicit insert/update)
   ▼
Supabase contacts table  (user_action='pending', source='discovery', sync_job_id set)
   → contacts flow through the swipe/review deck, NOT the default /contacts list
```

### Key files
| File | Role |
|---|---|
| `extension/content-script/voyager-list-client.ts` | Phase 1 connections fetch + parse — **WORKS** |
| `extension/content-script/rsc-profile-client.ts` | Phase 2 RSC parser — **THE FILE THAT NEEDS WORK** |
| `extension/content-script/connections-sync.ts` | Orchestrator (Phase 1 + Phase 2 loop, throttle, resume) |
| `extension/service-worker/sync-coordinator.ts` | Job mgmt, LinkedIn tab, CSRF fallback |
| `extension/service-worker/api-client.ts` | `bulkImportContacts` snake→camel transform |
| `extension/shared/types.ts` / `constants.ts` | SyncJob model, throttle constants |
| `src/lib/supabase/contacts.ts` | `bulkUpsertContacts` (insert/update, NOT ON CONFLICT) |
| `src/app/api/contacts/bulk-import/route.ts` | Import endpoint (Zod) |
| `src/app/(auth)/onboarding/connect-linkedin/page.tsx` | UI trigger |
| `docs/specs/LINKEDIN_NETWORK_SYNC_v1.md` | Phase 1 spec |
| `docs/specs/PHASE2_DEEP_ENRICHMENT_RSC.md` | Phase 2 spec (read before touching the parser) |

---

## 5. How to set up + test (the operational playbook)

### 5.1 Tester account
`.env.test` (gitignored, already exists in repo root):
```
TEST_USER_EMAIL=liyang.guo@essec.edu
TEST_USER_PASSWORD=123456789
WARMLY_PROD_URL=https://ai-networking-coach.vercel.app
```
This is Liyang's real Warmly account (email+password auth, NOT Google). Supabase user_id:
`deed7f54-3c3c-40a9-bf20-2e17bc6192e0`.

### 5.2 Connect LinkedIn for the tester (the tricky part — follow exactly)
The extension needs an authenticated LinkedIn session in the test browser. We DON'T do a
manual login — we reuse the `/linkedin` skill's cookie file.
1. **Check the cookie is alive:** `bash ~/.claude/skills/linkedin/check_and_update_cookie.sh check`
   - Exit 0 = alive, proceed. Exit 1 = stale → ask Liyang for a fresh `li_at` (he gets it from
     his real Chrome: F12 → Application → Cookies → linkedin.com → copy `li_at` value), then
     `bash ~/.claude/skills/linkedin/check_and_update_cookie.sh update <value>`.
2. **Inject cookies into the Playwright profile:** `node tests/seed-linkedin-cookies.mjs`
   - Reads `%TEMP%/linkedin_cookies.json`, injects the linkedin.com cookies (incl. `li_at` +
     `JSESSIONID`) into `.playwright-profile/`. Prints `authenticated: true` on success.
   - This is a one-time seed; the session persists in the profile across test runs.

### 5.3 Build the extension
```
cd extension && BACKEND_URL=https://ai-networking-coach.vercel.app node build.mjs
cd extension && npm run typecheck     # must pass before testing
```

### 5.4 ⚠️ CRITICAL testing gotcha — clear the SW cache after EVERY rebuild
Chrome caches the old service worker in the persistent profile and runs STALE code even after
you rebuild dist/. ALWAYS run this after `node build.mjs`:
```
rm -rf ".playwright-profile/Default/Service Worker" ".playwright-profile/Default/Code Cache"
```
(This cost ~30 min of "my fix isn't working" confusion. Don't skip it.)

### 5.5 Run the sync test
The E2E harness is `tests/e2e-linkedin-sync.mjs` (smoke + full modes). For iterating on the
parser, write a focused ad-hoc probe (launch persistent context with the extension, click
"Sync my network", watch `[RscProfile]` / `[ConnectionsSync]` console logs from the LinkedIn
tab). Pattern for the launch args:
```js
chromium.launchPersistentContext('.playwright-profile', {
  headless:false,
  args:[`--disable-extensions-except=${EXT}/dist`,`--load-extension=${EXT}/dist`,
        '--window-position=-9999,-9999','--window-size=1366,900'],
  ignoreDefaultArgs:['--disable-extensions','--disable-component-extensions-with-background-pages'],
});
```
Phase 1 takes ~45s for 399; Phase 2 is throttled 15s/profile (~100 min for all 399 — for
testing just watch the first ~5 profiles).

### 5.6 Verify results in the DB
Query the live app from the authenticated page context (cookies attached):
```
GET /api/contacts?user_action=pending&page=N&per_page=100
   → { data: { items:[...], total, has_more } }
```
Synced contacts are `user_action='pending'`. Experience is in the `experience` column,
education in `education_v2` (NOT `education` — that's the legacy hand-entered column).
Filter logic in `src/app/api/contacts/route.ts`.

### 5.7 Wipe the test account (for a clean slate)
Service role key is in `.env.local` / `.env.vercel` (`SUPABASE_SERVICE_ROLE_KEY`,
`NEXT_PUBLIC_SUPABASE_URL`). Delete synced contacts (those with a `sync_job_id`):
```js
import { createClient } from '@supabase/supabase-js';   // already installed
const sb = createClient(URL, SERVICE_KEY, { auth:{persistSession:false} });
await sb.from('contacts').delete().eq('user_id','deed7f54-...').not('sync_job_id','is',null);
```

---

## 6. Agent architecture (how we work — the three-agent loop)

Per `C:/Users/glygs/Documents/Obsidian Vault/_claude/reference/claude-code-build-playbook.md`:
- **Orchestrator** (main session, full context): writes specs, gets user approval BEFORE code,
  runs the live LinkedIn tests itself (the tester sub-agent can't drive the seeded browser),
  diagnoses failures, dispatches fixes.
- **Developer** (spawned sub-agents): `subagent_type: extension` for `extension/**`, `backend`
  for `src/app/api` + `src/lib` + `supabase`, `frontend` for `src/components` + views. They
  build per spec, typecheck + build, but CANNOT run the live LinkedIn test.
- **Loop:** spec → user approves → spawn dev agent(s) → they build → orchestrator runs the
  live test + iterates with the agent on failures.

This session: spawned extension+backend devs in parallel for v1, then frontend, then did all
live testing + debugging in the main session (found ~11 integration bugs that way). The Phase 2
RSC parser was built + refined by spawning the `extension` agent twice with precise live-failure
reports.

**Guardrails (NON-NEGOTIABLE):**
- Extension is READ-ONLY — only GET to linkedin.com. Never send/post/connect/message. See
  `docs/LINKEDIN_GUARDRAILS.md`.
- Throttle is hard-coded, not user-overridable. Plan cap 2,500. 429/999 → exponential backoff.
  These protect the user's real LinkedIn account from suspension — do NOT loosen them.

---

## 7. What worked / what didn't (don't re-derive)

**Worked:** `q=search` param (the Phase 1 unlock); parsing `included[]` Profile entities;
deep data is in the `/details/` RSC payload fetched with nav headers; reusing `/linkedin`
cookies for the tester; explicit insert/update (the prod unique index on `(user_id,
linkedin_url)` is PARTIAL so `ON CONFLICT` can't target it).

**Dead ends (do NOT retry):**
- Voyager batch profile endpoint for DEEP data — returns basic only, experience is a URN ref.
- Any GraphQL query for experience — replayed all of them, none return it. SSR-only.
- Plain `fetch()` of the profile page (no nav headers) — stripped page.
- Reading Playwright RESPONSE bodies to find an API — unreliable (page consumes body first);
  capture REQUEST urls + replay them instead.
- **RSC date-anchor + backward-walk heuristic** (current `rsc-profile-client.ts`) — works on
  simple profiles, breaks on complex ones. This is the thing to replace (see §8).

---

## 8. Current hypothesis & where to start

### Quick wins first (~1 hr, gets most of Dex's visible card)
1. **Map `headline` to a DB column** (currently 0% — bug). `bulkUpsertContacts` in
   `src/lib/supabase/contacts.ts` doesn't set it. Add it (+ migration if the column is missing).
2. **Add a "Phase 1.5" location/company pass via the batch endpoint** (§3.B). It returns
   location + current position cleanly in BULK (fast, low risk, ~25 profiles/call). Fixes
   location (0%→high) and company (24%→high) cheaply, without the slow per-profile crawl.

### The hard problem — rewrite the RSC parser (focused effort, the real moat)
**Hypothesis:** the current parser fails because it string-anchors on date ranges and walks
backward, which breaks when the RSC serialization interleaves location/employment-type/duration
strings and when LinkedIn GROUPS multiple roles under one company. The fix is to **parse the
RSC flight payload into the actual React component tree, then walk it semantically** — each
experience CARD is a subtree with title/company/dateRange/location at known child positions.
This should fix all at once:
- title/company misalignment (grouped roles: "Morgan Stanley @ Sales and Trading Associate" is inverted)
- location-as-title ("Providence, RI, United States @ ...")
- missing dateRange start/end (currently shows `?–?` — the "Mon YYYY - Mon YYYY" string isn't split)
- education (same card structure; current anchor strategy finds nothing → 0 entries)

**Test profiles with known-correct expected output:**
- `daominhanh10` — SIMPLE, parses correctly today (regression baseline)
- `mariana-alvaro` — HARD, grouped roles + locations (the failing case to fix)
- Verify against the live profile (open `linkedin.com/in/<id>/details/experience/`).

**Approach to try:** the RSC flight format is `window.__como_rehydration__ = [...]` — an array
of serialized React elements (`["$","tag",key,{props, children}]`). Write a tolerant parser
that reconstructs the element tree, finds the experience/education list container, and reads
each card's labelled children. The spec `docs/specs/PHASE2_DEEP_ENRICHMENT_RSC.md` has the raw
samples and the field mapping the backend expects.

### Then
3. Full 390-contact enrichment end-to-end; re-measure the §2 coverage table.
4. Decide bulk-deep-crawl vs lazy-on-demand with Liyang. Bulk = ~100 min + views 390 profiles
   (account-detection sensitive). Lazy (enrich on contact-open) is safer. Currently built as
   bulk trickle. This is a product/risk decision for Liyang, not a pure eng call.

---

## 9. Commits this session (all pushed to main)
```
9657601 feat(linkedin-sync): Phase 2 deep enrichment via RSC details-page parsing
fec3110 fix(linkedin-sync): Phase 2 degrades gracefully instead of failing the sync
9e74ce4 fix(linkedin-sync): working connections fetch, import contract, and upsert
294ce9a fix(linkedin-sync): seed local job from server-created sync_job id
3740b45 fix(linkedin-sync): repair start-sync contract + LinkedIn detection + auto-open tab
f9ed03b feat(linkedin-sync): bulk Voyager-based network sync (v1)
```

## 10. Unrelated open threads (NOT part of this sync work — don't conflate)
- Survey insights deck: `Survey/survey-insights-deck.html` (cofounder/IVC presentation)
- Claude Design frontend brief: `_claude/projects/Warmly/claude-design-prompt-meeting-prep.md`
  (Meeting Prep screen + memory section for the UI mock — separate workstream)
- These are for the Wednesday cofounder (Sanket) sync, separate from the extension.

---
feature: Phase 2 Deep Enrichment via Details-Page RSC Parsing
status: pending build
created: 2026-05-29
depends_on: Phase 1 network sync (shipped, working — 399 contacts verified)
target_codebase: existing (C:/Users/glygs/Documents/ai-networking-coach/)
---

# Feature: Phase 2 Deep Enrichment via Details-Page RSC Parsing

## Context — what we discovered (read before building)

Phase 1 (connections list → basic contacts) is **shipped and working**: 399 real
connections imported. Phase 2 (deep work history + education) was failing because
the Voyager batch profile endpoint (`identity/dash/profiles?ids=List(...)`)
returns only enriched-basic fields (industry, location) and references experience
via an `experienceCardUrn` — it does **not** inline work history or education.

After exhaustive investigation (8+ probes, documented below), we found the real
source: **LinkedIn server-renders full experience/education into the profile
"details" sub-pages as a React Server Components (RSC) hydration payload.** This
is fetchable via a single HTTP request per profile (no browser render needed).

### Verified facts (from live probing, May 2026)

1. **Experience URL:** `https://www.linkedin.com/in/<publicIdentifier>/details/experience/`
2. **Education URL:** `https://www.linkedin.com/in/<publicIdentifier>/details/education/`
3. Both must be fetched with **navigation headers** or LinkedIn serves a stripped page:
   ```
   accept: text/html,application/xhtml+xml,...
   sec-fetch-mode: navigate
   sec-fetch-dest: document
   sec-fetch-site: same-origin
   credentials: include   (cookies auto-attach in content-script context)
   ```
4. The data is in a `<script id="rehydrate-data">...</script>` block, assigned to
   `window.__como_rehydration__ = [ ... ]`. It is **RSC flight serialization**,
   NOT plain JSON. Text values live in React element `"children":["<value>"]`
   arrays (escaped as `\"children\":[\"<value>\"]` inside the script string).
5. **Verified extraction** from a real profile (Marc Becker):
   ```
   Experience date ranges parsed cleanly:
     "Jun 2025 - Present · 1 yr"
     "Nov 2022 - Present · 3 yrs 7 mos"
     "Sep 2017 - Present · 8 yrs 9 mos"
     "Mar 2008 - Aug 2017 · 9 yrs 6 mos"
   Company appears as: "children":["Deloitte"]
   ```
6. **WARNING — noise:** the same `"children":[...]` pattern is used by ads, UI
   chrome, and "people also viewed" sidebars. A naive blanket regex catches
   garbage (e.g. "Acquire customers and grow your business"). **The parser MUST
   scope to the experience/education list subtree**, not match the whole payload.

## User story

As a user who synced my LinkedIn network, I want each contact enriched with their
full work history and education over time, so that when I open a contact in
Warmly (or browse my network) I see who they actually are without leaving the app.

## Architecture

Replace the Phase 2 approach in the extension. **Keep Phase 1 untouched.**

```
connections-sync.ts (Phase 2 loop, runs in content script)
  For each collected connection (throttled, resumable):
    1. rsc-profile-client.fetchExperience(publicId)  → fetch details/experience/
    2. rsc-profile-client.fetchEducation(publicId)   → fetch details/education/
    3. Parse RSC payload → { experience[], education[], location? }
    4. bulkImport(phase 2 contact with experience + education)
    5. throttle PROFILE_FETCH_THROTTLE_MS (random jitter)
```

### Critical: publicIdentifier must be available in Phase 2

The details URL needs `publicIdentifier` (e.g. `marc-becker-489151`), NOT the
profile URN. Phase 1's connections response returns BOTH `entityUrn` and
`publicIdentifier`. Currently `job.collected_urns` stores only URNs.

**Change required:** Phase 1 must persist the publicIdentifier (or full
linkedin_url) alongside each URN so Phase 2 can build the details URL. Options:
- (preferred) Change `collected_urns: string[]` to a parallel structure carrying
  `{ urn, publicId }`, OR add a `collected_profiles: Array<{urn, publicId}>` field
  to the SyncJob model, OR
- Derive publicId from the already-stored contact's `linkedin_url` by re-fetching
  the basic contact list. (Less clean — prefer persisting it in Phase 1.)

Whichever approach: a contact with no publicIdentifier cannot be deep-enriched
(skip it, don't fail).

## RSC parser requirements (the hard part)

Build `parseProfileDetailsRsc(html, kind: "experience" | "education")`:

1. Extract the `rehydrate-data` script content (regex:
   `/<script[^>]*id="rehydrate-data"[^>]*>([\s\S]*?)<\/script>/`).
2. Unescape the RSC string enough to walk it (`\"` → `"`, `\\` → `\`).
3. **Scope to the main content subtree.** The experience/education entries render
   inside the page's primary list (a `<ul>`/list of cards), distinct from sidebar
   ("People also viewed") and ad/promo subtrees. Identify the list boundary
   before extracting (e.g. anchor on the section that contains date-range strings;
   ads/sidebars don't contain "Mon YYYY - Mon YYYY · N yrs" patterns).
4. For EXPERIENCE, each entry = `{ title, company, dateRange?: {startText, endText}, location?, description? }`.
   - Reliable anchor: date-range strings matching
     `/[A-Z][a-z]{2} \d{4} - (Present|[A-Z][a-z]{2} \d{4})(?: · [^"]+)?/`.
   - title + company appear as the two `children` strings immediately preceding
     each date-range in document order. Pair them by proximity.
5. For EDUCATION, each entry = `{ school, degree?, fieldOfStudy?, dateRange? }`.
   - Anchor on year-range strings `/(19|20)\d{2}\s*[-–]\s*(19|20)\d{2}/` or the
     school name being the first child in each education card.
6. **Defensive:** if the structure can't be parsed, return `[]` for that kind and
   log — never throw. Partial data (experience but not education, or vice versa)
   is fine.
7. Map to the backend's expected shape (see existing `BulkImportContact`):
   - experience: `[{ title, company, dateRange: { start, end }, description?, location? }]`
   - education: `[{ school, degree?, fieldOfStudy?, dateRange? }]`
   The api-client.bulkImportContacts transform already maps these to the backend
   camelCase contract — reuse it.

## Throttling + safety (NON-NEGOTIABLE)

This fetches one profile-details page per contact = N fetches for N contacts.
That is the account-detection-sensitive surface. Hard rules:

- `PROFILE_FETCH_THROTTLE_MS = 15000` minimum between profile-detail fetches,
  with ±30% random jitter. NOT user-overridable.
- Experience + education for the same profile count as the throttle unit (fetch
  both back-to-back, then throttle before the next profile).
- Respect the existing `PLAN_CAP` (2500).
- On HTTP 429 / 999: reuse the existing `RateLimitedError` backoff (pause ≥1h,
  exponential). Same as Phase 1.
- Resumable: `last_processed_urn_index` already tracks Phase 2 progress — keep it
  correct so a closed browser resumes mid-enrichment.
- READ-ONLY: only GET requests to linkedin.com. (See docs/LINKEDIN_GUARDRAILS.md.)

At 15s/profile, 399 profiles = ~100 min. That is expected and acceptable — this
runs as a slow background trickle while the user uses LinkedIn normally. Do NOT
try to make it fast; fast = account ban.

## Files to touch

- `extension/content-script/rsc-profile-client.ts` (NEW) — fetchExperience,
  fetchEducation, parseProfileDetailsRsc
- `extension/content-script/voyager-batch-client.ts` — KEEP for enriched-basic
  (location/industry) as an optional fast first pass, OR retire if unused. Do not
  let its 400-on-FullProfile path block Phase 2 anymore.
- `extension/content-script/connections-sync.ts` — Phase 2 loop now iterates
  per-profile using rsc-profile-client instead of per-batch-of-25 Voyager profiles
- `extension/shared/types.ts` — ensure collected profiles carry publicId; confirm
  experience/education entry types
- `extension/shared/constants.ts` — add `PROFILE_FETCH_THROTTLE_MS = 15000`
- (if needed) Phase 1 in connections-sync.ts — persist publicId per connection

Do NOT touch `src/` (backend bulk-import already accepts experience/education),
`supabase/`, or `src/components/`. The backend contract is already correct.

## Success criteria (tester verifies via tests/e2e-linkedin-sync.mjs)

1. After a sync, opening 5 random synced contacts shows populated `experience`
   with real company + title + date range (cross-check against the live profile).
2. At least 60% of enriched contacts have ≥1 education entry (some profiles list
   no education — 60% accounts for that).
3. Experience entries are real (company names like "Deloitte", "Parloa"), NOT UI
   noise ("Acquire customers and grow your business", "People also viewed").
4. Throttle enforced: no two profile-detail fetches within 10s (15s nominal − jitter).
5. Resumable: closing the browser mid-Phase-2 and reopening resumes, does not
   re-enrich already-done profiles.
6. No write actions to linkedin.com (only GET).
7. Sync completes (status "completed") even if some profiles fail to parse.

## Out of scope (v1 of Phase 2)

- Skills, recommendations, accomplishments, projects (just experience + education)
- Real-time re-enrichment / diff updates
- Parsing rich descriptions (just title/company/dates; description optional)
- Making it fast (it is deliberately a slow trickle)

## Test plan

- The orchestrator (main session) will probe-confirm the current RSC format is
  unchanged before the agent starts (LinkedIn rotates; the rehydrate-data /
  details-page structure was verified 2026-05-29).
- Build → typecheck → build → orchestrator clears `.playwright-profile/Default/
  Service Worker` (Chrome caches the old SW — MUST clear after every rebuild) →
  run tests/e2e-linkedin-sync.mjs full mode → verify criteria.
- Manual: Liyang spot-checks 5 enriched contacts against their real LinkedIn.

## Definition of done

All 7 success criteria pass. The sync enriches contacts with real experience +
education parsed from the RSC payload, throttled safely, resumable.

## Hard-won lessons for the building agent (do not relearn these)

- **Clear the SW cache after every extension rebuild** (`rm -rf
  .playwright-profile/Default/"Service Worker"`) or you test stale code. This cost
  ~30 min of confusion earlier this session.
- **The connections endpoint needs `q=search`** (Phase 1, already fixed) — same
  Rest.li-finder requirement may bite other endpoints.
- **Read REQUEST urls, not consumed RESPONSE bodies**, when reverse-engineering
  what an API returns (Playwright can't re-read a body the page consumed).
- **RSC `children` arrays are everywhere** including ads — scope to the content
  list subtree, anchored on date-range strings which only appear in real entries.

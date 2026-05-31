# Warmly — LinkedIn Network Sync: How It Works

_A complete, self-contained explainer of the one-click LinkedIn deep-sync feature.
Written so a cofounder (Sanket) can read it for status + strategy, AND feed it to
Claude Code to get the same working understanding we have._

_Last updated: 2026-05-31._

---

## 0. TL;DR

We built (and deployed) the thing Dex does: **one click in Warmly syncs your entire
LinkedIn network into your contacts database with full profile detail** — name,
photo, headline, current title + company, location, **full work history (every
role, with dates + locations)**, and **full education (school, degree, field,
dates)**.

It runs as a Chrome extension that reads from the user's own logged-in LinkedIn
session, parses LinkedIn's data, and writes structured records to Supabase. The
web app renders it.

**Status: working and deployed to production.** On a 50-contact validation sync:
50/50 real names, 49/50 photos, 48/50 with full experience + education (~96%).
Verified end-to-end into the prod database and rendering in the app.

The hard part — and the real engineering moat — is **accurately parsing
LinkedIn's data**, not the plumbing. This doc explains how.

---

## 1. What it does (the user-facing capability)

1. User installs the Warmly Chrome extension and is logged into LinkedIn.
2. In Warmly's onboarding, they click **"Sync my network."**
3. The extension, in the background, pages through their entire connections list
   and then enriches each contact with deep profile data.
4. Contacts appear in Warmly with real name, photo, headline, current role,
   location, complete career timeline, and education — exactly like Dex.

It's throttled for account safety, so it's a slow background trickle (minutes to
hours depending on network size), not an instant dump. See §6.

---

## 2. The breakthrough — how we cracked it ("why does Dex work?")

This was the central mystery. Here's the real answer.

### 2.1 LinkedIn has no clean API for deep profile data (anymore)

- The classic `GET /voyager/api/identity/profiles/{id}/profileView` endpoint that
  every open-source LinkedIn scraper uses is **410 Gone**.
- We captured + replayed **every** GraphQL call the profile page makes. **None**
  return work history or education.
- LinkedIn moved the profile to a **fully server-driven UI (SDUI)**. The page is
  assembled server-side and shipped as a **React Server Components (RSC / "Flight")
  payload**, not as JSON data.

So the data is *not* available via a documented or semi-documented JSON API.

### 2.2 The unlock: the SDUI pagination endpoint

When you scroll a profile's Experience or Education section, the page itself fires
a request to load that section. That request is fully replicable from the
extension's content script (it runs on `linkedin.com`, so the user's cookies
attach automatically):

```
POST https://www.linkedin.com/flagship-web/rsc-action/actions/pagination
     ?sduiid=com.linkedin.sdui.pagers.profile.details.{experience|education}
     &parentSpanId=AAAAAAAAAAA%3D          ← NOT validated; a constant works

headers:
  content-type: application/json
  csrf-token: <value of the JSESSIONID cookie, format "ajax:123...">
  x-li-rsc-stream: true
  referer: https://www.linkedin.com/in/<publicId>/details/<section>/

body (JSON): { pagerId, clientArguments:{ payload:{
  vanityName: <publicId>,          // e.g. "mariana-alvaro"
  profileId:  <fsd_profile id>,    // the connection URN minus "urn:li:fsd_profile:"
  start: 0, count: 50,
  detailSectionReplaceableComponentRef:
    "com.linkedin.sdui.profile.card.ref<profileId><Experience|Education>DetailsSection"
} ... } ... }
```

Key facts that make this work:
- The request body is **fully constructible** from `publicId` + `profileId`, and
  **both are already captured in Phase 1** (the connections list returns the
  `entityUrn` and `publicIdentifier`). `profileId` = URN minus the prefix.
- `parentSpanId` is **not validated** — a constant placeholder works.
- One scoped POST per section returns the **complete** list (`count: 50`), not
  just the first page LinkedIn renders.
- This is a **data read**. It performs no state change (no message, connect,
  post, edit). It's exactly how LinkedIn's own UI loads the section on scroll.

> Strategic note: this is the same output Dex produces. The big difference is
> **speed**. Dex reportedly syncs ~1,300 contacts in <20 min (~1s/profile). That
> is far too fast to be crawling each profile from a user's browser session
> without getting blocked — which strongly suggests Dex enriches via a **paid
> backend data provider** (Proxycurl / People Data Labs style) keyed on the
> LinkedIn URL, OR does the basic sync fast and fills deep detail slowly in the
> background like we do. We proved you can get the data for free from the user's
> session; Dex likely buys speed + stability + scale. That's a cost/architecture
> decision, not a code gap. See §10.

### 2.3 The response format & the parser (the real moat)

The response is a **React Flight wire payload** — a chunked, reference-based
serialization. It is not JSON you can `JSON.parse` and read. We wrote a proper
deserializer + semantic parser. The non-obvious problems we solved:

- **Reference resolution.** Rows reference each other (`$L42`, `$a1`). The parser
  builds a chunk map and lazily resolves references with a global visited-guard.
- **Length-prefixed text rows.** Multi-line job descriptions are encoded as
  `T<hexBYTElen>,<text>` where the text contains newlines. Splitting on `\n`
  (the naive approach) corrupts the whole stream and silently drops entire
  cards. The parser reads exactly `<hexlen>` UTF-8 bytes.
- **Double-serialized subtrees.** Some children are Flight elements re-encoded as
  strings; the parser detects and re-parses them.
- **Experience segmentation.** Each role is wrapped in an `entity-collection-item`
  component; grouped multi-role companies (e.g. promotions at one employer) are
  split by counting date ranges per card.
- **Education segmentation.** Education does *not* use the same wrapper. A state
  machine anchors on school logos + school-keyword names, and handles dated,
  dateless, and single-year entries, in multiple languages.
- **Field disambiguation.** Comma-bearing job titles ("Manager, Sales & Ops") vs
  "City, Country" locations; type/duration meta lines ("Full-time · 4 yrs");
  media alt-text and skills-section noise — all filtered.

This parser is fragile by nature: when LinkedIn changes the SDUI format, it will
need fixing. That fragility is precisely why deep LinkedIn sync is a real product
(and why Dex is a company with a team), not a weekend hack.

### 2.4 The reverse-engineered endpoints (the crown jewels)

These took the whole investigation to find. They WORK from a content script on
`linkedin.com` (cookies attach automatically). Common headers for the Voyager
JSON calls:
```
accept: application/vnd.linkedin.normalized+json+2.1
x-restli-protocol-version: 2.0.0
csrf-token: <value of the JSESSIONID cookie, format "ajax:123...">
```

**A. Connections list (Phase 1 — basic fields, fast)**
```
GET https://www.linkedin.com/voyager/api/relationships/dash/connections
    ?q=search                 ← REQUIRED. Without it → HTTP 400. (Rest.li finder.)
    &count=40 &start=<N>       ← paginate 0, 40, 80, ...
    &sortType=RECENTLY_ADDED
    &decorationId=com.linkedin.voyager.dash.deco.web.mynetwork.ConnectionListWithProfile-16
```
Response is normalized: people are the `included[]` items whose `$type` ends in
`identity.profile.Profile`. Gives firstName, lastName, headline, publicIdentifier
(→ URL), entityUrn (→ urn → profileId), profilePicture.

**B. Basic profile (reliable photo / headline / location / bio, bulk-capable)**
```
GET https://www.linkedin.com/voyager/api/identity/dash/profiles
    ?q=memberIdentity&memberIdentity=<publicId>
    &decorationId=com.linkedin.voyager.dash.deco.identity.profile.WebTopCardCore-6
```
Returns the Profile core: headline, summary (bio), geoLocation, industry, AND
`profilePicture` even for profiles the connections list omitted. Has the photo
for the ~2% Phase 1 misses. Work history is only a URN reference here, NOT inline.
(A `?ids=List(<urn1>,<urn2>)` batch variant returns the same in bulk, ~25-50/call.)

**C. Deep data — the SDUI pagination action (experience + education)**
```
POST https://www.linkedin.com/flagship-web/rsc-action/actions/pagination
     ?sduiid=com.linkedin.sdui.pagers.profile.details.{experience|education}
     &parentSpanId=AAAAAAAAAAA%3D          ← NOT validated; any constant works
headers: content-type: application/json | csrf-token: <JSESSIONID>
         x-li-rsc-stream: true | referer: .../in/<publicId>/details/<section>/
body: { pagerId, clientArguments:{ payload:{ vanityName:<publicId>,
        profileId:<urn minus "urn:li:fsd_profile:">, start:0, count:50,
        detailSectionReplaceableComponentRef:
        "com.linkedin.sdui.profile.card.ref<profileId><Experience|Education>DetailsSection"
       } ... } ... } }
```
Returns the COMPLETE section as a React Flight stream. This is the one that
matters — see the parser in §2.3 and `rsc-profile-client.ts`.

### 2.5 Dead ends — do NOT re-derive these

- `GET /voyager/api/identity/profiles/{id}/profileView` → **410 Gone** (the
  classic open-source-scraper endpoint; dead).
- **Any GraphQL query for experience/education** → captured + replayed every
  `/voyager/api/graphql` call the profile page fires; none return it. SSR-only.
- The Voyager batch profile endpoint with a `FullProfile` decoration → **400**.
  No decoration → 200 but basic only (work history is a URN reference, not inline).
- `GET /in/<id>/details/experience|education/` (the SSR HTML pages) → experience
  is in the inline SSR Flight payload, but **education is NOT** (only a pager
  placeholder) — you must use the rsc-action POST (§2.4.C) for education.
- Splitting the Flight stream on `\n` → corrupts multi-line text rows (read by
  byte length instead — §2.3).
- Reading Playwright RESPONSE bodies to find an API → unreliable (the page
  consumes the body first); capture REQUEST urls + replay them instead.
- Bearer-auth POSTs to the prod Next.js API from outside the browser → **405**
  (the cookie-based middleware redirects them); only the extension's real flow
  works. Don't use a standalone bearer POST to deploy-check.

---

## 3. Architecture & data flow

```
warmly.app  /onboarding/connect-linkedin   ── user clicks "Sync my network"
   │  POST /api/sync-jobs (creates a sync_job)
   │  window.postMessage({source:"WARMLY_WEBAPP", type:"START_NETWORK_SYNC",
   │                       payload:{ user_id, sync_job_id }})
   ▼
extension/content-script/auth-bridge.ts      (runs on warmly.app tabs)
   │  chrome.runtime.sendMessage → service worker
   ▼
extension/service-worker/sync-coordinator.ts
   │  - persists the sync job to chrome.storage.local (resumable)
   │  - finds/opens a linkedin.com tab
   │  - sends TRIGGER_NETWORK_SYNC to that tab's content script
   ▼
extension/content-script/connections-sync.ts   (THE ORCHESTRATOR)
   │  Runs in the content script — NOT the service worker — because MV3 service
   │  workers die after 30s and a sync takes many minutes/hours.
   │
   │  Phase 1: voyager-list-client.ts → connections list API → basic contacts
   │           (name, photo, headline, URL, urn, publicId)   [fast, ~30s/400]
   │  Phase 2: rsc-profile-client.ts  → SDUI pagination POST → deep parse
   │           (experience + education)   [throttled ~18s/profile]
   │  Each batch → SYNC_BULK_IMPORT → service worker → backend
   ▼
src/app/api/contacts/bulk-import/route.ts   (Zod-validated; camelCase contract)
   │  → src/lib/supabase/contacts.ts  bulkUpsertContacts
   ▼
Supabase  contacts table   (one row per contact, Row-Level-Security per user)
   → contacts flow through the swipe/review deck first (user_action='pending')
   → the contact detail view renders experience + education + photo + headline
```

### Where the data lives
All synced data is in **Supabase Postgres**, `public.contacts` table, one row per
contact, private to the user via RLS. Relevant columns:
`name, linkedin_url, linkedin_urn, photo_url/avatar_url, company, current_title,
location, experience (JSONB), education_v2 (JSONB), linkedin_bio (holds the
headline)`.

---

## 4. Key files (where Sanket's Claude Code should look)

| File | Role |
|---|---|
| `extension/content-script/connections-sync.ts` | The orchestrator: Phase 1 + Phase 2 loop, throttle, resume, empty-profile retry |
| `extension/content-script/voyager-list-client.ts` | Phase 1: connections list fetch + parse (the `q=search` param is required) |
| **`extension/content-script/rsc-profile-client.ts`** | **Phase 2: the SDUI Flight parser — the moat.** Endpoint call + experience/education extraction |
| `extension/service-worker/sync-coordinator.ts` | Job mgmt, LinkedIn tab, CSRF fallback, web-app relay |
| `extension/service-worker/api-client.ts` | `bulkImportContacts` — snake_case→camelCase transform to the backend contract |
| `extension/shared/types.ts` / `constants.ts` | SyncJob model, experience/education shapes, throttle constants |
| `src/app/api/contacts/bulk-import/route.ts` | Import endpoint (Zod validation) |
| `src/lib/supabase/contacts.ts` | `bulkUpsertContacts` — identity-field preservation (Phase 2 never clobbers Phase 1) |
| `src/components/contacts/ContactDetail.tsx` | Renders synced experience/education/photo/headline |
| `docs/LINKEDIN_GUARDRAILS.md` | Read-only safety rules (READ before touching anything LinkedIn) |
| `HANDOFF.md` | Operational deep-dive (tester creds, cookie seeding, test commands, gotchas) |

The reverse-engineering process is captured in `tests/` probe scripts
(`probe-*.mjs`, `flight-*.mjs`, `ref-parser.mjs`, `verify-parser.mjs`) — useful if
the SDUI format changes and the parser needs re-deriving.

---

## 5. Current status & measured coverage

Latest validation (50-contact sync, fixed parser, deployed backend):

| Field | Coverage |
|---|---|
| Real name | 50/50 |
| Photo | 49/50 (the 1 miss is a profile LinkedIn omits from the list decoration) |
| Headline | 50/50 (stored in `linkedin_bio`, shown as a tagline) |
| Current title + company + location | from the most-recent role |
| Full work experience (with dates, locations, grouped roles) | 48/50 |
| Full education (school, degree, field, dates) | 48/50 |

The ~4% that miss experience/education parse perfectly on a direct re-fetch — the
sync-time miss is a transient LinkedIn anti-bot block. We added an end-of-pass
retry to recover those.

Tech stack: Next.js 14 (App Router) + Supabase (Postgres/Auth/RLS) + Vercel +
Chrome Extension Manifest V3. Anthropic Claude for the AI features (separate from
sync).

### 5.1 Bugs we found & fixed (the recovery log)

Most of these were found by **inspecting real synced contacts**, not by tests —
the lesson being to eyeball actual output across diverse profiles. Listed so a
future maintainer (or Claude Code) doesn't re-debug them.

| Symptom | Root cause | Fix |
|---|---|---|
| Some profiles returned **0 experience** (anishka, puneet, dora) | Multi-line job descriptions are `T<hexBYTElen>,<text>` rows whose text contains newlines; splitting the Flight stream on `\n` mis-segments everything and drops whole cards | Parse text rows by exact byte length (`advanceBytes`) |
| Profiles with **year-only dates** ("2024 - 2025") parsed 0 experience | Date regex only matched "Mon YYYY" form | Broaden `EXP_DATE_RE` + `parseExpDate` to year-only |
| **Dateless education** dropped (e.g. nichamon's INSEAD/Chulalongkorn) | Education parser only anchored on year ranges | State machine anchored on school logos + school-keyword names; handles dated/dateless/single-year/non-English |
| Title/location **swapped** in grouped cards; "Full-time · 4 yrs" became a title; "Manager, Sales" became a location | Type+duration meta lines and comma-titles vs "City, Country" ambiguity | `isMetaLine`, job-word + connector-word guards on `isLocation`, `isDescription` for bullets |
| Media alt-text / skills leaked into fields | "Thumbnail for…", "+6 skills" noise | Junk-leaf filters |
| **46/50 names became URL slugs; 48/50 photos nulled** after enrichment | Phase 2 sends the slug as a name placeholder + null photo, and `bulkUpsertContacts` overwrote unconditionally | Only write `name` on insert/Phase 1; only overwrite a field when a real value is supplied |
| Dates silently missing in the DB even when parsed | Extension sent `startDate`/`endDate`; backend Zod expects `dateRange:{start,end}` → stripped | Emit the `dateRange` shape from the parser |
| Synced contacts looked **empty in the UI** | `ContactDetail` rendered legacy `career_history`/`education`, not synced `experience`/`education_v2`; and the list cache is "lite" (omits heavy JSON) | Fall back to synced data; load the FULL contact row on detail open |
| Headline never stored | No `headline` column | Store in the existing unused `linkedin_bio` column; render as a tagline (no migration) |
| ~4% returned nothing mid-sync (eva, mehdi) yet parse fine on re-fetch | Transient LinkedIn anti-bot block (protechts.net / crcldu.com challenge) | End-of-Phase-2 retry over empty profiles |
| `ON CONFLICT` errored on upsert | The prod unique index on `(user_id, linkedin_url)` is PARTIAL (`WHERE linkedin_url IS NOT NULL`) | Explicit insert/update branching, not `ON CONFLICT` |
| **Settings → Connections "re-sync" did nothing** | Posted `{ jobId }`; the auth-bridge needs `user_id` and the SW needs `sync_job_id` | Post `{ user_id, sync_job_id }` (the onboarding page already did) |

---

## 6. Account safety & guardrails (NON-NEGOTIABLE)

- **Read-only.** The extension only READS LinkedIn. It never sends a message,
  connection request, post, like, or profile edit. The one POST it makes (the
  SDUI pagination call) is a *data read* — see `docs/LINKEDIN_GUARDRAILS.md`,
  which defines read-only as "no state-changing actions," not "no POSTs."
- **Throttled, hard-coded, not user-overridable.** ~15s minimum between
  per-profile deep fetches with ±30% jitter (~18s effective). At this pace ~400
  contacts ≈ 2 hours, the 2,500 plan cap ≈ ~12 hours, as a background trickle.
- **Plan cap: 2,500 contacts.**
- **429/999 → exponential backoff** (pause ≥1h, auto-resume). Transient network
  failures → one retry.
- **Resumable.** Closing the browser mid-sync and reopening resumes where it left
  off (state in `chrome.storage.local` + the `sync_jobs` table).

This deliberate slowness is the price of using the user's own session safely. Do
not "optimize" it away.

---

## 7. How to run / test it

Full operational detail (tester credentials, LinkedIn cookie seeding, the
service-worker cache gotcha, DB queries, account wipe) is in **`HANDOFF.md`** —
that file is the playbook. Summary:

- Build the extension: `cd extension && BACKEND_URL=<url> node build.mjs`
- Typecheck: `cd extension && npm run typecheck` / app: `npx tsc --noEmit`
- Live test harness: `tests/timed-sync-50.mjs` (bounded, timed sync via a real
  headless Chrome with the extension + a seeded LinkedIn session).
- Offline parser validation: `tests/verify-parser.mjs` (bundles the real parser,
  runs it against captured payloads).
- **Gotcha:** after every extension rebuild, clear the cached service worker:
  `rm -rf .playwright-profile/Default/"Service Worker" .../Code\ Cache` — Chrome
  runs stale SW code otherwise.
- **Gotcha:** over-testing against prod from one IP triggers **Vercel's bot
  challenge** ("安全检查点"), which blocks an automated browser (real Chrome is
  fine). Validate via a local dev server instead: `npm run dev`, build the
  extension with `BACKEND_URL=http://localhost:3000` (it still writes to prod
  Supabase), then **rebuild for prod afterward**.

### 7.1 How a USER triggers a sync (the in-app flow)

The sync is started from the **web app**, not the extension popup (the popup is
for the separate discovery / save-a-profile features). Sequence:

1. The extension is installed and the user is logged into LinkedIn in the same
   browser.
2. The user clicks **"Sync my network"** (the `LinkedInSyncCard` button). It lives
   in two places, both rendering the same card:
   - **`/onboarding/connect-linkedin`** (onboarding step 2)
   - **Settings → `/settings/connections`** ("Re-sync" — for after onboarding)
3. That button: `POST /api/sync-jobs` (creates a `sync_job`) → then
   `window.postMessage({ source:"WARMLY_WEBAPP", type:"START_NETWORK_SYNC",
   payload:{ user_id, sync_job_id } })`.
4. `auth-bridge.ts` (content script on warmly.app) verifies the origin and relays
   to the service worker → which finds/opens a LinkedIn tab and tells the
   `connections-sync.ts` content script to begin.

> The exact `postMessage` payload matters: it MUST be `{ user_id, sync_job_id }`.
> Posting `{ jobId }` silently fails (the auth-bridge bails on the missing
> `user_id`) — this bug existed on the Settings page and was fixed.

---

## 8. Known gaps & caveats (be honest with yourself)

- **UI discoverability.** There is currently no obvious sidebar nav link to
  Settings → Connections, so the re-sync button is hard to find after onboarding.
  Worth adding a clear "Sync / Re-sync network" entry point. (Direct URL works:
  `/settings/connections` or `/onboarding/connect-linkedin`.)

- **Parser fragility.** When LinkedIn changes the SDUI format, the parser breaks.
  The `tests/` probes are the recovery toolkit.
- **Speed.** ~18s/profile by design. A full large network is a multi-hour job.
- **Anti-bot.** LinkedIn runs bot detection; at scale it will block a fraction of
  fetches (we see ~4%). The retry helps; a backend provider would remove this.
- **The ~2% photo / occasional edge profiles.** Some profiles legitimately omit
  data, or LinkedIn omits it from the list decoration.
- **Headline storage.** Currently reuses the `linkedin_bio` column (its documented
  purpose). A dedicated `headline` column would be cleaner (needs a migration).

---

## 9. Strategic read for the rebuild

- The architecture (session-based extraction + parse + store) is **cheap and
  proven**. We replicated Dex's *output* for free.
- The **moat is accurate, maintained deep-data parsing** — not the plumbing.
- For scale + speed + robustness, seriously evaluate a **backend enrichment data
  provider** (Proxycurl, People Data Labs, etc.) keyed on the LinkedIn URL. That
  is most likely how Dex achieves <20-min syncs of 1,300+ contacts and stays
  stable. Tradeoff: cost per profile vs. engineering + ban-risk of session
  crawling. This is the key product/architecture decision for the rebuild.

---

## 10. For Sanket's Claude Code — how to pick this up

1. Read this file, then `HANDOFF.md` (operational), then
   `docs/LINKEDIN_GUARDRAILS.md` (safety).
2. The parser is `extension/content-script/rsc-profile-client.ts` — start there
   for any deep-data work. Validate changes with `tests/verify-parser.mjs`
   against captured payloads before any live test.
3. The endpoint + body recipe is in §2.2 + §2.4 (all reverse-engineered endpoints)
   and in the parser's header comment. §2.5 lists the dead ends; §5.1 is the
   bug/fix recovery log.
4. Never loosen the throttle or make a state-changing LinkedIn request.
5. Recent commits (git log) trace the whole build:
   `feat(linkedin-sync): Dex-level deep enrichment via SDUI rsc-action endpoint` →
   parser robustness fixes → render in the app → preserve identity fields →
   headline + empty-profile retry.

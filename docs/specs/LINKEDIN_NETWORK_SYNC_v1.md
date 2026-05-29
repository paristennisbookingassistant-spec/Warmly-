---
feature: LinkedIn Network Sync (v1)
status: pending approval
spec_version: 2 (revised after observing Dex achieves bulk deep sync in <20 min)
created: 2026-05-29
target_codebase: existing (C:/Users/glygs/Documents/ai-networking-coach/)
---

# Feature: LinkedIn Network Sync (v1)

## User story

As a new Warmly user, I want to bring my entire LinkedIn network — including each contact's work history, education, location, and headline — into Warmly in a single onboarding step, so that my contacts page is fully populated and rich from day one, without having to add anyone manually.

## Architecture

```
┌──────────────────────┐                   ┌─────────────────────────────┐
│  Warmly web app      │  postMessage      │  Warmly Chrome extension    │
│  (warmly.app)        │ ◄─────────────►   │  (Manifest V3)              │
│                      │                   │                             │
│  - Onboarding step   │                   │  Content script (linkedin)  │
│    "Connect          │                   │  - voyager-list-client.ts   │
│    LinkedIn"         │                   │  - voyager-batch-client.ts  │
│  - Settings →        │                   │  - connections-sync.ts      │
│    Connections       │                   │  (orchestrator, runs in CS  │
│  - Live progress UI  │                   │   not SW per MV3 limits)    │
│  - Contacts page     │                   │                             │
│    (live updates)    │                   │  Service worker             │
└──────────┬───────────┘                   │  - sync-coordinator.ts      │
           │                               │  - api-client.ts            │
           │ Supabase realtime              │  - rate-limiter.ts          │
           │                               └──────────────┬──────────────┘
           ▼                                              │
┌──────────────────────────────────────────────────┐      │ POST batches
│  Supabase                                        │      │ (50 contacts/batch)
│  - contacts (enriched columns: linkedin_urn,     │      ▼
│    linkedin_bio, experience, education,         │ ┌──────────────────────┐
│    skills, location, photo_url)                 │ │  Next.js API routes  │
│  - sync_jobs (status tracking)                  │ │  /api/contacts/      │
└─────────────────────────────────────────────────┘ │   bulk-import        │
                                                    │  /api/sync-jobs      │
                                                    └──────────────────────┘
```

**Data flow:**

1. User in onboarding clicks "Sync my network" → web app `postMessage` to extension content script (extension exposes a known message channel on `warmly.app` origin via the existing `auth-bridge.ts` pattern).
2. Content script creates a sync_job record (via service worker → API), then begins Phase 1.
3. **Phase 1 — Connections list pagination (~3-5 min):**
   - Calls `GET /voyager/api/relationships/dash/connections?count=40&start=0` then increments `start`.
   - Each page returns ~40 connection URNs + basic data (name, headline, photo, current company).
   - Content script batches 50 basic contacts at a time, sends to service worker.
   - Service worker POSTs `/api/contacts/bulk-import` with batch. Backend UPSERTs (matching on `user_id, linkedin_url`), inserts new "passive" contacts. Web app sees them appear via Supabase realtime.
   - Throttle: 1 page request every 3-5 seconds (random jitter).
4. **Phase 2 — Batch profile enrichment (~12-20 min):**
   - Once all connection URNs are collected, batch them 25 at a time.
   - Calls `GET /voyager/api/identity/dash/profiles?ids=List(urn:li:fsd_profile:X,Y,Z,...)&decorationId=com.linkedin.voyager.dash.deco.identity.profile.FullProfile`.
   - Each batch returns ~25 deep profile records with experience, education, skills, location, about.
   - Content script forwards batch to service worker → POST `/api/contacts/bulk-import` with enrichment data. Backend UPDATEs existing contact rows.
   - Throttle: 1 batch request every 10-15 seconds (random jitter).
5. **Phase 3 — Cleanup:**
   - Mark sync_job as `completed`.
   - Web app shows "Sync complete · 1,311 contacts" toast.

**CSRF token extraction:**
- Primary: read `JSESSIONID` cookie via `document.cookie` from content script context (works when not HttpOnly).
- Fallback: `chrome.cookies.get({ url: 'https://www.linkedin.com', name: 'JSESSIONID' })` via service worker (requires `cookies` permission).
- Parse the `"ajax:XXXX"` value; send as `csrf-token` header on every Voyager call.

**Web app ↔ extension messaging:**
- Extension's existing `content-script/auth-bridge.ts` already handles bridging between `warmly.app` and the extension on the auth flow — extend the same pattern.
- Add message types: `START_NETWORK_SYNC`, `SYNC_PROGRESS`, `SYNC_COMPLETE`, `SYNC_FAILED`.
- Web app listens via `window.addEventListener('message', ...)` on the bridge channel.

## Success criteria (tester verifies these)

1. **Install detection.** Visiting the Warmly onboarding "Connect LinkedIn" step in a browser WITHOUT the extension installed shows the "Install extension" CTA, not a sync button. With the extension installed, shows the "Sync my network" button.
2. **LinkedIn session check.** With extension installed but user NOT logged into LinkedIn, the UI shows "Log into LinkedIn first" with a link to `https://www.linkedin.com/login`. Sync button is disabled.
3. **Phase 1 visible progress.** Within 30 seconds of clicking "Sync my network", at least 40 contacts appear in the Warmly Contacts page with basic data populated (name + headline + photo + current company + LinkedIn URL).
4. **Phase 1 completes.** Within 5 minutes (or `min(5 min, 0.2 sec × contact count)`), all connections from the user's LinkedIn network appear in Warmly with basic data, up to the 2,500-contact cap.
5. **Phase 2 enrichment.** Within 25 minutes of starting sync, at least 95% of synced contacts have populated `experience`, `education`, and `location` fields. (Tester verifies by opening 5 randomly-selected contact detail pages.)
6. **Throttle enforced.** Cannot be bypassed. Inspecting network traffic during sync shows max 1 Voyager call per 3 seconds (list endpoint), max 1 per 10 seconds (batch profile endpoint). If a "speed up sync" UI control exists (it shouldn't), tester marks FAIL.
7. **Anti-bot backoff.** If LinkedIn returns HTTP 429 or 999 during sync, the extension pauses for ≥1 hour, sync_job status becomes `paused`, and the web app shows "Sync paused — LinkedIn requested a cooldown. We'll resume automatically." Tester simulates this by mocking the response (or by triggering a real 429 with aggressive throttle disable — flagged as advanced test).
8. **Plan cap.** If user has >2,500 connections, sync stops at 2,500 (most recently added) and the web app shows "Synced first 2,500 of [N] contacts. Upgrade to sync the rest."
9. **Resumability.** If browser is closed mid-sync, on next visit to Warmly with extension installed and LinkedIn session active, the web app prompts "Resume your sync from contact 847?" and the extension picks up where it left off.
10. **No write actions to LinkedIn.** Tester confirms the extension never POSTs/PUTs/DELETEs to any LinkedIn endpoint. Read-only throughout (per existing LINKEDIN_GUARDRAILS.md).

## Out of scope (v1)

- **Re-sync of already-synced contacts.** v1 syncs once. Diff updates of title changes, new connections, etc. come in v2.
- **Network Updates feed** (Dex's job-title-change diff display). Comes with v2 re-sync.
- **Goal-based prioritization.** v1 syncs everyone equally. Tiering happens in the AI scoring layer post-sync, not in the sync itself.
- **Cross-browser support.** Chrome only. Firefox/Safari later.
- **Mobile.** Web app only on laptop.
- **Photos stored locally.** v1 stores LinkedIn photo URL only; rendering pulls from LinkedIn's CDN. Storing photos in Supabase storage is v2.
- **Skills sync.** v1 skips the skills field (it's noisy, not used by AI scoring yet).
- **Recent posts sync.** v1 skips recent activity. Comes in v2 if needed.

## Files likely touched

**Extension** (`extension/`):
- `manifest.json` — add `"cookies"` permission; add message receiver for `warmly.app` origin
- `content-script/voyager-list-client.ts` (new) — Voyager connections-list endpoint wrapper
- `content-script/voyager-batch-client.ts` (new) — Voyager batch profile endpoint wrapper
- `content-script/connections-sync.ts` (new) — orchestrator (runs in content script, NOT service worker)
- `content-script/auth-bridge.ts` — extend to bridge sync messages with warmly.app
- `service-worker/sync-coordinator.ts` (new) — receives batches from content script, manages sync_job state
- `service-worker/api-client.ts` — add `bulkImportContacts(batch)` and `updateSyncJob(jobId, status)` methods
- `service-worker/rate-limiter.ts` — add throttle config for list vs batch endpoints
- `shared/types.ts` — add `VoyagerConnection`, `VoyagerProfile`, `BulkImportRequest`, `SyncJob` types
- `shared/constants.ts` — add `LIST_THROTTLE_MS`, `BATCH_THROTTLE_MS`, `PLAN_CAP`, `BATCH_SIZE`

**Backend** (`src/`):
- `src/app/api/contacts/bulk-import/route.ts` (new) — POST endpoint, accepts batch, UPSERTs into contacts
- `src/app/api/sync-jobs/route.ts` (new) — POST creates, PATCH updates sync_job records
- `src/app/api/sync-jobs/[id]/route.ts` (new) — GET returns current sync_job status
- `src/lib/supabase/sync-jobs.ts` (new) — typed helpers for sync_job CRUD
- `src/lib/supabase/contacts.ts` — add `bulkUpsertContacts(userId, batch)` helper
- `src/types/api.ts` — add request/response types for new endpoints
- `src/types/database.ts` — regenerate after migration

**Frontend** (`src/`):
- `src/app/(auth)/onboarding/connect-linkedin/page.tsx` (new) — onboarding step
- `src/app/(views)/settings/connections/page.tsx` (new) — re-sync page
- `src/components/onboarding/LinkedInSyncCard.tsx` (new) — install detection + sync button
- `src/components/onboarding/SyncProgress.tsx` (new) — live progress display
- `src/hooks/useExtensionBridge.ts` (new) — postMessage wrapper for talking to extension
- `src/hooks/useSyncJob.ts` (new) — subscribes to sync_job updates via Supabase realtime

**Database** (`supabase/`):
- `supabase/migrations/<timestamp>_sync_jobs.sql` (new) — `sync_jobs` table with RLS
- `supabase/migrations/<timestamp>_contacts_linkedin_enrichment.sql` (new) — add `linkedin_urn`, `linkedin_bio`, `experience` (jsonb), `education` (jsonb), `location`, `photo_url`, `sync_job_id` columns to contacts

## Risks

1. **LinkedIn rotates Voyager endpoint paths.** Defensive parsing required. Wrap every field access. Log parse failures. Monitor sync success rate per endpoint version.
2. **Batch endpoint might require specific decoration ID values that change.** Hard-code the current `decorationId`, version it as a constant, plan to update when LinkedIn rotates.
3. **CSRF token extraction may fail** if LinkedIn flips JSESSIONID to HttpOnly. Defensive fallback via `chrome.cookies.get()` already in spec.
4. **User's LinkedIn account could be flagged.** Hard throttle (cannot be disabled by user) is the mitigation. Adopt Dex's 2,500 cap.
5. **Web app ↔ extension messaging fragility.** Use the existing `auth-bridge.ts` pattern. Both sides must verify the origin (`warmly.app` only).
6. **MV3 service worker death (30 sec idle).** Orchestrator MUST run in content script per existing PRD. Service worker only handles short-lived API forwards.
7. **Backend write concurrency.** Multiple parallel batches from same user could collide on UPSERT. Use Postgres `ON CONFLICT DO UPDATE` correctly; add unique index on `(user_id, linkedin_url)` if not already present.
8. **Resumability state correctness.** sync_job must track `last_completed_page` and `last_completed_batch` atomically. If browser closes mid-batch, no double-counting on resume.
9. **Testing the throttle requires non-trivial fixture.** ext-tester.mjs already exists but needs a real LinkedIn test account with known number of connections. Need to flag this to tester sub-agent so it doesn't ad-hoc create one.

## Test plan

**Agent loop test** (via tester sub-agent):

The tester uses `tests/ext-tester.mjs` (existing pattern from `claude-code-build-playbook.md`) to:

1. Launch persistent Chromium with the Warmly extension loaded
2. Use a pre-warmed test LinkedIn account (cookies in persistent profile dir)
3. Navigate to Warmly onboarding "Connect LinkedIn" step
4. Click "Sync my network"
5. Wait + screenshot at: 30 sec, 5 min, 25 min
6. Verify Phase 1 visible progress, Phase 1 completion, Phase 2 enrichment
7. Open 5 random contact detail pages, verify experience + education + location present
8. Inspect chrome.network logs to verify throttle (no two Voyager calls within minimum interval)
9. Verify no POST/PUT/DELETE to linkedin.com endpoints
10. Report PASS/FAIL per success criterion 1-10

**Manual user test** (Liyang verifies once):
- Run the flow with real account (Liyang's). Validate UX feel.
- Confirm sync completes within ~20 minutes (rough match to Dex baseline).
- Spot-check 5-10 contacts in Warmly against their actual LinkedIn profile for data fidelity.

**What we are NOT testing in v1:**
- 429/999 recovery (mock-only in tester, manually verified once by Liyang triggering aggressive throttle)
- Re-sync / diff updates (v2)
- Cross-browser (Chrome only)

## Definition of done

- All 10 success criteria PASS via tester sub-agent.
- Manual user test by Liyang confirms UX is acceptable.
- `docs/STATUS.html` updated with the shipped feature.
- `docs/PROJECT_MEMORY.md` appended with what shipped + tester findings + any deviation from spec.
- `docs/LINKEDIN_GUARDRAILS.md` reviewed — no new write-action surfaces added.
- New constants documented in `extension/shared/constants.ts` with rationale comments.
- Migration applied via the GitHub Actions auto-apply workflow.

## Spawn plan

Once approved:

- **Spawn in parallel** (single message, multiple Agent calls):
  1. **Extension developer** (`subagent_type: extension`) — owns everything under `extension/`. Brief: implement Voyager clients + connections-sync orchestrator + service worker coordinator + manifest update. Reference the existing `dom-reader.ts`, `auth-bridge.ts`, and `rate-limiter.ts` patterns. Write defensive parsers. Type-check + build before declaring done.
  2. **Backend developer** (`subagent_type: backend`) — owns everything under `src/app/api/`, `src/lib/`, `supabase/migrations/`. Brief: build the bulk-import endpoint + sync-jobs CRUD + migrations. Use existing Supabase patterns. All input validated with Zod. RLS on all new tables.
- **After both finish + deploy**:
  3. **Frontend developer** (`subagent_type: frontend`) — owns everything under `src/app/(views)/`, `src/components/`, `src/hooks/`. Brief: build onboarding step + settings page + progress UI + hooks. Must show loading + error states. Hits the API contracts the backend dev shipped.
- **After frontend deploys**:
  4. **Tester** (`subagent_type: tester`) — runs success criteria via `tests/ext-tester.mjs`. Reports PASS/FAIL with screenshots. No codebase access.

If tester fails: orchestrator (me) diagnoses, dispatches fix, re-tests. Max 3 iterations before escalating to Liyang.

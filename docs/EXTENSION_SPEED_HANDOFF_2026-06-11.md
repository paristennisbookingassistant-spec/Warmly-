# Extension Speed Investigation, Handoff (2026-06-11)

> **RESOLVED (Session 15, same day, see `docs/PROJECT_MEMORY.md` Session 15 for full detail).**
> Pressure-test done: 300 @ 700ms and 150 @ 400ms both clean (only failure = the
> profile-specific Ali Asad 500); detection never engaged across ~1,170 requests/day.
> Shipped: `PROFILE_FETCH_THROTTLE_MS = 700` (400 is the tested dial-down).
> **§3's truncation diagnosis was wrong in the mechanism:** the endpoint returns NO
> `paging.total`, and the decoration omits Profile entities even on full pages, the fix
> paginates on `data["*elements"].length`, not profile count. Verified live: **1,332/1,331
> imported across 34 pages** (vs the old 438 cap). Also fixed: sync-job PATCH 405
> (wrong route + field mapping), useExtensionBridge fictional event types, Phase-2
> batched imports (~2.1s/profile real pace → ~50 min full network). Trigger UI existed
> and works E2E; remaining: full-network Phase-2 acceptance run + deployed-UI visual pass.

_Self-contained. A fresh agent should be able to read ONLY this (plus the two docs it
references) and continue pressure-testing without re-deriving anything._

**Goal of this workstream:** replicate Dex's extension, user installs extension, clicks
"Connect LinkedIn" in the web app (no manual LinkedIn browsing), and their **entire network
(1,000+) syncs with photo, title, full work experience + education in under ~30 min.**

**Read alongside:** `docs/LINKEDIN_SYNC_HOW_IT_WORKS.md` (how the sync works), `HANDOFF.md`
(operational playbook, tester creds, endpoints), `docs/LINKEDIN_GUARDRAILS.md` (safety, READ
before any LinkedIn tooling).

---

## 0. TL;DR, the breakthrough and the caveat

**Breakthrough:** the sync was never fundamentally slow or broken. The **15-second
per-profile throttle (`PROFILE_FETCH_THROTTLE_MS`) was an unmeasured guess ~10–20× too slow.**
Measured reality: a full deep-profile fetch (experience + education) takes **~1.1–1.5s**. At a
modest pace we get **~37 min / 1,000**; pushing the delay down targets Dex's sub-30-min. Full
detail comes back (5–17 roles + education per profile, verified visually). **No 3rd-party data
provider needed, Dex uses the same session-based extension approach (confirmed from its own
"Connect LinkedIn" modal: "authenticates via Browser Extension... ensure you are logged in on
LinkedIn").**

**The caveat (do NOT lose this):** we proved **60 fast fetches in a row are clean**. We have
**NOT** proven **1,000** are. LinkedIn detection is largely **cumulative**, fine at 60, may
engage at 400+. **Faster is more bot-like, not less.** So full-scale fast sync still carries
**real, un-de-risked detection risk.** The job of the next agent is to pressure-test exactly
this: find the volume/rate where detection actually starts (if it does), and set a safe
throttle with margin.

---

## 1. What we measured (the experiments + results)

Two READ-ONLY experiment harnesses were written (they call the SAME rsc-action endpoint the
extension uses, just at controlled rates, and audit for forbidden writes):

### `tests/speed-probe.mjs`, 12 profiles, ramped 4s → 1.5s → 0s delay
- **11/12 OK.** avg deep-fetch (exp+edu) **~1,133 ms/profile**, fastest 972 ms.
- At 0ms delay, all 3 tested succeeded (1 tail failure, see Ali Asad below).
- **Bulk endpoint probe** (`/voyager/api/identity/dash/profiles?ids=List(...)`): returns 200
  but **NO experience/education**, confirmed basic-only. So fast per-profile is the only deep path.
- Extrapolation to 1,000: 0ms→~19min, 1.5s→~44min, 4s→~86min, 15s→~269min.

### `tests/speed-sustained.mjs`, 60 profiles, steady 700ms delay
- **59/60 OK.** avg latency **~1,495 ms**, effective pace ~2,300 ms/profile, wall **138s**.
- **No clustering, no degradation, 0 forbidden writes.** Anti-bot did NOT engage over 60.
- Extrapolated **~37 min / 1,000** at this (already-safe) pace.
- The **1 failure is Ali Asad** (`urn ...ACoAAAFZbiYB...`), fails **every** time regardless of
  speed → **profile-specific edge case** (his profile returns `500` to the rsc-action), NOT
  rate-limiting. ~1/60 ≈ the ~2–4% edge-case rate the docs already note; handled by retry.

### Completeness verified
Pulled the 12 probe profiles' parsed data from Supabase → rendered cards
(`contact-db/output/probe_cards.html`, screenshot) → **full multi-role experience + education**
(Casper 17 roles/8 edu, Joanna 14, Anay 10, rest 5–8). The big response sizes (50–130 KB) are
real career histories, not padding.

Result files: `contact-db/output/_speed_probe_result.json`, `_sustained_result.json`,
`_probe_profiles.json` (12), `_probe60.json` (60), `_probe_enriched.json`.

---

## 2. Why it failed before but works now (don't misread this)

It is NOT that we found a magically safe fast method. The earlier hard block came from
**cumulative over-volume + a hammer**: across one day we fired *thousands* of requests (all the
reverse-engineering probes + 3 full test syncs + a **6-hour retry loop that kept pounding an
already-blocked endpoint**). That tripped a hard block; the 6h run then failed at Phase 1 because
the session was **already flagged**. It works now because **(a) 24h+ cooldown cleared the flag,
and (b) we did tiny volume** (~72 profiles total). Lesson: **volume + bursting + retry-hammering
get you blocked; pace per-profile was never the problem.** Respect cooldowns and backoff.

---

## 3. Current extension state (gap analysis)

From a full read of `extension/` (see `docs/LINKEDIN_SYNC_HOW_IT_WORKS.md` for endpoint detail):

| Component | State | Note / file |
|---|---|---|
| Phase 1 (connections list) | ✅ works | `voyager-list-client.ts` + loop `connections-sync.ts:264-380`. Throttle `LIST_THROTTLE_MS=3000`. |
| **Phase 1 truncation bug** | ⚠️ **BUG** | `voyager-list-client.ts:472-474`: `hasMore=false` when a page returns `<40` → premature stop. **This is why our best run capped at 438 not ~1,347.** Fix: treat short/empty page as transient (pause+retry+resume), not end-of-list. |
| Phase 2 (deep exp/edu, RSC) | ✅ works | `rsc-profile-client.ts` (the parser/moat). Loop `connections-sync.ts:489-632`. **Throttle `PROFILE_FETCH_THROTTLE_MS=15000` ← the number to lower.** Runs UPFRONT/blocking, no lazy mode. End-of-pass retry exists (`:597-626`). |
| Phase 1.5 (bulk basic) | ❌ not built | `BATCH_SIZE`/`BATCH_THROTTLE_MS` constants exist but unused. Optional: fast bulk photo/title/location. Not needed if per-profile is fast enough. |
| Trigger UI | ❌ missing locally | `src/app/**/connect-linkedin` page does not exist (removed/rebuild). Prod Vercel still serves an older one. Message contract works: web app `postMessage START_NETWORK_SYNC {user_id}` → `auth-bridge.ts` → SW `sync-coordinator.ts` → content script. |
| Resume | ✅ works | `SyncJob` has `last_completed_page`, `last_processed_urn_index`, `collected_urns/profiles`, `backoff_count`, `resume_after_ts`. |
| Backend ingest | ✅ works | `POST /api/contacts/bulk-import` (Zod) → `bulkUpsertContacts` (`src/lib/supabase/contacts.ts`). Preserves identity fields (Phase 2 never clobbers name/photo). Writes `experience`/`education_v2` JSONB. |
| Throttle constants |, | `extension/shared/constants.ts`: LIST=3000, BATCH=10000(unused), **PROFILE_FETCH=15000**, PLAN_CAP=2500, RATE_LIMIT_PAUSE=60min. |

---

## 4. Recommended change set (evidence-backed, small)

1. **Lower `PROFILE_FETCH_THROTTLE_MS`** 15000 → start ~700ms (proven clean); the next agent
   dials toward ~300–500ms ONLY after pressure-testing sustained safety at scale.
2. **Fix Phase 1 truncation** (`voyager-list-client.ts:472`): short page ≠ end of list; pause +
   retry + resume so the full ~1,347 import.
3. **Keep the end-of-pass retry** for the ~2% profile-specific failures (Ali Asad pattern).
4. **Build the `connect-linkedin` trigger UI** for the real one-click flow (currently missing).
5. **Keep backoff + resume intact**, the safety net that prevents another hard block.

After any extension rebuild: `cd extension && BACKEND_URL=<url> node build.mjs` then **clear the
SW cache**: `rm -rf ".playwright-profile/Default/Service Worker" ".../Code Cache"` (stale SW
gotcha, HANDOFF §5.4).

---

## 5. PRESSURE-TEST PLAN for the next agent (the actual handoff task)

The open question: **does a real full-scale fast sync stay clean, or does detection engage past
some volume?** Find the threshold and the safe throttle. Suggested sequence (respect cooldowns,
ideally start after 12–24h of no LinkedIn hits; stop IMMEDIATELY on any `429`/`999`/`ERR_FAILED`):

1. **Re-confirm baseline**, re-run `node tests/speed-sustained.mjs` (60 @ 700ms). Expect ~59/60.
2. **Scale up gradually**, copy it to 150, then 300 profiles at 700ms. Watch for failures
   *clustering toward the end* (= detection onset) vs scattered (= transient). This is the core
   experiment: where, if anywhere, does it break?
3. **Map the rate curve**, at a fixed ~150 count, try delays 1000 / 700 / 500 / 300 ms (separate
   runs, spaced out). Find the fastest delay that stays clean at scale.
4. **End-to-end through the real extension**, rebuild with the chosen throttle + truncation fix,
   run `tests/timed-sync-50.mjs <N>` (or e2e), verify into Supabase, measure wall time + block
   rate. Then a true ~full-network run to confirm <30 min and full pagination (past 438→~1,347).
5. **Three-agent loop** (per `~/Documents/Obsidian Vault/_claude/reference/claude-code-build-playbook.md`):
   orchestrator plans → spawn `extension`/`backend`/`frontend` dev agents for the change set →
   spawn an **independent tester (no context)** to validate the full flow end-to-end against the
   tester account.

**Safety rules (NON-NEGOTIABLE):** read-only only (the rsc-action POST is a data read, see
guardrails); never message/connect/post/edit; hard-stop on rate-limit signals and wait out the
cooldown rather than retry-hammer (that is what caused the original block); prefer the user's real
Chrome over headless automation for any large real run.

---

## 6. Environment / how to run

- **Tester Warmly account:** `.env.test` → `TEST_USER_EMAIL`, `TEST_USER_PASSWORD`,
  `WARMLY_PROD_URL`. Supabase user_id `deed7f54-3c3c-40a9-bf20-2e17bc6192e0`.
- **LinkedIn session:** reuses the `/linkedin` skill cookie. Before any run:
  `bash ~/.claude/skills/linkedin/check_and_update_cookie.sh check` then
  `node tests/seed-linkedin-cookies.mjs` (injects into `.playwright-profile/`). Clear singleton
  locks first if a prior headed Chrome left them.
- **Supabase reads** (status checks): network works via `curl` in this env (Python urllib's DNS
  was flaky, use curl). Creds in `.env.local` (`NEXT_PUBLIC_SUPABASE_URL`,
  `SUPABASE_SERVICE_ROLE_KEY`).
- **Current DB state (test user):** ~438 contacts, ~342 deep-enriched (from a prior run). The
  full network is 1,347 connections (per the official export).

---

## 7. Cross-reference: the data side (separate, DONE)

The contact-DATABASE workstream (separate from this sync-speed topic) is complete and shippable,
all in `contact-db/`:
- INSEAD CV book → 961 normalized contacts (Notion-schema 4-table format).
- LinkedIn official export → **full network 1,331 contacts** with current title/company
  (zero-risk, `contact-db/output/linkedin_export/`).
- LinkedIn deep sync → 438 contacts (342 with full history).
- Format contract `contact-db/FORMAT.md`; validator `contact-db/build/validate.py`; converters
  `normalize_linkedin.py` / `convert_export_csv.py` / `export_supabase_csv.py`.

---

## 8. One-line status

**Sync speed is solved on paper (~1.5s/profile, 60 clean, full data), the 15s throttle was the
bug. Unverified at 1,000-scale (cumulative detection risk). Next: pressure-test the volume/rate
threshold, fix Phase-1 truncation, build the trigger UI, then run the three-agent build+test loop.**

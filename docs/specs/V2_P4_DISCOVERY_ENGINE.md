# V2 Phase 4, Real discovery engine (spec)

Make BOTH discovery doors real and the refine chat actually work. The shared
`directory_profiles` table (961 INSEAD alumni) is already created + loaded.

Two stages: **Backend** (3 endpoints) then **Frontend** (rewire INSEAD door to live
data + real chat re-rank + per-user scoring on both decks).

## Data model (done)
- `directory_profiles` (shared, authenticated-read RLS): one row per INSEAD alum.
  Columns mirror `contacts`: name, first_name, last_name, headline, current_title,
  company, location, photo_url, linkedin_url, plus `cohort` (text), `nationality`/
  `languages`/`industries`/`functions`/`geography` (text[]), `experience` (jsonb),
  `education_v2` (jsonb), `directory_key` (unique). 961 rows.
- `contacts.directory_profile_id` (uuid FK) links a saved alum back to its origin.
- `contacts.source` now allows `'cv_book'`.

---

## STAGE 1, Backend (agent: backend). New files under src/app/api/directory/**, a
## DirectoryProfile type, reuse src/lib/ai/scoring.ts + src/lib/api/helpers.ts.

### A. `GET /api/directory`, shared directory list, filtered
Auth required (any authenticated user; RLS allows shared read via the server client).
Query params (all optional): `page` (default 1), `per_page` (default 24, max 100),
`cohort` (eq), `company` (ilike %v%), `industry` (array contains, `industries=cs.{v}`),
`function`, `geo` (geography contains), `search` (ilike on name/company/current_title),
`sort_by` (name|cohort, default name), `sort_order`.
Response: `{ data: { items: DirectoryProfile[], total, page, per_page, has_more }, error }`
using `buildPaginatedResponse`. Add a `DirectoryProfile` type to `src/types/database.ts`
(or a new `src/types/directory.ts`) matching the columns (experience/education_v2 reuse
`LinkedInExperienceEntry[]` / `LinkedInEducationEntry[]`).

### B. `POST /api/directory/save`, copy an alum into the user's contacts
Body (Zod): `{ directory_id: string (uuid) }`. Flow:
1. Load the `directory_profiles` row by id (RLS shared read). 404 if missing.
2. Idempotency: if a `contacts` row already exists for `(user_id, directory_profile_id)`,
   return it (don't duplicate) with a flag `{ already_saved: true }`.
3. Else insert into `contacts`: user_id (auth), name, current_title, company, location,
   photo_url, avatar_url=photo_url, linkedin_url, experience, education_v2,
   `source:'cv_book'`, `directory_profile_id:<id>`, `user_action:'saved'`,
   `status:'discovered'`, reviewed_at=now.
Response: `{ data: Contact, error }` (+ `already_saved` boolean).

### C. `POST /api/directory/rank`, per-user scoring of directory profiles (no persistence)
Body (Zod): `{ directory_ids: string[] (1..25), top_n?: number }`. Flow:
1. Load those `directory_profiles` rows + the user row (`profile_md`, `user_memory`,
   career_history, education, goals, networking_preferences).
2. Build `BatchRankCandidate[]` (from `src/lib/ai/scoring.ts`): `contact_id` = the
   directory id; `profile` = a `ContactProfileForScoring` built from the directory row
   (name, current_title, company, career_history←experience, education←education_v2,
   location). Call `rankContactsBatch({ user_profile, user_profile_md, user_memory,
   candidates, topN })`.
3. Return `{ data: { rankings: [{ directory_id, score, tier, reasoning, hook, rank }] }, error }`.
   (Map BatchRankResult.contact_id → directory_id.) NOT persisted, it's live per-user.
**Add `export const maxDuration = 60;`** (MiniMax call, cold-start safe, see the P2 fix).

Constraints: Zod-validate every input; typed responses; no `any`; no raw SQL (Supabase
client); reuse helpers (`unauthorized`, `validationError`, `notFound`, `buildPaginatedResponse`).
Do NOT touch the extension, V1 views, or the V2 frontend (Stage 2 does that).

### Stage 1 acceptance (orchestrator verifies live with the tester account before Stage 2)
- `GET /api/directory?cohort=mba26d&per_page=5` → 5 real alumni; `total` ≈ 414.
- `GET /api/directory?search=mckinsey` → matches.
- `POST /api/directory/save {directory_id}` → creates a `cv_book` contact; calling again → `already_saved:true`, no duplicate.
- `POST /api/directory/rank {directory_ids:[…5…]}` → ranked results with tier + one-sentence reasoning.

---

## STAGE 2, Frontend (agent: frontend). Rewire `src/components/v2/discover/**`.

### INSEAD door → LIVE
- Replace the seed `CV_DECK` with a fetch to `GET /api/directory` (seed the filters from
  the user's scope; default no filter → all, sorted). Map `DirectoryProfile` → `DeckCard`
  (same mapper style as the LinkedIn door; source ribbon = "INSEAD CV book · {cohort} · 1st").
- On open, **score the visible batch**: `POST /api/directory/rank` with the first ~24 ids →
  apply tier + rationale (recommendation) to the cards; sort by score. Show a subtle
  "scoring…" state; fall back to unscored order if rank fails.
- Save → `POST /api/directory/save {directory_id}` → toast ("Saved {first} to your contacts");
  on `already_saved`, toast "Already in your contacts". (No more local-only toast.)
- Loading / error / empty states.

### LinkedIn door → add real scoring
- Keep the live pending-contacts deck (already wired). On open, score the visible batch
  via the EXISTING `POST /api/ai/rank-batch` (it takes contact_ids) and apply tier +
  reasoning to the cards, sorted by score. Fall back gracefully if unscored.

### Refine chat → REAL (both doors)
- Replace the canned `generateAgentReply` re-rank with a real effect: parse the user's
  instruction into filters/intent and RE-QUERY the deck.
  - INSEAD: map phrases → `GET /api/directory` params (cohort, industry, geo, company,
    search) and/or re-rank via `/api/directory/rank` with an instruction-biased order.
  - LinkedIn: filter the pending set client-side (company/location/keyword) and/or
    re-rank via `/api/ai/rank-batch`.
  Keep the coach's chat reply text (can stay lightweight), but the DECK MUST actually
  change to reflect the instruction (different/re-ordered cards), not just a cosmetic tag.
- Keep suggestion chips; make them issue real queries.

Constraints: no `any`; loading/error/empty on every fetch; reuse v2 primitives/tokens;
frontend only (call the Stage-1 + existing endpoints). Don't touch the extension or V1.

### Stage 2 acceptance (independent tester, live URL)
1. INSEAD door opens a deck of REAL alumni (real names from the 961), with tier badges +
   a one-line rationale (scored), inside the shell.
2. Saving an INSEAD alum adds them to `/v2/contacts` (a `cv_book` contact); re-opening
   doesn't duplicate.
3. LinkedIn door cards now show tier + rationale (scored), real contacts, Save persists.
4. Typing a refine instruction (e.g. "only consulting backgrounds" / "Paris only" /
   "anyone in VC") VISIBLY changes the deck, different or re-ordered cards, on BOTH doors.
   Quote before/after front-card names to prove it.
5. No console 500s on the page; warm design intact.

## Validation (each stage): `tsc` clean, `build` ok, no `: any`, V1 + vitest unaffected.

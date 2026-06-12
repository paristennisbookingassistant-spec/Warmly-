# V2 Phase 2, Real onboarding (CV → profile) spec

Goal: a new user uploads their CV → the tool reads it → generates their identity
(`profile_md`/`voice_md`) and **pre-fills the goal form** (background + targets) inferred
from the CV, which they edit → "Build my coach". This is a prerequisite for the AI
features (scoring/drafts/prep all need `profile_md`, see VISION.md Phase 1 learning).

**Key reuse:** the BUILD step already exists, `POST /api/users/me/onboarding-complete`
takes `{ materials:{ cv:<TEXT>, cover_letter?, past_messages?, assessments?, targets:{industries,companies,geographies,roles} }, about?, goal?, onboarded? }`, runs
`buildInitialProfile`/`buildInitialVoice`, saves `onboarding_materials`, sets
`onboarded=true`. **Do NOT rebuild it.** The only net-new backend is parsing a file → text
+ extracting structured fields to prefill the review form.

Design source: `design/warmly-v2/project/js/screens/onboarding.jsx` (the "Here's what we
pulled from your CV" review screen, two columns: Your background / Your targets).

---

## STAGE 1, Backend (agent: backend). `POST /api/onboarding/parse-cv` + parser deps.

Add deps: `unpdf` (serverless-friendly PDF→text) and `mammoth` (DOCX→text). `npm i unpdf mammoth`.

`src/app/api/onboarding/parse-cv/route.ts`:
- `export const runtime = "nodejs"; export const maxDuration = 60;`
- Auth-gated (unauthorized() if no user).
- Accept a file via `await request.formData()` → `file` (Blob). Also accept `kind` ("cv"|"cover_letter"|"assessment", default "cv"). Max ~8MB.
- Extract text by mime/extension: PDF → `unpdf` (`extractText`), DOCX → `mammoth.extractRawText`, `.txt`/`text/*` → `await file.text()`. Unknown → 415 with a clear message.
- If `kind === "cv"`, also run a MiniMax structured extraction on the text (reuse `callMiniMax` from `src/lib/ai/minimax.ts`, a tight system prompt, `maxTokens: 1200`, ask for JSON only). Extract:
  `{ prior_industry, prior_function, nationality, work_authorization: string[], insead_class, target_industry, target_role, target_companies: string[], target_geography: string[] }`
 , every field nullable; **never invent** (instruct: if not in the CV, return null/[]).
  Parse defensively; on non-JSON, return `fields: null` (don't 500, text still useful).
- Response: `{ data: { text: string, fields: ExtractedFields | null }, error }`. Add an `ExtractedFields` type (e.g. `src/types/onboarding.ts`).
- Zod-validate where applicable; typed response; no `any`; no raw SQL. Handle parse failures gracefully (return a 4xx/empty fields, never crash).

### Stage 1 acceptance (orchestrator verifies)
- POST a small text/PDF CV → `{ text: "...", fields: {...} }` with plausible extracted fields. Bad/empty file → graceful 4xx. Non-CV `kind` → just `{ text }`.

---

## STAGE 2, Frontend (agent: frontend). V2 onboarding at `/v2/onboarding`.

Build `src/app/v2/onboarding/page.tsx` + `src/components/v2/onboarding/**`, ported from the
design. A client state machine: `upload → processing → review → building`.

1. **Upload step:** drag-drop / file-picker for the CV (PDF/DOCX/TXT), plus optional
   cover-letter and assessment uploads (or paste). On CV drop → `POST /api/onboarding/parse-cv`
   (multipart). Show a friendly error if parse fails; allow paste-as-fallback (a textarea).
2. **Processing animation** while parsing (the design's "reading your CV" state).
3. **Review/prefill screen** (the screenshot): two cards,
   - *Your background* ("inferred from CV"): Prior industry, Prior function, Nationality,
     Work authorization (chips), INSEAD class, prefilled from `fields`, all editable
     (dropdowns/chips). Reuse the v2 `Chip`/`Picker`/`Select` primitives.
   - *Your targets*: Target industry, Target role, Target companies (chips), Target
     geography (chips), prefilled, editable.
   - A "Build my coach" CTA.
4. **Build:** on submit → `POST /api/users/me/onboarding-complete` with
   `materials:{ cv:<parsed text>, cover_letter?:<text>, assessments?, targets:{ industries:[target_industry], companies:target_companies, geographies:target_geography, roles:[target_role] } }`,
   `about`/`goal` (derive a short `goal` string from the targets), `onboarded:true`.
   Show a "building your coach…" state (this runs MiniMax, 15-30s), then `router.push("/v2")`.
5. **Gate:** in the V2 shell (the `Sidebar`/layout already loads the user) add a check,
   fetch `/api/users/me`; if `onboarded === false`, `router.replace("/v2/onboarding")`.
   Also add a "Rebuild profile from CV" link in `/v2/settings` (ProfileBlock) pointing to
   `/v2/onboarding`. Don't block the render while checking (avoid a flash); only redirect
   non-onboarded users.

Constraints: TS strict, no `any`; loading/error/empty on every fetch; reuse v2
primitives/tokens; the upload must degrade to paste if parsing fails; frontend only (call
the Stage-1 endpoint + the existing onboarding-complete). Don't touch V1 or the extension.

### Stage 2 acceptance (independent tester, live URL)
1. A logged-out test user with `onboarded=false` hitting `/v2` lands on `/v2/onboarding`
   (orchestrator will flip the test account's `onboarded` flag to exercise this; then
   restore). 2. Uploading a CV shows a processing state, then a review screen with
   **prefilled** background + target fields. 3. Editing a field works. 4. "Build my coach"
   shows a building state, then lands on `/v2` and the account is `onboarded=true` with a
   real `profile_md` (verify a subsequent draft/score is contextual, not a stub).

## Verification
`tsc` + `build` clean; no `: any`; V1 + vitest unaffected; new deps build on Vercel
(Node runtime). Tester PASS on the 4 criteria before shipping.

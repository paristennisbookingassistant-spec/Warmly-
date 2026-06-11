# V2 Phase 2 — Contacts loop (spec)

Build the "saved network" loop: Contacts list → Contact Detail → Draft editor. Two frontend agents work in parallel with the ownership split below. Frontend only — call existing endpoints; do NOT add/modify any API route, src/lib, the extension, or V1.

Routes (replace the `/v2/contacts` placeholder):
- `/v2/contacts` — list (Agent A)
- `/v2/contacts/[id]` — detail (Agent A)
- `/v2/contacts/[id]/draft` — draft editor (Agent B)

Design sources (port pixel-faithfully): `design/warmly-v2/project/js/screens/contacts.jsx`, `contact-detail.jsx`, `story-so-far.jsx`, `draft-editor.jsx`, and `data.jsx` (STORIES / DRAFTS_FOR_ANNA / MEETING_PREPS are seed reference only).

Reuse P0 primitives (`src/components/v2/{icons,palette,primitives,Toast}`) + tokens (`text-ink*`, `bg-surface`, `.font-display`, `.font-mono-tag`, `.fade-up`, `.card-hover`, `.shimmering`, `.skeleton-pulse`). Contact field names/types: `src/types/database.ts` (`Contact`, `LinkedInExperienceEntry`, `LinkedInEducationEntry`). No `any`.

## API contracts (confirmed)
- **Contact detail:** `GET /api/contacts/{id}` → `{ data: Contact, error }` (full row incl. experience, education_v2, notes, status).
- **Saved list:** `GET /api/contacts?user_action=saved&sort_by=relevance_score&sort_order=desc&per_page=50&lite=true` → `{ data: { items: Contact[], total, page, per_page, has_more }, error }`.
- **Search:** add `&search=<q>` (matches name/company/current_title).
- **Edit contact (notes / status):** `PUT /api/contacts/{id}` body any of `{ notes?, status?, current_title?, company?, location?, name?, linkedin_url?, user_feedback? }` → `{ data: Contact }`. (status enum: discovered|contacted|connected|met|ongoing.)
- **Artifacts for a contact:** `GET /api/artifacts?contact_id={id}&per_page=50` → `{ data: { items: Artifact[], ... } }`. Artifact: `{ id, type, content, status, created_at, ... }` (type incl. outreach_draft|meeting_notes; status draft|finalized|sent|archived).
- **Create conversation (draft prereq):** `POST /api/conversations { type:"contact_session", contact_id }` → `{ data: { id, ... } }`.
- **Generate draft (MiniMax):** `POST /api/ai/generate { artifact_type:"outreach_draft", contact_id, conversation_id, user_instructions? }` → `{ data: { artifact_id, content: { message }, model_used, ... } }`.
- **Send / finalize:** `PUT /api/artifacts/{artifact_id} { status:"sent", content:{ message }, user_edit_distance }` → sets contact.status="contacted" server-side.
- **Triage (for archive):** `PATCH /api/contacts/{id}/review { action:"skip" }` removes from the saved list.

---

## Agent A — Contacts list + Contact Detail

### List `/v2/contacts` (port contacts.jsx)
- Fetch the saved list (contract above). Render the contact cards/rows: avatar (photo_url ?? avatar_url), name, `current_title` @ `company`, location, a **StatusBadge** (map `contact.status` → label: discovered→"New", contacted→"Contacted", connected→"Connected", met→"Met", ongoing→"Ongoing"), tier badge if `tier` set, and a "last contact" line from `last_interaction_at` (relative; "Never" if null).
- Follow-up flag: the design shows "Follow-up due". Backend has no such field — DERIVE: `status ∈ {contacted, connected}` AND `last_interaction_at` older than 30 days → show the warning badge. If you can't compute reliably, omit it (don't fake it).
- Search box → refetch with `&search=`. Loading skeleton, error+retry, empty state (CTA → `/v2/discover`).
- Card click → `next/link` to `/v2/contacts/{id}`.
- Add a **StatusBadge** component to `src/components/v2/primitives.tsx` (only Agent A edits primitives.tsx), ported from the design's StatusBadge (New/Saved/Contacted/Met/Archived + followUpDue warning variant).

### Detail `/v2/contacts/[id]` (port contact-detail.jsx + story-so-far.jsx)
- Fetch `GET /api/contacts/{id}` and `GET /api/artifacts?contact_id={id}&per_page=50` in parallel. Loading + error states.
- Header: avatar, name (font-display), `current_title` @ `company`, location, INSEAD pill (if an `education_v2` entry matches /insead/i), tier badge, StatusBadge. Action buttons: **Draft** (`next/link` → `/v2/contacts/{id}/draft`), **Mark met** (`PUT {status:"met"}` → toast + refresh), **Archive** (`PATCH review {action:"skip"}` → toast + back to list), **Add note**.
- **Experience** timeline from `contact.experience` (title, company, dateRange, location) and **Education** from `education_v2` (school, degree, field, dateRange) — render like the design's timeline.
- **Story so far:** STUB clearly — a tasteful panel: if `contact.notes` is set, show it; else a placeholder ("Your coach will build the relationship story here as you interact."). Do NOT fabricate a narrative. (The design's STORIES is seed.)
- **Notes:** `contact.notes` is a single text field (not entries). "Add note" → append to `notes` and `PUT /api/contacts/{id} { notes }`; re-render. Keep it simple (one notes block + an input), don't invent an entries timeline the backend can't store.
- **Drafts/meetings timeline:** from the fetched artifacts — list outreach_draft / meeting_notes artifacts with type, status, created_at. Best-effort; empty is fine.

---

## Agent B — Draft editor `/v2/contacts/[id]/draft` (port draft-editor.jsx)

Real MiniMax generation. NOT a LinkedIn action — "Send" only logs/finalizes the artifact in our DB (sets the contact to "contacted"); it never sends anything on LinkedIn. Label accordingly.

Flow:
1. On mount: `GET /api/contacts/{id}` for the header context (name, role, company, avatar). Loading state.
2. Create a conversation once: `POST /api/conversations { type:"contact_session", contact_id }` → keep `conversation_id`.
3. Generate the initial draft: `POST /api/ai/generate { artifact_type:"outreach_draft", contact_id, conversation_id }` → show `content.message` in an editable `<textarea>`. While generating, show the `.shimmering` placeholder (design's draft-generation effect). Keep the returned `artifact_id`.
4. **Variant chips** (initial / shorter / formal / direct ask / Paris) → regenerate via `POST /api/ai/generate` with `user_instructions`:
   - shorter → "Make it shorter and punchier, 3 sentences max."
   - formal → "Use a more formal, professional register (vouvoiement if French)."
   - ask → "Add a specific ask for a 20-minute call in the next two weeks."
   - paris → "Mention I'm based in Paris and happy to meet in person."
   - initial → regenerate the base (no extra instruction).
   Each returns a new artifact; swap the textarea content + update the kept `artifact_id`. Show a per-variant loading state.
5. **Language toggle** (FR · tu / FR · vous / EN) → fold into `user_instructions` ("Write in French using informal 'tu'." / "...formal 'vous'." / "Write in English.") and regenerate.
6. **Send**: `PUT /api/artifacts/{artifact_id} { status:"sent", content:{ message: <edited text> }, user_edit_distance: <chars changed from last generated text> }` → toast "Sent to {first}. Logged in your CRM." → `router.push('/v2/contacts/{id}')`.
7. Error states: if generate fails, show a retry; if no `artifact_id` yet, disable Send.

Constraints: each generate is a real (slow ~1-3s) MiniMax call — show clear loading. Do NOT touch primitives.tsx (Agent A owns it this phase); if you need a shared bit, define it locally in the draft folder.

---

## Validation (each agent before reporting done)
`npx tsc --noEmit` zero errors; `npm run build` succeeds; `grep -rn ": any"` in your files → none; loading + error states present. Do NOT deploy or run live tests.

## P2 success criteria (one independent tester pass at the end, live URL)
1. `/v2/contacts` lists the user's saved contacts (real names; e.g. ones saved in P1) with status badges, inside the V2 shell; loading/empty handled.
2. Search narrows the list.
3. Click a contact → `/v2/contacts/{id}` detail shows real name/role/company, an experience timeline + education from real data, status, and action buttons.
4. Add a note → it persists (reload shows it).
5. Click **Draft** → `/v2/contacts/{id}/draft` shows a REAL AI-generated outreach message (after a loading/shimmer state).
6. Click a variant chip (e.g. "Shorter") → the message regenerates to a different text.
7. Edit the text and click Send → toast confirms, returns to detail, and on reload the contact's status badge reflects "Contacted".
8. Everything renders in the V2 shell; no console errors; warm design intact.

# Spec — V2 Phase 5b: CRM / Relationship-Maintenance MVP

> Orchestrator spec for the three-agent loop. Derived from `docs/CRM_PROPOSAL.md` but the
> **taxonomy + cadence were revised with Liyang** (the proposal's 6 function-based
> categories were too many). Build scope = the **MVP (manual-first, no AI dependency)**
> tier only. AI auto-suggest, swipe-to-sort, and inferred cadence are OUT (next round).

## Final decisions (locked with Liyang, 2026-06-14)
- **Taxonomy: 4 buckets**, priority/lifecycle-based (NOT the proposal's 6). New contacts
  default **uncategorized (null)** → no reminders until tagged. Cadence overridable per
  contact. Rationale: close ties are durable ("activate anytime") so they get the *lightest*
  cadence; the maintenance budget goes to the warm-professional ties that decay silently.

  | Category key | Label | Who | Default cadence |
  |---|---|---|---|
  | `nurturing` | Nurturing | Newly created relationships — keep momentum | **14d** |
  | `keep_warm` | Keep Warm | Senior/professional: clients, partners, professors | **30d** |
  | `inner_circle` | Inner Circle | Close ties: classmates, close coworkers | **60d** |
  | `dormant` | Dormant | Muted | **none** |
  | (null) | Uncategorized | default for new contacts | none |

- **Reminders surface in BOTH places** (Liyang's call): a **brief** reminder on the V2 home
  page + the **detailed** list on the V2 Contacts page.
- **MVP only, manual-first.** No AI category auto-suggest this round.
- **V1 untouched.** `src/components/contacts/Today.tsx` is a V1 surface (the `/v2` home does
  NOT render it) — do NOT touch it. All surfacing is in V2 components only.
- **Shared cadence logic** lives in a new `src/lib/crm/cadence.ts`, importable by both
  backend routes and frontend components (one source of truth for the "due" formula).
- MiniMax-only for any AI; LinkedIn read-only. (No AI in this MVP.)

## Success criteria (what the independent tester verifies on the live URL)
A. On a contact's detail page, a **Relationship** dropdown lets the user pick Nurturing /
   Keep Warm / Inner Circle / Dormant (or "Uncategorized"). The choice **persists** (survives
   reload).
B. After tagging a contact (non-dormant) whose last interaction is older than the category
   cadence, that contact appears under **"Due to reconnect"** in the Contacts list. A
   `dormant` or uncategorized contact never appears there.
C. The Contacts filter bar has a **"Due to reconnect"** pill; clicking it shows only due
   contacts, capped and sorted most-overdue first.
D. The **V2 home page** shows a brief "Due to reconnect" reminder (a count + a couple of
   names, linking to the Contacts reconnect view) when ≥1 contact is due; it's absent when 0
   are due.
E. A **"Draft re-touch"** affordance on a due contact produces a `follow_up_draft` (reusing
   the existing generate engine). (Tester verifies a draft is produced; does not judge copy.)
F. No V1 regression: `/contacts`, `/chat`, `/review` still load. No console errors on the V2
   contacts/home flow.

---

## Module 1 — DB migration (backend)
File: `supabase/migrations/20260613000000_crm_relationship_maintenance.sql`
```sql
alter table contacts add column if not exists relationship_category text;   -- nurturing|keep_warm|inner_circle|dormant|null
alter table contacts add column if not exists cadence_days int;             -- per-contact override; null = category default
alter table contacts add column if not exists next_touch_at timestamptz;    -- materialized "due" timestamp; null = no cadence
comment on column contacts.relationship_category is 'CRM category: nurturing|keep_warm|inner_circle|dormant|null(uncategorized). Orthogonal to tier. See docs/specs/V2_P5B_CRM_MVP.md';
comment on column contacts.cadence_days is 'Per-contact cadence override in days; null = inherit CATEGORY_CADENCE default';
comment on column contacts.next_touch_at is 'Materialized due timestamp = (last_interaction_at ?? now()) + effective_cadence; null = no cadence (dormant/uncategorized)';
create index if not exists idx_contacts_next_touch on contacts (user_id, next_touch_at) where next_touch_at is not null;
```
- `text` (not enum) so taxonomy tweaks need no migration; validation lives in the Zod schema.
- RLS already enforced on `contacts` — columns inherit row policies, no new policy.
- Apply: `node tests/apply-migration.mjs supabase/migrations/20260613000000_crm_relationship_maintenance.sql`
  (needs `SUPABASE_ACCESS_TOKEN` in `.env.local`; project ref `bdwrpfattfyyzmftmtqf`). Verify
  the 3 columns exist afterward.
- Validation 15/16: UNIQUE(user_id, linkedin_url) already exists; each new column has a
  comment. No new tables → RLS check N/A.

## Module 2 — Types + shared cadence lib (backend)
- `src/types/database.ts`: in `interface Contact` (after `notes`) add:
  ```ts
  relationship_category: RelationshipCategory | null;
  cadence_days: number | null;
  next_touch_at: ISODateString | null;
  ```
  and `export type RelationshipCategory = "nurturing" | "keep_warm" | "inner_circle" | "dormant";`
- New `src/lib/crm/cadence.ts`:
  ```ts
  export const CATEGORY_CADENCE: Record<RelationshipCategory, number | null> = {
    nurturing: 14, keep_warm: 30, inner_circle: 60, dormant: null,
  };
  export const CATEGORY_LABEL: Record<RelationshipCategory, string> = {
    nurturing: "Nurturing", keep_warm: "Keep Warm", inner_circle: "Inner Circle", dormant: "Dormant",
  };
  // effective cadence in days, or null if no reminders (dormant/uncategorized/override<=0)
  export function effectiveCadenceDays(category: RelationshipCategory | null, override: number | null): number | null { ... }
  // ISO string or null. anchor = lastInteractionAt ?? now(); null when no cadence
  export function computeNextTouchAt(category: RelationshipCategory | null, override: number | null, lastInteractionAt: string | null): string | null { ... }
  export function isReconnectDue(nextTouchAt: string | null): boolean { ... } // != null && <= now
  ```
  Pure, unit-tested. Add `tests/crm-cadence.test.ts`: category default; override beats
  default; dormant + uncategorized → null; due vs not-due boundary.

## Module 3 — Backend recompute at the write points (backend)
Recompute `next_touch_at` wherever category/cadence or `last_interaction_at` changes.
1. **`PUT /api/contacts/[id]`** (`src/app/api/contacts/[id]/route.ts`): extend
   `UpdateContactSchema` with `relationship_category` (z.enum of the 4, `.nullable()`) and
   `cadence_days` (int ≥ 1, `.nullable()`). When either is present, fetch the contact's
   `last_interaction_at` (add it to the `existing` select) and set `next_touch_at =
   computeNextTouchAt(category, override, last_interaction_at)` in the update payload. Use the
   incoming category/override if provided, else fall back to the contact's current values.
2. **`PUT /api/artifacts/[id]`** (`src/app/api/artifacts/[id]/route.ts`): at the two existing
   `last_interaction_at = now()` writes (outreach→`contacted` ~L153; meeting_notes→`met`
   ~L164), read that contact's current `relationship_category`/`cadence_days` and also set
   `next_touch_at = computeNextTouchAt(cat, override, now)`. So sending outreach / logging a
   meeting auto-pushes the reminder forward (auto-suppression).
- Keep Zod validation, typed responses, Supabase-client-only (no raw SQL) on both routes.

## Module 4 — Contacts list projection (backend)
`src/app/api/contacts/route.ts`: add `"relationship_category"`, `"cadence_days"`,
`"next_touch_at"` to `LIST_COLUMNS` (V2 list + home fetch with `lite=true`, so these must be
in the projection or they arrive undefined).

## Module 5 — Frontend: detail dropdown + cadence (frontend)
- On contact detail (`ContactDetailSidebar.tsx` meta area, or `ContactDetailMain.tsx`), add a
  **Relationship** `<select>` (the 4 labels via `CATEGORY_LABEL` + an "Uncategorized" =
  null option). When a non-dormant category is set, show an optional **cadence override**
  number input (days; placeholder = the category default from `CATEGORY_CADENCE`).
- On change → `PUT /api/contacts/[id]` with `relationship_category` / `cadence_days`;
  optimistic update + error toast (existing `Toast`); pending state while saving.
- Match V2 design tokens (palette.ts, primitives). No inline hex outside the established
  pattern. No `any`.

## Module 6 — Frontend: "Due to reconnect" in Contacts list (frontend)
- `ContactsFilterBar.tsx`: add a `reconnect` pill ("Due to reconnect", Alert icon like
  `followup`); extend `FilterId`.
- `ContactsList.tsx`: import `isReconnectDue` from `src/lib/crm/cadence.ts`; `reconnect`
  filter → `contacts.filter(c => isReconnectDue(c.next_touch_at))`, sorted by `next_touch_at`
  ascending (most overdue first), **capped at ~10** (anti-nagging). Add a header count
  (`· N due to reconnect`) alongside the existing met/follow-up counts.
- "Draft re-touch" button on a due contact's row/detail → `POST /api/ai/generate` with
  `type: "follow_up_draft"`, passing the contact + a `user_instructions` note (category +
  days since last touch). Reuse the existing follow_up_draft/outreach draft trigger pattern
  already in the contact detail; loading state; open/route to the draft as that flow does.

## Module 7 — Frontend: brief home reminder (frontend)
- New `src/components/v2/home/ReconnectReminder.tsx`: a compact strip/banner — "**N people due
  to reconnect**" + up to ~3 names (avatar + name) + a "View all →" link to
  `/v2/contacts?filter=reconnect`. Renders nothing when 0 are due. Brief by design (not the
  full list — that's the Contacts page).
- Wire into `src/app/v2/page.tsx`: add one fetch in `useHomeData` —
  `/api/contacts?user_action=saved&per_page=50&lite=true&credentials` — filter client-side
  with `isReconnectDue(c.next_touch_at)`, sort by `next_touch_at` asc, pass the top few to
  `ReconnectReminder` (place it above/near the action cards, below `GreetingHero`). Skeleton
  while loading; hidden when none due or on first-run.
- `ContactsList.tsx` should honor a `?filter=reconnect` query param so the home link deep-links
  into the reconnect view.

---

## Build order
Backend agent: Modules 1 → 2 → 3 → 4 (+ cadence unit test). Run migration + validation gate.
Then frontend agent: Modules 5 → 6 → 7. Then independent tester against the live URL after
deploy (~140s wait), using `.env.test` (`liyang.guo@essec.edu` / `123456789`).

## Validation gate (before tester)
`npx tsc --noEmit` clean · `npm run build` clean · no `: any` · `npx vitest run` (the 2
known-pre-existing failures excepted, incl. the new cadence test passing) · every touched API
route keeps Zod validation + typed responses · migration applied and the 3 columns verified.

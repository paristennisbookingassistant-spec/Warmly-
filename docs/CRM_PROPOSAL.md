# Warmly CRM / Relationship-Maintenance, Proposal (research output)

> Phase 5 of `docs/VISION.md`. Researched against Dex, Clay/Mesh, folk, Monica, UpHabit,
> Covve. **Not yet approved to build.** Liyang reviews this, then we build the MVP.

## Headline (and the answer to "should it be a game?")
Liyang's hypothesis, *sort each contact into a category that defines its maintenance
cadence*, is **validated** (it's exactly Clay/Dex's model: cadence inherits from a
category/group, overridable per contact). But the research **refines the UX**: a 6-way
categorization is the wrong fit for a binary swipe game. **Recommended: AI auto-suggests
a category → one-tap confirm** on the contact row/detail (the common case is a single
tap). Keep the swipe deck only as a **secondary "Sort your network" bulk-triage** entry
(reusing `TinderView`) for the one moment it's warranted, clearing a big uncategorized
pile after a network sync.

Two non-negotiables from the research: (1) **cap the daily "due" list** (a handful, not
the whole backlog, the #1 anti-nagging lever); (2) an explicit **"no reminders" state**
(`dormant` / uncategorized = no `next_touch_at`).

## 1. Category taxonomy (6, job-search-funnel specific, orthogonal to `tier`)
`target` (decision-maker/hiring), `sponsor` (mentor/advocate/referrer), `peer`
(cohort/lateral), `alumni` (INSEAD/school network), `connector` (recruiters/hubs),
`dormant` (muted). New contacts default **uncategorized (null)** so they surface for
classification rather than silently generating reminders. Do NOT overload `tier` (= match
strength); category is a separate axis (= what this person is *to you*).

## 2. Cadence (per-category default, per-contact override, the Clay model)
| Category | Default | | Category | Default |
|---|---|---|---|---|
| target | 14d | | peer | 60d |
| sponsor | 30d | | alumni | 90d |
| connector | 45d | | dormant | none |
Defaults live in a `CATEGORY_CADENCE` constant (tunable, no migration). `cadence_days`
null = inherit category default; non-null = explicit override.

## 3. Schema (3 columns on `contacts`)
```
relationship_category text         null   -- target|sponsor|peer|alumni|connector|dormant|null
cadence_days          int          null   -- per-contact override; null = category default
next_touch_at         timestamptz  null   -- materialized "due" timestamp; null = no cadence
```
`next_touch_at = (last_interaction_at ?? now()) + effective_cadence`. Recompute at the 3
existing write points: on categorize/cadence-change; on every interaction (piggyback the
`last_interaction_at` writes in `src/app/api/artifacts/[id]/route.ts` outreach→contacted
& meeting→met, this is the auto-suppression); on mark-met. "Due" = `next_touch_at <= now()`
evaluated at query time, **no cron needed** (absolute timestamp).

## 4. Reminder surfacing (reuse existing surfaces, zero new screens)
- **Contacts list:** add a `reconnect` filter pill + a **capped** "Due to reconnect"
  section (sorted most-overdue first), mirror the existing "Saved today" section.
  (`ContactsList.tsx` + `ContactsFilterBar.tsx`.)
- **Today/Home re-warm lane:** swap the hardcoded "met/ongoing & >30d" predicate for
  `next_touch_at <= now()`, upgrades the existing lane from a fixed guess to the user's
  chosen rhythm. (`src/components/contacts/Today.tsx`.)

## 5. AI assist (pure reuse, no new model plumbing)
- **Auto-suggest category** (Haiku-tier, like scoring) from title/company/career/education/
  tier/goals → one of the 6 + a one-line rationale; runs at save-time + a batch backfill;
  stored as the *suggested* value the user one-tap confirms.
- **Draft re-touch when due** = reuse `/api/ai/generate` with the existing
  `follow_up_draft` artifact type (already injects `voice_md`/`profile_md`); pass category
  + days-since-last-touch as `user_instructions`. Sending it bumps `last_interaction_at`,
  which auto-pushes `next_touch_at` and clears the reminder, loop closes with existing code.

## 6. Phased build
**MVP (manual-first, no AI dependency):** (1) migration + `Contact` type +
`RelationshipCategory` union + `CATEGORY_CADENCE`; (2) recompute `next_touch_at` at the 3
write points; (3) per-contact category dropdown + cadence override on detail/row; (4)
"Due to reconnect" filter + capped section + swap the Today re-warm predicate; (5)
"Draft re-touch" button → existing generate.
**v2 (AI):** (6) auto-suggest category + one-tap-confirm pill; (7) swipe-to-sort bulk
backlog on `TinderView`; (8) **"Automatic" cadence** inferred from real interaction
frequency (Clay's killer feature, the differentiator).

## Key files
`src/types/database.ts`, `src/components/v2/contacts/contactsUtils.ts` (CATEGORY_CADENCE,
deriveReconnectDue, computeNextTouchAt), `src/app/api/artifacts/[id]/route.ts` (recompute
alongside last_interaction_at), `ContactsList.tsx` + `ContactsFilterBar.tsx`,
`src/components/contacts/Today.tsx`, `src/app/api/ai/generate/route.ts` (follow_up_draft).

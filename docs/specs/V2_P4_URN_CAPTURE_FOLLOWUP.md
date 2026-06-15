# Follow-up spec, capture each user's OWN LinkedIn URN at sync (Phase 4)

> The one remaining code piece for warm intros to work with REAL users (not seeded). Deferred
> from the Phase 4 build because it touches the **extension sync flow**, which can't be
> verified without an extension reload + a real LinkedIn sync, so it should be built with
> founder-in-the-loop testing, not shipped blind into the working sync path.

## Why it's needed
Warm-intro matching detects "A is connected to B" by checking whether A has a `contacts` row
whose `linkedin_urn` equals **B's own** `users.linkedin_urn`. That column is populated for the
seeded test users, but for real users nothing captures their own URN. Until it does, the
matcher finds no real bridges (only seeded ones).

## What to build
1. **Extension, capture the logged-in user's own URN during network sync.**
   - During the sync flow (`extension/content-script/connections-sync.ts` / the sync
     orchestrator), the content script runs on the user's logged-in LinkedIn session. Capture
     the *self* profile URN, e.g. from the voyager "me" endpoint
     (`/voyager/api/me` → `miniProfile`/`*elements` entityUrn) or the profile DOM/RSC for the
     current user. This is the SAME `urn:li:fsd_profile:…` shape already parsed for contacts.
   - Send it to the backend once per sync (cheap), e.g. piggyback on the existing sync-start or
     sync-complete message, OR a tiny dedicated call.
2. **Backend, store it on `users.linkedin_urn`.**
   - Reuse `PATCH /api/users/me` (already accepts arbitrary user fields via its schema, add
     `linkedin_urn: z.string().optional()` to the PatchSchema, 1 line) OR a dedicated
     `POST /api/users/me/linkedin-urn`. Validate the `urn:li:fsd_profile:` prefix.
   - Idempotent: only write if changed.

## Verification (needs founder + extension)
- Reload the extension, run a network sync while logged into LinkedIn.
- Confirm `users.linkedin_urn` for the real user is set to their actual URN.
- With 2 real opted-in users who are LinkedIn-connected, confirm `/api/warm-intros` surfaces
  real 2nd-degree candidates (not just seeded). This is also the **GTM dependency**: warm intros
  only produce value once ≥2 real users have synced + opted in.

## Guardrails
- LinkedIn **read-only**, capturing the self URN is a read, no state change.
- Consent unchanged: matching still gated on `share_network_for_intros`.

## Also documented: matcher scale TODO
`GET /api/warm-intros` currently fetches A's contacts with `.range(0,9999)` but Supabase caps
at 1000 rows server-side, so for users with >1000 contacts a bridge beyond row 1000 could be
missed. Proper fix (when needed): flip to targeted queries, fetch the few opted-in users, then
`contacts WHERE user_id=A AND linkedin_urn IN (their urns)` for bridge detection, and
`linkedin_url IN (candidate urls)` for the already-known exclusion. Avoids pulling A's whole
network into memory. Works today for the test account (bridge is within first 1000).

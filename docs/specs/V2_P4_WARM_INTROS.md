# Spec, V2 Phase 4: Cross-user 2nd-degree warm-intro graph (spike + build)

> The differentiator (VISION step 5c). Consent = **explicit opt-in** (locked). This doc IS the
> schema/architecture spike. MiniMax-only; LinkedIn read-only.

## The feature in one line
If User A and User B are both Warmly users, both opted in, and connected on LinkedIn, and B's
network has people matching A's goal, Warmly surfaces those people to A as **"via B · ask for a
warm intro"** cards, plus a drafted intro-request message to B.

## Data model: how "A is connected to B" is known
- Every user syncs their LinkedIn connections into `contacts` (each row has `linkedin_urn`).
- So **A is connected to B** ⇔ A has a `contacts` row whose `linkedin_urn` = B's *own* LinkedIn
  URN. That requires storing each user's **own** URN on `users`.

## Schema (additive, 2 columns on `users` + 1 index)
```sql
alter table users add column if not exists linkedin_urn text;                    -- the user's OWN LinkedIn URN (captured at sync)
alter table users add column if not exists share_network_for_intros boolean not null default false;  -- explicit opt-in
comment on column users.linkedin_urn is 'The user''s own LinkedIn profile URN; lets other Warmly users detect they are connected to this user. Captured at network sync.';
comment on column users.share_network_for_intros is 'Explicit opt-in: when true, this user''s synced connections are eligible to be surfaced to peers they are connected to as warm-intro candidates. Default false. Only opted-in networks are ever matchable.';
create index if not exists idx_contacts_linkedin_urn on contacts (linkedin_urn) where linkedin_urn is not null;
```
No new tables. The graph is computed at query time from `users` + `contacts`.

## Consent & privacy (non-negotiable)
- A user's network is matchable **only if `share_network_for_intros = true`**. Default off.
- Matching runs **server-side with the service role** (`/api/warm-intros`) and returns to A
  **only the matched candidates + provenance**, never B's full network, never a browsable graph.
- Both A and B must be opted in for a match (A opts in to participate; B opts in to share).

## The matching query (`GET /api/warm-intros`, service-role, for authenticated user A)
1. If A `share_network_for_intros` is false → return `{ optedIn: false, cards: [] }` (UI prompts opt-in).
2. **Find bridge peers B:** opted-in users (`share_network_for_intros = true`, `linkedin_urn not null`)
   whose `linkedin_urn` appears among A's contacts' `linkedin_urn` (A is connected to B). Exclude A.
3. **Collect 2nd-degree candidates:** for those B's, fetch their `contacts` (user_id in B-set)
   that match A's goal, reuse the directory-style goal filter (A's `goals.target_industries`
   → contact company/title/industry overlap; optional geo). 
4. **Exclude already-known:** drop candidates whose `linkedin_urn` is in A's own contacts (A
   already has them) or equals A's own URN.
5. **Dedupe + rank:** one card per candidate; if multiple B's bridge to the same candidate, list
   the strongest bridge (or "via B +N"). Cap (e.g. top 25). Return cards:
   `{ candidate: {name, title, company, linkedin_url}, via: {peer_name, peer_contact_id}, match_reason }`.
- Zod-validate; typed response (`src/types/api.ts`); no raw SQL beyond the service-role joins.

## UI (V2)
- **Discover → a third surface or a LinkedIn-door section:** a "Warm intros" lane of 2nd-degree
  cards, "{Candidate} · {title} @ {company} · **via {peer}**" + an "Ask {peer} for an intro" CTA.
- The CTA → generate a **warm-intro request draft** (new artifact intent) addressed to B,
  reusing `/api/ai/generate` (a `warm_intro_request` type, or reuse `outreach_draft` with
  `user_instructions` framing "ask B to introduce me to {candidate} because…").
- An **opt-in toggle** in Settings (`share_network_for_intros`) with a clear one-line consent
  explanation. If A isn't opted in, the Warm-intros lane shows the opt-in prompt instead.

## Validation plan (autonomous, seed a 2nd user)
Real demo needs ≥2 opted-in connected users, so seed it:
1. Create a 2nd test user **B** in Supabase (or reuse an existing one), `share_network_for_intros = true`,
   give B a `linkedin_urn`.
2. Give A (`deed7f54…`) `share_network_for_intros = true` and a contact row whose `linkedin_urn`
   = B's URN (A↔B connected).
3. Give B several `contacts` matching A's goal (e.g. PE/VC in Paris), none of which A already has.
4. Hit `GET /api/warm-intros` as A → expect B's matching contacts back as "via B" cards.
5. Browse-verify the Warm-intros lane renders them + the "ask for intro" draft generates.
Tester can verify the web surface; the real cross-user value is proven by the seeded data here.

## Build order
1. Migration (2 cols + index) + apply. 2. `users` type + matching API (`/api/warm-intros`) +
seed script. 3. Settings opt-in toggle. 4. Warm-intros lane + "ask for intro" draft. Each step
tsc+build clean, deploy READY, browse-verified.

## Deferred (post-MVP)
- Capturing the user's OWN urn automatically at sync (extension change), for now seed/backfill;
  wire the extension capture as a follow-up.
- Multi-hop (3rd degree); "N mutual" counts; intro-status tracking.

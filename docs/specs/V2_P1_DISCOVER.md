# V2 Phase 1, Discover core (spec)

Replace the `/v2/discover` placeholder with the full two-door Discover + swipe deck, ported pixel-faithfully from the design bundle and wired to real data where it exists.

## Design source (port from, read in full)
- `design/warmly-v2/project/js/screens/discover.jsx`, DiscoverScreen state machine, DoorsView, CVDoor/LinkedInDoor, DoorShell parts, DirectoryPreview, NetworkPreview, LinkedInSetup, SetupStep, ScopeRow.
- `design/warmly-v2/project/js/screens/discover-tinder.jsx`, TinderView, TopStrip, QueueBanner, ChannelChip, CardStack, ProfileCard, SwipeBtn, EmptyDeck, ChatSidebar (refine chat), seedChat + generateAgentReply.
- `design/warmly-v2/project/js/data.jsx`, seed decks live in discover.jsx (`DISCOVERY_DECK`, `SYNCED_PEERS`).

## Reuse (already built in P0)
- `src/components/v2/icons.tsx` (Icon.*), `palette.ts` (CHANNELS, TIER_STYLES, tierLabelFromNumber, Tier), `primitives.tsx` (Btn, Chip, TierBadge, InseadPill, Card, Avatar, Wordmark, SectionLabel), `Toast.tsx` (useToast).
- Design tokens in `globals.css` (`text-ink`, `bg-surface`, `.font-display`, `.font-mono-tag`, `.fade-up`, `.pulse-dot`, `.card-hover`, `.focus-ring`). Channel-specific colours come from `CHANNELS` (keep those literals, they're brand accents, not tokens).
- Logos: `/v2/insead-logo.png`, `/v2/linkedin-logo.png` (in `public/v2/`). The design references `assets/...`; change to `/v2/...`.

## Structure
Build under `src/components/v2/discover/` and wire from `src/app/v2/discover/page.tsx` (client component holding the state machine: `doors | cv-tinder | linkedin-setup | linkedin-tinder`).

- `DiscoverScreen.tsx`, state machine + scope header (target role/industry/geo can be seed for now).
- `Doors.tsx`, DoorsView + CVDoor + LinkedInDoor + shell parts + DirectoryPreview + NetworkPreview.
- `TinderView.tsx`, deck workspace (queue banner + card stack + Save/Skip + EmptyDeck) + ChatSidebar (refine).
- `LinkedInSetup.tsx`, 3-step checklist + scope chips.
- `seed.ts`, port `DISCOVERY_DECK.cv` (5 INSEAD alumni), `DISCOVERY_DECK.linkedin` (5, fallback/demo only), `SYNCED_PEERS` (3). Typed.
- `types.ts`, a `DeckCard` view-model the deck renders, so both seed and live contacts map into one shape.

## Data wiring

### INSEAD door (`cv-tinder`), SEED
Deck = `seed.ts` `DISCOVERY_DECK.cv`. Save → `useToast()` confirmation + advance (no persistence, directory ingestion is a later task). Source ribbon = "INSEAD CV book · indexed alumnus · 1st". This door is clearly a seed/demo until the directory is ingested.

### LinkedIn door (`linkedin-tinder`), LIVE
Deck = the user's real pending contacts:
```
GET /api/contacts?user_action=pending&sort_by=relevance_score&sort_order=desc&per_page=25&lite=true
→ { data: { items: Contact[], total, has_more } }   (paginated helper shape)
```
Map each `Contact` → `DeckCard`:
- `name` ← name; `role` ← current_title; `company` ← company; `location` ← location
- `avatar` ← photo_url ?? avatar_url
- `linkedinUrl` ← linkedin_url
- `tier` ← tierLabelFromNumber(contact.tier), **only render `<TierBadge>` if contact.tier is set**
- `rationale` ← recommendation_reason ?? linkedin_bio ?? null, **hide the "Why I'm pushing them" block if null**
- `about` ← derive up to 3 bullets from `experience` (e.g. "Senior PM @ Parloa") + most-recent `education_v2`; **omit the About block if both empty**
- `inseadShort` ← if an `education_v2` entry's school matches /INSEAD/i, derive a short pill (e.g. "INSEAD"); else null → no InseadPill
- Source ribbon = LinkedIn variant but **1st-degree** (no "via peer · N mutual", provenance doesn't exist): show the LinkedIn logo + "1st-degree connection" + a "1st" degree tag.

Save → `PATCH /api/contacts/{id}/review` `{action:"save"}`; Skip → `{action:"skip"}`. Optimistic: animate the card out and advance immediately; fire the PATCH; on error, show a toast and revert that card. The contact must not reappear on reload (it's no longer `pending`).

States: **loading** (skeleton/spinner while fetching the deck), **error** (failed fetch → message + retry), **empty** (no pending contacts → a friendly empty state pointing to the LinkedIn setup / "all caught up").

### Refine chat (both channels), LOCAL
Port `seedChat` + `generateAgentReply` (canned keyword re-rank) verbatim. No backend call. Keep the suggestion chips and the search-hint tag on the next card. (MiniMax-powered refine is a later fast-follow.)

### Doors view counts
- INSEAD door big number = seed deck length; meta strings kept as design copy (decorative).
- LinkedIn door: if connected/has pending contacts, big number = pending count (a `total` from a cheap `per_page=1` count fetch, or reuse the deck fetch); else show the peers-ready seed. Status pill = connected when pending contacts exist.

## Constraints
- TypeScript strict, **no `any`**. Every data-fetching component has loading + error states.
- Use the V2 primitives + tokens; keep channel literals from `CHANNELS`. Remote images via `<img>` (eslint-disable inline, like `Avatar`).
- Do NOT touch V1, the extension, or any API route. Frontend only (calls existing endpoints).
- LinkedIn guardrails: read-only; this screen triggers the existing sync flow at most (no new LinkedIn calls).

## Success criteria (independent tester, live URL)
1. `/v2/discover` shows two door cards, "INSEAD Directory" and "LinkedIn Network", each with a logo, status pill, preview visual, big number, meta rows, and a CTA, inside the V2 sidebar shell.
2. INSEAD door → swipe deck: a profile card with name, role, company, INSEAD pill, tier badge, a "Why I'm pushing them" rationale, About bullets, Skip/Save buttons, a queue banner (count + avatar row + saved/skipped), and a right-side "Refine with your coach" chat panel.
3. Save and Skip animate the card out and advance; saved/skipped counters + queue row update.
4. Typing a refine command (or clicking a suggestion chip) yields a coach reply; a matching keyword tags the next card with a hint pill.
5. End of deck → "You've seen the queue" empty state with Back-to-doors.
6. Back-to-doors returns to the two-door view.
7. LinkedIn door → opens a deck of **real synced contacts** (real names/photos). Save persists: the saved contact does not reappear after a reload. (If the account has no pending contacts, a sensible empty state instead.)
8. Renders within the V2 shell; no console errors; warm design intact.

## Verification
`npx tsc --noEmit` + `npm run build` clean; no `: any` in touched files; V1 + existing tests unaffected. Deploy to prod; independent tester validates 1-8 with screenshots; orchestrator runs/sanity-checks the live LinkedIn-door data path (and ensures the tester account has pending contacts) before the tester run.

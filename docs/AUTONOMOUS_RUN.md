# Autonomous build run, live plan + log

> Self-paced loop (started 2026-06-15). Goal: a fully functional Warmly that meets
> `docs/VISION.md`. Each iteration: pick the highest-value gap → build → validate (`tsc` +
> `build`) → ship → **confirm Vercel deploy READY** → browse-verify live → log result here.
> This doc survives context summarization, read it first on each wake-up to know where I am.

## Operating rules (learned this session)
- **Never claim "live" without confirming the Vercel deploy state is `READY`** (errored deploys
  silently keep the old build live). Verify via the Vercel API, then browse-verify.
- Watch for **dangling uncommitted tracked changes** (`git status` each iteration), they make
  local builds pass while Vercel fails.
- MiniMax-only for AI; **LinkedIn read-only**. Extension-dependent flows (live scrape, network
  sync) can't be browser-verified here, mark them founder-verified.
- Test account: `liyang.guo@essec.edu` / `123456789` (Supabase `deed7f54-…`). Seed test data
  via service-role REST when a flow needs it (as done for CRM / discovery).

## Gap assessment (vs VISION, as of run start)
**Built & verified this session:** signup, onboarding (CV→profile), home, INSEAD discovery
(goal-filtered + scored + refine), save→contacts→draft (refusal fixed), meeting prep + company
intel (Brave, live), meeting synthesis (5a), CRM (5b), WhatsApp, /v2 default, discover polish.

**Gaps to close (autonomous-doable):**
1. **Phase 4, cross-user 2nd-degree warm intros** (the differentiator; biggest Missing gap).
   Build schema + matching + "via peer" cards; validate with seeded multi-user test data.
2. **Refine-chat → company discovery routing**, typing "find people at [company]" in the
   refine chat returns "no connections matched" instead of offering a live company scrape.
3. **Polish**, em-dash in scoring rationale (anti-AI gate not applied to scoring); onboarding
   "0 of 2" step counter reads oddly.
4. **Full regression**, fresh-journey walkthrough at the end to catch anything missed.

**Blocked (need Liyang, NOT autonomous):** Google sign-in (needs a Google Cloud OAuth client);
extension reload; live-scrape founder verification; INSEAD IT allowlist for thewarmly.com;
rotate the Brave key + Vercel token.

## Overnight session 2 (user asleep, Product Director mode, follow VISION, test every piece)
Queue: (a) **queue circles overlap saved/skipped icons**, bug I introduced with bigger circles, FIX
(in TinderView, but a warm-intro agent is editing it, fix after it lands). (b) **warm-intro →
LinkedIn-deck integration**, agent building, ship+verify. (c) **screen-switch latency**, diagnose
+ fix (client fetches on every mount? gate re-check?). (d) **meeting prep "doesn't work"**, re-test,
fix. (e) **draft outreach context**, CV-book contacts are INSEAD alumni → shared-school hook should
be automatic; wire contact source/alumni into the draft prompt. (f) **LinkedIn sync reality**,
clarify status (extension-dependent; can't sync for the user). (g) **contact categorization / game**,
AI auto-suggest category (deferred from CRM MVP) + decide swipe-to-categorize game. Work each, verify.

## Overnight session 2 — progress
- **Warm intros now IN the LinkedIn deck** (ddc9d97): 2nd-degree "via {peer} · ask for a warm
  intro" cards lead the deck (steel-blue ribbon, Save→"Ask for intro" drafts to the peer), then
  1st-degree. Separate page removed; Settings toggle kept; opt-in hint on the door. **Queue
  overlap FIXED**: overflow-hidden + slightly smaller tokens so the single row doesn't spill over
  the saved/skipped counter. (Verify on deploy.)
- **Latency diagnosed**: API calls 1–6s each (Vercel cold starts + Supabase round-trips), run on
  every page mount. Fixed the worst offender: OnboardingGate fetched /api/users/me on EVERY screen
  switch → now once per session (faee30a). Deeper fix = client-side data cache (noted, bigger).
- **Meeting prep WORKS** (5 recent briefs all complete w/ intel+themes) — the "doesn't work" was
  the ~40s gen with weak feedback (user retried). UX/loading improvement needed, not a bug fix.
- **Draft alumni context** (753258a): cv_book/INSEAD contacts now flagged in the outreach prompt
  so drafts lead with the shared-INSEAD hook instead of missing it.
- **Queued next**: verify warm-intro deck live; contact categorization (AI auto-suggest + decide
  swipe-to-categorize game); meeting-prep/scoring loading-state UX; LinkedIn-sync reality clarif.

## Iteration log
- **Iter 1 DONE + verified live (e8f5607):** refine-chat → company-discovery routing.
  `parseCompanyIntent` detects "find people at [company]" → coach offers "Run live search at
  {Company}" button opening company discovery prefilled. Browse-verified with "find people at
  Bain in Paris"; non-company refines unchanged.
- **Iter 2-4 Phase 4 (verifying):** cross-user warm-intro graph, BUILT + shipped.
  Backend (9374b57): schema (`users.linkedin_urn` + `share_network_for_intros` + contacts index),
  `GET /api/warm-intros` matcher, PATCH consent on /api/users/me, seed-2nd-user script (peer B +
  3 candidates). Frontend (4a9180c): Sidebar "Warm Intros" → /v2/warm-intros lane (opt-in prompt /
  "via {peer}" cards / ask-for-intro draft) + Settings consent toggle.
  **2 matcher bugs found+fixed live:** (a) giant IN() over A's 1000-urn network → 500 (4b9221d);
  (b) 1000-row default cap dropped the bridge contact (A has 1331) → fetch range to 9999 (4a9180c).
  Scale TODO noted in route: targeted queries for very large networks.
- **Phase 4 DONE + VERIFIED LIVE (01f6f20):** 3rd matcher bug fixed, goal filter did literal
  includes() of A's compound industry string ("AI/Technology; Private Equity & Venture Capital")
  → 0 matches; now tokenizes industries+geos and matches on ANY industry OR geo hit. API returns
  4 "via {peer}" cards; /v2/warm-intros lane renders them with provenance chips + ask-for-intro
  CTA. The differentiator works end-to-end (web surface + matching, on seeded multi-user data).
  Remaining for Phase 4: real cross-user demo needs ≥2 real opted-in users (GTM, not code);
  capture user's OWN urn at sync (extension follow-up); the ask-for-intro draft reuses the
  already-verified generate flow.
- **Iter 5 DONE (em-dash 65ee399, counter d2b8b3f):** scoring rationale + hook now run through
  the existing stripDashes gate (no more "Bain, the same firm"); onboarding step bar hides on
  the processing/building transitional screens (no more "0 of 2"). Verifying on next deploy.
- **Iter 6 DONE, regression GREEN:** all 8 surfaces load (V2 home/discover/warm-intros/contacts/
  settings + V1 chat/contacts/review); post-login → /v2; INSEAD deck opens, scores (tier +
  rationale), no 500s/console errors; warm-intros lane renders 4 cards. Product meets the VISION
  journey end-to-end except user/extension-dependent bits.

## Status vs VISION (after this run)
Built + verified: signup, onboarding (CV→profile, counter fixed), home, INSEAD discovery
(goal-filtered + scored + refine + company-search routing), save→contacts→draft (refusal fixed,
em-dash clean), meeting prep + company intel (Brave, live), meeting synthesis, CRM, WhatsApp,
**Phase 4 cross-user warm intros (the differentiator)**, /v2 default.
User/extension-dependent (not autonomous): live company scrape + network sync (extension reload),
real multi-user warm intros (need ≥2 real opted-in users), Google sign-in (Google OAuth client),
INSEAD on-campus domain (Cato allowlist), rotate Brave+Vercel keys.
Code TODOs noted: warm-intros targeted-query scaling; capture user's OWN urn at sync (extension).

- **Phase 4 ask-for-intro draft VERIFIED:** clicking "Ask {peer} for an intro" → POST conversations
  (201) → generate (200, 28s) → navigates to peer contact; draft is a real warm-intro request
  naming the candidate (Sophie Marceau @ Mistral) grounded in A's profile. Full Phase 4 loop done.
- **Run wind-down:** major vision gaps closed + verified. Remaining = user/extension-dependent
  (see above) + documented follow-ups. Updating HANDOFF.md + writing URN-capture spec; not
  manufacturing busywork. Loop at relaxed cadence for any further polish.
- **Phase 4 spike DONE:** `docs/specs/V2_P4_WARM_INTROS.md` written (schema = 2 cols on `users`
  + index; server-side `/api/warm-intros` matching with consent; seed a 2nd user to validate).
  Ready to build as iter 2+.
- **Next up (queue):** iter 2 = Phase 4 migration + matching API + seed; iter 3 = opt-in toggle;
  iter 4 = warm-intros lane + ask-for-intro draft; iter 5 = polish (em-dash in scoring, onboarding
  counter); iter 6 = full regression walkthrough + final report.

## Overnight session 2 — verified shipped (all live, browse-confirmed)
1. Warm intros IN the LinkedIn deck (ddc9d97) — "via {peer} · ask for intro · 2nd" cards lead it. ✓
2. Queue overlap fixed (ddc9d97) — single row, no spill over saved/skipped. ✓
3. Nav latency: OnboardingGate once-per-session, not per-nav (faee30a). ✓ (API calls still 1-6s = cold starts)
4. INSEAD-alumni draft hook (753258a) — drafts lead with shared-school. ✓
5. CRM category auto-suggest + one-tap Confirm chip (fa187a0). ✓ (Ning Gao → Nurturing)
6. Scoring loading state (72d4bf7) — "Scoring this match…" shimmer instead of weak placeholder. ✓
Diagnosed: meeting prep WORKS (5 briefs generated) — the "doesn't work" was the slow-load perception.
Queued: "Sort your network" swipe game (user undecided — propose, don't build blind); deeper
client-side caching for nav latency (bigger refactor); LinkedIn sync = extension-dependent (clarify).

## Overnight session 2 — more shipped + verified
7. Meeting-prep loading paced to ~40s (05b25d4) — was the "meeting prep doesn't work" cause
   (anim finished in 12s, sat on "Almost ready" for 30s). Onboarding loader paced too (8e72dba).
8. "Sort your network" swipe-categorize game (a0e6498) — /v2/contacts/sort: one card at a time,
   AI-suggested category pre-highlighted (key 1-4 / → skip), optimistic advance, progress bar,
   done/empty states. Entry: "Sort N · contacts without a category" banner on Contacts. VERIFIED.
   NOTE: Vercel missed the webhook for a0e6498 (deployed nothing); empty-commit re-trigger
   (84bd23a) fixed it → READY + verified. Watch for this — push≠deploy if a webhook drops.
Richer scoring rationale confirmed live on contact cards too (ESSEC/Bain/INSEAD specific hooks).

## Overnight session 2 — full-surface gap-hunt (CLEAN)
Verified healthy after tonight's 10 changes, no new bugs: home (greeting/pickup/reconnect strip),
discover (deck, scoring loading state, warm-intro cards, company-discovery, refine), contacts
(list + sort banner + rich rationale on cards), /v2/contacts/sort game, warm-intros-in-deck,
settings (warm-intro toggle/linkedin/draft-lang/rebuild), prep, draft. No console errors (beyond
known pravatar 404s). Draft loader uses a skeleton (no "ends-early" issue); company-discovery is
event-driven. Queue from the user's overnight list is COMPLETE.
Remaining = user-decision/extension-dependent: deep latency caching (refactor — flagged, not risked
unattended); LinkedIn sync + live scrape (extension); Google OAuth; rotate keys. Dialing loop to a
long monitoring cadence to avoid busywork.

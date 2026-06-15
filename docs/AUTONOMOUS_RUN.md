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
- **Next:** iter 5 = polish (em-dash in scoring rationale; onboarding "0 of 2" counter);
  iter 6 = full fresh-journey regression walkthrough + final report.
- **Phase 4 spike DONE:** `docs/specs/V2_P4_WARM_INTROS.md` written (schema = 2 cols on `users`
  + index; server-side `/api/warm-intros` matching with consent; seed a 2nd user to validate).
  Ready to build as iter 2+.
- **Next up (queue):** iter 2 = Phase 4 migration + matching API + seed; iter 3 = opt-in toggle;
  iter 4 = warm-intros lane + ask-for-intro draft; iter 5 = polish (em-dash in scoring, onboarding
  counter); iter 6 = full regression walkthrough + final report.

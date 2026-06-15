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
- **Iter 2 (in progress):** Phase 4 backend, agent building migration + `GET /api/warm-intros`
  matcher + seed-2nd-user script. On completion: validate, ship, confirm READY.
- **Phase 4 spike DONE:** `docs/specs/V2_P4_WARM_INTROS.md` written (schema = 2 cols on `users`
  + index; server-side `/api/warm-intros` matching with consent; seed a 2nd user to validate).
  Ready to build as iter 2+.
- **Next up (queue):** iter 2 = Phase 4 migration + matching API + seed; iter 3 = opt-in toggle;
  iter 4 = warm-intros lane + ask-for-intro draft; iter 5 = polish (em-dash in scoring, onboarding
  counter); iter 6 = full regression walkthrough + final report.

# Co-Founder Sync — Meeting Plan

> **Goal:** align on what we're building, agree on how we work together, hand off the right tasks so neither of us blocks the other.
>
> **Time:** ~90 minutes is plenty for the first sync. After that, weekly 60-min works.
>
> **Format:** walk through the agenda in order. Don't rush brand or equity decisions — it's better to defer them with a clear "we'll decide by [date]" than to half-decide now.

---

## Agenda at a glance

| # | Topic | Est. time | Decision needed today? |
|---|-------|-----------|------------------------|
| 1 | Quick demo — show what's built | 10 min | No |
| 2 | Product vision + narrative alignment | 15 min | No (just confirm) |
| 3 | The big strategic decision: Warmly brand | 10 min | **Yes** |
| 4 | The bigger decision: equity + commitment | 20 min | **Yes (or set deadline)** |
| 5 | How we work — process, tools, gates | 10 min | Yes |
| 6 | Ownership split — who does what | 10 min | Yes |
| 7 | First-week task handoff | 10 min | Yes |
| 8 | Open questions + risks | 5 min | Track |

---

## 1. Quick demo (10 min)

**Show, don't tell.** Walk through the live product:
- Open `ai-networking-coach.vercel.app` (or whatever the production URL is by Thursday)
- **Login** → notice the warm editorial aesthetic, "Warmly" wordmark
- **Contacts** → "A deliberate network." hero, the **Today** feed (Re-warm / Follow up / Reach out), the table list with filter pills, click into a contact
- **Contact detail** → 2-column with the prominent hook block ("Why this person · why now"), Coach's take + Why this match in the right sidebar
- **Chat** → open a contact session, type *"Draft a message to [name]"*, watch the **artifact card** appear → click "Open in full ↗" → drawer slides in with the editable draft → "Mark as sent"
- **Goals** → gamified view (note: sample data; real wiring is V2)

**What this demonstrates:**
- The full lifecycle is wired: Discover (extension) → Strategize (chat → artifact drawer) → Prepare (meeting_prep artifact) → Maintain (Today feed surfaces who needs attention)
- Editorial brand identity, not generic SaaS
- AI artifacts are first-class — drawer, edit, mark sent, status flows back to contact

---

## 2. Product vision + narrative (15 min)

**Pre-read for partner:**
- `docs/PRD_AI_Networking_Coach_v1.md` — full PRD, ~13 sections
- `docs/PROJECT_MEMORY.md` Sessions 1-8 — context, decisions, debates
- `docs/DESIGN.md` — design system spec

**The one-liner you should both be able to say:**
> *"Your AI networking coach that finds the right people, helps you reach out, prepares you for conversations, and keeps your relationships alive."*

**The narrative — democratizing networking.**
Some people intuitively know how to network. Everyone else faces an invisible barrier. This product is the equalizer. Not a CRM, not a LinkedIn tool — a coach that gives anyone the social intelligence the best networkers have naturally.

**The 4-step framework:** Discover → Strategize → Prepare → Maintain.
This is the differentiator. No competitor covers all four with AI intelligence (Dex covers Maintain only. Granola is Prepare-adjacent. Mesh dumps contacts. Careerflow is transactional).

**Confirm:**
- Does the partner buy the narrative?
- Anything they'd reframe?
- Any market they're skeptical about?

---

## 3. Brand: Warmly — yes/no? (10 min — DECIDE TODAY)

**Context.** The current shipped product carries the Warmly wordmark across the entire UI. The italic serif aesthetic and warm cream palette are distinctive — not interchangeable with "AI Networking Coach."

**The decision matrix:**
- **If yes:** register `warmly.app` (or `getwarmly.com` / similar), update copy + GTM materials, lock in
- **If no:** roll back the wordmark in ~30 minutes, pick a new name, restart brand discovery
- **If undecided:** set a hard deadline (e.g., end of next week). Indecision costs more than a wrong name.

**Things to check before deciding:**
- Domain availability (warmly.com is taken by a sales-tech company — check warmly.app, getwarmly.com, hellowarmly.com)
- Trademark conflicts (USPTO + EU — quick search)
- Search competition ("warmly" + "networking" — see what shows up)
- Does the partner like it? (Brand has to feel right to both founders)

**Recommendation:** decide today, accept it's not perfect, and move on. Naming debates eat months and rarely produce something obviously better.

---

## 4. Equity + commitment (20 min — DECIDE TODAY OR SET DEADLINE)

This is the most important conversation of the meeting. Don't skip it.

**Topics to cover:**

### Commitment level
- Is the partner full-time, part-time, evenings? (Be specific: hours/week)
- When does that change? (e.g., "evenings until end of MBA program, full-time after")
- What's the trigger that makes them go all-in?

### Equity split
- Two-founder defaults: 50/50, 60/40, 55/45 are all defensible
- Vesting: 4 years with a 1-year cliff is industry standard
- Do you want acceleration on change-of-control? (Almost always yes for founders)
- Who's CEO? (Whoever raises money + sells; usually the more product-oriented founder)

### Founder agreement
- Get this in writing within 30 days of agreeing — even a one-page founder agreement is enough
- Includes: equity %, vesting, IP assignment, what happens if someone leaves
- Y Combinator's founder agreement template is free and fine for the first version

### Departure scenarios
- What happens if either of you wants to leave in month 6? Month 18?
- What's the buyback price for unvested equity?
- Awkward but essential. Better to discuss now than during a fight.

**Don't:**
- Decide equity based on who came up with the idea (founders who give too much weight to "I had it first" usually regret it)
- Defer this past a month — equity disputes are the #1 cause of startup death
- Sign anything without each of you reading it carefully (and ideally a YC partner or lawyer skimming it)

**Tonal recommendation:** be direct, be generous, be specific. If the partner is bringing real engineering value full-time, treat them like a real co-founder, not a contractor with equity.

---

## 5. How we work — process + tools (10 min)

This sets the rules of engagement. Get aligned now to avoid friction later.

### The repo
- One GitHub repo: `paristennisbookingassistant-spec/Warmly-` (rename to something cleaner once brand is locked)
- One Vercel project deploying `main` to production + every other branch as a preview
- One Supabase project (production) + one for staging if you scale

### Branching + PRs
- **`main` is sacred.** Nobody pushes directly. Every change goes through a pull request.
- **Branch naming:** `feat/...` for features, `fix/...` for bugs, `docs/...` for docs, `chore/...` for infra
- **Branch lifetime:** ≤3 days. Smaller PRs review faster and conflict less.
- **Self-merge prohibited.** Each PR needs ≥1 approval from the other person.

### Validation gate (non-negotiable)
Already in `CLAUDE.md`. Every PR must pass:
- `npx tsc --noEmit` (no type errors)
- `npm run build` (production build works)
- `npx vitest run` (137+ tests pass)

We'll set up GitHub Actions CI to enforce this automatically — see "First-week tasks" below.

### Reviews
- Read the diff. Don't rubber-stamp.
- Run it locally if behavior is non-obvious.
- Comment with questions, not commands. "Why this approach?" not "Use X instead."
- "Approve and merge" only when you'd be comfortable shipping it yourself.

### Communication
- **Slack-style async** for daily updates: "shipped X, working on Y, blocked on Z"
- **60-min weekly sync** for architecture/roadmap/strategic calls
- **Loom** for tricky walkthroughs that don't fit in chat
- **Don't overschedule meetings.** Defer most decisions to async + the weekly sync.

### Tools list
| Tool | Use |
|------|-----|
| GitHub | Code, PRs, issues |
| Vercel | Hosting, deploys, preview URLs |
| Supabase | DB, auth, storage |
| MiniMax | All LLM calls (chat, scoring, generation, summarization, discovery extraction) |
| Linear or Notion | Roadmap + task tracking (pick one) |
| PostHog (later) | Analytics. Add when you have ≥10 users |
| Slack or Discord | Async chat |

---

## 6. Ownership split (10 min)

Working hypothesis based on what we've discussed. Adjust to match the partner's strengths.

| Area | Owner | Why |
|---|---|---|
| Product direction, PRD, GTM, copy, prompts | **Liyang** | Strategy + domain context |
| Design system, UX flows, demo prep | **Liyang** | Founder taste + IVC-facing |
| Backend architecture, API routes, AI engine | **Partner** | Hardening + scale |
| Chrome extension (CDP, scraping resilience) | **Partner** | Most fragile part of the stack |
| Supabase schema, RLS, migrations | **Partner** | Data integrity matters |
| Frontend components, Tailwind, view logic | **Shared** | Liyang prototypes with AI, partner refactors + hardens |
| Tests + CI | **Partner** sets up, both maintain | Forcing function for quality |
| Deploy infra (Vercel, env vars, monitoring) | **Partner** | Solo Liyang already hit pain here |
| Customer/tester recruiting + interviews | **Liyang** | Product instinct |

**Watch-outs:**
- Liyang ships fast with AI agents. Don't let partner's "review every line" kill that velocity. Negotiate a "prototype branch" pattern: Liyang ships rough cuts, partner refactors toward main.
- Partner brings rigor. When they push back on backend/security, default to their judgment unless Liyang has a specific product reason.

---

## 7. First-week task handoff (10 min)

Concrete, scoped, owner per item. These should land before the second weekly sync.

### Partner — first week
1. **Onboarding** — clone, read PRD + PROJECT_MEMORY + CLAUDE.md, set up local env (`vercel env pull`), run validation gate end-to-end
2. **Set up CI** — `.github/workflows/test.yml` that runs `tsc + build + vitest` on every PR
3. **Set up branch protection** — main protected, requires 1 approval + passing CI to merge
4. **Add PR template** — `.github/pull_request_template.md` with "what / why / how to test"
5. **Audit the artifact double-generation fix** — review `app/api/conversations/[id]/messages/route.ts` to confirm the deterministic short reply approach is sound. Pair with the prompt audit (item below).
6. **(Stretch) Re-score button** — small UI + backend tweak that lets users re-score old contacts that have null `relevance_score`. Listed as a Phase 2.5 candidate, ideal first PR.

### Liyang — first week
1. **Brand decision shipped** — register domain, update copy if Warmly is locked
2. **Onboarding flow rebuild** — current onboarding still uses old design + simple stepper. The design ref has a 2-column conversational flow with live `user.md` preview. Higher leverage than auth polish.
3. **Tester recruitment** — get 5-10 INSEAD MBA classmates signed up to try the prototype + give feedback
4. **Prompt audit prep** — open the doc skeleton for `docs/PROMPT_INVENTORY.md` (see item below)

### Joint — first week
1. **Prompt audit + outreach skill port** — already queued in PROJECT_MEMORY.md Session 8. Liyang flagged this as "after Phase 3" priority. Map every prompt in the codebase, then port the gstack `/outreach` skill into `lib/ai/generation.ts` for the `outreach_draft` artifact type. Layer voice-matching on top per PRD 5.9.

---

## 8. Open questions + risks (5 min — track, not necessarily decide)

**Product:**
- When do we open up to non-MBA users? (Beachhead is INSEAD/HEC/LBS/IESE; expansion to junior professionals 2-5 yrs out comes later)
- Should we run a market validation survey before pouring more dev hours into Phase 4? (Liyang flagged this as wanting to do)
- LinkedIn risk — what's our response if LinkedIn detects the extension and rate-limits or bans accounts?

**Tech:**
- MiniMax dependency — what's the fallback if MiniMax has an outage or pricing change? (We removed Anthropic SDK; could re-add if needed)
- Discovery stability — slug disambiguation, MiniMax empty responses, CDP session drops still cause occasional failures
- Cost trajectory — at what user count do per-user LLM costs threaten unit economics?

**Business:**
- IVC submission timeline (Sept 2026) — what's the gating milestone? (10 paying users? 50? Specific revenue?)
- Pricing — €9.99 student / €19.99 pro (still need to nail the pro tier feature differentiation)
- When do we start charging? (Right now everything's free. Before or after IVC?)

**Operational:**
- Support email + monitoring (currently nothing). When do we set up?
- Privacy policy + terms — needed before beta launch with non-friend users
- Data retention policy — especially for the discovered LinkedIn profile data

---

## What good looks like at end of meeting

By the time you wrap, both of you should be able to answer:

1. ✅ Is Warmly the brand? (Yes / No / Decide-by-X)
2. ✅ What's the equity split + vesting? (Specific numbers)
3. ✅ Who owns what? (Reference the table in §6)
4. ✅ What's the first PR each of you opens this week?
5. ✅ When's the next sync? (Default: same time next week)
6. ✅ What's our shared definition of "ready for IVC demo"? (Specific bar)

If any of these are still vague after 90 min, schedule a follow-up specifically for that gap rather than letting it slide.

---

## What to send the partner before the meeting

48 hours before:
- This document
- `docs/PRD_AI_Networking_Coach_v1.md`
- `docs/PROJECT_MEMORY.md` (especially Sessions 1, 7, 8)
- `docs/DESIGN.md`
- The live production URL
- The repo URL with read access

Ask them to come with:
- Reactions to the product/narrative
- Their commitment level (specific hours/week)
- Their equity expectations (so neither of you is guessing)
- Top 3 things they'd want to fix or build first

If they show up cold to the meeting, you'll spend the first hour onboarding and the second hour rushing decisions. Pre-reads make the conversation 3× faster.

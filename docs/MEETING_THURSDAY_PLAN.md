# Co-Founder Sync — Tomorrow's Plan (Product Alignment)

> **Goal:** get on the same page about what we're actually building, agree on the MVP feature set, and lock who does what for the next 4 weeks. He hasn't seen the product yet, so the demo carries most of the alignment work.
>
> **Time:** 90 min
>
> **Pre-read for partner (send 24h before):** this doc, `docs/PRD_AI_Networking_Coach_v1.md`, `docs/PROJECT_MEMORY.md` Sessions 7-9, the live production URL.

---

## Agenda at a glance

| # | Block | Time | Decision needed? |
|---|-------|------|------------------|
| 1 | Demo — full lifecycle walkthrough | **25 min** | No — shared context |
| 2 | State of the build — solid / mocked / fragile | 10 min | No |
| 3 | **The strategic debate: INSEAD wedge vs LinkedIn extension** | **25 min** | **Yes** |
| 4 | MVP feature lock + GTM | 15 min | Yes |
| 5 | 4-week workstream split | 10 min | Yes |
| 6 | Logistics + brand/equity check-in | 5 min | Defer if needed |

---

## 1. Demo (25 min)

The full Discover → Strategize → Prepare → Maintain lifecycle. Don't narrate features; tell the story of one networking moment from start to finish.

### Script

1. **The pain (2 min)** — tell, don't show.
   > *"You meet someone great at a conference. Swap LinkedIn. Six months later you've got 400 contacts and remember nothing. The best networkers have a system — they know who to talk to, when, and why. We're building that system."*

2. **Discover (5 min)** — Chrome extension demo.
   - Open LinkedIn search results page
   - Run discovery → contacts get scored against the user's goals with reasoning
   - Click a high-scoring result → it lands in Warmly with a fully populated profile
   - **This is the moat.** Spend time here. Without this, every other feature is a CRM.

3. **Strategize (5 min)** — click into a high-scoring contact.
   - Show the 2-column detail page
   - Point at the **hook block** ("why this person, why now") — the prominent italic serif quote
   - Right sidebar: Coach's take, Why this match (4 bullets), Next steps
   - *"This isn't a CRM. It's a strategist briefing you on every person you might reach out to."*

4. **Prepare (5 min)** — open chat session for this contact.
   - Type *"draft an outreach to her"*
   - Artifact card appears in chat → click "Open in full ↗"
   - Right-side drawer slides in with the personalized draft
   - Highlight: voice-matched, no AI tells, references real career history
   - Edit one line → "Mark as sent" → status flows back to contact
   - Then on a different contact: *"prep me for tomorrow's coffee"* → meeting_prep artifact with discussion themes + do/don't list

5. **Maintain (3 min)** — back to Contacts page.
   - Hero with "A deliberate network."
   - Show the **Today feed** (Re-warm / Follow up / Reach out)
   - *"This is the 'right person, right time' feature. The whole system exists to surface this card every morning. If we get this right, we're done."*

6. **The framework (3 min)** — pull up the 4-step diagram.
   - Discover → Strategize → Prepare → Maintain
   - *"No competitor covers all four with AI. Dex is Maintain-only. Granola is Prepare-adjacent. LinkedIn alumni filter is Discover-only. Mesh dumps contacts. We're the only end-to-end coach."*

7. **Honest gaps (2 min)** —
   - Goals view: gamified UI is sample data; real wiring is V2
   - Onboarding: still on old simple stepper; new 2-column conversational design queued
   - Extension: LinkedIn DOM extraction is fragile on photos/companies/education
   - No monitoring, no privacy policy, no payment integration yet

---

## 2. State of the build (10 min)

Quick inventory — what's solid, what's mocked, what's broken. No defensiveness.

### Shipped + solid
- Full editorial UI (Warmly brand, OKLch palette, Instrument Serif)
- MiniMax integration (no Anthropic dependency anywhere)
- Auth: signup / login / forgot / reset
- Contact scoring with reasoning
- 6 artifact types: connection_note, outreach_draft, meeting_prep, meeting_notes, action_plan, follow_up_draft
- Artifact drawer (right-side editor with Edit / Mark sent / Copy)
- 2-column contact detail with hook block + coach sidebar
- Today feed on contacts page
- Chat with contact-scoped sessions
- Per-artifact-family prompt architecture (universal skill content as TS constants + per-user identity narrative + self-improvement loop)
- 137/137 tests passing
- Vercel preview-per-branch + production on main

### Mocked
- Goals view: streak, habits, quests are hardcoded sample data
- Onboarding: still old simple stepper (not the 2-column conversational design)
- "Why this match" sidebar bullets: derived client-side from contact fields, not LLM-generated
- "Coach's take": uses recommendation_reason from scoring, not a separate generation pass

### Fragile / broken
- Extension LinkedIn DOM extraction: photos, company, education sometimes fail (LinkedIn ships hashed CSS classes that change)
- No error monitoring (Sentry not set up)
- No privacy policy / ToS
- Discovery sessions occasionally fail mid-run (CDP session drops, MiniMax empty responses)
- Scoring backfill: existing contacts with `null` relevance_score have no UI to re-score

---

## 3. The strategic debate: INSEAD wedge vs LinkedIn extension (25 min)

This is the most important conversation of the meeting. Don't rush it.

### The two positions

**Partner's instinct: INSEAD directory as the MVP starting point.**
- Closed ecosystem, easier to seed data
- Verified identities + trust built-in
- Classmates as natural testers
- Zero LinkedIn ToS risk
- Faster to ship a working v0
- High signup conversion in friend network

**Liyang's conviction: the LinkedIn extension is the killer feature.**
- It's the moat. Without it, Warmly is "ChatGPT for networking" — easily replicated by anyone with an OpenAI key
- TAM goes from ~thousands of current MBAs to ~1B LinkedIn users
- The "right person at right time" prompt only works with passive context capture from where networking actually happens
- Already partially built (extension exists, basic discovery works)

### The synthesis (recommended)

**INSEAD is the GTM wedge. The extension is the product. They're not competing — they're orthogonal.**

Concretely:
1. First 30-50 testers come from Liyang's INSEAD classmates → his network gives us fast traction (partner's instinct wins on **distribution**)
2. The product they install on day 1 is the **full Warmly with extension** (Liyang's conviction wins on **product**)
3. Optional ingest: onboarding can pull INSEAD AlumNet as *one source* of contacts — but the system treats those contacts like any other (no school-specific features that don't generalize)
4. Expand school-by-school: INSEAD → HEC → LBS → IESE → mid-career professionals (2-5 yrs out)

### What this means in practice

- We do NOT build INSEAD-specific features (alumni search filters, school-only feeds, etc.) that won't generalize
- We DO use INSEAD as the early growth channel: WhatsApp groups, INSEAD Slack channels, AI Club + PE & VC Club, Liyang's LinkedIn
- The product roadmap stays focused on the 4-step coaching loop — Discover (extension), Strategize, Prepare, Maintain
- Validation goal: 30 active users from INSEAD by IVC demo (Sept 2026), 5+ paying

### Possible objection from partner: "but the extension is fragile"

Fair. The answer is: **harden the extension**, don't abandon it. LinkedIn DOM fragility is fixable with multi-selector fallback + visual extraction (already in PRD). It's the most important technical work for the next 4 weeks because it directly de-risks the moat. See workstream split.

### Decision needed today

✅ Agree on the synthesis: INSEAD = wedge, extension = product
✅ Agree we do NOT build school-specific features
✅ Agree extension hardening is the partner's #1 technical priority for the next 4 weeks

---

## 4. MVP feature lock + GTM (15 min)

### What ships before IVC (Sept 2026)

**Must-have (gating for IVC submission):**
- All 4 phases working end-to-end (Discover, Strategize, Prepare, Maintain) — already shipped
- Extension stable on LinkedIn (photo + company + edu extraction working ≥95% of profiles)
- New onboarding flow (2-column conversational, builds user.md profile)
- Re-score button + bulk operations
- Privacy policy + ToS (template-grade)
- Payment integration (Stripe) + €9.99 / €19.99 tier
- Error monitoring (Sentry)
- Chrome Web Store submission approved

**Nice-to-have (deprioritize if behind):**
- Real gamification wiring (streak from interaction count)
- Meeting notes from voice memo
- Email integration (besides LinkedIn)

**V2 / post-IVC:**
- Mobile app
- Other directories beyond LinkedIn
- Team/agency tier

### Pricing (already in PRD — confirm)

- **Free**: 5 contacts, 5 outreaches/month, no extension
- **Student €9.99/mo**: unlimited contacts, unlimited drafts, full extension
- **Pro €19.99/mo**: above + team features, priority support

### GTM channels (next 4 weeks)

- Liyang's INSEAD class WhatsApp groups
- INSEAD Slack channels (AI Club, PE & VC Club, MBA section channels)
- Liyang's LinkedIn (1-2 posts/week showing real product use)
- 1-on-1 outreach to specific classmates with high networking needs (PE/VC/Consulting recruiters)
- Goal: 10 testers by end of week 1, 30 by end of week 4

---

## 5. 4-week workstream split (10 min)

Owner per item. Adjust to match partner's strengths and capacity.

### Liyang (strategy + product + frontend prototyping)

| # | Task | Why |
|---|------|-----|
| 1 | **Onboarding rebuild** (2-col conversational + live user.md preview) | Highest-leverage UX upgrade; activates `buildInitialProfile()` already in code |
| 2 | **Tester recruitment** — 10 by W1, 30 by W4 | Validates coaching model; gating for IVC |
| 3 | **Demo polish + landing page + pricing copy** | IVC submission needs polish |
| 4 | **Privacy policy + ToS** (template-grade) | Legal floor for non-friend users |
| 5 | **Settings UI** for profile_md + pending learnings approval | APIs already exist, frontend needed |

### Partner (technical hardening + infra)

| # | Task | Why |
|---|------|-----|
| 1 | **Extension stability** — fix LinkedIn DOM fragility on photo/company/edu | **#1 priority** — directly de-risks the moat |
| 2 | **CI/CD** — GitHub Actions running tsc + build + vitest, branch protection on main | Quality gate, also unblocks faster merges |
| 3 | **Sentry / error monitoring** | Required for IVC-grade reliability |
| 4 | **Re-score button + bulk operations** | Closes the gap on existing null-score contacts |
| 5 | **Discovery session reliability** — slug disambiguation, MiniMax empty-response handling, CDP session drops | Phase 1 of the lifecycle is the most fragile step today |

### Joint

| # | Task | Why |
|---|------|-----|
| 1 | **Chrome Web Store submission** | Long approval cycle (7-21 days) — needs to start week 1 |
| 2 | **Decide INSEAD AlumNet ingestion** — yes/no, build path | Single architectural decision; affects onboarding |
| 3 | **Stripe integration + €9.99/€19.99 tier wiring** | Gating for "real users." Joint because spans frontend + backend |

---

## 6. Logistics + brand/equity (5 min — defer if running long)

### Quick check-in items

- **Brand: Warmly — confirm or set deadline.** Production is fully Warmly-branded right now. If yes → register `warmly.app` (warmly.com is taken by sales-tech). If no → 30-min rollback.
- **Equity + commitment.** If we don't decide today, set a hard deadline (e.g., end of next week). Equity disputes are the #1 cause of startup death.
- **Cadence.** Default: weekly 60-min sync, async daily updates ("shipped X, working on Y, blocked on Z").
- **Repo + tools.** GitHub repo, Vercel project, Supabase project, MiniMax API. Linear or Notion for task tracking — pick one.

If brand and equity need more time, schedule a separate 60-min next week dedicated to them. Don't half-decide them under time pressure.

For full process / equity / branding details, see `docs/COFOUNDER_SYNC.md`.

---

## What good looks like at end of meeting

By the time you wrap, both of you should be able to answer:

1. ✅ Are we aligned on **INSEAD = wedge, extension = product**? (Yes / No / Compromise)
2. ✅ What ships before IVC? (Specific feature list)
3. ✅ Who owns what for the next 4 weeks? (Reference §5)
4. ✅ When's the next sync? (Default: same time next week)
5. ✅ Brand decision: yes / no / by-when?
6. ✅ Equity decision: yes / no / by-when?

If any of these are still vague after 90 min, schedule a follow-up specifically for that gap.

---

## What to send the partner before the meeting (24h ahead)

- This document (`docs/MEETING_THURSDAY_PLAN.md`)
- `docs/PRD_AI_Networking_Coach_v1.md`
- `docs/PROJECT_MEMORY.md` Sessions 7-9 (the recent context)
- Live production URL: [insert latest Vercel URL]
- Repo URL with read access

Ask him to come with:
- Reactions to the demo (good, bad, confusing)
- His position on **INSEAD wedge vs extension** — does the synthesis work?
- His top 3 technical concerns
- His commitment level (specific hours/week)
- His equity expectations (so neither of you is guessing)

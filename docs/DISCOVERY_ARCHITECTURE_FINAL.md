# Discovery Feature — Final Architecture Recommendation

**Date:** 2026-04-06
**Status:** Approved — ready for implementation
**Origin:** Roundtable review of `DISCOVERY_ARCHITECTURE_PROPOSAL.md` by 5-person technical panel (systems architect, security analyst, fullstack developer, LLM architect, performance engineer)

---

## 1. Executive Summary

Automated contact discovery for MBA students. User enters a target company, the system finds relevant contacts on LinkedIn, extracts profile data, and ranks them by multi-signal relevance using AI.

**Chosen approach:** Chrome Extension with `chrome.debugger` CDP relay — a single installable artifact with zero local infrastructure, zero configuration, and zero terminal commands.

**Rejected approaches:**
- ~~Option A: Content script orchestrator~~ — Navigation kills the content script on every page load; state machine too fragile.
- ~~Option B: Proxycurl API~~ — Cannot do school-filtered search; stale data; expensive at scale.
- ~~Option C: Local CDP agent with Stagehand~~ — Requires `--remote-debugging-port=9222` (security risk for non-technical users) and a local Node.js process (UX dealbreaker).

---

## 2. Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│  User's Machine                                          │
│                                                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │  Chrome Extension (Manifest V3)                   │   │
│  │                                                    │   │
│  │  ┌──────────┐   chrome.debugger   ┌────────────┐ │   │
│  │  │ Popup UI │   (CDP commands)    │ LinkedIn   │ │   │
│  │  │ "Start   │──────────────────►  │ Tab        │ │   │
│  │  │ Discovery"│                    │ (user's    │ │   │
│  │  └────┬─────┘                    │  session)  │ │   │
│  │       │                           └────────────┘ │   │
│  │       ▼                                           │   │
│  │  ┌──────────────────────────┐                    │   │
│  │  │ Service Worker            │                    │   │
│  │  │ • Orchestration engine    │                    │   │
│  │  │ • CDP command dispatcher  │                    │   │
│  │  │ • Rate limiter            │                    │   │
│  │  │ • Progress reporter       │                    │   │
│  │  └────────────┬─────────────┘                    │   │
│  └───────────────┼──────────────────────────────────┘   │
│                  │ HTTPS                                  │
└──────────────────┼───────────────────────────────────────┘
                   ▼
     ┌──────────────────────────┐
     │  Vercel Backend (Next.js) │
     │                           │
     │  POST /api/discovery/     │
     │    extract → Claude Haiku │──► Structured profile JSON
     │    score   → Claude Haiku │──► Relevance score (0-100)
     │                           │
     │  POST /api/contacts       │──► Supabase (PostgreSQL)
     └──────────────────────────┘
```

### Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| `chrome.debugger` over raw port 9222 | Sandboxed by Chrome, user-visible banner, no CLI flags needed. Proven pattern used by OpenClaw and Claude Code Chrome extension. |
| Orchestration in service worker, not content script | CDP session persists across navigations. `chrome.debugger.attach()` keeps SW alive (Chrome 118+). No state-machine-across-navigations problem. |
| No Stagehand / No Playwright | Unnecessary dependencies. `chrome.debugger` provides the same CDP primitives directly. Extension-native approach = zero local infrastructure. |
| LLM extraction on backend, not in extension | Extension sends raw page text to Vercel; backend calls Claude Haiku. Keeps API keys server-side, allows centralized prompt versioning. |
| Single LLM provider (Anthropic) | Already using Claude for coaching. Adding Gemini saves $0.01/session but doubles operational complexity. Not worth it. |
| Sideloaded distribution (not Chrome Web Store) | `debugger` permission triggers strict CWS review. Sideloading to a known MBA cohort is simpler. CWS submission is a v2 goal. |

### Prior Art

This architecture follows the same pattern as two production systems:

- **OpenClaw Browser Relay** — MV3 extension uses `chrome.debugger` to pipe CDP commands from a local agent server to browser tabs. User clicks to attach tabs explicitly.
- **Claude Code Chrome Extension** — MV3 extension uses `chrome.debugger` + Native Messaging to give the CLI full browser control. Side panel shows live activity feed.

Our version is simpler: no external process, no native messaging — the service worker IS the orchestrator.

---

## 3. User Flow

### One-Time Setup (< 2 minutes)
1. User receives extension files from us (sideloaded `.crx` or unpacked folder)
2. Goes to `chrome://extensions` → enables Developer Mode → loads extension
3. Chrome shows permission prompt: "This extension can debug your browser" → user accepts
4. Done. No terminal. No flags. No config files.

### Every Discovery Session (8-12 minutes)
1. User is logged into LinkedIn in Chrome (as they normally are)
2. Clicks the extension icon in toolbar → popup opens
3. Types company name (e.g. **"McKinsey"**), selects school (e.g. **"INSEAD"**) → clicks **"Start Discovery"**
4. Extension opens a LinkedIn tab, a banner appears: *"Extension is debugging this tab"*
5. User watches Chrome navigate automatically:
   - LinkedIn search results page (filtered by company + school)
   - Opens each profile (15-45s human-like delay between profiles)
   - Scrolls to load lazy content
   - Moves to next profile
6. **Meanwhile in the web app:** contacts appear one-by-one in real-time, each with:
   - Full name, photo, headline, location
   - Experience history, education
   - AI relevance score (0-100) with explanation
7. After 25 profiles (or user clicks **"Stop"**), session ends
8. User switches to web app → contacts ranked by relevance, ready for AI coaching

### What the User NEVER Does
- Run a terminal command
- Launch Chrome with special flags
- Install Node.js or Python
- Edit a config file
- Manage API keys

---

## 4. Discovery Service Worker — Orchestration Flow

```
User clicks "Start Discovery" in popup
  → popup sends message to service worker: { company: "McKinsey", school: "INSEAD" }

Service Worker receives message
  │
  ├─ Step 1: Open & attach to LinkedIn tab
  │   chrome.tabs.create({ url: "about:blank" })
  │   chrome.debugger.attach(tabId, "1.3")
  │   // Service worker now stays alive for duration of session
  │
  ├─ Step 2: Get company ID (CDP, 0 LLM calls)
  │   CDP: Page.navigate → linkedin.com/company/mckinsey/
  │   CDP: Runtime.evaluate → extract company ID via regex
  │   Result: company_id = "1035"
  │
  ├─ Step 3: Search with filters (CDP, 0 LLM calls)
  │   CDP: Page.navigate → linkedin.com/search/results/people/
  │     ?currentCompany=["1035"]&schoolFilter=["5176"]
  │   Wait for page load (Page.loadEventFired)
  │
  ├─ Step 4: Collect profile URLs (CDP, 0 LLM calls)
  │   CDP: Runtime.evaluate →
  │     document.querySelectorAll('a[href*="linkedin.com/in/"]')
  │   Filter duplicates, extract clean URLs
  │   Result: [url1, url2, ..., url10]
  │
  ├─ Step 5: For each profile URL
  │   │
  │   ├─ CDP: Page.navigate → profile URL
  │   ├─ CDP: Runtime.evaluate → scroll to load lazy sections
  │   ├─ CDP: Runtime.evaluate → extract page text (innerText or AX tree)
  │   ├─ POST page text to backend:
  │   │   POST /api/discovery/extract
  │   │     → Claude Haiku extracts structured profile (Zod-validated)
  │   │   POST /api/discovery/score
  │   │     → Claude Haiku scores relevance against user background
  │   ├─ POST structured contact to /api/contacts (saved to Supabase)
  │   ├─ Report progress to popup / web app
  │   └─ Human-like delay: random(15000, 45000) ms
  │       + randomized scroll behavior before navigating away
  │
  ├─ Step 6: Pagination (CDP, 0 LLM calls)
  │   CDP: Runtime.evaluate → find & click "Next" button
  │   Repeat Steps 4-5 for pages 2-3
  │
  └─ Step 7: Session complete
      chrome.debugger.detach(tabId)
      Report summary to popup / web app
      Total: ≤25 profiles extracted and scored
```

### CDP Commands Used

| CDP Domain | Command | Purpose |
|-----------|---------|---------|
| `Page` | `navigate` | Go to LinkedIn URLs |
| `Page` | `loadEventFired` | Wait for page load |
| `Runtime` | `evaluate` | Execute JS in page context (DOM queries, scroll, extract text) |
| `Accessibility` | `getFullAXTree` | Alternative text extraction (fallback) |
| `Input` | `dispatchMouseEvent` | Human-like click simulation (if needed) |
| `Emulation` | `setDeviceMetricsOverride` | Ensure consistent viewport |

### Service Worker Lifecycle

- `chrome.debugger.attach()` keeps the service worker alive for the entire session (Chrome 118+, documented behavior).
- As a safety net, persist orchestration state in `chrome.storage.session` after each profile, so the session can resume if the SW is unexpectedly killed.
- Detach debugger on session end or user cancellation.

---

## 5. LLM Strategy

### Model Routing

| Task | Model | Location | Input | Output | Cost/call |
|------|-------|----------|-------|--------|-----------|
| Profile extraction | Claude Haiku | Vercel `/api/discovery/extract` | ~2K tokens (page text) | ~500 tokens (JSON) | ~$0.001 |
| Relevance scoring | Claude Haiku | Vercel `/api/discovery/score` | ~1K tokens (profile + user bg) | ~300 tokens (score + reasoning) | ~$0.002 |
| Coaching conversations | Claude Sonnet | Vercel `/api/ai/chat` | Variable | Variable | ~$0.05/msg |

### Cost Per Session (25 profiles)
- 25 extraction calls: $0.025
- 25 scoring calls: $0.050
- **Total: ~$0.08/session**
- Monthly (60 sessions): **~$4.80**

### Single Provider Rationale
The proposal considered Gemini Flash ($0.01/session) vs Claude Haiku ($0.08/session). The $4.20/month savings does not justify:
- Second SDK (`@google/generative-ai`)
- Second set of API keys and billing
- Second error handling and retry path
- Second set of rate limits and quotas
- Divergent prompt behavior between models

We already depend on Anthropic for coaching. One provider, one billing dashboard, one failure mode.

---

## 6. Multi-Signal Relevance Scoring

### Strategy: Filter Broad, Score Deep

LinkedIn's search filters provide the **candidate pool**. AI scoring provides the **ranking**.

**Step 1 — LinkedIn filters (coarse):**
- Company filter: `currentCompany=["COMPANY_ID"]`
- School filter: `schoolFilter=["5176"]` (INSEAD)
- This gets us ~10-50 people who work at the company and went to the same school

**Step 2 — AI scoring (fine-grained):**

For each extracted profile, Claude Haiku evaluates against the user's background:

| Signal | Weight | What Haiku Looks For |
|--------|--------|---------------------|
| Shared school | High | Same program, overlapping years, same campus |
| Career path similarity | High | Similar industry transitions (e.g. consulting → PE) |
| Common past employers | Medium | Both worked at same companies |
| Geographic/cultural proximity | Medium | Same nationality signals from education, location, languages |
| Seniority accessibility | Medium | VP more reachable than Managing Director |
| Connection degree | Low | 2nd degree > 3rd degree (if detectable) |
| Recency at company | Low | Current employee vs. recently left |

**Output:** Score (0-100) + one-sentence explanation of why this person is relevant.

### Future Extension: Beyond School Filter
When we want contacts who share career paths but NOT school, we can:
1. Search by company only (broader pool)
2. Extract more profiles (50+, across multiple sessions)
3. Rely entirely on AI scoring for relevance
4. This is a parameter change, not an architecture change

---

## 7. Rate Limiting & Anti-Detection

### Hard Limits (non-configurable)
| Parameter | Value | Rationale |
|-----------|-------|-----------|
| Max profiles per session | 25 | LinkedIn's informal threshold |
| Max sessions per day | 2 | Conservative daily limit |
| Min delay between profiles | 15 seconds | Human browsing floor |
| Max delay between profiles | 45 seconds | Avoid suspiciously long waits |
| Min hours between sessions | 2 | Cooldown period |

### Human-Like Behavior
- **Randomized delays:** uniform distribution between 15-45s, not fixed intervals
- **Variable scroll depth:** scroll 60-100% of page before extracting
- **Occasional pauses:** 5% chance of a 60-90s "reading" pause on a profile
- **No parallel tabs:** one profile at a time, sequential browsing

### Detection Mitigations
- Uses user's real Chrome (same cookies, IP, fingerprint, user-agent)
- CDP commands execute in the page context — indistinguishable from real user JS
- No headless mode, no Puppeteer fingerprint artifacts
- The `chrome.debugger` banner is only visible locally, not sent to LinkedIn

---

## 8. Risk Assessment

| # | Risk | Severity | Probability | Mitigation |
|---|------|----------|-------------|------------|
| 1 | Chrome Web Store rejects `debugger` permission | HIGH | HIGH | Sideload for v1. Known MBA cohort, controlled distribution. CWS is a v2 goal — may require justification letter or enterprise distribution. |
| 2 | LinkedIn rate limiting / account restriction | HIGH | MEDIUM | Hard-coded conservative limits (Section 7). Human-like behavior simulation. Immediate session abort on any CAPTCHA or restriction signal. |
| 3 | LinkedIn DOM changes break URL/profile extraction | MEDIUM | HIGH | Navigation uses hardcoded URL patterns (stable for years). Profile extraction uses LLM (adapts to DOM changes). Only `querySelectorAll('a[href*="linkedin.com/in/"]')` is fragile — monitor and update. |
| 4 | Haiku extraction accuracy | MEDIUM | LOW | Zod schema validation rejects malformed output. Retry once on failure. Accessibility tree as fallback input. Log failures for prompt improvement. |
| 5 | Service worker unexpected termination | LOW | LOW | `chrome.debugger` keeps SW alive (Chrome 118+). Backup: persist state in `chrome.storage.session`, resume on wake. |
| 6 | User's LinkedIn session expires mid-discovery | LOW | LOW | Detect login wall via DOM check after each navigation. Pause session, notify user to re-login, resume. |

### Biggest Risk That Could Kill This Feature
**LinkedIn behavioral detection evolving faster than our simulation.** If LinkedIn starts flagging profiles that are visited in rapid sequence from a single session, no amount of delay randomization helps. Mitigation: keep session sizes small (25 max), monitor for restriction signals aggressively, and design the scoring system so that fewer-but-better profiles still deliver value.

---

## 9. Extension Manifest Permissions

```json
{
  "manifest_version": 3,
  "permissions": [
    "debugger",
    "activeTab",
    "storage",
    "tabs"
  ],
  "host_permissions": [
    "https://www.linkedin.com/*",
    "https://YOUR_BACKEND.vercel.app/*"
  ]
}
```

**Permission justification:**
- `debugger` — Core functionality: CDP access to automate LinkedIn browsing
- `activeTab` — Read current tab URL for context
- `storage` — Persist session state, rate limit counters, user preferences
- `tabs` — Create/manage the LinkedIn discovery tab

---

## 10. New Backend API Routes

### `POST /api/discovery/extract`
- **Input:** `{ pageText: string, url: string }`
- **Process:** Send page text to Claude Haiku with extraction prompt + Zod schema
- **Output:** `{ profile: ExtractedProfile }` (name, headline, experience[], education[], location, photoUrl)
- **Validation:** Zod schema on both input and LLM output

### `POST /api/discovery/score`
- **Input:** `{ profile: ExtractedProfile, userBackground: UserBackground }`
- **Process:** Send to Claude Haiku with multi-signal scoring prompt
- **Output:** `{ score: number (0-100), reasoning: string, signals: SignalBreakdown[] }`
- **Validation:** Score must be 0-100, reasoning must be non-empty

Both routes require Supabase auth (user must be logged in).

---

## 11. Implementation Plan

### Week 1: Extension CDP Foundation
- [ ] Add `debugger` permission to manifest.json
- [ ] Build CDP helper module: `attach`, `detach`, `navigate`, `evaluate`, `waitForLoad`
- [ ] Implement company ID extraction via CDP (`Runtime.evaluate` + regex)
- [ ] Implement search URL construction with filters
- [ ] Implement profile URL collection from search results
- [ ] Implement page text extraction (innerText and/or AX tree)
- [ ] Build orchestration loop in service worker with rate limiting
- [ ] Persist session state in `chrome.storage.session`
- [ ] Test against saved LinkedIn HTML fixtures

### Week 2: Backend LLM Integration
- [ ] Build `POST /api/discovery/extract` route with Haiku + Zod
- [ ] Build `POST /api/discovery/score` route with multi-signal scoring prompt
- [ ] Design scoring prompt with signal weights (Section 6)
- [ ] Wire extension → backend API calls with auth
- [ ] Build progress reporting (extension → web app via Supabase Realtime or polling)
- [ ] Update contacts page to show relevance scores and reasoning

### Week 3: Polish & Testing
- [ ] Build discovery UI in extension popup (company input, school selector, progress bar, stop button)
- [ ] Add "Discovery" section to web app (trigger from web app → extension via messaging)
- [ ] Handle edge cases: login wall, empty results, CAPTCHA detection, session timeout
- [ ] Human-like behavior: randomized scroll, variable delays, occasional pauses
- [ ] End-to-end testing on real LinkedIn (manual, careful)
- [ ] User setup documentation (screenshot guide for sideloading)

### Deliverable
MBA student installs extension → clicks "Discover McKinsey" → watches Chrome browse LinkedIn → contacts appear ranked in web app with AI relevance scores and coaching-ready profiles.

---

## 12. Dependencies

| Dependency | Version | Purpose |
|-----------|---------|---------|
| Chrome Manifest V3 | — | Extension platform |
| `chrome.debugger` API | Chrome 118+ | CDP access to LinkedIn tab |
| Anthropic Claude Haiku | Latest | Profile extraction + relevance scoring |
| Anthropic Claude Sonnet | Latest | Coaching conversations (existing) |
| Zod | ^3.22 | Schema validation for extraction output |
| Supabase | Existing | Database, auth, realtime |

**Not needed:** Stagehand, Playwright, Puppeteer, Gemini SDK, any local Node.js process.

---

## 13. Appendix: LinkedIn Search URL Patterns

```
# Find school alumni at a company:
https://www.linkedin.com/search/results/people/
  ?currentCompany=["COMPANY_ID"]
  &schoolFilter=["SCHOOL_ID"]

# Known school IDs:
INSEAD = 5176
HBS = 1219
LBS = 1552
Stanford GSB = 1792
Wharton = 1285

# Extract company ID from company page:
document.documentElement.innerHTML.match(/fsd_company[%3A:]+(\d{5,12})/)[1]

# Extract profile URLs from search results:
[...document.querySelectorAll('a[href*="linkedin.com/in/"]')]
  .map(a => ({ name: a.innerText.trim(), url: a.href.split('?')[0] }))
  .filter(r => r.name.length > 2 && !r.name.includes('mutual'))
```

These are hardcoded in the service worker — zero LLM calls for navigation.

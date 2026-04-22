# Discovery Feature — Technical Architecture Proposal

**Date:** 2026-04-06
**Status:** Proposal — needs external technical review before implementation
**Author:** AI Networking Coach development team

---

## 1. What We're Building

An automated contact discovery feature for a networking coach app. The user enters a target company name (e.g. "McKinsey"). The system automatically:

1. Finds people at that company on LinkedIn, filtered by school (e.g. INSEAD alumni)
2. Visits each profile
3. Extracts structured data: name, title, experience history, education, photo
4. Saves contacts to the web app with AI-powered relevance scoring

**Key constraint:** Must use the user's own LinkedIn session (logged-in browser). LinkedIn does not offer a public API for search or profile browsing.

---

## 2. Approaches Considered

We evaluated three architectures:

### Option A: Chrome Extension Content Script Orchestrator
A content script running inside LinkedIn tabs navigates pages, extracts DOM data, and saves profiles.

**Pros:** Zero cost, zero detection risk (runs as the user's browser), no infrastructure.
**Cons:** Content scripts are destroyed on every page navigation (Manifest V3 limitation). Requires a complex state machine persisted in `chrome.storage.local` to survive navigations. LinkedIn's 2025 DOM uses CSS-in-JS with hashed class names that change frequently — CSS selectors break constantly. High maintenance burden.

**Verdict:** Architecturally fragile. The navigation-death problem makes the orchestration logic complex and hard to test.

### Option B: Third-Party API (Proxycurl)
Server-side API calls to Proxycurl ($0.01/profile) to fetch LinkedIn profile data.

**Pros:** Fastest to build (3-4 days), zero maintenance, structured JSON responses.
**Cons:** Cannot replicate LinkedIn's structured search filters (e.g. "INSEAD alumni at McKinsey"). Would need to pull ALL company employees and filter on our side — expensive and imprecise. Data can be stale (days/weeks behind). Cannot see private profiles. Cannot determine connection degree (1st/2nd/3rd). The school-based filtering is our core use case, and Proxycurl cannot do it.

**Verdict:** Poor fit for our specific use case (school-based filtering at target companies).

### Option C: Local CDP Agent with Stagehand (PROPOSED)
A hybrid automation approach using Stagehand (by Browserbase) to control the user's Chrome browser via Chrome DevTools Protocol (CDP). Hard-coded Playwright navigation for known LinkedIn URLs, LLM-powered extraction only for profile data parsing.

**Pros:** Connects to user's real browser (same cookies, IP, fingerprint — zero detection risk). No navigation-death problem (CDP session persists across page loads). LLM-based extraction adapts when LinkedIn changes DOM structure. TypeScript native. ~$0.01 per discovery session with cheap models.
**Cons:** User must launch Chrome with `--remote-debugging-port=9222`. Requires a local process or server to run the automation script. More complex initial setup than a pure extension.

**Verdict:** Best balance of cost, reliability, and maintainability. Proposed approach.

---

## 3. Proposed Architecture: Stagehand + CDP

### 3.1 What is Stagehand?

[Stagehand](https://github.com/browserbase/stagehand) is an open-source TypeScript library (22K GitHub stars, MIT license, maintained by Browserbase) that combines Playwright with LLM-powered actions. It provides three tiers of automation:

- **Pure Playwright** — deterministic browser actions (navigate, click, type). Zero LLM cost.
- **`act()`** — single LLM call to perform a described action ("click the Next button"). Used when selectors are unknown or may change.
- **`extract()`** — single LLM call to extract structured data from the current page, validated against a Zod schema. This is the key feature for us.

Stagehand also provides **auto-caching**: once an LLM-driven action succeeds, it records the resolution and replays it deterministically on subsequent runs — converting LLM calls into free cached lookups over time.

### 3.2 System Architecture

```
┌─────────────────────────────────────────────────────┐
│  User's Machine                                      │
│                                                       │
│  ┌──────────────┐     CDP (port 9222)    ┌─────────┐ │
│  │ Chrome        │◄─────────────────────►│ Discovery│ │
│  │ (LinkedIn     │                        │ Service  │ │
│  │  logged in)   │                        │ (Node.js)│ │
│  └──────────────┘                        └────┬─────┘ │
│                                                │       │
└────────────────────────────────────────────────┼───────┘
                                                 │
                          HTTPS                  │
                                                 ▼
                                    ┌─────────────────────┐
                                    │  Our Backend (Vercel)│
                                    │  - Save contacts     │
                                    │  - AI scoring        │
                                    │  - Web app           │
                                    └──────────┬──────────┘
                                               │
                                               ▼
                                    ┌─────────────────────┐
                                    │  LLM API             │
                                    │  (Gemini Flash /     │
                                    │   DeepSeek V3)       │
                                    └─────────────────────┘
```

**Components:**

1. **Chrome** — the user's regular Chrome browser, logged into LinkedIn. Launched with `--remote-debugging-port=9222` to enable CDP access.

2. **Discovery Service** — a Node.js process running locally on the user's machine. Uses Stagehand + Playwright to control Chrome via CDP. Executes the discovery loop. Could run as:
   - A CLI script (`npx ai-networking-coach discover "McKinsey"`)
   - A local server started by our Chrome extension
   - Part of a lightweight Electron wrapper

3. **Our Backend** — existing Vercel-hosted Next.js app. Receives extracted profiles via API, runs AI scoring, stores contacts in Supabase.

4. **LLM API** — Gemini 2.5 Flash (recommended) or DeepSeek V3 for the `extract()` calls. Only called for profile data extraction, not navigation.

### 3.3 Discovery Flow (step by step)

```
User clicks "Start Discovery" in web app
  → Enters: company name = "McKinsey", school = "INSEAD"
  → Web app triggers Discovery Service

Discovery Service connects to Chrome via CDP
  │
  ├─ Step 1: Get company ID (Playwright, 0 LLM calls)
  │   Navigate to linkedin.com/company/mckinsey/
  │   Extract company ID via regex: /fsd_company[%3A:]+(\d{5,12})/
  │   Result: company_id = "1035"
  │
  ├─ Step 2: Search with filters (Playwright, 0 LLM calls)
  │   Navigate to structured URL:
  │   linkedin.com/search/results/people/?currentCompany=["1035"]&schoolFilter=["5176"]
  │   Wait for page load
  │
  ├─ Step 3: Collect profile URLs (Playwright, 0 LLM calls)
  │   document.querySelectorAll('a[href*="linkedin.com/in/"]')
  │   Filter duplicates and noise
  │   Result: [url1, url2, ..., url10]
  │
  ├─ Step 4: For each profile URL (1 LLM call per profile)
  │   │
  │   ├─ Navigate to profile (Playwright, 0 LLM calls)
  │   ├─ Scroll to load lazy sections (Playwright, 0 LLM calls)
  │   ├─ extract() with Zod schema (1 LLM call):
  │   │   {
  │   │     name: "John Smith",
  │   │     headline: "Partner at McKinsey",
  │   │     experience: [
  │   │       { role: "Partner", company: "McKinsey", dates: "2020-Present" },
  │   │       { role: "Engagement Manager", company: "McKinsey", dates: "2016-2020" }
  │   │     ],
  │   │     education: [
  │   │       { school: "INSEAD", degree: "MBA", dates: "2015-2016" }
  │   │     ],
  │   │     location: "London, UK",
  │   │     photo_url: "https://media.licdn.com/..."
  │   │   }
  │   ├─ POST to backend API: /api/contacts
  │   ├─ Report progress to web app
  │   └─ Human-like delay (15-45 seconds) before next profile
  │
  ├─ Step 5: Pagination (Playwright + act(), 0-1 LLM calls)
  │   Click "Next" button (use act() if button selector is unknown)
  │   Repeat Steps 3-4 for next page
  │
  └─ Step 6: Session complete
      Report summary to web app
      Total: 25 profiles extracted
```

### 3.4 Cost Analysis

**LLM calls per session:**
- Navigation: 0 calls (hard-coded Playwright)
- Profile extraction: 25 calls (1 per profile)
- Pagination: 2-3 calls (act() for "Next" button)
- Total: ~28 LLM calls per session

**Cost per session by model:**

| Model | Input ($/1M tokens) | Output ($/1M tokens) | Est. tokens/call | Cost per session |
|-------|---------------------|---------------------|------------------|-----------------|
| Gemini 2.5 Flash | $0.15 | $0.60 | ~2K in, ~500 out | **~$0.01** |
| DeepSeek V3 | $0.07 | $0.28 | ~2K in, ~500 out | **~$0.01** |
| Claude Haiku | $0.25 | $1.25 | ~2K in, ~500 out | **~$0.02** |
| Claude Sonnet | $3.00 | $15.00 | ~2K in, ~500 out | **~$0.25** |

**Recommended: Gemini 2.5 Flash** — cheapest, fast, Stagehand's docs recommend it.

**Monthly cost projection:**
- 2 sessions/day × 30 days = 60 sessions/month
- At $0.01/session = **$0.60/month** in LLM costs
- Negligible. Not a cost concern.

### 3.5 Why This Beats the Alternatives

| Criterion | Extension State Machine | CDP + Stagehand | Proxycurl API |
|-----------|------------------------|-----------------|---------------|
| School filter (INSEAD at McKinsey) | Yes | **Yes** | No |
| Survives page navigation | No (state machine needed) | **Yes (CDP persists)** | N/A |
| DOM resilience | Low (selectors break) | **High (LLM adapts)** | N/A |
| Detection risk | Low | **Low (same browser)** | None |
| Cost per session | $0 | **$0.01** | $2-5 (many profiles) |
| Build time | 2-3 weeks | **1-2 weeks** | 3-4 days |
| Maintenance | High | **Low** | Low |
| Private profiles visible | Yes | **Yes** | No |
| Connection degree visible | Yes | **Yes** | No |
| Real-time data | Yes | **Yes** | No (cached) |

---

## 4. Technical Risks and Mitigations

### Risk 1: User must launch Chrome with CDP flag
**Impact:** Friction in user setup.
**Mitigation:** Provide a one-click launcher script or desktop shortcut. Or use our Chrome extension's `chrome.debugger` API to attach to tabs (avoids the flag requirement but has permission implications). Or build a lightweight Electron wrapper.

### Risk 2: LinkedIn rate limiting / account restrictions
**Impact:** User's LinkedIn account could be restricted.
**Mitigation:** Hard-coded rate limits (25 profiles/session, 2 sessions/day, 15-45s delay between profiles). Human-like behavior patterns (random scroll, variable timing). These are the same limits as our existing extension — the PRD already specifies them.

### Risk 3: Stagehand library stability
**Impact:** Breaking changes in Stagehand could break our discovery flow.
**Mitigation:** Pin the Stagehand version. The library is actively maintained (Browserbase is a funded company). Worst case, we can fall back to raw Playwright + manual extraction.

### Risk 4: LLM extraction accuracy
**Impact:** Wrong data extracted from profiles.
**Mitigation:** Zod schema validation rejects malformed extractions. We can add a verification step (compare extracted name against page title). Stagehand's auto-caching means successful extractions are replayed deterministically.

### Risk 5: CDP connection security
**Impact:** Any local process could connect to Chrome on port 9222.
**Mitigation:** Only open the port when running discovery. Use `--remote-debugging-port=9222` with `--remote-allow-origins=http://localhost:*` to restrict access. Close the port after the session.

---

## 5. Implementation Plan

### Week 1: Core discovery loop
- Install Stagehand, configure with Gemini Flash
- Build CDP connection helper (connect to user's Chrome)
- Implement company ID extraction (Playwright, no LLM)
- Implement filtered search URL construction
- Implement profile URL collection from search results
- Implement profile extraction with Zod schema
- Implement the full discovery loop with rate limiting
- Test against saved LinkedIn HTML fixtures

### Week 2: Integration and polish
- Wire discovery service to web app (trigger from UI, report progress)
- Build the "Start Discovery" UI in the web app
- Add progress reporting (websocket or polling)
- Handle errors and edge cases (login wall, empty results, CAPTCHA)
- User setup documentation / launcher script
- End-to-end testing on real LinkedIn

### Deliverable
User enters "McKinsey" + "INSEAD" in the web app → clicks Start → watches Chrome navigate LinkedIn → contacts appear in the web app with full profile data and relevance scores.

---

## 6. Questions for Technical Review

1. **Is the CDP connection approach (port 9222) the right way to control the user's Chrome, or is there a better method?** Alternatives: Chrome extension `chrome.debugger` API, native messaging host, WebSocket bridge.

2. **Is Stagehand the right library choice?** Alternatives: browser-use (Python, more mature but wrong language), raw Playwright (cheaper but no LLM extraction), Puppeteer.

3. **Is the hybrid approach (Playwright for navigation, LLM for extraction only) sound?** Or should we go full LLM-driven (more resilient but more expensive) or full deterministic (cheaper but fragile)?

4. **How should the Discovery Service run?** Options: CLI script user runs manually, background service started by extension, Electron app, VS Code extension.

5. **Is Gemini 2.5 Flash reliable enough for structured data extraction from HTML pages?** Any experience with its accuracy on Zod-schema-validated extraction?

6. **What's the best way to handle the Chrome CDP flag requirement?** Is there a way to enable CDP access without requiring the user to restart Chrome with a special flag?

---

## 7. Dependencies

| Dependency | Version | Purpose |
|-----------|---------|---------|
| @browserbasehq/stagehand | latest | Browser automation with LLM extraction |
| playwright | ^1.40 | Browser control via CDP |
| zod | ^3.22 | Schema validation for extracted data |
| Google Generative AI SDK | latest | Gemini Flash API calls |

---

## 8. Reference: LinkedIn Search Skill

Our existing LinkedIn search skill (tested manually, works reliably) defines the exact URL patterns:

```
# Find INSEAD alumni at a company:
https://www.linkedin.com/search/results/people/?currentCompany=["COMPANY_ID"]&schoolFilter=["5176"]

# Known school IDs:
INSEAD = 5176, HBS = 1219, LBS = 1552, Stanford GSB = 1792, Wharton = 1285

# Extract company ID from company page:
document.documentElement.innerHTML.match(/fsd_company[%3A:]+(\d{5,12})/)[1]

# Extract profile URLs from search results:
[...document.querySelectorAll('a[href*="linkedin.com/in/"]')]
  .map(a => ({ name: a.innerText.trim(), url: a.href.split('?')[0] }))
  .filter(r => r.name.length > 2 && !r.name.includes('mutual'))
```

These patterns are hard-coded in the discovery service (no LLM calls needed for navigation).

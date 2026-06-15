# LinkedIn data: Chrome extension vs. server-side MCP scraper

_Decision memo for Sanket. Question raised 2026-06-15: a popular open-source
[`linkedin-mcp-server`](https://github.com/stickerdaniel/linkedin-mcp-server) looks like it
does much of what we're building for proactive contact discovery + profile scraping. Does it
let us drop the Chrome extension? Does it shift our build choices?_

**TL;DR, No. Keep the extension as the sole in-product mechanism.** The MCP's one genuine
advantage is a capability (criteria-based people/company *search*), not an architecture, and
we capture it by reading its open source as a parsing reference, not by running its
infrastructure. This conclusion was reached twice independently: once with full context, once
by a clean-room agent told only "pick the better approach" without knowing we'd already built
the extension. Both picked the extension decisively.

---

## What the MCP server is
- **Capabilities (real and broad):** `search_people` (keyword/location/connection-degree/
  company), `get_person_profile`, `get_company_employees`, `search_companies`, `search_jobs`,
  `get_sidebar_profiles` ("people you may know"), plus messaging and `connect_with_person`.
- **How it works:** *not* an API. It drives a **real headless Chromium via Patchright**, a
  Playwright fork purpose-built to evade LinkedIn's bot detection (LinkedIn broke plain
  Playwright in late 2025). Logs in once, stores the session/cookie locally, serializes every
  call through one shared browser.
- **Their own risk disclaimer:** "automated access may violate LinkedIn's terms and can lead
  to account restrictions… no guarantee of account safety." Cited practical ceiling ~80–100
  profile views/day before a standard account is flagged.

## How our extension works (for contrast)
- **Manifest V3 Chrome extension** running in **the user's own browser, their logged-in
  LinkedIn session, on their residential IP**. Read-only: it parses LinkedIn's server-driven
  UI / React-Flight pagination payloads (the old `profileView` JSON API is 410 Gone). Hard
  rate limits (25 profiles/session, 2 sessions/day). Writes structured records to Supabase.
- Validated: 96% deep-profile accuracy (name/photo/full work history/education) on a 50-contact
  sync. The moat is the *parsing*, which we've already paid for. See
  `docs/LINKEDIN_SYNC_HOW_IT_WORKS.md`.

---

## The head-to-head

| Dimension | Extension (in user's browser) | Server-side MCP/Patchright scraper |
|---|---|---|
| **End-user ban risk** | **Low**, real user, real session, residential IP, human-paced, capped. Looks like browsing. | **High**, datacenter IP + replayed cookie + headless Chromium is the exact fingerprint LinkedIn hunts. |
| **Company legal/ToS exposure** | **Lower & distributed**, runs on the user's machine in their own session; we never hold LinkedIn credentials. Closer to the *hiQ* posture (user's own access). | **Higher & concentrated**, we operate the scraping infra, store/replay user cookies, and run *anti-detection* software (intent to evade). Centralized cookie custody = security + GDPR liability. |
| **Multi-user scale (10→10k)** | **Linear, free**, each user brings their own browser, IP, session, compute. ~Zero marginal infra. | **Scales terribly**, each user needs a long-lived, stateful, serialized logged-in browser. 10k users = 10k warm Chromium sessions or a brutal queue. The core killer. |
| **Infra cost/complexity** | **Near-zero**, backend just ingests JSON. | **High & ongoing**, worker fleet, session pooling, cookie vault, residential-proxy rotation, queue orchestration, headless babysitting. |
| **Data coverage** | Narrower out of the box; we build each parser. Covers profile + connections + (planned) discovery. | **Broader out of the box**, search/employees/jobs/PYMK. The one genuine edge. |
| **Maintenance vs LinkedIn churn** | We eat RSC/DOM churn, bounded, mostly already paid. | We *also* eat that churn **plus** an anti-detection arms race we don't control. Two churn surfaces, one adversarial. |
| **Time-to-value** | **Shipped & validated. TTV = 0.** | Weeks to productionize cookies/sessions/proxies, before the first ban wave. |
| **Fits our AI stack?** | Direct in-product calls. | **No.** MCP is a tool protocol for an LLM *host* (Claude Desktop). Our AI is MiniMax over REST, not an MCP host. We'd strip the MCP layer and call the Patchright functions directly, so the "it's an MCP server" headline is worth **zero** to us. We'd inherit a library, not a product. |

## The two non-obvious points
1. **"Plug in the MCP" isn't a real option.** Because we're not an MCP host, adopting this
   means adopting a **server-side Patchright scraper**, not "an MCP." The protocol buys us
   nothing; only the scraping code underneath has value.
2. **Server-side inverts our biggest safety advantage.** The extension's whole design,
   client-side, real browser, residential IP, read-only, is the lowest-ban-risk posture that
   exists and keeps LinkedIn liability with the user's normal browsing. Moving scraping
   server-side with the user's cookie is exactly what LinkedIn bans hardest *and* shifts
   liability to us. For a venture-stage B2C product, **getting early users' LinkedIn accounts
   banned is an extinction-level retention event.** This also violates our own
   `docs/LINKEDIN_GUARDRAILS.md` (read-only, no state-changing calls).

## The one real advantage, and how we capture it
The MCP's discovery toolset (`search_people` by filters, `get_company_employees`) is the only
place it genuinely leads, those are *search/list* operations, harder to parse than a single
profile, and exactly where our client-side parser is thinnest. **But that's a parsing problem,
not an architecture problem.** We capture the value by **porting the MCP's open-source
selectors/endpoint patterns for the search surfaces into our extension's client-side reader**,
same data, in the user's own session, without the ban/legal/scaling tax. Its messaging /
connection-request tools are actively *unwanted* (we're read-only by policy).

---

## Does this shift our development choices?
**No course change. One priority tweak.**
- **Keep the extension as the sole in-product mechanism.** Do not stand up server-side
  scraping infrastructure. It is strictly dominated on risk, cost, and scale for a multi-user
  product, and validated work (96% accuracy) is an asset to build on, not discard.
- **Priority tweak:** when we build **proactive discovery (Phase 3b)** and the **warm-intro
  graph (Phase 4)**, both lean on *search* (people/company by criteria), our thinnest parser
  area. Spend part of that work **mining `linkedin-mcp-server`'s open source as a reference**
  for the search/employee-list endpoints, and port the patterns client-side. Treat it as a
  free cheat-sheet, never as infrastructure to run.
- **Optional, zero-architecture:** the founder can run the MCP **locally, on their own
  account**, as an ops tool to bulk-seed/expand `directory_profiles` (target-company alumni
  enumeration). That's personal use on a personal account/IP, fine, and de-risks the Phase
  3b/4 data shapes. It is explicitly *not* part of the product runtime.

_Conclusion stands: keep building the extension. Harvest the MCP repo as a parsing reference
for discovery. Move on to the development plan._

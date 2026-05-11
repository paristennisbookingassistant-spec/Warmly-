/**
 * service-worker/index.ts
 * Manifest V3 service worker entry point.
 *
 * Handles only SHORT-LIVED tasks:
 *   - Rate limit checks and state updates
 *   - Auth token reads
 *   - API calls (profile save, session create/update)
 *   - Heartbeat responses
 *
 * NEVER put long-running loops or orchestration here.
 * Long-lived state lives in the content script (orchestrator.ts).
 */

import {
  checkRateLimit,
  recordSessionStart,
  recordSessionEnd,
} from "./rate-limiter";
import { getSession, isAuthenticated } from "./auth";
import {
  saveDiscoveredProfile,
  createDiscoverySession,
  updateDiscoverySession,
  bookmarkProfile,
  rankContactsBatch,
  type BatchRankResult,
} from "./api-client";
import type { ExtractedProfile } from "../shared/types";
import {
  attachToNewTab,
  attachToTab,
  navigate,
  evaluate,
  detach,
  sleep,
  mouseWheel,
  getActiveTabId,
} from "./cdp-helper";
import { DEFAULT_BACKEND_URL } from "../shared/constants";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * JS snippet executed inside the LinkedIn page (via CDP `Runtime.evaluate`)
 * that scrapes the company-search results page into rows.
 *
 * Strategy: pull the slug from each company link's href (stable, derives
 * from the URL path), then grab the row's raw `innerText` (whatever LinkedIn
 * is rendering this week). The LLM downstream is good at parsing
 * semi-structured text into name + industry + location + followers — far
 * more robust than chasing LinkedIn's churning CSS class names with
 * brittle multi-selector strategies.
 *
 * Used in two places:
 *   - CDP_GET_COMPANY_ID (slug-failed fallback)
 *   - CDP_DISCOVER (slug-failed fallback)
 */
const SCRAPE_COMPANY_CANDIDATES_JS = `(() => {
  const links = Array.from(document.querySelectorAll('a[href*="/company/"]'))
    .filter(a => {
      const h = a.href;
      return !h.includes('/search/') && !h.includes('/unavailable') && h.includes('linkedin.com/company/');
    });

  const seen = new Set();
  const rows = [];
  for (const link of links) {
    const slug = (() => {
      try {
        const u = new URL(link.href);
        return u.pathname.split('/company/')[1]?.replace(/\\/.*$/, '').replace(/\\/$/, '');
      } catch {
        return null;
      }
    })();
    if (!slug || seen.has(slug)) continue;
    seen.add(slug);

    // Find the row container — try a few wrappers, fall back to the link's parent.
    const container = link.closest('li, .reusable-search__result-container, [class*="entity-result"]') || link.parentElement;
    const rawText = (container?.innerText || link.innerText || '').trim();

    // Heuristic: the FIRST line of the row text is almost always the company
    // name, even when the rest of the row varies. Fall back to the link text.
    const firstLine = rawText.split('\\n').map(s => s.trim()).filter(Boolean)[0] || (link.innerText || '').trim();

    if (firstLine && slug) {
      rows.push({
        name: firstLine.slice(0, 200),
        slug,
        url: 'https://www.linkedin.com/company/' + slug + '/',
        // Trimmed to keep prompt size bounded — typical row is under 250 chars
        rawText: rawText.replace(/\\s+\\n/g, '\\n').slice(0, 400),
      });
    }
    if (rows.length >= 10) break;
  }

  return JSON.stringify(rows);
})()`;

interface CompanyCandidate {
  name: string;
  slug: string;
  url: string;
  rawText: string;
}

/**
 * Finds the best LinkedIn tab to attach CDP to.
 * Priority: active tab in current window (if it's LinkedIn) → any LinkedIn tab.
 */
async function findLinkedInTab(): Promise<number | null> {
  const activeTabs = await chrome.tabs.query({ active: true, currentWindow: true });
  const active = activeTabs[0];
  if (active?.id && active.url?.includes("linkedin.com")) {
    return active.id;
  }
  const allLinkedIn = await chrome.tabs.query({ url: "*://www.linkedin.com/*" });
  return allLinkedIn[0]?.id ?? null;
}

// ---------------------------------------------------------------------------
// Message handler
// ---------------------------------------------------------------------------

chrome.runtime.onMessage.addListener(
  (
    message: { type: string; payload?: unknown },
    _sender,
    sendResponse: (response: unknown) => void
  ) => {
    // Return true immediately to signal async response
    handleMessage(message).then(sendResponse).catch((err) => {
      console.error("[SW] Message handler error:", err);
      sendResponse(null);
    });
    return true;
  }
);

async function handleMessage(
  message: { type: string; payload?: unknown }
): Promise<unknown> {
  switch (message.type) {
    // ---- Rate limit --------------------------------------------------------
    case "CHECK_RATE_LIMIT": {
      return checkRateLimit();
    }

    case "RECORD_SESSION_START": {
      await recordSessionStart();
      return { ok: true };
    }

    case "RECORD_SESSION_END": {
      await recordSessionEnd();
      return { ok: true };
    }

    // ---- Auth --------------------------------------------------------------
    case "AUTH_CHECK": {
      const authed = await isAuthenticated();
      if (!authed) return { user_id: null, access_token: null };
      const session = await getSession();
      return {
        user_id: session?.user_id ?? null,
        access_token: session?.access_token ?? null,
      };
    }

    // ---- Session management ------------------------------------------------
    case "CREATE_SESSION": {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- dynamic payload
      const p = message.payload as any;
      const session = await createDiscoverySession(p?.query ?? "", p?.filters);
      return session
        ? { session_id: session.id }
        : { session_id: crypto.randomUUID() }; // Offline fallback
    }

    case "SESSION_UPDATE":
    case "SESSION_COMPLETED": {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- dynamic payload
      const p = message.payload as any;
      if (p?.session_id) {
        await updateDiscoverySession(p.session_id, {
          status: p.status ?? "completed",
          profiles_discovered: p.profiles_saved ?? 0,
        });
      }
      return { ok: true };
    }

    case "SESSION_ERROR": {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- dynamic payload
      const p = message.payload as any;
      console.error("[SW] Session error from content script:", p?.error);
      return { ok: true };
    }

    // ---- Profile saving ----------------------------------------------------
    case "SAVE_PROFILE":
    case "PROFILE_EXTRACTED": {
      const p = message.payload as { profile?: ExtractedProfile; session_id?: string | null };
      const profile = p?.profile;
      const sessionId = p?.session_id;

      if (!profile) {
        console.warn("[SW] SAVE_PROFILE missing profile");
        return { ok: false };
      }

      // session_id is null for manual bookmarks — use bookmarkProfile() in that case
      const contact = sessionId
        ? await saveDiscoveredProfile(profile, sessionId)
        : await bookmarkProfile(profile);
      return { ok: contact !== null, contact_id: contact?.id ?? null };
    }

    // ---- MiniMax extraction + save (used by manual bookmark button) ---------
    case "EXTRACT_AND_SAVE": {
      const p = message.payload as {
        pageText?: string;
        avatar?: string | null;
        linkedinUrl?: string;
      };

      if (!p?.pageText || p.pageText.length < 50) {
        return { ok: false, reason: "no_page_text" };
      }

      try {
        const backendUrl = DEFAULT_BACKEND_URL;
        const extractRes = await fetch(`${backendUrl}/api/discovery/extract`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pageText: p.pageText }),
        });

        if (!extractRes.ok) {
          const errText = await extractRes.text().catch(() => "");
          console.error("[SW] EXTRACT_AND_SAVE: API error", extractRes.status, errText.slice(0, 200));
          return { ok: false, reason: `API error ${extractRes.status}` };
        }

        const extractData = await extractRes.json() as {
          data?: {
            name: string;
            headline: string | null;
            location: string | null;
            experiences: Array<{ title: string; company: string; duration: string }>;
            educations: Array<{ school: string; degree: string; dates?: string }>;
          };
        };

        const d = extractData.data;
        if (!d?.name) {
          console.warn("[SW] EXTRACT_AND_SAVE: MiniMax returned no name");
          return { ok: false, reason: "extraction_returned_no_name" };
        }

        // Map MiniMax result to ExtractedProfile and save
        const profile: ExtractedProfile = {
          linkedin_url: p.linkedinUrl ?? "",
          name: d.name,
          headline: d.headline ?? "",
          current_title: d.experiences[0] ?? { title: "Unknown", company: "Unknown", duration: "Unknown" },
          previous_roles: d.experiences.slice(1),
          education: d.educations,
          location: d.location ?? "",
          ...(p.avatar ? { avatar: p.avatar } : {}),
          mutual_connections: 0,
          captured_at: new Date().toISOString(),
          source_session_id: null,
        };

        const contact = await bookmarkProfile(profile);
        if (contact) {
          console.debug("[SW] EXTRACT_AND_SAVE: saved", d.name);
          return { ok: true, contact_id: contact.id };
        }
        return { ok: false, reason: "save_failed" };
      } catch (err) {
        console.error("[SW] EXTRACT_AND_SAVE error:", err);
        return { ok: false, reason: String(err) };
      }
    }

    // ---- Heartbeat ---------------------------------------------------------
    case "HEARTBEAT": {
      // Receiving this message keeps the service worker alive.
      // No action needed — just respond so the content script knows we're up.
      return { ok: true, ts: Date.now() };
    }

    // ---- Pause/Resume/Stop (forwarded from popup) --------------------------
    case "PAUSE_DISCOVERY":
    case "RESUME_DISCOVERY":
    case "STOP_DISCOVERY": {
      // The service worker re-broadcasts these to the active LinkedIn tab
      // so the content script orchestrator can act on them.
      const tabs = await chrome.tabs.query({ url: ["*://www.linkedin.com/*"] });
      for (const tab of tabs) {
        if (tab.id) {
          chrome.tabs.sendMessage(tab.id, message).catch(() => {
            // Tab may not have the content script loaded — non-fatal
          });
        }
      }
      return { ok: true };
    }

    // ---- Page bookmark (popup save button) ---------------------------------
    case "PAGE_BOOKMARKED": {
      // The popup sends this; we need to ask the content script to extract
      // the current profile and return it. The content script handles this
      // directly in its own message listener (index.ts).
      return { ok: true };
    }

    // ---- Fetch display data for ranked contacts ---------------------------
    case "FETCH_CONTACTS_FOR_RANKINGS": {
      // Popup uses this after rankings arrive to enrich the display rows
      // with name + role + company. Goes through the authenticated api-client.
      const ids = (message.payload as { ids?: string[] })?.ids ?? [];
      if (ids.length === 0) return { ok: true, contacts: [] };
      try {
        const { getAuthHeader } = await import("./auth");
        const { getBackendUrl } = await import("./api-client");
        const authHeader = await getAuthHeader();
        if (!authHeader) return { ok: false, error: "Not authenticated" };

        const baseUrl = await getBackendUrl();
        const params = new URLSearchParams({ ids: ids.join(",") });
        const res = await fetch(`${baseUrl}/api/contacts?${params.toString()}`, {
          headers: { Authorization: authHeader },
        });
        if (!res.ok) return { ok: false, error: `Backend ${res.status}` };
        const body = await res.json() as {
          data?: { items?: Array<{ id: string; name: string; current_title: string | null; company: string | null }> };
        };
        const items = body.data?.items ?? [];
        // Return only the ones the user asked for (in case the contacts
        // listing returned more than requested).
        const idSet = new Set(ids);
        return {
          ok: true,
          contacts: items.filter((c) => idSet.has(c.id)),
        };
      } catch (err) {
        return { ok: false, error: String(err) };
      }
    }

    // ---- CDP test (Module 1 verification) -----------------------------------
    case "CDP_TEST": {
      try {
        const tabId = await findLinkedInTab();
        if (!tabId) {
          return { ok: false, error: "Open a LinkedIn page first, then test again" };
        }
        await attachToTab(tabId);
        const title = await evaluate<string>("document.title");
        await detach();
        return { ok: true, tabId, title };
      } catch (err) {
        await detach().catch(() => {});
        return { ok: false, error: String(err) };
      }
    }

    // ---- CDP Module 2: Company ID extraction --------------------------------
    case "CDP_GET_COMPANY_ID": {
      const p = message.payload as { companyName?: string; userContext?: string };
      const companyName = p?.companyName?.trim();
      const userContext = p?.userContext?.trim() || undefined;
      if (!companyName) return { ok: false, error: "Company name required" };

      // Helper: check if current page is a valid company page and extract ID
      const extractIdFromCurrentPage = async (): Promise<string | null> => {
        const pageUrl = await evaluate<string>("window.location.href");
        if (pageUrl.includes("/unavailable")) return null;

        return evaluate<string | null>(
          `(() => {
            const m = document.documentElement.innerHTML.match(/fsd_company[%3A:]+(\\d{5,12})/);
            return m ? m[1] : null;
          })()`
        );
      };

      try {
        const tabId = await findLinkedInTab();
        if (!tabId) {
          return { ok: false, error: "Open LinkedIn first" };
        }
        await attachToTab(tabId);

        // Phase 1: Try slug guesses (fast — 1 navigation each)
        const base = companyName.toLowerCase().replace(/[^a-z0-9\s&-]/g, "").trim();
        const slugs = [
          base.replace(/[&]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-"),
          base.replace(/[&\s-]/g, ""),
          base.split(/\s+/)[0],
        ];
        const uniqueSlugs = [...new Set(slugs)];

        for (const slug of uniqueSlugs) {
          console.debug("[CDP] Trying slug:", slug);
          await navigate(`https://www.linkedin.com/company/${slug}/`);
          await sleep(2000);

          const companyId = await extractIdFromCurrentPage();
          if (companyId) {
            // Validate: does the page's company name match what the user typed?
            const displayName = await evaluate<string | null>(
              `document.querySelector('h1')?.innerText?.trim() ?? null`
            );
            const inputLower = companyName.toLowerCase().trim();
            const pageLower = (displayName ?? "").toLowerCase().trim();

            // Match logic:
            // The PAGE name must contain the FULL user input (not the other way around)
            // "McKinsey & Company" contains "mckinsey" → accept
            // "JEITO Capital" contains "jeito capital" → accept
            // "Jeito" does NOT contain "jeito capital" → reject
            const pageContainsInput = pageLower.includes(inputLower);
            // Also accept if input contains the full page name AND page name has 2+ words
            // (handles "Boston Consulting Group" typed as "BCG" edge case — but that's rare)
            const inputContainsPage = inputLower.includes(pageLower) && pageLower.split(/\s+/).length >= 2;

            if (pageContainsInput || inputContainsPage) {
              await detach();
              return { ok: true, companyId, companyName: displayName ?? companyName, method: "slug_guess" };
            }
            console.debug("[CDP] Slug matched wrong company:", JSON.stringify(displayName), "vs", JSON.stringify(companyName));
          }
        }

        // Phase 2: Slug guesses failed — search LinkedIn + use LLM to pick the right company
        console.debug("[CDP] Slugs failed, searching LinkedIn for:", companyName);
        await navigate(
          `https://www.linkedin.com/search/results/companies/?keywords=${encodeURIComponent(companyName)}`
        );
        await sleep(3000);

        // Extract STRUCTURED candidates from the search results page. The
        // backend disambiguator works far better with name + tagline +
        // location + followers than with a single text blob.
        const candidatesJson = await evaluate<string>(SCRAPE_COMPANY_CANDIDATES_JS);

        let candidates: CompanyCandidate[] = [];
        try {
          candidates = JSON.parse(candidatesJson || "[]");
        } catch {
          candidates = [];
        }

        if (candidates.length === 0) {
          await detach();
          return { ok: false, error: `No LinkedIn search results for "${companyName}"` };
        }

        // Ask our backend LLM to pick the right company
        const backendUrl = DEFAULT_BACKEND_URL;
        const resolveRes = await fetch(`${backendUrl}/api/discovery/resolve-company`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ companyName, userContext, candidates }),
        });

        if (!resolveRes.ok) {
          await detach();
          return { ok: false, error: `Backend resolve-company failed (${resolveRes.status})` };
        }

        const resolveData = await resolveRes.json() as {
          data?: {
            companyUrl?: string | null;
            companySlug?: string | null;
            companyName?: string | null;
            confidence?: number;
            reasoning?: string;
            candidates?: typeof candidates;
          }
        };
        const resolvedUrl = resolveData.data?.companyUrl;

        // Low-confidence: surface the picker. The popup will show top 3
        // candidates so the user can pick. We return ok:false but with a
        // structured candidates payload so the popup knows what to show.
        if (!resolvedUrl) {
          await detach();
          return {
            ok: false,
            needsPicker: true,
            candidates: resolveData.data?.candidates ?? candidates,
            reasoning: resolveData.data?.reasoning ?? "Could not auto-resolve",
            error: `Need user to pick which "${companyName}" they meant`,
          };
        }

        // Navigate to the LLM-selected company page
        console.debug("[CDP] LLM selected company URL:", resolvedUrl, "confidence:", resolveData.data?.confidence);
        await navigate(resolvedUrl);
        await sleep(2000);

        const companyId = await extractIdFromCurrentPage();
        const displayName = await evaluate<string | null>(
          `document.querySelector('h1')?.innerText?.trim() ?? null`
        );
        await detach();

        if (companyId) {
          return {
            ok: true,
            companyId,
            companyName: displayName ?? resolveData.data?.companyName ?? companyName,
            method: "llm_search",
            reasoning: resolveData.data?.reasoning,
            confidence: resolveData.data?.confidence,
          };
        }
        return { ok: false, error: `Found page but could not extract company ID` };
      } catch (err) {
        await detach().catch(() => {});
        return { ok: false, error: String(err) };
      }
    }

    // ---- CDP Module 3: Search profiles by company + school -------------------
    case "CDP_SEARCH_PROFILES": {
      const p = message.payload as { companyId?: string; schoolId?: string };
      if (!p?.companyId) return { ok: false, error: "Company ID required" };

      try {
        const tabId = await findLinkedInTab();
        if (!tabId) {
          return { ok: false, error: "Open LinkedIn first" };
        }
        await attachToTab(tabId);

        // Construct filtered search URL
        const params = new URLSearchParams();
        params.set("currentCompany", `["${p.companyId}"]`);
        if (p.schoolId) params.set("schoolFilter", `["${p.schoolId}"]`);
        const searchUrl = `https://www.linkedin.com/search/results/people/?${params.toString()}`;

        console.debug("[CDP] Searching profiles:", searchUrl);
        await navigate(searchUrl);
        await sleep(3000);

        // Extract profile URLs from search results
        const profiles = await evaluate<Array<{ name: string; url: string }>>(
          `(() => {
            const seen = new Set();
            const results = [];
            const links = document.querySelectorAll('a[href*="linkedin.com/in/"]');
            for (const a of links) {
              const url = a.href.split('?')[0];
              if (!url.includes('/in/')) continue;
              if (seen.has(url)) continue;
              const text = a.innerText.trim();
              if (text.length < 2 || text.includes('mutual')) continue;
              seen.add(url);
              results.push({ name: text.split('\\n')[0].trim(), url });
            }
            return results;
          })()`
        );

        await detach();
        return { ok: true, profiles, count: profiles.length };
      } catch (err) {
        await detach().catch(() => {});
        return { ok: false, error: String(err) };
      }
    }

    // ---- CDP Full Discovery Test: Company name → profile URLs ----------------
    case "CDP_DISCOVER": {
      const p = message.payload as {
        companyName?: string;
        schoolId?: string;
        userContext?: string;
        companySlug?: string;
        locationGeoUrn?: string;
        functionKeywords?: string;
        // Human-readable labels for the LLM resolver's downstream-filters
        // reasoning ("with Paris filter applied, prefer the global parent").
        schoolLabel?: string;
        locationLabel?: string;
        functionLabel?: string;
      };
      const companyName = p?.companyName?.trim();
      const schoolId = p?.schoolId ?? "5176";
      const userContext = p?.userContext?.trim() || undefined;
      // Pre-resolved slug from the disambiguation picker — bypasses LLM resolution.
      const presetSlug = p?.companySlug?.trim() || undefined;
      // Human-readable filter labels for the LLM resolver
      const downstreamFilters = {
        schoolLabel: p?.schoolLabel?.trim() || undefined,
        locationLabel: p?.locationLabel?.trim() || undefined,
        functionLabel: p?.functionLabel?.trim() || undefined,
      };
      // Optional filters from the popup form
      const locationGeoUrn = p?.locationGeoUrn?.trim() || undefined;
      const functionKeywords = p?.functionKeywords?.trim() || undefined;
      if (!companyName) return { ok: false, error: "Company name required" };

      try {
        // Step 1: Resolve company ID (reuse Module 2 logic inline)
        const tabId = await findLinkedInTab();
        if (!tabId) {
          return { ok: false, error: "Open LinkedIn first" };
        }
        await attachToTab(tabId);

        // Helper to extract company ID from current page
        const tryExtractId = async (): Promise<string | null> => {
          const pageUrl = await evaluate<string>("window.location.href");
          if (pageUrl.includes("/unavailable")) return null;
          return evaluate<string | null>(
            `(() => { const m = document.documentElement.innerHTML.match(/fsd_company[%3A:]+(\\d{5,12})/); return m ? m[1] : null; })()`
          );
        };

        // Resolution strategy: ALWAYS go through LinkedIn search + LLM
        // disambiguation, except when the popup pre-resolved a slug via
        // the picker (presetSlug). The previous "slug guess first" code
        // was a footgun on common names: "wonderful" successfully
        // resolves to /company/wonderful but that's a different company
        // than wonderfulcx (the AI agent startup). The cache layer in
        // /api/discovery/resolve-company makes repeat lookups instant
        // (zero LLM call) so the cost of going LLM-first is one-time
        // per company name.
        let companyId: string | null = null;
        let resolvedName: string = companyName;

        if (presetSlug) {
          // Picker already chose the slug — go directly. Trust the user's pick.
          await navigate(`https://www.linkedin.com/company/${presetSlug}/`);
          await sleep(2000);
          const id = await tryExtractId();
          if (id) {
            const name = await evaluate<string | null>(`document.querySelector('h1')?.innerText?.trim() ?? null`);
            companyId = id;
            resolvedName = name ?? companyName;
          }
        }
        // No presetSlug → fall through to LinkedIn search + LLM resolver below.

        // Candidates from the LLM resolver — hoisted so the zero-result
        // safety net (Step 2 check) can re-surface them in the picker if
        // people-search returns 0 alumni for the picked slug.
        let resolveCandidates: CompanyCandidate[] = [];
        let resolvedSlug: string | null = presetSlug ?? null;

        // Fallback: LinkedIn search + LLM disambiguation with structured candidates
        if (!companyId) {
          await navigate(`https://www.linkedin.com/search/results/companies/?keywords=${encodeURIComponent(companyName)}`);
          await sleep(3000);

          const candJson = await evaluate<string>(SCRAPE_COMPANY_CANDIDATES_JS);
          try {
            resolveCandidates = JSON.parse(candJson || "[]");
          } catch {
            resolveCandidates = [];
          }

          if (resolveCandidates.length > 0) {
            const backendUrl = DEFAULT_BACKEND_URL;
            const res = await fetch(`${backendUrl}/api/discovery/resolve-company`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ companyName, userContext, candidates: resolveCandidates, downstreamFilters }),
            });
            if (res.ok) {
              const data = await res.json() as {
                data?: {
                  companyUrl?: string | null;
                  companySlug?: string | null;
                  companyName?: string | null;
                  confidence?: number;
                  reasoning?: string;
                  candidates?: CompanyCandidate[];
                }
              };
              if (data.data?.companyUrl) {
                await navigate(data.data.companyUrl);
                await sleep(2000);
                companyId = await tryExtractId();
                resolvedName = data.data.companyName ?? companyName;
                resolvedSlug = data.data.companySlug ?? resolvedSlug;
              } else if (data.data?.candidates) {
                // Low-confidence — surface picker through the orchestrator's
                // error path. Caller (popup) can read needsPicker + candidates.
                await detach();
                return {
                  ok: false,
                  needsPicker: true,
                  candidates: data.data.candidates,
                  reasoning: data.data.reasoning,
                  error: `Need user to pick which "${companyName}" they meant`,
                };
              }
            }
          }
        }

        if (!companyId) {
          await detach();
          return { ok: false, error: `Could not find company "${companyName}" on LinkedIn` };
        }

        // Step 2: Search profiles with company ID + school ID + optional filters
        const params = new URLSearchParams();
        params.set("currentCompany", `["${companyId}"]`);
        if (schoolId) params.set("schoolFilter", `["${schoolId}"]`);
        if (locationGeoUrn) params.set("geoUrn", `["${locationGeoUrn}"]`);
        // function filter goes in keywords (LinkedIn's industry filter is brittle)
        if (functionKeywords) params.set("keywords", functionKeywords);
        const searchUrl = `https://www.linkedin.com/search/results/people/?${params.toString()}`;

        console.debug("[CDP] Searching profiles:", searchUrl);
        await navigate(searchUrl);
        await sleep(3000);

        const profiles = await evaluate<Array<{ name: string; url: string }>>(
          `(() => {
            const seen = new Set();
            const results = [];
            const links = document.querySelectorAll('a[href*="linkedin.com/in/"]');
            for (const a of links) {
              const url = a.href.split('?')[0];
              if (!url.includes('/in/')) continue;
              if (seen.has(url)) continue;
              const text = a.innerText.trim();
              if (text.length < 2) continue;

              // Skip mutual connection links:
              // Their parent/grandparent container text contains "mutual connection"
              const parentText = (a.parentElement?.parentElement?.innerText ?? '').toLowerCase();
              if (parentText.includes('mutual connection') || parentText.includes('mutual connections')) continue;

              // Real search results have a connection degree nearby (1st, 2nd, 3rd+)
              // and the link text is just the name (short, no "mutual" keyword)
              if (text.toLowerCase().includes('mutual')) continue;

              const name = text.split('\\n')[0].trim();
              if (name.length > 50 || name.length < 3) continue;

              seen.add(url);
              results.push({ name, url });
            }
            return results;
          })()`
        );

        if (profiles.length === 0) {
          // Zero results — most often this means we picked the wrong company
          // entity (e.g., Bain & Company Brasil when the user meant the parent
          // Bain & Company). If we have the original candidate list from the
          // LLM resolver, surface the picker so the user can correct without
          // restarting from scratch. The failed slug gets marked so they
          // don't pick it again.
          await detach();
          if (resolveCandidates.length > 0) {
            return {
              ok: false,
              needsPicker: true,
              candidates: resolveCandidates,
              failedSlug: resolvedSlug,
              reasoning: `Tried ${resolvedName} but found 0 alumni matching your filters. Pick a different company:`,
              error: `Zero alumni at "${resolvedName}" with these filters`,
            };
          }
          // No candidates available (e.g., presetSlug path with no LLM call)
          // — fall back to the old behavior: report 0-saved as a success.
          return { ok: true, companyId, companyName: resolvedName, profiles: [], count: 0, saved: 0 };
        }

        // Layer 3: cache-on-pick. If we got here via presetSlug (user picked
        // from the disambiguation picker) AND people-search returned actual
        // results, the user's pick is ground truth. Write it to the cache so
        // next discovery for the same (companyName, userContext) tuple skips
        // the LLM call entirely and goes straight to the right company.
        // Fire-and-forget — failures here don't block discovery.
        if (presetSlug && profiles.length > 0) {
          const cacheBackend = DEFAULT_BACKEND_URL;
          fetch(`${cacheBackend}/api/discovery/resolve-company`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              companyName,
              userContext,
              forceSlug: presetSlug,
              forceName: resolvedName,
              forceReasoning: "User-picked from disambiguation picker",
            }),
          }).catch((err) => {
            console.warn("[CDP] Cache-on-pick write failed (non-fatal):", err);
          });
        }

        // Step 3: Visit each profile, extract data, save to backend
        const saved: Array<{ name: string; url: string; id: string }> = [];
        const errors: string[] = [];

        for (let i = 0; i < profiles.length; i++) {
          const profileUrl = profiles[i].url;
          console.debug(`[CDP] Visiting profile ${i + 1}/${profiles.length}:`, profileUrl);

          // Broadcast progress
          chrome.runtime.sendMessage({
            type: "SESSION_PROGRESS",
            data: { profilesVisited: i, profilesDiscovered: saved.length, total: profiles.length, state: "VISITING_PROFILE" },
          }).catch(() => {});

          try {
            // Ensure CDP session is alive — re-attach if it dropped
            let activeTabId = getActiveTabId();
            if (!activeTabId) {
              console.debug("[CDP] Session lost, re-attaching...");
              const tabs = await chrome.tabs.query({ url: "*://www.linkedin.com/*" });
              if (tabs.length > 0 && tabs[0].id) {
                // Detach first in case old session is still attached at Chrome level
                try { await chrome.debugger.detach({ tabId: tabs[0].id }); } catch { /* not attached */ }
                await attachToTab(tabs[0].id);
                activeTabId = tabs[0].id;
              } else {
                errors.push(`[${profiles[i].name}] CDP session lost, no LinkedIn tab`);
                break;
              }
            }

            // Force the LinkedIn tab to be active
            if (activeTabId) {
              await chrome.tabs.update(activeTabId, { active: true });
            }

            // Navigate to profile
            await navigate(profileUrl);
            await sleep(3000);

            // Force tab active again after navigation (in case focus shifted)
            if (activeTabId) {
              await chrome.tabs.update(activeTabId, { active: true });
            }

            // Scroll using real mouse wheel events (triggers LinkedIn's lazy loading)
            for (let s = 0; s < 12; s++) {
              await mouseWheel(400);
              await sleep(300);
            }
            // Wait for lazy content (Experience/Education) to render
            await sleep(3000);

            // Verify Experience section loaded
            let hasExperience = await evaluate<boolean>(
              `(document.querySelector('main')?.innerText ?? '').includes('Experience')`
            );

            if (!hasExperience) {
              // Retry: scroll back to top, then scroll down again slower
              console.debug("[CDP] Experience not found, retrying scroll...");
              await evaluate<void>("window.scrollTo(0, 0)");
              await sleep(1000);
              for (let s = 0; s < 15; s++) {
                await mouseWheel(300);
                await sleep(500);
              }
              await sleep(3000);
              hasExperience = await evaluate<boolean>(
                `(document.querySelector('main')?.innerText ?? '').includes('Experience')`
              );
            }

            if (!hasExperience) {
              console.warn("[CDP] Could not load Experience section for:", profileUrl);
            }

            // Extract relevant sections only (header + Experience + Education)
            // instead of full page text — avoids truncation that cuts off Experience
            const rawData = await evaluate<{
              pageText: string;
              avatar: string | null;
              linkedinUrl: string;
            }>(`(() => {
              const main = document.querySelector('main');
              if (!main) return null;
              const fullText = main.innerText;
              const lines = fullText.split('\\n');

              // Extract header (first ~30 lines — name, headline, location)
              const header = lines.slice(0, 30).join('\\n');

              // Extract section between two headings
              function getSection(startHeading, stopHeadings) {
                const startIdx = lines.findIndex(l => l.trim() === startHeading);
                if (startIdx === -1) return '';
                const result = [startHeading];
                for (let i = startIdx + 1; i < lines.length; i++) {
                  if (stopHeadings.includes(lines[i].trim())) break;
                  result.push(lines[i]);
                }
                return result.join('\\n');
              }

              const expSection = getSection('Experience', ['Education', 'Skills', 'Languages', 'Licenses & certifications', 'Certifications', 'Courses', 'Projects', 'Volunteering']);
              const eduSection = getSection('Education', ['Skills', 'Languages', 'Licenses & certifications', 'Certifications', 'Courses', 'Projects', 'Volunteering']);

              const pageText = [header, expSection, eduSection].filter(Boolean).join('\\n\\n---\\n\\n');

              let avatar = null;
              const photoAnchor = document.querySelector('[aria-label="Profile photo"]');
              if (photoAnchor) {
                const img = photoAnchor.querySelector('img') || photoAnchor.closest('div')?.querySelector('img') || photoAnchor.parentElement?.querySelector('img');
                if (img?.src?.includes('media.licdn.com')) avatar = img.src;
              }
              if (!avatar) {
                const mainImgs = main.querySelectorAll('img[src*="media.licdn.com"]');
                if (mainImgs[0]) avatar = mainImgs[0].src;
              }

              return { pageText, avatar, linkedinUrl: window.location.href.split('?')[0] };
            })()`);

            if (!rawData?.pageText) {
              errors.push(`[${profiles[i].name}] No page text extracted`);
              continue;
            }

            // Diagnostic info — will be shown in popup
            const textLen = rawData.pageText.length;
            const hasExp = rawData.pageText.includes("Experience");
            const hasEdu = rawData.pageText.includes("Education");
            const diagPrefix = `[${profiles[i].name}] ${textLen} chars, Exp:${hasExp}, Edu:${hasEdu}`;

            // Send section text to MiniMax for extraction
            const backendUrl = DEFAULT_BACKEND_URL;
            let extractRes: Response;
            try {
              extractRes = await fetch(`${backendUrl}/api/discovery/extract`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ pageText: rawData.pageText }),
              });
            } catch (fetchErr) {
              errors.push(`${diagPrefix} → fetch error: ${String(fetchErr)}`);
              continue;
            }

            if (!extractRes.ok) {
              const errText = await extractRes.text().catch(() => "");
              errors.push(`${diagPrefix} → API ${extractRes.status}: ${errText.slice(0, 100)}`);
              continue;
            }

            const extractData = await extractRes.json() as {
              data?: {
                name: string;
                headline: string | null;
                location: string | null;
                experiences: Array<{ title: string; company: string; duration: string }>;
                educations: Array<{ school: string; degree: string; dates?: string }>;
              };
            };

            const finalData = extractData.data;

            if (!finalData?.name) {
              errors.push(`${diagPrefix} → MiniMax returned no name`);
              continue;
            }

            const expCount = finalData.experiences?.length ?? 0;
            const eduCount = finalData.educations?.length ?? 0;

            // Save via existing bookmarkProfile API
            const contact = await bookmarkProfile({
              linkedin_url: rawData.linkedinUrl,
              name: finalData.name,
              headline: finalData.headline || "",
              current_title: finalData.experiences[0] ?? { title: "Unknown", company: "Unknown", duration: "Unknown" },
              previous_roles: finalData.experiences.slice(1),
              education: finalData.educations,
              location: finalData.location || "",
              ...(rawData.avatar ? { avatar: rawData.avatar } : {}),
              mutual_connections: 0,
              captured_at: new Date().toISOString(),
              source_session_id: null,
            });

            if (contact) {
              saved.push({ name: finalData.name, url: rawData.linkedinUrl, id: contact.id });
              errors.push(`${diagPrefix} → minimax: ${expCount} exp, ${eduCount} edu → SAVED`);
            } else {
              errors.push(`${diagPrefix} → minimax: ${expCount} exp, ${eduCount} edu → save failed`);
            }
          } catch (profileErr) {
            console.error(`[CDP] Error visiting ${profileUrl}:`, profileErr);
            errors.push(`Error: ${profileUrl} — ${String(profileErr)}`);
          }

          // Human-like delay before next profile (15-45 seconds)
          if (i < profiles.length - 1) {
            const delay = 15000 + Math.random() * 30000;
            console.debug(`[CDP] Waiting ${(delay / 1000).toFixed(0)}s before next profile...`);
            await sleep(delay);
          }
        }

        // Step 4: Rank the saved candidates in a single LLM call. Uses
        // profile_md + comparative reasoning so the popup can show "picked
        // because: shared INSEAD class, same Bain → growth VC pivot..."
        // rather than opaque scores. Non-fatal — discovery succeeds even
        // if ranking fails.
        let rankings: BatchRankResult[] = [];
        if (saved.length > 0) {
          try {
            chrome.runtime.sendMessage({
              type: "SESSION_PROGRESS",
              data: { profilesVisited: profiles.length, profilesDiscovered: saved.length, total: profiles.length, state: "RANKING" },
            }).catch(() => {});

            rankings = await rankContactsBatch(
              saved.map((s) => s.id),
              Math.min(saved.length, 10)
            );
            console.debug(`[CDP] Ranked ${rankings.length} contacts`);
          } catch (rankErr) {
            console.warn("[CDP] Rank batch threw:", rankErr);
          }
        }

        // Broadcast completion
        chrome.runtime.sendMessage({
          type: "SESSION_PROGRESS",
          data: {
            profilesVisited: profiles.length,
            profilesDiscovered: saved.length,
            total: profiles.length,
            state: "COMPLETED",
            rankings,
          },
        }).catch(() => {});

        await detach();

        return {
          ok: true,
          companyId,
          companyName: resolvedName,
          profiles,
          count: profiles.length,
          saved: saved.length,
          savedProfiles: saved,
          rankings,
          errors: errors.length > 0 ? errors : undefined,
        };
      } catch (err) {
        await detach().catch(() => {});
        return { ok: false, error: String(err) };
      }
    }

    default:
      console.warn("[SW] Unknown message type:", message.type);
      return null;
  }
}

// ---------------------------------------------------------------------------
// Keep-alive alarm (belt-and-suspenders)
// ---------------------------------------------------------------------------

chrome.alarms.create("keepAlive", { periodInMinutes: 0.4 }); // ~24 s

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "keepAlive") {
    // Intentional no-op — receiving the alarm event reactivates the SW
  }
});

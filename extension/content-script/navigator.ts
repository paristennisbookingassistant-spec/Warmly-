/**
 * content-script/navigator.ts
 * LinkedIn navigation helpers for the discovery orchestrator.
 *
 * Responsibilities:
 * - Construct and navigate to LinkedIn search URLs with filters
 * - Wait for page elements with MutationObserver + timeout
 * - Scroll to trigger lazy-loading and detect new content
 * - Click "Next" pagination buttons organically
 * - Navigate to and wait for individual profile pages
 *
 * All user-facing clicks pass through behavior-sim.ts.
 */

import { organicClick, waitShort, jitterDelay } from "./behavior-sim";
import { SELECTORS } from "../shared/constants";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SearchFilters {
  industry?: string;
  location?: string;
  /** "F" = 1st, "S" = 2nd, "O" = 3rd+ */
  connectionDegree?: "F" | "S" | "O";
  /** LinkedIn numeric company ID for structured filter search */
  companyId?: string;
  /** LinkedIn numeric school ID (e.g. INSEAD = 5176) */
  schoolId?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Polls the DOM every 500 ms until one of the given selectors matches.
 * Returns the matching element, or null on timeout.
 */
export async function waitForSelector(
  selectors: string[],
  timeoutMs = 10_000
): Promise<Element | null> {
  const deadline = Date.now() + timeoutMs;

  return new Promise((resolve) => {
    const poll = () => {
      for (const sel of selectors) {
        try {
          const el = document.querySelector(sel);
          if (el) {
            resolve(el);
            return;
          }
        } catch {
          // Bad selector — skip
        }
      }

      if (Date.now() >= deadline) {
        resolve(null);
        return;
      }

      setTimeout(poll, 500);
    };

    poll();
  });
}

/**
 * Returns true if the current page appears to be a LinkedIn login wall.
 */
export function isLoginWall(): boolean {
  return (
    window.location.href.includes("/login") ||
    window.location.href.includes("/authwall") ||
    document.querySelector(".join-form") !== null ||
    document.querySelector("form#emailForm") !== null
  );
}

// ---------------------------------------------------------------------------
// Search navigation
// ---------------------------------------------------------------------------

/**
 * Navigates to LinkedIn people search with the given query and optional filters.
 *
 * Supports two modes:
 * 1. Structured filter search (preferred): companyId + schoolId → exact filter URL
 * 2. Keyword search (fallback): free-text query
 */
export async function searchLinkedIn(
  query: string,
  filters?: SearchFilters
): Promise<void> {
  let url: string;

  if (filters?.companyId) {
    // Structured filter URL — much more targeted than keyword search
    const params = new URLSearchParams();
    params.set("currentCompany", `["${filters.companyId}"]`);
    if (filters.schoolId) {
      params.set("schoolFilter", `["${filters.schoolId}"]`);
    }
    if (filters.connectionDegree) {
      params.set("network[]", filters.connectionDegree);
    }
    url = `https://www.linkedin.com/search/results/people/?${params.toString()}`;
  } else {
    // Keyword search fallback
    const params = new URLSearchParams();
    params.set("keywords", query);
    params.set("origin", "GLOBAL_SEARCH_HEADER");
    if (filters?.connectionDegree) params.set("network[]", filters.connectionDegree);
    if (filters?.location) params.set("geoUrn", filters.location);
    if (filters?.industry) params.set("industry", filters.industry);
    url = `https://www.linkedin.com/search/results/people/?${params.toString()}`;
  }

  console.debug("[Navigator] Searching:", url);
  window.location.href = url;

  // Wait for search results page to load (use main element, not CSS selectors)
  await waitForSelector(["main"], 12_000);
  // Extra wait for results to render
  await jitterDelay(3000, 30);
}

/**
 * Extracts the numeric LinkedIn company ID from a company page.
 * Navigate to the company page first, then call this.
 * Returns null if extraction fails.
 */
export function extractCompanyId(): string | null {
  const match = document.documentElement.innerHTML.match(
    /fsd_company[%3A:]+(\d{5,12})/
  );
  return match?.[1] ?? null;
}

/**
 * Navigates to a company's LinkedIn page and extracts its numeric ID.
 */
export async function getCompanyId(companySlug: string): Promise<string | null> {
  const url = `https://www.linkedin.com/company/${companySlug}/`;
  window.location.href = url;
  await waitForSelector(["main"], 10_000);
  await jitterDelay(2000, 30);
  return extractCompanyId();
}

// ---------------------------------------------------------------------------
// Search results collection
// ---------------------------------------------------------------------------

/**
 * Collects valid LinkedIn profile URLs from the current search results page.
 * Uses href attribute matching (NOT CSS classes) — stable across LinkedIn redesigns.
 */
export function collectProfileUrlsFromSearchResults(): string[] {
  const seen = new Set<string>();
  const urls: string[] = [];

  const links = Array.from(
    document.querySelectorAll<HTMLAnchorElement>('a[href*="linkedin.com/in/"]')
  );

  for (const link of links) {
    const url = link.href?.split("?")[0];
    if (!url?.includes("/in/")) continue;
    if (seen.has(url)) continue;

    // Filter out noise: mutual connection links, nav links, etc.
    const text = link.innerText?.trim() ?? "";
    if (text.length < 3) continue;
    if (text.includes("mutual")) continue;

    seen.add(url);
    urls.push(url);
  }

  return urls;
}

// ---------------------------------------------------------------------------
// Lazy-load trigger
// ---------------------------------------------------------------------------

/**
 * Scrolls to the bottom to trigger lazy loading and waits for new content.
 * Returns true if new result nodes appeared, false if nothing changed.
 */
export async function scrollToLoadMore(): Promise<boolean> {
  const countBefore = document.querySelectorAll(
    SELECTORS.search.results[0]
  ).length;

  // Scroll to bottom in a natural pattern
  window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
  await jitterDelay(1500, 30);

  // Poll for new content (up to 5 s)
  const deadline = Date.now() + 5_000;
  while (Date.now() < deadline) {
    const countAfter = document.querySelectorAll(
      SELECTORS.search.results[0]
    ).length;
    if (countAfter > countBefore) return true;
    await waitShort();
  }

  return false;
}

// ---------------------------------------------------------------------------
// Profile navigation
// ---------------------------------------------------------------------------

/**
 * Navigates to a LinkedIn profile URL and waits until the page renders.
 * Uses `main` element presence (stable) instead of CSS class selectors (broken on 2025 LinkedIn).
 */
export async function navigateToProfile(url: string): Promise<void> {
  window.location.href = url;
  const el = await waitForSelector(["main"], 10_000);
  if (!el) {
    console.warn(`[Navigator] Profile did not load within timeout: ${url}`);
  }
  // Extra wait for SPA content to render inside main
  await jitterDelay(2000, 30);
}

/**
 * Waits for the profile page to fully load.
 * Returns true when ready, false on timeout.
 */
export function waitForProfileLoad(): Promise<boolean> {
  return waitForSelector(["main"], 10_000).then((el) => el !== null);
}

// ---------------------------------------------------------------------------
// Pagination
// ---------------------------------------------------------------------------

/**
 * Clicks the "Next" pagination button and waits for new results.
 * Uses aria-label (stable) instead of CSS class selectors.
 * Returns true if navigation succeeded, false if no next page.
 */
export async function goToNextPage(): Promise<boolean> {
  // Try aria-label first (most stable), then CSS selectors as fallback
  const nextBtn =
    document.querySelector<HTMLButtonElement>('button[aria-label="Next"]') ??
    document.querySelector<HTMLButtonElement>('button[aria-label="Forward"]');

  if (nextBtn && !nextBtn.disabled && !nextBtn.hasAttribute("aria-disabled")) {
    await organicClick(nextBtn);
    await waitForSelector(["main"], 8_000);
    await jitterDelay(2000, 30);
    return true;
  }

  return false;
}

/**
 * Backward-compatible alias used by the existing orchestrator.
 */
export async function goToNextResultsPage(): Promise<boolean> {
  return goToNextPage();
}

// ---------------------------------------------------------------------------
// Misc backward-compatible exports
// ---------------------------------------------------------------------------

/**
 * Navigates to a company people search page.
 * Used by the existing orchestrator.
 */
export async function navigateToCompanySearch(
  companyName: string,
  keywords: string[]
): Promise<boolean> {
  try {
    const query = [companyName, ...keywords].join(" ");
    await searchLinkedIn(query);
    return true;
  } catch {
    return false;
  }
}

/**
 * Waits the standard inter-profile delay.
 * Delegates to behavior-sim for randomised timing.
 */
export async function waitBeforeNextProfile(): Promise<void> {
  const { humanDelay } = await import("./behavior-sim");
  await humanDelay();
}

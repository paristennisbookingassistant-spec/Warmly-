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
 * LinkedIn search URL structure:
 *   /search/results/people/?keywords=…&network[]=F&network[]=S&geoUrn=…&industry=…
 */
export async function searchLinkedIn(
  query: string,
  filters?: SearchFilters
): Promise<void> {
  const params = new URLSearchParams();
  params.set("keywords", query);
  params.set("origin", "GLOBAL_SEARCH_HEADER");

  if (filters?.connectionDegree) {
    // LinkedIn uses network[] parameter for connection degree filters
    params.set("network[]", filters.connectionDegree);
  }

  if (filters?.location) {
    // Free-text location filter — LinkedIn also supports geoUrn but that requires ID lookup
    params.set("geoUrn", filters.location);
  }

  if (filters?.industry) {
    params.set("industry", filters.industry);
  }

  const url = `https://www.linkedin.com/search/results/people/?${params.toString()}`;
  window.location.href = url;

  // Wait for search results to appear
  await waitForSelector(Array.from(SELECTORS.search.results), 12_000);
}

// ---------------------------------------------------------------------------
// Search results collection
// ---------------------------------------------------------------------------

/**
 * Collects valid LinkedIn profile URLs from the current search results page.
 * Backward-compatible wrapper — returns just the URL strings.
 */
export function collectProfileUrlsFromSearchResults(): string[] {
  const urls: string[] = [];

  for (const sel of SELECTORS.search.resultLink) {
    try {
      const links = Array.from(
        document.querySelectorAll<HTMLAnchorElement>(sel)
      );
      for (const link of links) {
        const url = link.href?.split("?")[0];
        if (url?.includes("/in/") && !urls.includes(url)) {
          urls.push(url);
        }
      }
      if (urls.length > 0) break;
    } catch {
      // Skip bad selectors
    }
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
 * Navigates to a LinkedIn profile URL and waits until the name element appears.
 * Timeout: 10 s.
 */
export async function navigateToProfile(url: string): Promise<void> {
  window.location.href = url;
  const el = await waitForSelector(Array.from(SELECTORS.profile.name), 10_000);
  if (!el) {
    console.warn(`[Navigator] Profile did not load within timeout: ${url}`);
  }
}

/**
 * Waits for the profile page to fully load.
 * Returns true when ready, false on timeout.
 * Backward-compatible alias.
 */
export function waitForProfileLoad(): Promise<boolean> {
  return waitForSelector(
    Array.from(SELECTORS.profile.name),
    10_000
  ).then((el) => el !== null);
}

// ---------------------------------------------------------------------------
// Pagination
// ---------------------------------------------------------------------------

/**
 * Clicks the "Next" pagination button and waits for new results.
 * Returns true if navigation succeeded, false if no next page.
 */
export async function goToNextPage(): Promise<boolean> {
  for (const sel of SELECTORS.search.nextButton) {
    try {
      const btn = document.querySelector<HTMLButtonElement>(sel);
      if (btn && !btn.disabled && !btn.hasAttribute("aria-disabled")) {
        await organicClick(btn);
        // Wait for the new page's results to appear
        await waitForSelector(Array.from(SELECTORS.search.results), 8_000);
        return true;
      }
    } catch {
      // Skip selector
    }
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

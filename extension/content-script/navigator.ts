/**
 * content-script/navigator.ts
 * LinkedIn navigation controller — executes search queries,
 * scrolls result pages, opens profiles, navigates back.
 * All navigation passes through behavior-sim.ts for human-like timing.
 */

import { organicClick, waitBetweenActions, waitShort } from "./behavior-sim";

/**
 * Navigates to a LinkedIn search page for a given company.
 * Returns true if navigation was successful.
 */
export async function navigateToCompanySearch(
  companyName: string,
  keywords: string[]
): Promise<boolean> {
  try {
    const query = encodeURIComponent(
      `${companyName} ${keywords.join(" ")}`
    );
    const searchUrl = `https://www.linkedin.com/search/results/people/?keywords=${query}&origin=GLOBAL_SEARCH_HEADER`;
    window.location.href = searchUrl;
    return true;
  } catch {
    return false;
  }
}

/**
 * Collects profile URLs from the current search results page.
 * Returns an array of LinkedIn profile URLs.
 */
export function collectProfileUrlsFromSearchResults(): string[] {
  const urls: string[] = [];

  // Multiple selectors for result link elements
  const selectors = [
    "a.app-aware-link[href*='/in/']",
    ".entity-result__title-text a[href*='/in/']",
    "[data-test-id*='search-result'] a[href*='/in/']",
  ];

  for (const sel of selectors) {
    const links = document.querySelectorAll<HTMLAnchorElement>(sel);
    if (links.length > 0) {
      links.forEach((link) => {
        const url = link.href.split("?")[0];
        if (url.includes("/in/") && !urls.includes(url)) {
          urls.push(url);
        }
      });
      if (urls.length > 0) break;
    }
  }

  return urls;
}

/**
 * Navigates to a specific LinkedIn profile URL.
 * Returns true when the page has loaded.
 */
export function navigateToProfile(profileUrl: string): Promise<boolean> {
  return new Promise((resolve) => {
    window.location.href = profileUrl;

    // Wait for navigation to complete
    const checkInterval = setInterval(() => {
      if (window.location.href.includes(profileUrl.split("?")[0])) {
        clearInterval(checkInterval);
        resolve(true);
      }
    }, 500);

    // Timeout after 15 seconds
    setTimeout(() => {
      clearInterval(checkInterval);
      resolve(false);
    }, 15_000);
  });
}

/**
 * Clicks the "Next" button on a search results page to go to the next page.
 * Returns true if a next page exists and was navigated to.
 */
export async function goToNextResultsPage(): Promise<boolean> {
  const nextButtonSelectors = [
    "button[aria-label='Next']",
    ".artdeco-pagination__button--next",
    "button.artdeco-button--icon-right",
  ];

  for (const sel of nextButtonSelectors) {
    const btn = document.querySelector<HTMLButtonElement>(sel);
    if (btn && !btn.disabled) {
      await waitShort();
      organicClick(btn);
      await new Promise((resolve) => setTimeout(resolve, 2000));
      return true;
    }
  }

  return false;
}

/**
 * Checks if the current page is a LinkedIn login wall.
 * If so, discovery should be paused and user notified.
 */
export function isLoginWall(): boolean {
  return (
    window.location.href.includes("/login") ||
    document.querySelector(".join-form") !== null ||
    document.querySelector("form#emailForm") !== null
  );
}

/**
 * Waits for the profile page to fully load (experience section visible).
 * Returns true when ready, false on timeout.
 */
export function waitForProfileLoad(): Promise<boolean> {
  return new Promise((resolve) => {
    const startTime = Date.now();

    const check = () => {
      const hasName = document.querySelector("h1");
      const hasContent = document.querySelector(
        "section#experience, section#education, .pv-text-details__left-panel"
      );

      if (hasName && hasContent) {
        resolve(true);
        return;
      }

      if (Date.now() - startTime > 10_000) {
        resolve(false);
        return;
      }

      setTimeout(check, 300);
    };

    check();
  });
}

/**
 * Waits for the current action delay between profiles.
 * Delegates to behavior-sim for randomized timing.
 */
export async function waitBeforeNextProfile(): Promise<void> {
  await waitBetweenActions();
}

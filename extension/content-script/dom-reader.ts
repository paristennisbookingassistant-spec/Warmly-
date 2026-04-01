/**
 * content-script/dom-reader.ts
 * Extracts profile and search-result data from LinkedIn DOM elements.
 *
 * Strategy: multi-selector fallback per field.
 * If the primary selector fails, each fallback is tried in order.
 * Graceful degradation — a null field never fails the whole extraction.
 * Minimum viable extraction: name + linkedin_url.
 *
 * See PRD Section 5.3 — DOM Fragility Mitigation.
 */

import type { ExtractedProfile, ExtractedRole, ExtractedEducation } from "../shared/types";
import { SELECTORS } from "../shared/constants";

// ---------------------------------------------------------------------------
// Public surface types
// ---------------------------------------------------------------------------

export interface SearchResult {
  linkedin_url: string;
  name: string;
  headline: string | null;
  company: string | null;
  connection_degree: string | null;
}

// ---------------------------------------------------------------------------
// Core helper: querySelector with fallback chain
// ---------------------------------------------------------------------------

/**
 * Tries each selector in order and returns the first matching Element, or null.
 * Invalid selectors are skipped silently.
 */
export function querySelector(selectors: readonly string[]): Element | null {
  for (const sel of selectors) {
    try {
      const el = document.querySelector(sel);
      if (el) return el;
    } catch {
      // Malformed selector — skip
    }
  }
  return null;
}

/**
 * Tries each selector in order and returns all matching elements from the
 * first selector that yields at least one result.
 */
function querySelectorAll(selectors: readonly string[]): Element[] {
  for (const sel of selectors) {
    try {
      const els = Array.from(document.querySelectorAll(sel));
      if (els.length > 0) return els;
    } catch {
      // Malformed selector — skip
    }
  }
  return [];
}

// ---------------------------------------------------------------------------
// Field extractors
// ---------------------------------------------------------------------------

function extractText(selectors: readonly string[]): string | null {
  const el = querySelector(selectors);
  const text = el?.textContent?.trim();
  return text || null;
}

function extractMutualConnections(): number {
  for (const sel of SELECTORS.profile.mutualConnections) {
    try {
      const el = document.querySelector(sel);
      if (el?.textContent) {
        const match = el.textContent.match(/(\d+)/);
        if (match) return parseInt(match[1], 10);
      }
    } catch {
      // continue
    }
  }
  return 0;
}

function extractAboutSnippet(): string | null {
  const el = querySelector(SELECTORS.profile.about);
  const text = el?.textContent?.trim();
  if (!text) return null;
  return text.slice(0, 500);
}

function extractAvatarUrl(): string | null {
  for (const sel of SELECTORS.profile.avatar) {
    try {
      const img = document.querySelector<HTMLImageElement>(sel);
      if (img?.src) return img.src;
    } catch {
      // continue
    }
  }
  return null;
}

/**
 * Extracts experience entries from the Experience section.
 */
function extractRoles(): { current: ExtractedRole; previous: ExtractedRole[] } {
  const unknownRole: ExtractedRole = { title: "Unknown", company: "Unknown", duration: "Unknown" };

  try {
    let section: Element | null = null;
    for (const sel of SELECTORS.profile.experienceSection) {
      section = document.querySelector(sel);
      if (section) break;
    }

    if (!section) return { current: unknownRole, previous: [] };

    const entries = Array.from(
      section.querySelectorAll("li.artdeco-list__item, li[class*='pvs-list__item']")
    );

    const roles: ExtractedRole[] = [];

    for (const entry of entries) {
      const titleEl =
        entry.querySelector("span[aria-hidden='true']:first-child") ??
        entry.querySelector(".mr1.t-bold span[aria-hidden='true']");
      const companyEl = entry.querySelector(".t-14.t-normal span[aria-hidden='true']");
      const durationEl = entry.querySelector(
        ".t-14.t-normal.t-black--light span[aria-hidden='true']"
      );

      if (titleEl?.textContent?.trim()) {
        roles.push({
          title: titleEl.textContent.trim(),
          company: companyEl?.textContent?.trim() ?? "Unknown",
          duration: durationEl?.textContent?.trim() ?? "Unknown",
        });
      }
    }

    if (roles.length === 0) return { current: unknownRole, previous: [] };
    return { current: roles[0], previous: roles.slice(1) };
  } catch (err) {
    console.warn("[DOM Reader] extractRoles error:", err);
    return { current: unknownRole, previous: [] };
  }
}

/**
 * Extracts education entries from the Education section.
 */
function extractEducation(): ExtractedEducation[] {
  try {
    let section: Element | null = null;
    for (const sel of SELECTORS.profile.educationSection) {
      section = document.querySelector(sel);
      if (section) break;
    }

    if (!section) return [];

    const entries = Array.from(
      section.querySelectorAll("li.artdeco-list__item, li[class*='pvs-list__item']")
    );

    const education: ExtractedEducation[] = [];

    for (const entry of entries) {
      const schoolEl = entry.querySelector("span[aria-hidden='true']:first-child");
      const degreeEl = entry.querySelector(".t-14.t-normal span[aria-hidden='true']");
      const datesEl = entry.querySelector(
        ".t-14.t-normal.t-black--light span[aria-hidden='true']"
      );

      if (schoolEl?.textContent?.trim()) {
        const degreeRaw = degreeEl?.textContent?.trim() ?? "";
        const [degree, field] = degreeRaw.split(",").map((s) => s.trim());
        education.push({
          school: schoolEl.textContent.trim(),
          degree: degree || "Unknown",
          field: field ?? undefined,
          dates: datesEl?.textContent?.trim() ?? undefined,
        });
      }
    }

    return education;
  } catch (err) {
    console.warn("[DOM Reader] extractEducation error:", err);
    return [];
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Returns true if the current page is a LinkedIn profile page (/in/ path).
 */
export function isProfilePage(): boolean {
  return /linkedin\.com\/in\/[^/]+/.test(window.location.href);
}

/**
 * Returns true if the current page is a LinkedIn people search results page.
 */
export function isSearchPage(): boolean {
  return window.location.href.includes("/search/results/people/");
}

/**
 * Extracts a full profile from the current LinkedIn profile page DOM.
 * Returns null if the minimum viable fields (name + URL) cannot be found.
 *
 * @param sessionId  The active discovery session ID to attach to the profile.
 */
export function extractProfile(sessionId: string | null = null): ExtractedProfile | null {
  try {
    const name = extractText(SELECTORS.profile.name);

    if (!name) {
      console.warn("[DOM Reader] Could not extract name — not a valid profile page");
      return null;
    }

    const linkedin_url = window.location.href.split("?")[0];
    const { current, previous } = extractRoles();

    return {
      linkedin_url,
      name,
      headline: extractText(SELECTORS.profile.headline) ?? "",
      current_role: current,
      previous_roles: previous,
      education: extractEducation(),
      location: extractText(SELECTORS.profile.location) ?? "",
      mutual_connections: extractMutualConnections(),
      captured_at: new Date().toISOString(),
      source_session_id: sessionId,
    };
  } catch (err) {
    console.error("[DOM Reader] Unexpected extraction error:", err);
    return null;
  }
}

/**
 * Backward-compatible alias used by the existing orchestrator.
 */
export function extractProfileFromDOM(sessionId: string | null): ExtractedProfile | null {
  return extractProfile(sessionId);
}

/**
 * Extracts all search results visible on the current search results page.
 * Filters out any result that lacks a valid /in/ profile URL.
 */
export function extractSearchResults(): SearchResult[] {
  try {
    const containers = querySelectorAll(SELECTORS.search.results);
    const results: SearchResult[] = [];

    for (const container of containers) {
      try {
        // Find profile link within this result container
        let profileUrl: string | null = null;
        for (const sel of SELECTORS.search.resultLink) {
          const link = container.querySelector<HTMLAnchorElement>(sel);
          if (link?.href?.includes("/in/")) {
            profileUrl = link.href.split("?")[0];
            break;
          }
        }

        // Skip results without a valid profile URL
        if (!profileUrl || !profileUrl.includes("/in/")) continue;

        // Extract name — try heading elements within the container
        const nameEl =
          container.querySelector("span[aria-hidden='true']") ??
          container.querySelector(".entity-result__title-text span:not(.visually-hidden)");
        const name = nameEl?.textContent?.trim() ?? null;
        if (!name) continue;

        // Headline
        const headlineEl = container.querySelector(
          ".entity-result__primary-subtitle span[aria-hidden='true'], " +
          ".entity-result__summary span[aria-hidden='true']"
        );

        // Company — try a secondary subtitle
        const companyEl = container.querySelector(
          ".entity-result__secondary-subtitle span[aria-hidden='true']"
        );

        // Connection degree
        const degreeEl = container.querySelector(
          ".dist-value, span[data-anonymize='degree-connection']"
        );

        results.push({
          linkedin_url: profileUrl,
          name,
          headline: headlineEl?.textContent?.trim() ?? null,
          company: companyEl?.textContent?.trim() ?? null,
          connection_degree: degreeEl?.textContent?.trim() ?? null,
        });
      } catch (inner) {
        console.warn("[DOM Reader] Failed to extract individual search result:", inner);
      }
    }

    return results;
  } catch (err) {
    console.error("[DOM Reader] extractSearchResults error:", err);
    return [];
  }
}

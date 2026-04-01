/**
 * content-script/dom-reader.ts
 * Extracts profile data from LinkedIn DOM elements.
 *
 * Strategy: multi-selector fallback per field.
 * If primary selector fails, try fallbacks in order.
 * Gracefully degrade — null is acceptable for non-critical fields.
 * Minimum viable extraction: name + linkedin_url.
 *
 * See PRD Section 5.3 — DOM Fragility Mitigation.
 */

import type { ExtractedProfile, ExtractedRole, ExtractedEducation } from "../shared/types";

/**
 * Selector configuration — JSON map of field → selector list.
 * Update selectors here without touching extraction logic.
 * Version this config so selector updates can be pushed without code deploys.
 */
const SELECTORS = {
  name: [
    "h1.text-heading-xlarge",
    "h1[class*='artdeco-entity-lockup__title']",
    ".pv-text-details__left-panel h1",
    "h1",
  ],
  headline: [
    ".text-body-medium.break-words",
    "[data-generated-suggestion-target*='headline']",
    ".pv-text-details__left-panel .text-body-medium",
  ],
  location: [
    ".text-body-small.inline.t-black--light.break-words",
    "[class*='pv-text-details__left-panel'] span.text-body-small",
  ],
  experience_section: [
    "section#experience",
    "[data-section='experience']",
    "section[aria-label*='Experience']",
  ],
  education_section: [
    "section#education",
    "[data-section='education']",
    "section[aria-label*='Education']",
  ],
  mutual_connections: [
    "[data-test-id*='mutual-connections']",
    ".pv-member-badge a",
    "a[href*='facets=network']",
  ],
};

/**
 * Extracts a text value using a list of selectors, trying each in order.
 * Returns null if no selector matches.
 */
function extractText(selectors: string[]): string | null {
  for (const selector of selectors) {
    try {
      const el = document.querySelector(selector);
      if (el?.textContent?.trim()) {
        return el.textContent.trim();
      }
    } catch {
      // Invalid selector — continue to next
    }
  }
  return null;
}

/**
 * Extracts experience entries from the Experience section.
 * Returns an empty array if the section cannot be found.
 */
function extractRoles(): { current: ExtractedRole; previous: ExtractedRole[] } {
  const defaultRole: ExtractedRole = {
    title: "Unknown",
    company: "Unknown",
    duration: "Unknown",
  };

  try {
    let section: Element | null = null;
    for (const sel of SELECTORS.experience_section) {
      section = document.querySelector(sel);
      if (section) break;
    }

    if (!section) return { current: defaultRole, previous: [] };

    // Each experience entry is typically an <li> within the section
    const entries = section.querySelectorAll("li.artdeco-list__item, li[class*='pvs-list__item']");
    const roles: ExtractedRole[] = [];

    entries.forEach((entry) => {
      const titleEl = entry.querySelector("span[aria-hidden='true']:first-child, .mr1.t-bold span");
      const companyEl = entry.querySelector(".t-14.t-normal span[aria-hidden='true']");
      const durationEl = entry.querySelector(".t-14.t-normal.t-black--light span[aria-hidden='true']");

      if (titleEl) {
        roles.push({
          title: titleEl.textContent?.trim() ?? "Unknown",
          company: companyEl?.textContent?.trim() ?? "Unknown",
          duration: durationEl?.textContent?.trim() ?? "Unknown",
        });
      }
    });

    if (roles.length === 0) return { current: defaultRole, previous: [] };
    return { current: roles[0], previous: roles.slice(1) };
  } catch {
    return { current: defaultRole, previous: [] };
  }
}

/**
 * Extracts education entries from the Education section.
 */
function extractEducation(): ExtractedEducation[] {
  try {
    let section: Element | null = null;
    for (const sel of SELECTORS.education_section) {
      section = document.querySelector(sel);
      if (section) break;
    }

    if (!section) return [];

    const entries = section.querySelectorAll("li.artdeco-list__item, li[class*='pvs-list__item']");
    const education: ExtractedEducation[] = [];

    entries.forEach((entry) => {
      const schoolEl = entry.querySelector("span[aria-hidden='true']:first-child");
      const degreeEl = entry.querySelector(".t-14.t-normal span[aria-hidden='true']");
      const datesEl = entry.querySelector(".t-14.t-normal.t-black--light span[aria-hidden='true']");

      if (schoolEl) {
        const degreeText = degreeEl?.textContent?.trim() ?? "";
        const [degree, field] = degreeText.split(",").map((s) => s.trim());
        education.push({
          school: schoolEl.textContent?.trim() ?? "Unknown",
          degree: degree ?? "Unknown",
          field: field,
          dates: datesEl?.textContent?.trim(),
        });
      }
    });

    return education;
  } catch {
    return [];
  }
}

/**
 * Extracts mutual connections count.
 * Returns 0 if not determinable.
 */
function extractMutualConnections(): number {
  for (const sel of SELECTORS.mutual_connections) {
    try {
      const el = document.querySelector(sel);
      if (el?.textContent) {
        const match = el.textContent.match(/(\d+)/);
        if (match) return parseInt(match[1], 10);
      }
    } catch {
      // Continue
    }
  }
  return 0;
}

/**
 * Main extraction function.
 * Call this from orchestrator.ts when a profile page is loaded.
 */
export function extractProfileFromDOM(
  sessionId: string | null
): ExtractedProfile | null {
  try {
    const name = extractText(SELECTORS.name);

    // name is the minimum viable field — abort if missing
    if (!name) {
      console.warn("[DOM Reader] Could not extract name — aborting profile extraction");
      return null;
    }

    const { current, previous } = extractRoles();

    return {
      linkedin_url: window.location.href.split("?")[0],
      name,
      headline: extractText(SELECTORS.headline) ?? "",
      current_role: current,
      previous_roles: previous,
      education: extractEducation(),
      location: extractText(SELECTORS.location) ?? "",
      mutual_connections: extractMutualConnections(),
      captured_at: new Date().toISOString(),
      source_session_id: sessionId,
    };
  } catch (err) {
    console.error("[DOM Reader] Unexpected extraction error:", err);
    return null;
  }
}

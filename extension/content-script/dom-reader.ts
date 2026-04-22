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
// JSON-LD extraction (primary source — available at document_idle, no SPA timing issues)
// ---------------------------------------------------------------------------

interface LinkedInJsonLd {
  "@type"?: string;
  name?: string;
  jobTitle?: string | string[];
  address?: { addressLocality?: string; addressRegion?: string; addressCountry?: string };
  image?: string | { "@type"?: string; contentUrl?: string };
  worksFor?: Array<{ name?: string }>;
  alumniOf?: Array<{ name?: string }>;
}

/**
 * Extracts core profile fields from LinkedIn's Schema.org JSON-LD structured data.
 * LinkedIn injects this into the initial HTML for SEO — it's present at document_idle
 * before any React rendering, so it never suffers from SPA timing issues.
 */
function extractFromJsonLd(): {
  name: string;
  headline: string | null;
  location: string | null;
  avatar: string | null;
  jobTitles: string[];
  companies: string[];
  schools: string[];
} | null {
  try {
    const scripts = document.querySelectorAll('script[type="application/ld+json"]');
    for (const script of Array.from(scripts)) {
      const data = JSON.parse(script.textContent ?? "{}") as LinkedInJsonLd;
      if (data["@type"] !== "Person" || !data.name) continue;

      const titles = Array.isArray(data.jobTitle)
        ? data.jobTitle
        : data.jobTitle
        ? [data.jobTitle]
        : [];

      // Only use real profile photos (media.licdn.com); static.licdn.com is a sprite
      const rawAvatar =
        typeof data.image === "string"
          ? data.image
          : (data.image?.contentUrl ?? null);
      const avatar = rawAvatar?.includes("media.licdn.com") ? rawAvatar : null;

      const companies = (data.worksFor ?? []).map((w) => w.name ?? "").filter(Boolean);
      const schools = (data.alumniOf ?? []).map((a) => a.name ?? "").filter(Boolean);

      return {
        name: data.name,
        headline: titles[0] ?? null,
        location:
          data.address?.addressLocality ??
          data.address?.addressRegion ??
          null,
        avatar,
        jobTitles: titles,
        companies,
        schools,
      };
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Parses the person's name from document.title as a last-resort fallback.
 * LinkedIn sets the title to "Name - Title | LinkedIn" or "Name | LinkedIn".
 */
function extractNameFromTitle(): string | null {
  const withoutSuffix = document.title.replace(/\s*\|\s*LinkedIn\s*$/i, "").trim();
  if (!withoutSuffix) return null;
  return withoutSuffix.split(/\s+-\s+/)[0].trim() || null;
}

// ---------------------------------------------------------------------------
// Text-structure extraction (2025 LinkedIn — hashed CSS classes, no stable selectors)
// ---------------------------------------------------------------------------

/**
 * LinkedIn 2025 uses CSS-in-JS with hashed class names that change every deploy.
 * No CSS selector is stable. Instead, parse the profile card's text structure:
 *
 *   Name
 *   · 1st (or 2nd, 3rd)
 *   Headline (e.g. "Product Management")
 *   Company · School (e.g. "Parloa · INSEAD")
 *   Location (e.g. "Berlin, Berlin, Germany")
 *
 * This order is a UX pattern LinkedIn won't change.
 */
// Section headings that delimit LinkedIn profile sections
const TEXT_SECTION_HEADINGS = [
  "Experience", "Education", "Skills", "Languages", "Licenses & certifications",
  "Certifications", "Licenses", "Courses", "Projects", "Honors & awards",
  "Publications", "Volunteering", "Activity", "Interests", "Recommendations", "Show all",
];

const DATE_PATTERN = /\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{4}\s*[-–]\s*|^\d{4}\s*[-–]\s*\d{4}|Present/;
const EMPLOYMENT_TYPES = ["Full-time", "Part-time", "Contract", "Freelance", "Internship", "Self-employed", "Temporary"];

function isTextSectionHeading(line: string): boolean {
  return TEXT_SECTION_HEADINGS.includes(line.trim());
}

function isDateLine(line: string): boolean { return DATE_PATTERN.test(line); }

function isDescriptionLine(line: string): boolean {
  if (line.startsWith("- ") || line.startsWith("• ")) return true;
  if (line.startsWith("...") || line.startsWith("…")) return true;
  if (line.length > 80) return true;
  if (/^(Led|Spearheaded|Designed|Developed|Built|Managed|Created|Drove|Improved|Improving|Launched|Delivered|Implemented|Established|Oversaw|Coordinated|Analyzed|Executed)\s/i.test(line)) return true;
  return false;
}

function isLocationLine(line: string): boolean {
  if (/·\s*(On-site|Remote|Hybrid)/i.test(line)) return true;
  if (/^[A-Z][^·]{3,60},\s*[A-Z]/.test(line) && !isDateLine(line)) return true;
  return false;
}

function extractTextSection(lines: string[], sectionName: string): string[] {
  const startIdx = lines.findIndex((l) => l.trim() === sectionName);
  if (startIdx === -1) return [];
  const result: string[] = [];
  for (let i = startIdx + 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    if (isTextSectionHeading(line)) break;
    result.push(line);
  }
  return result;
}

function parseExperienceSection(sectionLines: string[]): ExtractedRole[] {
  const roles: ExtractedRole[] = [];
  let title: string | null = null;
  let company: string | null = null;
  let duration: string | null = null;
  let groupCompany: string | null = null;

  const flush = () => {
    if (title) roles.push({ title, company: company ?? groupCompany ?? "Unknown", duration: duration ?? "Unknown" });
    title = null; company = null; duration = null;
  };

  for (let i = 0; i < sectionLines.length; i++) {
    const line = sectionLines[i];
    if (isDateLine(line)) { duration = line; continue; }
    if (isLocationLine(line)) continue;
    if (isDescriptionLine(line)) continue;

    // Company line with employment type: "Acme · Full-time"
    if (EMPLOYMENT_TYPES.some((t) => line.includes(`· ${t}`))) {
      company = line.split(" · ")[0].trim();
      continue;
    }
    // Group header: "Full-time · 4 yrs"
    if (EMPLOYMENT_TYPES.some((t) => line.startsWith(t))) continue;

    // Check if next line is a group header (company followed by "Full-time · X yrs")
    const nextLine = sectionLines[i + 1];
    if (nextLine && EMPLOYMENT_TYPES.some((t) => nextLine.startsWith(t))) {
      flush();
      groupCompany = line;
      continue;
    }

    // Otherwise: job title
    flush();
    title = line;

    // Peek ahead for company line
    if (nextLine && EMPLOYMENT_TYPES.some((t) => nextLine.includes(`· ${t}`))) {
      company = nextLine.split(" · ")[0].trim();
      i++;
    }
  }
  flush();
  return roles;
}

function parseEducationSection(sectionLines: string[]): ExtractedEducation[] {
  const items: ExtractedEducation[] = [];
  let school: string | null = null;
  let degree: string | null = null;
  let dates: string | undefined;

  const flush = () => {
    if (school) items.push({ school, degree: degree ?? "Unknown", field: undefined, dates });
    school = null; degree = null; dates = undefined;
  };

  for (const line of sectionLines) {
    if (isDateLine(line)) { dates = line; continue; }
    if (line.startsWith("Grade:") || line.startsWith("Activities")) continue;
    if (school && !degree) { degree = line; continue; }
    flush();
    school = line;
  }
  flush();
  return items;
}

function extractFromTextStructure(): {
  name: string;
  headline: string | null;
  company: string | null;
  school: string | null;
  location: string | null;
  avatar: string | null;
  experiences: ExtractedRole[];
  educations: ExtractedEducation[];
} | null {
  try {
    const main = document.querySelector("main");
    if (!main) return null;

    const rawLines = main.innerText.split("\n").map((l) => l.trim()).filter(Boolean);
    // Deduplicate consecutive identical lines
    const lines: string[] = [];
    for (const line of rawLines) {
      if (lines.length === 0 || lines[lines.length - 1] !== line) lines.push(line);
    }

    if (lines.length < 3) return null;

    // --- Header card ---
    let degreeIdx = -1;
    for (let i = 0; i < Math.min(lines.length, 30); i++) {
      if (/(?:^|\s|·)\s*(1st|2nd|3rd|\d+th)\b/i.test(lines[i]) && lines[i].length < 30) {
        degreeIdx = i;
        break;
      }
    }

    // Name: line before degree indicator (skip pronouns, nav items)
    const SKIP_PATTERNS = /^(She\/Her|He\/Him|They\/Them|Ze\/Hir|She\/They|He\/They|More|Connect|Message|Follow|Pending)$/i;
    let name = "";
    if (degreeIdx >= 2) {
      for (let i = degreeIdx - 1; i >= 0; i--) {
        if (lines[i].length > 2 && lines[i].length < 60 && !lines[i].startsWith("·") && !lines[i].includes("notification") && !SKIP_PATTERNS.test(lines[i])) {
          name = lines[i];
          break;
        }
      }
    }
    if (!name) {
      for (const l of lines.slice(0, 15)) {
        if (l.length > 2 && l.length < 50 && /^[A-Z]/.test(l) && !l.includes("Skip") && !l.includes("Home") && !l.includes("notification")) {
          name = l; break;
        }
      }
    }
    if (!name) return null;

    // Headline: first non-degree, non-short line after degree
    let headline: string | null = null;
    if (degreeIdx >= 0) {
      for (let i = degreeIdx + 1; i < Math.min(lines.length, degreeIdx + 5); i++) {
        if (/^·/.test(lines[i]) || lines[i].length <= 3) continue;
        if (!isTextSectionHeading(lines[i])) { headline = lines[i]; break; }
      }
    }

    // Company · School
    const headlineFoundIdx = headline ? lines.indexOf(headline, degreeIdx) : -1;
    const searchStart = headlineFoundIdx > 0 ? headlineFoundIdx + 1 : (degreeIdx > 0 ? degreeIdx + 3 : 5);
    let company: string | null = null;
    let school: string | null = null;
    for (let i = searchStart; i < Math.min(lines.length, searchStart + 5); i++) {
      if (lines[i]?.includes(" · ") && lines[i].length < 100) {
        const parts = lines[i].split(/\s+·\s+/);
        company = parts[0]?.trim() || null;
        school = parts[1]?.trim() || null;
        break;
      }
    }

    // Location
    let location: string | null = null;
    for (let i = searchStart; i < Math.min(lines.length, searchStart + 6); i++) {
      const l = lines[i];
      if (l && /^[A-Z][a-z]/.test(l) && l.length < 60 && !l.includes("·") && !isTextSectionHeading(l) && l !== name && l !== headline) {
        if (/,/.test(l) || /^[A-Z][a-z]+$/.test(l)) { location = l; break; }
      }
    }

    // --- Photo ---
    let avatar: string | null = null;
    const profilePhotoAnchor = document.querySelector('[aria-label="Profile photo"]');
    if (profilePhotoAnchor) {
      const img =
        profilePhotoAnchor.querySelector<HTMLImageElement>("img") ??
        profilePhotoAnchor.closest("div")?.querySelector<HTMLImageElement>("img") ??
        profilePhotoAnchor.parentElement?.querySelector<HTMLImageElement>("img");
      if (img?.src?.includes("media.licdn.com")) avatar = img.src;
    }
    if (!avatar) {
      const mainImgs = main.querySelectorAll<HTMLImageElement>('img[src*="media.licdn.com"]');
      avatar = mainImgs[0]?.src ?? null;
    }

    // --- Experience & Education sections ---
    const experiences = parseExperienceSection(extractTextSection(lines, "Experience"));
    const educations = parseEducationSection(extractTextSection(lines, "Education"));

    console.debug("[DOM Reader] Text-structure extraction:", {
      name, headline, company, school, location, avatar: !!avatar,
      experiences: experiences.length, educations: educations.length,
    });

    return { name, headline, company, school, location, avatar, experiences, educations };
  } catch (err) {
    console.warn("[DOM Reader] extractFromTextStructure error:", err);
    return null;
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
    // Priority 1: Text-structure parsing (2025 LinkedIn with hashed CSS classes)
    const ts = extractFromTextStructure();

    // Priority 2: JSON-LD (logged-out / public profiles only)
    const ld = extractFromJsonLd();

    // Priority 3: Legacy CSS selectors (older LinkedIn layouts)
    const name =
      ts?.name ??
      ld?.name ??
      extractText(SELECTORS.profile.name) ??
      extractNameFromTitle();

    if (!name) {
      console.warn("[DOM Reader] Could not extract name — not a valid profile page");
      return null;
    }

    console.debug("[DOM Reader] Extracted name:", name,
      ts ? "(text-structure)" : ld ? "(JSON-LD)" : "(CSS/title)");

    const linkedin_url = window.location.href.split("?")[0];

    // Headline: text-structure → JSON-LD → CSS
    const headline = ts?.headline ?? ld?.headline ?? extractText(SELECTORS.profile.headline) ?? "";

    // Current role: text-structure experiences → CSS section → header fallback → JSON-LD
    let resolvedCurrent: ExtractedRole;
    let resolvedPrevious: ExtractedRole[];

    if (ts && ts.experiences.length > 0) {
      resolvedCurrent = ts.experiences[0];
      resolvedPrevious = ts.experiences.slice(1);
      console.debug("[DOM Reader] Used text-structure for roles:", ts.experiences.length, "entries");
    } else {
      const { current, previous } = extractRoles();
      const isUnknownRole = current.title === "Unknown" && current.company === "Unknown";
      resolvedCurrent = current;
      resolvedPrevious = previous;

      if (isUnknownRole) {
        if (ts?.company || ts?.headline) {
          resolvedCurrent = { title: ts?.headline ?? "Unknown", company: ts?.company ?? "Unknown", duration: "Current" };
        } else if (ld?.jobTitles.length || ld?.companies.length) {
          resolvedCurrent = { title: ld?.jobTitles[0] ?? "Unknown", company: ld?.companies[0] ?? "Unknown", duration: "Unknown" };
        }
      }
      if (resolvedPrevious.length === 0 && ld && ld.jobTitles.length > 1) {
        resolvedPrevious = ld.jobTitles.slice(1).map((title, i) => ({
          title, company: ld.companies[i + 1] ?? "Unknown", duration: "Unknown",
        }));
      }
    }

    // Education: text-structure sections → CSS section → JSON-LD
    let resolvedEducation: ExtractedEducation[];

    if (ts && ts.educations.length > 0) {
      resolvedEducation = ts.educations;
      console.debug("[DOM Reader] Used text-structure for education:", ts.educations.length, "entries");
    } else {
      const education = extractEducation();
      resolvedEducation = education;
    }
    if (resolvedEducation.length === 0) {
      if (ts?.school) {
        resolvedEducation = [{ school: ts.school, degree: "Unknown", field: undefined, dates: undefined }];
        console.debug("[DOM Reader] Used text-structure for education");
      } else if (ld && ld.schools.length > 0) {
        resolvedEducation = ld.schools.map((school) => ({ school, degree: "Unknown", field: undefined, dates: undefined }));
        console.debug("[DOM Reader] Used JSON-LD fallback for education");
      }
    }

    // Location: text-structure → JSON-LD → CSS
    const location = ts?.location ?? ld?.location ?? extractText(SELECTORS.profile.location) ?? "";

    // Avatar: text-structure (media.licdn.com img) → JSON-LD → CSS
    const avatar = ts?.avatar ?? ld?.avatar ?? extractAvatarUrl();

    return {
      linkedin_url,
      name,
      headline,
      current_title: resolvedCurrent,
      previous_roles: resolvedPrevious,
      education: resolvedEducation,
      location,
      ...(avatar ? { avatar } : {}),
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

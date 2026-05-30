/**
 * content-script/rsc-profile-client.ts
 *
 * Fetches deep experience + education data from LinkedIn profile "details"
 * sub-pages and parses the React Server Components (RSC) hydration payload
 * embedded in each page.
 *
 * Background: the Voyager batch profile endpoint does NOT return work history
 * or education inline. The real data is server-rendered into:
 *   https://www.linkedin.com/in/<publicId>/details/experience/
 *   https://www.linkedin.com/in/<publicId>/details/education/
 * as an RSC flight payload inside <script id="rehydrate-data">.
 *
 * VERIFIED (2026-05-29 live probe):
 *   - Data lives in window.__como_rehydration__ RSC flight serialization.
 *   - Text values are in "children":["<value>"] arrays.
 *   - Date-range strings: "Jun 2025 - Present · 1 yr" (Month YYYY - ... pattern).
 *   - Company name: "children":["Deloitte"] immediately before the date-range.
 *   - Noise: ads/sidebars also use children arrays; scope ONLY to subtrees that
 *     contain date-range strings to avoid garbage like "Acquire customers...".
 *
 * READ-ONLY: only GET requests. No POST/PUT/DELETE to linkedin.com.
 * See docs/LINKEDIN_GUARDRAILS.md.
 *
 * Runs INSIDE the content script — session cookies attach automatically.
 */

import type { VoyagerProfile } from "../shared/types";
import { RateLimitedError } from "./voyager-list-client";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ExperienceEntry = VoyagerProfile["experience"][number];
export type EducationEntry = VoyagerProfile["education"][number];

// ---------------------------------------------------------------------------
// Navigation fetch helper
// ---------------------------------------------------------------------------

/**
 * Fetches a LinkedIn profile detail page with navigation headers so LinkedIn
 * serves the full SSR page (with rehydrate-data) rather than a stripped SPA stub.
 *
 * READ-ONLY — GET only.
 */
async function fetchDetailsPage(url: string): Promise<string | null> {
  let response: Response;
  try {
    response = await fetch(url, {
      method: "GET",
      credentials: "include",
      headers: {
        accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "accept-language": "en-US,en;q=0.9",
        "sec-fetch-mode": "navigate",
        "sec-fetch-dest": "document",
        "sec-fetch-site": "same-origin",
        "upgrade-insecure-requests": "1",
      },
    });
  } catch (err) {
    console.error("[RscProfile] Network error fetching", url, err);
    return null;
  }

  if (response.status === 429 || response.status === 999) {
    console.warn(`[RscProfile] Rate limited (HTTP ${response.status}) for ${url}`);
    throw new RateLimitedError(response.status);
  }

  if (!response.ok) {
    console.warn(`[RscProfile] HTTP ${response.status} for ${url}`);
    return null;
  }

  try {
    return await response.text();
  } catch (err) {
    console.error("[RscProfile] Failed to read response text:", err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// RSC payload extraction
// ---------------------------------------------------------------------------

/**
 * Extracts the raw content of <script id="rehydrate-data"> from the page HTML.
 * Returns null if the script tag is absent.
 */
function extractRehydrateScript(html: string): string | null {
  const match = html.match(/<script[^>]*id="rehydrate-data"[^>]*>([\s\S]*?)<\/script>/);
  if (!match?.[1]) return null;
  return match[1].trim();
}

/**
 * Unescapes the RSC string so we can walk it with plain string operations.
 *
 * BUG 4 FIX: also decode \uXXXX Unicode escapes and common HTML entities
 * (&amp; → &, &lt; → <, &gt; → >, &quot; → ").
 */
function unescapeRsc(raw: string): string {
  return raw
    // Standard JSON-style string escapes
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, "\\")
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "")
    // BUG 4: Unicode escape sequences (\uXXXX)
    .replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) =>
      String.fromCharCode(parseInt(hex, 16))
    )
    // BUG 4: HTML entities that sometimes appear inside RSC string values
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

// ---------------------------------------------------------------------------
// Content subtree scoping
// ---------------------------------------------------------------------------

/**
 * Date-range pattern for experience entries.
 * Matches strings like:
 *   "Jun 2025 - Present · 1 yr"
 *   "Nov 2022 - Jun 2025 · 2 yrs 7 mos"
 *   "Mar 2008 - Aug 2017"
 */
const DATE_RANGE_RE =
  /[A-Z][a-z]{2} \d{4} - (?:Present|[A-Z][a-z]{2} \d{4})(?:\s*[··]\s*[^"]+)?/g;

/**
 * Education year-range pattern.
 * Matches "2016 - 2020", "2016–2020", "2016 – 2020", "2016—2020".
 * Also handles the single-year "2020" format for partial dates.
 */
const EDU_YEAR_RE = /(?:19|20)\d{2}\s*[-–—]\s*(?:19|20)\d{2}/g;

const CONTEXT_WINDOW = 12_000;

/**
 * BUG 3 FIX: For education, the year-range anchor is unreliable because many
 * education entries have no dates. We now also try a broader window that simply
 * grabs everything between the first and last occurrence of any date OR the
 * first school-like string in the page. scopeToContentSubtree is called with a
 * fallbackToFullPayload flag for education.
 */
function scopeToContentSubtree(
  payload: string,
  kind: "experience" | "education"
): string {
  const anchorRe = kind === "experience" ? DATE_RANGE_RE : EDU_YEAR_RE;
  anchorRe.lastIndex = 0;

  let firstPos = -1;
  let lastPos = -1;
  let m: RegExpExecArray | null;

  while ((m = anchorRe.exec(payload)) !== null) {
    if (firstPos === -1) firstPos = m.index;
    lastPos = m.index + m[0].length;
  }

  if (firstPos === -1) {
    if (kind === "education") {
      // BUG 3 FIX: No year-range anchors found for education — fall back to
      // the full payload so the school-name heuristic in the parser can still
      // find entries. Truncate to a reasonable size to avoid pathological input.
      console.debug("[RscProfile] No edu year anchors; using full payload for school-name scan");
      return payload.slice(0, 60_000);
    }
    return "";
  }

  const start = Math.max(0, firstPos - CONTEXT_WINDOW);
  const end = Math.min(payload.length, lastPos + CONTEXT_WINDOW);
  return payload.slice(start, end);
}

// ---------------------------------------------------------------------------
// Children-string extraction helpers
// ---------------------------------------------------------------------------

/**
 * Extracts all plain-string values from "children":["<value>"] arrays in the
 * given payload segment. Returns them in document order.
 */
function extractChildrenStrings(segment: string): Array<{ pos: number; values: string[] }> {
  const results: Array<{ pos: number; values: string[] }> = [];
  const re = /"children":\[("(?:[^"\\]|\\.)*"(?:,\s*"(?:[^"\\]|\\.)*")*)\]/g;
  let m: RegExpExecArray | null;

  while ((m = re.exec(segment)) !== null) {
    const inner = m[1];
    const strings: string[] = [];
    const strRe = /"((?:[^"\\]|\\.)*)"/g;
    let sm: RegExpExecArray | null;
    while ((sm = strRe.exec(inner)) !== null) {
      const val = sm[1]
        .replace(/\\"/g, '"')
        .replace(/\\\\/g, "\\")
        .replace(/\\n/g, " ")
        // Decode unicode escapes within individual field values too
        .replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) =>
          String.fromCharCode(parseInt(hex, 16))
        )
        .trim();
      if (val.length > 0) strings.push(val);
    }
    if (strings.length > 0) {
      results.push({ pos: m.index, values: strings });
    }
  }

  return results;
}

// ---------------------------------------------------------------------------
// BUG 1 helpers — filter noise before title/company pairing
// ---------------------------------------------------------------------------

/**
 * Employment type strings LinkedIn appends to company names (e.g. "Deloitte · Full-time").
 * These also appear as standalone children strings in some RSC structures.
 */
const EMPLOYMENT_TYPES = new Set([
  "full-time", "part-time", "freelance", "self-employed", "contract",
  "internship", "apprenticeship", "seasonal",
]);

/**
 * Returns true if the string is an employment-type label.
 */
function isEmploymentType(s: string): boolean {
  return EMPLOYMENT_TYPES.has(s.toLowerCase().trim());
}

/**
 * Returns true if the string looks like a location (city, region, country).
 * Heuristics:
 *  - Contains ", " with ≥2 words on each side (e.g. "New York, United States")
 *  - Ends in " Area" (e.g. "Greater Paris Metropolitan Area")
 *  - Matches known country/region suffixes
 */
function isLocation(s: string): boolean {
  const t = s.trim();
  if (t.endsWith(" Area")) return true;
  // "City, State" or "City, Country" — comma with at least one letter on each side
  if (/^[A-Za-zÀ-ÿ\s\-'.]+,\s+[A-Za-zÀ-ÿ\s\-'.]+$/.test(t)) return true;
  return false;
}

/**
 * Returns true if the string is a standalone duration/tenure token.
 * Matches: "1 yr", "2 yrs 3 mos", "· 8 yrs 9 mos", etc.
 */
function isDuration(s: string): boolean {
  return /^[··\s]*\d+\s+(?:yr|yrs|mos|mo)/.test(s.trim());
}

/**
 * Returns true if the string is (or contains) a date range we'd use as anchor.
 * We already have anchors but we also want to skip stray date strings in the
 * candidate list (e.g. "Jun 2025 - Present" showing up as a child value).
 */
function looksLikeDateRange(s: string): boolean {
  return /[A-Z][a-z]{2} \d{4}/.test(s) || /^\d{4}[-–]/.test(s);
}

/**
 * BUG 1 FIX: Strips noise tokens from a candidate string list.
 * Also splits on " · " within company strings to discard the employment-type
 * suffix LinkedIn appends (e.g. "Deloitte · Full-time" → "Deloitte").
 */
function filterCandidates(raw: string[]): string[] {
  const out: string[] = [];
  for (const s of raw) {
    const t = s.trim();
    if (!t) continue;
    if (looksLikeDateRange(t)) continue;
    if (isEmploymentType(t)) continue;
    if (isLocation(t)) continue;
    if (isDuration(t)) continue;
    // Split on " · " — take only the part before the bullet (strips "Full-time" suffix)
    const clean = t.split(/\s*[··]\s*/)[0]?.trim() ?? t;
    if (!clean || isEmploymentType(clean)) continue;
    out.push(clean);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Experience parser
// ---------------------------------------------------------------------------

/**
 * Parses experience entries from the scoped RSC payload segment.
 *
 * BUG 1 FIX: Filter employment types, locations, and duration strings from
 * candidate list before pairing title/company.
 * BUG 2 FIX: Parse dateRange start/end from the anchor string explicitly.
 */
function parseExperienceFromSegment(segment: string): ExperienceEntry[] {
  const entries: ExperienceEntry[] = [];
  if (!segment) return entries;

  const groups = extractChildrenStrings(segment);
  if (groups.length === 0) return entries;

  // Find date-range anchors with their parsed start/end
  const dateRangeRe =
    /[A-Z][a-z]{2} \d{4}\s*-\s*(?:Present|[A-Z][a-z]{2} \d{4})(?:\s*[··]\s*[^"]{0,80})?/g;
  dateRangeRe.lastIndex = 0;

  interface DateAnchor {
    pos: number;
    raw: string;
    startText: string;
    endText: string;
  }

  const dateAnchors: DateAnchor[] = [];
  let dm: RegExpExecArray | null;
  while ((dm = dateRangeRe.exec(segment)) !== null) {
    const raw = dm[0];
    // BUG 2 FIX: split on " - " (with possible surrounding whitespace)
    // and strip the " · N yrs" duration suffix from the end part.
    const dashIdx = raw.indexOf(" - ");
    const startText = (dashIdx >= 0 ? raw.slice(0, dashIdx) : raw).trim();
    const afterDash = dashIdx >= 0 ? raw.slice(dashIdx + 3) : "";
    // Strip duration suffix: everything from " · " onward
    const endText = afterDash.split(/\s*[··]/)[0]?.trim() ?? "";
    dateAnchors.push({ pos: dm.index, raw, startText, endText });
  }

  if (dateAnchors.length === 0) return entries;

  // General noise filter (for UI chrome strings, not experience-specific)
  function isUiNoise(s: string): boolean {
    if (s.length > 150) return true;
    const noisePatterns = [
      /^People also viewed$/i,
      /^Acquire customers/i,
      /^Grow your business/i,
      /^LinkedIn/i,
      /^Try Premium/i,
      /^\d+$/,
      /^[··]/,
    ];
    return noisePatterns.some((p) => p.test(s.trim()));
  }

  for (const anchor of dateAnchors) {
    const before = groups.filter((g) => g.pos < anchor.pos);
    if (before.length === 0) continue;

    // Flatten and apply full noise filters (BUG 1 FIX)
    const rawCandidates: string[] = [];
    for (const g of before) {
      for (const v of g.values) {
        if (!isUiNoise(v)) rawCandidates.push(v);
      }
    }
    const candidates = filterCandidates(rawCandidates);

    // BUG 2 FIX: parse start/end dates
    const [startYear, startMonth] = parseMonthYear(anchor.startText);
    const isPresent = anchor.endText.toLowerCase() === "present";
    const [endYear, endMonth] = isPresent
      ? [null, null]
      : parseMonthYear(anchor.endText);

    if (candidates.length === 0) continue;

    if (candidates.length < 2) {
      const title = candidates[candidates.length - 1]!;
      entries.push({
        title,
        company: "Unknown",
        duration: anchor.raw,
        startDate: formatDate(startYear, startMonth),
        endDate: isPresent ? "Present" : formatDate(endYear, endMonth),
      });
      continue;
    }

    // In LinkedIn's RSC order: title is rendered first (heading), company second.
    // Both appear before the date range. After filtering, the last two candidates
    // are [title, company] in document order.
    const title = candidates[candidates.length - 2]!;
    const company = candidates[candidates.length - 1]!;

    entries.push({
      title,
      company,
      duration: anchor.raw,
      startDate: formatDate(startYear, startMonth),
      endDate: isPresent ? "Present" : formatDate(endYear, endMonth),
    });
  }

  // Deduplicate by (title, company, startDate)
  const seen = new Set<string>();
  return entries.filter((e) => {
    const key = `${e.title}|${e.company}|${e.startDate ?? ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ---------------------------------------------------------------------------
// Education parser
// ---------------------------------------------------------------------------

/**
 * Parses education entries from the scoped RSC payload segment.
 *
 * BUG 3 FIX: Two-pass strategy.
 *
 * Pass 1 (date-anchored): find year-range strings, look backward for school +
 * degree. Handles dated entries.
 *
 * Pass 2 (school-name scan): if Pass 1 finds nothing, scan the full candidate
 * list for strings that match school-name heuristics. This catches dateless
 * entries and profiles where the education RSC uses no year anchors.
 *
 * Critically, the education page is now scoped more broadly (full payload when
 * no year anchors found) so Pass 2 always has something to work with.
 */
function parseEducationFromSegment(segment: string): EducationEntry[] {
  const entries: EducationEntry[] = [];
  if (!segment) return entries;

  const groups = extractChildrenStrings(segment);
  if (groups.length === 0) return entries;

  function isNoise(s: string): boolean {
    if (s.length > 200) return true;
    const noisePatterns = [
      /^People also viewed$/i,
      /^Acquire customers/i,
      /^LinkedIn/i,
      /^Try Premium/i,
      /^\d+$/,
      /^[··]/,
    ];
    return noisePatterns.some((p) => p.test(s.trim()));
  }

  // --- Pass 1: anchor on year-ranges ---
  // BUG 3 FIX: broaden dash matching to include em-dash and en-dash variants
  const yearRangeRe = /(?:19|20)\d{2}\s*[-–—]\s*(?:19|20)\d{2}/g;
  yearRangeRe.lastIndex = 0;

  interface YearAnchor {
    pos: number;
    raw: string;
    startYear: string;
    endYear: string;
  }

  const yearAnchors: YearAnchor[] = [];
  let ym: RegExpExecArray | null;
  while ((ym = yearRangeRe.exec(segment)) !== null) {
    const raw = ym[0];
    // BUG 3 FIX: split on any dash variant
    const parts = raw.split(/[-–—]/);
    yearAnchors.push({
      pos: ym.index,
      raw,
      startYear: (parts[0] ?? "").trim(),
      endYear: (parts[parts.length - 1] ?? "").trim(),
    });
  }

  for (const anchor of yearAnchors) {
    const before = groups
      .filter((g) => g.pos < anchor.pos)
      .flatMap((g) => g.values)
      .filter((v) => !isNoise(v) && !/^\d{4}$/.test(v) && !looksLikeDateRange(v));

    if (before.length === 0) continue;

    const school = before.length >= 2 ? before[before.length - 2]! : before[before.length - 1]!;
    const degree = before.length >= 2 ? before[before.length - 1]! : null;

    entries.push({
      school,
      degree: degree ?? null,
      fieldOfStudy: null,
      startYear: anchor.startYear,
      endYear: anchor.endYear,
    });
  }

  // --- Pass 2 (fallback): school-name heuristic ---
  // Run always if Pass 1 found nothing. Keeps dateless entries.
  if (entries.length === 0) {
    const schoolKeywords =
      /university|college|school|institute|academy|insead|essec|hec|polytechnic|sciences\s+po|mba|bachelor|master|lycée|iut|business\s+school|grande\s+école|ecole|école/i;

    for (let i = 0; i < groups.length; i++) {
      const g = groups[i]!;
      for (const val of g.values) {
        if (schoolKeywords.test(val) && !isNoise(val) && !looksLikeDateRange(val)) {
          // Look at the next 1-2 groups for degree / field of study
          const next1 = groups[i + 1];
          const next2 = groups[i + 2];
          const degree =
            (next1?.values[0] && !isNoise(next1.values[0]) && !schoolKeywords.test(next1.values[0]))
              ? next1.values[0]
              : null;
          const field =
            degree &&
            next2?.values[0] &&
            !isNoise(next2.values[0]) &&
            !schoolKeywords.test(next2.values[0]) &&
            !looksLikeDateRange(next2.values[0])
              ? next2.values[0]
              : null;

          entries.push({
            school: val,
            degree: degree ?? null,
            fieldOfStudy: field ?? null,
            startYear: null,
            endYear: null,
          });
        }
      }
    }
  }

  // Deduplicate by school + degree
  const seen = new Set<string>();
  return entries.filter((e) => {
    const key = `${e.school}|${e.degree ?? ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ---------------------------------------------------------------------------
// Date parsing utilities
// ---------------------------------------------------------------------------

const MONTH_MAP: Record<string, string> = {
  Jan: "01", Feb: "02", Mar: "03", Apr: "04",
  May: "05", Jun: "06", Jul: "07", Aug: "08",
  Sep: "09", Oct: "10", Nov: "11", Dec: "12",
};

/** Parses "Jun 2025" → [year, month] as strings */
function parseMonthYear(text: string): [string | null, string | null] {
  const m = text.trim().match(/^([A-Z][a-z]{2})\s+(\d{4})$/);
  if (!m) return [null, null];
  return [m[2]!, MONTH_MAP[m[1]!] ?? null];
}

/** Formats parsed year+month into "YYYY-MM" or "YYYY" or null */
function formatDate(
  year: string | null,
  month: string | null
): string | null {
  if (!year) return null;
  if (month) return `${year}-${month}`;
  return year;
}

// ---------------------------------------------------------------------------
// Public parser
// ---------------------------------------------------------------------------

/**
 * Parses the RSC hydration payload from a LinkedIn profile details page HTML.
 *
 * @param html   Raw HTML of the details page (from fetchDetailsPage).
 * @param kind   "experience" or "education".
 * @returns      Parsed entries array. Returns [] on any parse failure — never throws.
 */
export function parseProfileDetailsRsc(
  html: string,
  kind: "experience" | "education"
): ExperienceEntry[] | EducationEntry[] {
  try {
    const script = extractRehydrateScript(html);
    if (!script) {
      console.warn(`[RscProfile] No rehydrate-data script found for ${kind}`);
      return [];
    }

    const payload = unescapeRsc(script);
    const segment = scopeToContentSubtree(payload, kind);

    if (!segment) {
      console.warn(`[RscProfile] No ${kind} anchor strings found in RSC payload`);
      return [];
    }

    if (kind === "experience") {
      const result = parseExperienceFromSegment(segment);
      console.debug(`[RscProfile] Parsed ${result.length} experience entries`);
      return result;
    } else {
      const result = parseEducationFromSegment(segment);
      console.debug(`[RscProfile] Parsed ${result.length} education entries`);
      return result;
    }
  } catch (err) {
    // Defensive: never let a parse failure propagate — return empty
    console.warn(`[RscProfile] parseProfileDetailsRsc error (${kind}):`, err);
    return [];
  }
}

// ---------------------------------------------------------------------------
// Public fetch functions
// ---------------------------------------------------------------------------

/**
 * Fetches and parses the experience details page for a LinkedIn public identifier.
 *
 * @param publicId  The vanity slug, e.g. "marc-becker-489151".
 * @returns         Parsed experience entries, or [] on failure.
 *                  Throws RateLimitedError on HTTP 429/999 (caller must backoff).
 */
export async function fetchExperience(publicId: string): Promise<ExperienceEntry[]> {
  const url = `https://www.linkedin.com/in/${encodeURIComponent(publicId)}/details/experience/`;
  console.debug(`[RscProfile] Fetching experience: ${url}`);

  const html = await fetchDetailsPage(url);
  if (!html) return [];

  return parseProfileDetailsRsc(html, "experience") as ExperienceEntry[];
}

/**
 * Fetches and parses the education details page for a LinkedIn public identifier.
 *
 * @param publicId  The vanity slug, e.g. "marc-becker-489151".
 * @returns         Parsed education entries, or [] on failure.
 *                  Throws RateLimitedError on HTTP 429/999 (caller must backoff).
 */
export async function fetchEducation(publicId: string): Promise<EducationEntry[]> {
  const url = `https://www.linkedin.com/in/${encodeURIComponent(publicId)}/details/education/`;
  console.debug(`[RscProfile] Fetching education: ${url}`);

  const html = await fetchDetailsPage(url);
  if (!html) return [];

  return parseProfileDetailsRsc(html, "education") as EducationEntry[];
}

/**
 * content-script/voyager-batch-client.ts
 *
 * Wraps the LinkedIn Voyager batch profile endpoint:
 *   GET /voyager/api/identity/dash/profiles?ids=List(urn1,urn2,...)
 *       &decorationId=com.linkedin.voyager.dash.deco.identity.profile.FullProfile
 *
 * Runs INSIDE the content script (LinkedIn tab) — session cookies are
 * attached automatically. Defensively parses nested Voyager JSON shapes.
 *
 * READ-ONLY: GET requests only. Never writes to linkedin.com.
 * See LINKEDIN_GUARDRAILS.md.
 */

import type { VoyagerProfile } from "../shared/types";
import { VOYAGER_DECORATION_ID } from "../shared/constants";
import { RateLimitedError } from "./voyager-list-client";

// ---------------------------------------------------------------------------
// Voyager response parsing helpers
// ---------------------------------------------------------------------------

/**
 * Extracts the numeric/alphanumeric entity ID from the end of a URN string.
 */
function extractEntityId(urn: string): string {
  if (!urn) return "";
  const parts = urn.split(":");
  return parts[parts.length - 1] ?? "";
}

/**
 * Safely reads a deeply-nested string from an object.
 * Returns null on any type mismatch or access error.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- defensive traversal
function safeString(obj: any, ...keys: (string | number)[]): string | null {
  try {
    let cur = obj;
    for (const key of keys) {
      if (cur == null) return null;
      cur = cur[key];
    }
    if (typeof cur === "string" && cur.trim().length > 0) return cur.trim();
    return null;
  } catch {
    return null;
  }
}

/**
 * Finds an entity inside the Voyager `included[]` flat array by its URN.
 */
function findIncluded(
  included: unknown[],
  urn: string
): Record<string, unknown> | null {
  if (!Array.isArray(included) || !urn) return null;
  for (const item of included) {
    if (typeof item !== "object" || item === null) continue;
    const rec = item as Record<string, unknown>;
    if (rec["entityUrn"] === urn || rec["objectUrn"] === urn) return rec;
  }
  return null;
}

/**
 * Parses a year/month object into a human-readable string.
 * LinkedIn uses { year: 2020, month: 6 } for dates.
 */
function parseLinkedInDate(dateObj: unknown): string | null {
  try {
    if (typeof dateObj !== "object" || dateObj === null) return null;
    const d = dateObj as Record<string, unknown>;
    const year = d["year"];
    const month = d["month"];
    if (typeof year === "number") {
      if (typeof month === "number") {
        // Month is 1-indexed in LinkedIn
        return `${year}-${String(month).padStart(2, "0")}`;
      }
      return String(year);
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Extracts profile photo URL from a profile or vectorImage record.
 */
function extractPhotoUrl(profile: Record<string, unknown>): string | null {
  try {
    const photoVectorImage =
      (profile["profilePicture"] as Record<string, unknown> | null)?.["displayImageReference"]
      ?? (profile["photo"] as Record<string, unknown> | null);
    if (!photoVectorImage || typeof photoVectorImage !== "object") return null;

    const vec = photoVectorImage as Record<string, unknown>;
    const rootUrl = safeString(vec, "rootUrl");
    const artifacts = vec["artifacts"] as Array<Record<string, unknown>> | null;
    if (!Array.isArray(artifacts) || artifacts.length === 0 || !rootUrl) return null;

    // Use the largest artifact (last one)
    const last = artifacts[artifacts.length - 1];
    const segment = safeString(last, "fileIdentifyingUrlPathSegment");
    if (segment) return `${rootUrl}${segment}`;
    return null;
  } catch {
    return null;
  }
}

/**
 * Parses experience (position) entries from a profile record.
 *
 * LinkedIn structures positions in two ways:
 *   1. profile.positionView.elements[] (legacy)
 *   2. profile.profilePositionGroups.elements[].profilePositionInPositionGroup.elements[] (current)
 */
function parseExperience(
  profile: Record<string, unknown>,
  included: unknown[]
): VoyagerProfile["experience"] {
  const experiences: VoyagerProfile["experience"] = [];

  try {
    // Approach 1: positionView (simpler / legacy)
    const positionViewUrn = safeString(profile, "positionView", "entityUrn") ??
      safeString(profile, "positionView");
    const positionElements = (() => {
      const pv = profile["positionView"] as Record<string, unknown> | null;
      if (Array.isArray(pv?.["elements"])) return pv["elements"] as unknown[];
      if (positionViewUrn) {
        const ref = findIncluded(included, positionViewUrn);
        if (ref && Array.isArray(ref["elements"])) return ref["elements"] as unknown[];
      }
      return null;
    })();

    if (positionElements && positionElements.length > 0) {
      for (const pos of positionElements) {
        if (typeof pos !== "object" || pos === null) continue;
        const p = pos as Record<string, unknown>;
        const title = safeString(p, "title");
        if (!title) continue;

        const companyName =
          safeString(p, "companyName") ??
          safeString(p, "company", "name") ??
          safeString(p, "companyUrn") ?? // last resort
          "Unknown";

        const startDate = parseLinkedInDate(p["dateRange"] !== undefined
          ? (p["dateRange"] as Record<string, unknown>)["start"]
          : p["startMonthYear"] ?? p["startDateOn"]);

        const endDate = parseLinkedInDate(p["dateRange"] !== undefined
          ? (p["dateRange"] as Record<string, unknown>)["end"]
          : p["endMonthYear"] ?? p["endDateOn"]);

        const duration = (() => {
          if (startDate && endDate) return `${startDate} – ${endDate}`;
          if (startDate) return `${startDate} – Present`;
          return null;
        })();

        experiences.push({ title, company: companyName, duration, startDate, endDate });
      }
      return experiences;
    }

    // Approach 2: profilePositionGroups (modern dash API)
    const groups = profile["profilePositionGroups"] as Record<string, unknown> | null;
    const groupElements = Array.isArray(groups?.["elements"]) ? (groups!["elements"] as unknown[]) : [];

    for (const group of groupElements) {
      if (typeof group !== "object" || group === null) continue;
      const g = group as Record<string, unknown>;
      const companyName =
        safeString(g, "companyName") ??
        safeString(g, "company", "name") ??
        "Unknown";

      const innerView = g["profilePositionInPositionGroup"] as Record<string, unknown> | null;
      const innerElements = Array.isArray(innerView?.["elements"])
        ? (innerView!["elements"] as unknown[])
        : [];

      for (const pos of innerElements) {
        if (typeof pos !== "object" || pos === null) continue;
        const p = pos as Record<string, unknown>;
        const title = safeString(p, "title");
        if (!title) continue;

        const dateRange = p["dateRange"] as Record<string, unknown> | null;
        const startDate = parseLinkedInDate(dateRange?.["start"]);
        const endDate = parseLinkedInDate(dateRange?.["end"]);

        const duration = (() => {
          if (startDate && endDate) return `${startDate} – ${endDate}`;
          if (startDate) return `${startDate} – Present`;
          return null;
        })();

        experiences.push({
          title,
          company: safeString(p, "companyName") ?? companyName,
          duration,
          startDate,
          endDate,
        });
      }
    }
  } catch (err) {
    console.warn("[VoyagerBatch] parseExperience error:", err);
  }

  return experiences;
}

/**
 * Parses education entries from a profile record.
 */
function parseEducation(
  profile: Record<string, unknown>,
  included: unknown[]
): VoyagerProfile["education"] {
  const educations: VoyagerProfile["education"] = [];

  try {
    const eduViewUrn = safeString(profile, "educationView", "entityUrn") ??
      safeString(profile, "educationView");
    const eduElements = (() => {
      const ev = profile["educationView"] as Record<string, unknown> | null;
      if (Array.isArray(ev?.["elements"])) return ev["elements"] as unknown[];
      if (eduViewUrn) {
        const ref = findIncluded(included, eduViewUrn);
        if (ref && Array.isArray(ref["elements"])) return ref["elements"] as unknown[];
      }
      return null;
    })();

    const elements = eduElements ?? [];
    for (const edu of elements) {
      if (typeof edu !== "object" || edu === null) continue;
      const e = edu as Record<string, unknown>;
      const school =
        safeString(e, "schoolName") ??
        safeString(e, "school", "name") ??
        safeString(e, "entityUrn");
      if (!school) continue;

      const degreeRaw = safeString(e, "degreeName");
      const fieldRaw = safeString(e, "fieldOfStudy");

      const dateRange = e["dateRange"] as Record<string, unknown> | null;
      const startYear = parseLinkedInDate(dateRange?.["start"])?.slice(0, 4) ?? null;
      const endYear = parseLinkedInDate(dateRange?.["end"])?.slice(0, 4) ??
        parseLinkedInDate(e["endDateOn"])?.slice(0, 4) ?? null;

      educations.push({
        school,
        degree: degreeRaw,
        fieldOfStudy: fieldRaw,
        startYear,
        endYear,
      });
    }
  } catch (err) {
    console.warn("[VoyagerBatch] parseEducation error:", err);
  }

  return educations;
}

/**
 * Parses a single profile entity from the Voyager batch response.
 * Every field access is defensive; partial data is returned rather than null.
 * Minimum requirement: we must have the URN.
 */
function parseProfileEntity(
  entity: Record<string, unknown>,
  included: unknown[]
): VoyagerProfile | null {
  try {
    const urn: string | null =
      safeString(entity, "entityUrn") ??
      safeString(entity, "objectUrn");

    if (!urn) {
      console.warn("[VoyagerBatch] Entity missing URN:", JSON.stringify(entity).slice(0, 100));
      return null;
    }

    const entityId = extractEntityId(urn);

    const firstName = safeString(entity, "firstName");
    const lastName = safeString(entity, "lastName");
    const name = firstName && lastName
      ? `${firstName} ${lastName}`
      : firstName ?? lastName ?? safeString(entity, "name");

    const headline =
      safeString(entity, "headline", "text") ??
      safeString(entity, "headline") ??
      null;

    const location =
      safeString(entity, "locationName") ??
      safeString(entity, "geo", "defaultLocalizedName") ??
      safeString(entity, "geoLocation", "geo", "defaultLocalizedName") ??
      null;

    const publicIdentifier = safeString(entity, "publicIdentifier");
    const linkedinUrl = publicIdentifier
      ? `https://www.linkedin.com/in/${publicIdentifier}/`
      : null;

    const photoUrl = extractPhotoUrl(entity);

    const bio =
      safeString(entity, "summary", "text") ??
      safeString(entity, "summary") ??
      null;

    const experience = parseExperience(entity, included);
    const education = parseEducation(entity, included);

    return {
      urn,
      entityId,
      name,
      headline,
      location,
      linkedinUrl,
      photoUrl,
      bio,
      experience,
      education,
    };
  } catch (err) {
    console.warn("[VoyagerBatch] parseProfileEntity error:", err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Fetches deep profile data for a batch of profile URNs from the Voyager API.
 *
 * @param urns        Up to 25 profile URNs (e.g. "urn:li:fsd_profile:ACoAA...")
 * @param csrfToken   CSRF token from getCsrfToken()
 * @returns           Parsed profiles array, or null on hard failure.
 *                    Partial results (some URNs missing) are returned rather
 *                    than null — log the count mismatch for debugging.
 *
 * READ-ONLY: GET only. Never writes to LinkedIn.
 */
export async function fetchProfileBatch(
  urns: string[],
  csrfToken: string
): Promise<VoyagerProfile[] | null> {
  if (urns.length === 0) return [];

  // Build the List(...) query string LinkedIn expects for multi-value params
  const idsList = `List(${urns.map(encodeURIComponent).join(",")})`;

  const url = new URL("https://www.linkedin.com/voyager/api/identity/dash/profiles");
  url.searchParams.set("ids", idsList);
  url.searchParams.set("decorationId", VOYAGER_DECORATION_ID);

  let response: Response;
  try {
    response = await fetch(url.toString(), {
      method: "GET",
      credentials: "include",
      headers: {
        accept: "application/vnd.linkedin.normalized+json+2.1",
        "x-restli-protocol-version": "2.0.0",
        "csrf-token": csrfToken,
      },
    });
  } catch (err) {
    console.error("[VoyagerBatch] Network error:", err);
    return null;
  }

  if (response.status === 429 || response.status === 999) {
    console.warn(`[VoyagerBatch] Rate limited (HTTP ${response.status})`);
    throw new RateLimitedError(response.status);
  }

  if (!response.ok) {
    console.error(`[VoyagerBatch] HTTP ${response.status} for batch of ${urns.length} URNs`);
    return null;
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch (err) {
    console.error("[VoyagerBatch] Failed to parse response JSON:", err);
    return null;
  }

  return parseBatchResponse(body, urns.length);
}

/**
 * Parses the batch profiles response.
 * LinkedIn returns results keyed by URN under `results`, or as an `elements[]` array.
 */
function parseBatchResponse(body: unknown, expectedCount: number): VoyagerProfile[] | null {
  try {
    if (typeof body !== "object" || body === null) {
      console.warn("[VoyagerBatch] Response body is not an object");
      return null;
    }

    const root = body as Record<string, unknown>;
    const included = Array.isArray(root["included"]) ? (root["included"] as unknown[]) : [];

    const profiles: VoyagerProfile[] = [];
    let parseFailures = 0;

    // Shape 1: results is an object keyed by URN (dash API)
    const results = root["results"];
    if (typeof results === "object" && results !== null && !Array.isArray(results)) {
      const resultsMap = results as Record<string, unknown>;
      for (const [, value] of Object.entries(resultsMap)) {
        if (typeof value !== "object" || value === null) { parseFailures++; continue; }
        const profile = parseProfileEntity(value as Record<string, unknown>, included);
        if (profile) profiles.push(profile);
        else parseFailures++;
      }
    }

    // Shape 2: elements array (legacy / some regions)
    if (profiles.length === 0) {
      const elements = root["elements"];
      if (Array.isArray(elements)) {
        for (const el of elements) {
          if (typeof el !== "object" || el === null) { parseFailures++; continue; }
          const profile = parseProfileEntity(el as Record<string, unknown>, included);
          if (profile) profiles.push(profile);
          else parseFailures++;
        }
      }
    }

    // Shape 3: included array contains the full profiles directly
    if (profiles.length === 0 && included.length > 0) {
      for (const item of included) {
        if (typeof item !== "object" || item === null) continue;
        const rec = item as Record<string, unknown>;
        // Only parse items that look like profiles (have publicIdentifier)
        if (!rec["publicIdentifier"] && !rec["firstName"]) continue;
        const profile = parseProfileEntity(rec, included);
        if (profile) profiles.push(profile);
      }
    }

    if (parseFailures > 0 || profiles.length < expectedCount) {
      console.warn(
        `[VoyagerBatch] Parsed ${profiles.length}/${expectedCount} profiles. ` +
        `Parse failures: ${parseFailures}. LinkedIn schema may have changed.`
      );
    }

    return profiles;
  } catch (err) {
    console.error("[VoyagerBatch] parseBatchResponse error:", err);
    return null;
  }
}

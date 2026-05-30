/**
 * content-script/voyager-list-client.ts
 *
 * Wraps the LinkedIn Voyager connections-list endpoint:
 *   GET /voyager/api/relationships/dash/connections?count=40&start=N&sortType=RECENTLY_ADDED
 *
 * Runs INSIDE the content script (LinkedIn tab) so the browser automatically
 * attaches the user's session cookies. No separate auth needed.
 *
 * Design principles (mirroring dom-reader.ts's defensive approach):
 * - Wrap every field access in try/catch or optional chaining
 * - A missing field sets null; it never throws or drops the whole record
 * - Log parse failures with enough context to debug LinkedIn schema changes
 *
 * READ-ONLY: this file only issues GET requests. No POST/PUT/DELETE to
 * linkedin.com under any circumstance (see LINKEDIN_GUARDRAILS.md).
 */

import type { VoyagerConnection } from "../shared/types";
import { CONNECTIONS_PAGE_SIZE } from "../shared/constants";

// ---------------------------------------------------------------------------
// CSRF token extraction
// ---------------------------------------------------------------------------

/**
 * Extracts the CSRF token from the JSESSIONID cookie.
 *
 * LinkedIn stores the CSRF token as: JSESSIONID="ajax:XXXX"
 * The csrf-token header value must be the raw value including "ajax:XXXX"
 * (with surrounding quotes stripped).
 *
 * Primary: read document.cookie directly (works when cookie is not HttpOnly).
 * Fallback: ask service worker to use chrome.cookies.get() (needs `cookies` permission).
 */
export async function getCsrfToken(): Promise<string | null> {
  // Primary: document.cookie (available in content script context)
  try {
    const match = document.cookie.match(/JSESSIONID="([^"]+)"/);
    if (match?.[1]) {
      return match[1]; // e.g. "ajax:1234567890"
    }
    // Some LinkedIn configs store without quotes
    const matchUnquoted = document.cookie.match(/JSESSIONID=([^;]+)/);
    if (matchUnquoted?.[1]) {
      const val = matchUnquoted[1].trim().replace(/^"(.*)"$/, "$1");
      if (val.startsWith("ajax:")) return val;
    }
  } catch (err) {
    console.warn("[VoyagerList] document.cookie read failed:", err);
  }

  // Fallback: ask the service worker to read via chrome.cookies API
  try {
    const response = await chrome.runtime.sendMessage({
      type: "GET_CSRF_TOKEN",
    }) as { csrfToken?: string | null } | null;
    if (response?.csrfToken) return response.csrfToken;
  } catch (err) {
    console.warn("[VoyagerList] SW CSRF fallback failed:", err);
  }

  console.error("[VoyagerList] Could not extract CSRF token — LinkedIn session may not be active");
  return null;
}

// ---------------------------------------------------------------------------
// Voyager response parsing helpers
// ---------------------------------------------------------------------------

/**
 * Extracts the numeric entity ID from a LinkedIn URN string.
 * e.g. "urn:li:fsd_profile:ACoAA..." → we look for the base64-encoded ID
 * or for numeric IDs in other URN formats.
 *
 * For fsd_profile URNs the trailing segment IS the entity ID (alphanumeric).
 * For fs_miniProfile URNs it's also the trailing segment.
 */
function extractEntityId(urn: string): string {
  if (!urn) return "";
  const parts = urn.split(":");
  return parts[parts.length - 1] ?? "";
}

/**
 * Builds a LinkedIn profile URL from a publicIdentifier (vanity slug).
 * If no publicIdentifier, returns null (we can try to construct from URN
 * but that requires another API call so we leave it null for Phase 1).
 */
function buildProfileUrl(publicIdentifier: string | null | undefined): string | null {
  if (!publicIdentifier) return null;
  return `https://www.linkedin.com/in/${publicIdentifier}/`;
}

/**
 * Safely extracts a string from a nested object path.
 * Returns null on any access failure.
 */
function safeString(obj: unknown, ...keys: string[]): string | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- defensive traversal
    let cur: any = obj;
    for (const key of keys) {
      if (cur == null || typeof cur !== "object") return null;
      cur = cur[key];
    }
    if (typeof cur === "string" && cur.trim().length > 0) return cur.trim();
    return null;
  } catch {
    return null;
  }
}

/**
 * Finds the entity with a given URN inside the Voyager `included[]` array.
 * The included array is a flat list of normalized entities; we look up by
 * entityUrn or the common alias fields.
 */
function findIncluded(
  included: unknown[],
  urn: string
): Record<string, unknown> | null {
  if (!Array.isArray(included)) return null;
  for (const item of included) {
    if (typeof item !== "object" || item === null) continue;
    const rec = item as Record<string, unknown>;
    if (rec["entityUrn"] === urn || rec["objectUrn"] === urn) return rec;
  }
  return null;
}

/**
 * Parses one connection element from the Voyager connections-list response.
 * The response has changed shape several times; we probe multiple known paths
 * and degrade gracefully on any missing field.
 *
 * Known response shapes (as of late 2025):
 *   - elements[i].connectedMember (dash API)
 *   - elements[i].miniProfile (legacy)
 * The `included[]` array contains entity records cross-referenced by URN.
 */
function parseConnectionElement(
  element: Record<string, unknown>,
  included: unknown[]
): VoyagerConnection | null {
  try {
    // Determine the profile URN — it lives in different places depending on
    // which LinkedIn A/B variant is serving the response.
    const profileUrn: string | null =
      safeString(element, "connectedMember", "entityUrn") ??
      safeString(element, "memberUrn") ??
      safeString(element, "entityUrn") ??
      safeString(element, "miniProfile", "entityUrn");

    if (!profileUrn) {
      console.warn("[VoyagerList] Connection element has no profile URN:", JSON.stringify(element).slice(0, 200));
      return null;
    }

    const entityId = extractEntityId(profileUrn);

    // The mini-profile is sometimes embedded directly and sometimes referenced
    // in the included[] array via a miniProfileUrn.
    const miniProfileUrn: string | null =
      safeString(element, "connectedMember", "miniProfile", "entityUrn") ??
      safeString(element, "miniProfileUrn") ??
      null;

    const embeddedMiniProfile =
      (element["connectedMember"] as Record<string, unknown> | null)?.["miniProfile"] as Record<string, unknown> | null ??
      element["miniProfile"] as Record<string, unknown> | null;

    const miniProfile: Record<string, unknown> | null =
      embeddedMiniProfile ??
      (miniProfileUrn ? findIncluded(included, miniProfileUrn) : null) ??
      (findIncluded(included, profileUrn));

    // Extract fields with fallback chains
    const name: string | null =
      (miniProfile
        ? (() => {
            const first = safeString(miniProfile, "firstName");
            const last = safeString(miniProfile, "lastName");
            if (first && last) return `${first} ${last}`;
            if (first) return first;
            return null;
          })()
        : null) ??
      safeString(element, "name") ??
      safeString(element, "connectedMember", "name");

    const headline: string | null =
      safeString(miniProfile, "occupation") ??
      safeString(miniProfile, "headline", "text") ??
      safeString(element, "headline") ??
      null;

    const publicIdentifier: string | null =
      safeString(miniProfile, "publicIdentifier") ??
      safeString(element, "publicIdentifier") ??
      safeString(element, "connectedMember", "publicIdentifier") ??
      null;

    const linkedinUrl = buildProfileUrl(publicIdentifier);

    // Photo URL
    const photoUrl: string | null = (() => {
      try {
        // Mini profile photo lives under picture.rootUrl + artifacts
        const picture = miniProfile?.["picture"] as Record<string, unknown> | null;
        if (!picture) return null;
        const rootUrl = safeString(picture, "rootUrl");
        const artifacts = picture["artifacts"] as Array<Record<string, unknown>> | null;
        if (!Array.isArray(artifacts) || artifacts.length === 0) return null;
        // Use the last (largest) artifact
        const lastArtifact = artifacts[artifacts.length - 1];
        const segment = safeString(lastArtifact, "fileIdentifyingUrlPathSegment");
        if (rootUrl && segment) return `${rootUrl}${segment}`;
        return null;
      } catch {
        return null;
      }
    })();

    // Current company — available in the occupation string in miniProfile
    // and sometimes as a separate currentPositions field in included
    const currentCompany: string | null = (() => {
      try {
        // Some responses embed it explicitly
        const explicitCompany = safeString(miniProfile, "currentPosition", 0 as unknown as string, "companyName") ??
          safeString(element, "connectedMember", "currentPosition", 0 as unknown as string, "companyName");
        if (explicitCompany) return explicitCompany;
        // Extract from "Title at Company" occupation pattern
        const occ = safeString(miniProfile, "occupation");
        if (occ?.includes(" at ")) {
          return occ.split(" at ").slice(1).join(" at ").trim() || null;
        }
        return null;
      } catch {
        return null;
      }
    })();

    // Connection timestamp
    const connectedAt: string | null = (() => {
      try {
        const raw = element["connectedAt"];
        if (typeof raw === "number" && raw > 0) {
          return new Date(raw).toISOString();
        }
        return null;
      } catch {
        return null;
      }
    })();

    return {
      urn: profileUrn,
      entityId,
      name,
      headline,
      currentCompany,
      linkedinUrl,
      photoUrl,
      connectedAt,
    };
  } catch (err) {
    console.warn("[VoyagerList] parseConnectionElement error:", err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface ConnectionsPage {
  connections: VoyagerConnection[];
  /** Total connections count from the response paging metadata */
  total: number | null;
  /** Whether there are more pages after this one */
  hasMore: boolean;
}

/**
 * Fetches one page of the connections list from the Voyager API.
 *
 * @param start   Zero-based offset (0, 40, 80, ...)
 * @param csrfToken  CSRF token from getCsrfToken()
 * @returns  Parsed connections page, or null if the request fails.
 *
 * NOTE: This is a GET-only request. The extension never writes to LinkedIn.
 */
export async function fetchConnectionsPage(
  start: number,
  csrfToken: string
): Promise<ConnectionsPage | null> {
  const url = new URL("https://www.linkedin.com/voyager/api/relationships/dash/connections");
  // q=search is the Rest.li finder name and is REQUIRED — without it the
  // endpoint returns HTTP 400. (Verified empirically against the live API:
  // the same request 400s without q=search and 200s with it.)
  url.searchParams.set("q", "search");
  url.searchParams.set("count", String(CONNECTIONS_PAGE_SIZE));
  url.searchParams.set("start", String(start));
  url.searchParams.set("sortType", "RECENTLY_ADDED");
  // Decoration gives us miniProfile data inline
  url.searchParams.set(
    "decorationId",
    "com.linkedin.voyager.dash.deco.web.mynetwork.ConnectionListWithProfile-16"
  );

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
    console.error("[VoyagerList] Network error fetching connections page:", err);
    return null;
  }

  if (response.status === 429 || response.status === 999) {
    console.warn(`[VoyagerList] Rate limited (HTTP ${response.status})`);
    throw new RateLimitedError(response.status);
  }

  if (!response.ok) {
    console.error(`[VoyagerList] HTTP ${response.status} fetching connections page start=${start}`);
    return null;
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch (err) {
    console.error("[VoyagerList] Failed to parse response JSON:", err);
    return null;
  }

  return parseConnectionsResponse(body, start);
}

/**
 * Parses a single dash Profile entity (from included[]) into a VoyagerConnection.
 * Shape (verified live, May 2026):
 *   { $type: "...identity.profile.Profile", firstName, lastName, headline,
 *     publicIdentifier, entityUrn: "urn:li:fsd_profile:...", profilePicture }
 */
function parseProfileEntity(rec: Record<string, unknown>): VoyagerConnection | null {
  try {
    const urn = safeString(rec, "entityUrn");
    if (!urn) return null;

    const first = safeString(rec, "firstName");
    const last = safeString(rec, "lastName");
    const name = first && last ? `${first} ${last}` : (first ?? last ?? null);

    const headline =
      safeString(rec, "headline") ??
      safeString(rec, "occupation") ??
      null;

    const publicIdentifier = safeString(rec, "publicIdentifier");
    const linkedinUrl = buildProfileUrl(publicIdentifier);

    // Current company: parse from a "Title at Company" headline pattern.
    let currentCompany: string | null = null;
    if (headline?.includes(" at ")) {
      currentCompany = headline.split(" at ").slice(1).join(" at ").trim() || null;
    }

    // Photo: profilePicture.displayImageReference.vectorImage.{rootUrl,artifacts}
    let photoUrl: string | null = null;
    try {
      const pp = rec["profilePicture"] as Record<string, unknown> | null;
      const vector =
        ((pp?.["displayImageReference"] as Record<string, unknown> | null)?.["vectorImage"] as Record<string, unknown> | null) ??
        (pp?.["vectorImage"] as Record<string, unknown> | null);
      const rootUrl = safeString(vector ?? {}, "rootUrl");
      const artifacts = vector?.["artifacts"] as Array<Record<string, unknown>> | null;
      if (rootUrl && Array.isArray(artifacts) && artifacts.length > 0) {
        const seg = safeString(artifacts[artifacts.length - 1], "fileIdentifyingUrlPathSegment");
        if (seg) photoUrl = `${rootUrl}${seg}`;
      }
    } catch {
      photoUrl = null;
    }

    return {
      urn,
      entityId: extractEntityId(urn),
      name,
      headline,
      currentCompany,
      linkedinUrl,
      photoUrl,
      // connectedAt lives on the Connection entity, not the Profile; not needed
      // for import. Left null rather than cross-referencing for a field we
      // don't use downstream.
      connectedAt: null,
    };
  } catch (err) {
    console.warn("[VoyagerList] Failed to parse profile entity:", err);
    return null;
  }
}

/**
 * Parses the Voyager connections-list response body.
 * Defensive: every field access is wrapped; partial data is returned rather
 * than throwing on a missing field.
 */
function parseConnectionsResponse(body: unknown, start: number): ConnectionsPage | null {
  try {
    if (typeof body !== "object" || body === null) {
      console.warn("[VoyagerList] Response body is not an object");
      return null;
    }

    const root = body as Record<string, unknown>;

    // The `accept: application/vnd.linkedin.normalized+json+2.1` response is a
    // NORMALIZED envelope: entities live flat in `included[]`, and `data` holds
    // `*elements` (URN refs) + `paging`. The connection profiles are the
    // `included[]` items whose $type ends in `identity.profile.Profile`.
    // (Verified empirically against the live API, May 2026.)
    const data = root["data"] as Record<string, unknown> | null;

    // Total count from paging metadata (data.paging.total)
    let total: number | null = null;
    try {
      const paging = (data?.["paging"] ?? root["paging"]) as Record<string, unknown> | null;
      if (typeof paging?.["total"] === "number") total = paging["total"] as number;
    } catch {
      // non-fatal
    }

    const included = Array.isArray(root["included"]) ? (root["included"] as unknown[]) : [];
    if (included.length === 0) {
      console.warn("[VoyagerList] No included[] entities in response at start=" + start);
      return { connections: [], total, hasMore: false };
    }

    const connections: VoyagerConnection[] = [];
    let parseFailures = 0;
    let profileCount = 0;

    for (const item of included) {
      if (typeof item !== "object" || item === null) continue;
      const rec = item as Record<string, unknown>;
      const type = String(rec["$type"] ?? "");
      // Only the Profile entities are people; skip Connection/other records.
      if (!type.endsWith("identity.profile.Profile") && !rec["firstName"]) continue;
      profileCount++;
      const conn = parseProfileEntity(rec);
      if (conn) connections.push(conn);
      else parseFailures++;
    }

    if (parseFailures > 0) {
      console.warn(`[VoyagerList] ${parseFailures}/${profileCount} profile entities failed to parse at start=${start}`);
    }

    // hasMore: a full page of profiles came back AND we haven't reached total.
    const pageFull = profileCount >= CONNECTIONS_PAGE_SIZE;
    const hasMore = pageFull && (total === null || start + profileCount < total);

    return { connections, total, hasMore };
  } catch (err) {
    console.error("[VoyagerList] parseConnectionsResponse error:", err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Custom error for rate limiting
// ---------------------------------------------------------------------------

export class RateLimitedError extends Error {
  constructor(public readonly statusCode: number) {
    super(`LinkedIn rate limited: HTTP ${statusCode}`);
    this.name = "RateLimitedError";
  }
}

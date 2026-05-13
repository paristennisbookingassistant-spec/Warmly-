/**
 * service-worker/api-client.ts
 * HTTP calls to the Next.js backend API.
 * All calls are authenticated; auth token comes from auth.ts.
 *
 * Only short-lived operations live here (fetch, storage read/write).
 * Long-running orchestration stays in the content script.
 */

import type { ExtractedProfile } from "../shared/types";
import { getAuthHeader } from "./auth";
import { DEFAULT_BACKEND_URL, STORAGE_KEYS } from "../shared/constants";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Contact {
  id: string;
  name: string;
  linkedin_url: string;
}

export interface DiscoverySession {
  id: string;
  query: string;
  status: string;
  profiles_discovered: number;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Backend URL
// ---------------------------------------------------------------------------

/**
 * Returns the backend URL from storage, or falls back to localhost:3000.
 * The user (or a setup flow) may override this via chrome.storage.local.
 */
export async function getBackendUrl(): Promise<string> {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEYS.BACKEND_URL);
    const url = result[STORAGE_KEYS.BACKEND_URL] as string | undefined;
    return url?.replace(/\/$/, "") ?? DEFAULT_BACKEND_URL;
  } catch {
    return DEFAULT_BACKEND_URL;
  }
}

// ---------------------------------------------------------------------------
// Authenticated fetch wrapper
// ---------------------------------------------------------------------------

async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T | null> {
  const authHeader = await getAuthHeader();
  if (!authHeader) {
    console.error("[API Client] No auth token — user must log in via web app");
    return null;
  }

  const baseUrl = await getBackendUrl();

  try {
    const response = await fetch(`${baseUrl}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader,
        ...(options.headers as Record<string, string> | undefined),
      },
    });

    if (!response.ok) {
      console.error(`[API Client] ${response.status} ${path}`);
      return null;
    }

    // Backend routes use the standard { data, error } envelope. Unwrap so
    // callers get the actual payload and not the envelope. Falls back to
    // the raw body for legacy routes that returned T directly.
    const body = await response.json() as { data?: T; error?: unknown } | T;
    if (body && typeof body === "object" && "data" in (body as Record<string, unknown>)) {
      const env = body as { data: T | null; error?: unknown };
      return env.data ?? null;
    }
    return body as T;
  } catch (err) {
    console.error(`[API Client] Network error for ${path}:`, err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Saves a discovered LinkedIn profile to the backend.
 * Returns the created Contact record on success, null on failure.
 */
export async function saveDiscoveredProfile(
  profile: ExtractedProfile,
  sessionId: string
): Promise<Contact | null> {
  return apiFetch<Contact>("/api/contacts", {
    method: "POST",
    body: JSON.stringify({
      name: profile.name,
      linkedin_url: profile.linkedin_url,
      current_title: profile.current_title.title,
      company: profile.current_title.company,
      location: profile.location,
      avatar_url: profile.avatar ?? null,
      career_history: profile.previous_roles.map((r) => ({
        title: r.title,
        company: r.company,
        duration: r.duration,
      })),
      education: profile.education,
      profile_snapshot: profile,
      discovery_session_id: sessionId,
      source: "discovery",
    }),
  });
}

/**
 * Creates a discovery session record in the backend.
 */
export async function createDiscoverySession(
  query: string,
  filters?: Record<string, unknown>
): Promise<DiscoverySession | null> {
  return apiFetch<DiscoverySession>("/api/discovery", {
    method: "POST",
    body: JSON.stringify({ query, filters }),
  });
}

/**
 * Updates a discovery session (status, counts, etc.).
 */
export async function updateDiscoverySession(
  sessionId: string,
  update: Partial<DiscoverySession>
): Promise<void> {
  await apiFetch(`/api/discovery/${sessionId}`, {
    method: "PATCH",
    body: JSON.stringify(update),
  });
}

/**
 * Bookmarks a profile to the user's contacts (manual save from popup).
 */
export async function bookmarkProfile(
  profile: ExtractedProfile
): Promise<Contact | null> {
  return apiFetch<Contact>("/api/contacts", {
    method: "POST",
    body: JSON.stringify({
      name: profile.name,
      linkedin_url: profile.linkedin_url,
      current_title: profile.current_title.title,
      company: profile.current_title.company,
      location: profile.location,
      avatar_url: profile.avatar ?? null,
      career_history: profile.previous_roles.map((r) => ({
        title: r.title,
        company: r.company,
        duration: r.duration,
      })),
      education: profile.education,
      profile_snapshot: profile,
      source: "extension_bookmark",
    }),
  });
}

/**
 * Backward-compatible alias.
 */
export async function uploadProfile(
  profile: ExtractedProfile,
  discoverySessionId: string
): Promise<string | null> {
  const contact = await saveDiscoveredProfile(profile, discoverySessionId);
  return contact?.id ?? null;
}

// ---------------------------------------------------------------------------
// Batch ranking — runs after discovery saves N candidates so the popup can
// show "picked because: shared INSEAD class, same Bain → growth VC pivot..."
// rather than opaque scores. One LLM call, comparative ranking using
// profile_md as the primary "who is the user" signal.
// ---------------------------------------------------------------------------

export interface BatchRankResult {
  contact_id: string;
  rank: number;
  score: number;
  tier: 1 | 2 | 3;
  reasoning: string;
  hook: string;
}

export async function rankContactsBatch(
  contactIds: string[],
  topN = 10
): Promise<BatchRankResult[]> {
  if (contactIds.length === 0) return [];
  const result = await apiFetch<{ rankings: BatchRankResult[] }>(
    "/api/ai/rank-batch",
    {
      method: "POST",
      body: JSON.stringify({ contact_ids: contactIds, top_n: topN }),
    }
  );
  return result?.rankings ?? [];
}

// ---------------------------------------------------------------------------
// Draft reply from a captured LinkedIn thread.
// Called from messaging.ts when the user clicks "Draft reply with Warmly"
// inside a LinkedIn message thread.
// ---------------------------------------------------------------------------

export interface ThreadMessageInput {
  sender_role: "user" | "them" | "unknown";
  sender_name: string | null;
  text: string;
  timestamp_raw: string | null;
}

export interface DraftReplyResult {
  draft: string;
  reasoning: string;
  participant_name: string | null;
  message_count: number;
}

export async function draftReplyFromThread(payload: {
  participant_name: string | null;
  participant_linkedin_url: string | null;
  messages: ThreadMessageInput[];
  instruction?: string;
}): Promise<DraftReplyResult | null> {
  return apiFetch<DraftReplyResult>("/api/ai/draft-reply-from-thread", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

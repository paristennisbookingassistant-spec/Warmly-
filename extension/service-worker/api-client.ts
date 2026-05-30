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
 * Saves a profile to the user's contacts. Two ergonomic shorthand modes:
 *
 *   bookmarkProfile(profile)                       // manual one-off save
 *   bookmarkProfile(profile, { kind: "discovery" }) // bulk-discovery save
 *
 * The kind controls two backend-visible fields:
 *   - source: distinguishes manual saves from discovery for analytics
 *   - user_action: discovery saves land in /review (pending); manual saves
 *     go straight into /contacts (NULL = treated as already-triaged)
 *
 * Why a single function: the only difference between a "manual bookmark"
 * and a "discovery save" is these two fields. Keeping one save path
 * means we can't accidentally drift two implementations.
 */
export async function bookmarkProfile(
  profile: ExtractedProfile,
  options: { kind?: "manual" | "discovery" } = {}
): Promise<Contact | null> {
  const kind = options.kind ?? "manual";
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
      source: kind === "discovery" ? "discovery" : "extension_bookmark",
      // user_action is set server-side based on source (see /api/contacts
      // POST handler). Discovery sources land as 'pending', manual saves
      // pass through as null. Setting it explicitly here as belt-and-braces.
      user_action: kind === "discovery" ? "pending" : undefined,
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
// LinkedIn Network Sync — bulk import + sync job management
// ---------------------------------------------------------------------------

import type { BulkImportRequest, SyncJob } from "../shared/types";

/**
 * POSTs a batch of contacts to the bulk-import endpoint.
 * Returns true on success, null on failure.
 *
 * Phase 1: basic contacts (name, headline, photo, company, URL)
 * Phase 2: enriched contacts (experience, education, location, bio)
 */
export async function bulkImportContacts(
  request: BulkImportRequest
): Promise<{ imported: number } | null> {
  // The backend bulk-import endpoint uses a different (camelCase) contract than
  // the extension's internal snake_case model, and its Zod schema (a) requires
  // linkedinUrl to be a valid URL + name to be non-empty, and (b) rejects null
  // for optional fields (only omitted/undefined is allowed). Transform here so
  // the extension's model stays internal and the wire payload validates.
  const isUrl = (s: string | null): s is string =>
    typeof s === "string" && /^https?:\/\//.test(s);

  type WireItem = Record<string, unknown>;
  const batch: WireItem[] = [];
  for (const c of request.contacts) {
    // Required by the backend schema — skip items that can't satisfy them.
    if (!isUrl(c.linkedin_url) || !c.linkedin_urn || !c.name) continue;

    const item: WireItem = {
      linkedinUrl: c.linkedin_url,
      linkedinUrn: c.linkedin_urn,
      name: c.name,
    };
    // Only include optional fields when present (omit, never send null).
    if (c.headline) item.headline = c.headline;
    if (isUrl(c.photo_url)) item.photoUrl = c.photo_url;
    if (c.current_company) item.currentCompany = c.current_company;
    if (c.location) item.location = c.location;
    if (c.linkedin_bio) item.bio = c.linkedin_bio;
    if (Array.isArray(c.experience) && c.experience.length) item.experience = c.experience;
    if (Array.isArray(c.education) && c.education.length) item.education = c.education;
    batch.push(item);
  }

  if (batch.length === 0) {
    // Nothing valid to import in this batch (e.g. all connections lacked a
    // public profile URL). Treat as a no-op success rather than a failed POST.
    return { imported: 0 };
  }

  return apiFetch<{ imported: number }>("/api/contacts/bulk-import", {
    method: "POST",
    body: JSON.stringify({
      syncJobId: request.sync_job_id,
      phase: request.phase === 2 ? "batch" : "list",
      batch,
    }),
  });
}

/**
 * Creates a sync_job record on the backend.
 * Returns the created SyncJob on success, null on failure.
 */
export async function createSyncJobRecord(userId: string): Promise<SyncJob | null> {
  const now = new Date().toISOString();
  const localJob: SyncJob = {
    id: crypto.randomUUID(),
    user_id: userId,
    status: "pending",
    created_at: now,
    updated_at: now,
    total_connections: null,
    connections_imported: 0,
    profiles_enriched: 0,
    last_completed_page: -1,
    last_processed_urn_index: 0,
    collected_urns: [],
    cap_hit: false,
    backoff_count: 0,
    resume_after_ts: null,
  };

  // Attempt to persist to backend (best-effort; local fallback if offline)
  const backendJob = await apiFetch<SyncJob>("/api/sync-jobs", {
    method: "POST",
    body: JSON.stringify({ user_id: userId }),
  });

  // Use backend-assigned ID if available; otherwise use local UUID
  if (backendJob?.id) {
    return { ...localJob, ...backendJob };
  }

  console.warn("[API Client] createSyncJob: backend unavailable, using local UUID");
  return localJob;
}

/**
 * Updates a sync_job record on the backend.
 * Best-effort — failures are logged but not thrown.
 */
export async function updateSyncJobRecord(
  jobId: string,
  update: Partial<SyncJob>
): Promise<void> {
  await apiFetch(`/api/sync-jobs/${jobId}`, {
    method: "PATCH",
    body: JSON.stringify(update),
  });
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
  voice_signals_used?: {
    approved_learnings: number;
    past_messages: number;
    has_writing_style: boolean;
    has_profile_md: boolean;
    in_thread_user_messages: number;
  };
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

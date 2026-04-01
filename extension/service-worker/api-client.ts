/**
 * service-worker/api-client.ts
 * Backend API calls from the extension service worker.
 * Handles profile upload, session management, and contact creation.
 */

import type { ExtractedProfile } from "../shared/types";
import { getAuthHeader } from "./auth";

/** Base URL for the web app API — must match deployment URL */
const API_BASE_URL =
  process.env.NODE_ENV === "production"
    ? "https://ai-networking-coach.vercel.app"
    : "http://localhost:3000";

/**
 * Generic authenticated fetch wrapper.
 */
async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T | null> {
  const authHeader = await getAuthHeader();
  if (!authHeader) {
    console.error("[API Client] No auth token — user must log in via web app");
    return null;
  }

  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader,
        ...options.headers,
      },
    });

    if (!response.ok) {
      console.error(`[API Client] Request failed: ${response.status} ${path}`);
      return null;
    }

    return response.json() as Promise<T>;
  } catch (err) {
    console.error(`[API Client] Network error for ${path}:`, err);
    return null;
  }
}

/**
 * Uploads an extracted profile to the backend for scoring and storage.
 * Triggers the AI scoring engine via /api/contacts → /api/ai/score.
 */
export async function uploadProfile(
  profile: ExtractedProfile,
  discoverySessionId: string
): Promise<string | null> {
  const result = await apiFetch<{ data: { id: string } }>(
    "/api/contacts",
    {
      method: "POST",
      body: JSON.stringify({
        name: profile.name,
        linkedin_url: profile.linkedin_url,
        current_role: profile.current_role.title,
        company: profile.current_role.company,
        location: profile.location,
        source: "discovery",
        // Profile snapshot is included for full data preservation
        profile_snapshot: profile,
        discovery_session_id: discoverySessionId,
      }),
    }
  );

  return result?.data?.id ?? null;
}

/**
 * Updates the discovery session status in the backend.
 */
export async function updateDiscoverySession(
  sessionId: string,
  updates: {
    status?: string;
    profiles_viewed?: number;
    profiles_scored?: number;
    profiles_saved?: number;
  }
): Promise<void> {
  // TODO: Implement PATCH /api/discovery/[id] endpoint
  // For now, use the existing PUT-style update
  await apiFetch(`/api/discovery/${sessionId}`, {
    method: "PUT",
    body: JSON.stringify(updates),
  });
}

/**
 * Bookmarks the current LinkedIn profile to the user's contacts.
 * Called when user clicks "Save to AI Networking Coach" in the popup.
 */
export async function bookmarkProfile(
  profile: ExtractedProfile
): Promise<string | null> {
  const result = await apiFetch<{ data: { id: string } }>(
    "/api/contacts",
    {
      method: "POST",
      body: JSON.stringify({
        name: profile.name,
        linkedin_url: profile.linkedin_url,
        current_role: profile.current_role.title,
        company: profile.current_role.company,
        location: profile.location,
        source: "extension_bookmark",
      }),
    }
  );

  return result?.data?.id ?? null;
}

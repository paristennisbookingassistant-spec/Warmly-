/**
 * service-worker/auth.ts
 * Auth token management for the extension.
 *
 * The web app writes the Supabase JWT to chrome.storage.local after login.
 * The extension reads it for API calls. Tokens are never sent over postMessage.
 *
 * Storage key: "auth_token" — contains a raw JWT string.
 * The web app integration key: "supabase_session" — full session object.
 *
 * See PRD Section 5.3.
 */

import { STORAGE_KEYS } from "../shared/constants";

// ---------------------------------------------------------------------------
// Simple JWT token helpers
// ---------------------------------------------------------------------------

/**
 * Returns the stored JWT string, or null if not authenticated.
 */
export async function getAuthToken(): Promise<string | null> {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEYS.AUTH_TOKEN);
    const token = result[STORAGE_KEYS.AUTH_TOKEN] as string | undefined;
    return token ?? null;
  } catch {
    return null;
  }
}

/**
 * Stores a JWT in chrome.storage.local.
 */
export async function setAuthToken(token: string): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEYS.AUTH_TOKEN]: token });
}

/**
 * Removes the stored JWT (logout).
 */
export async function clearAuthToken(): Promise<void> {
  await chrome.storage.local.remove(STORAGE_KEYS.AUTH_TOKEN);
}

/**
 * Returns true if a valid (non-expired) auth token is present.
 * Performs a lightweight expiry check by decoding the JWT payload.
 */
export async function isAuthenticated(): Promise<boolean> {
  const token = await getAuthToken();
  if (!token) return false;

  try {
    // JWT = header.payload.signature — decode the payload (base64url)
    const parts = token.split(".");
    if (parts.length !== 3) return false;

    const payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/"))) as {
      exp?: number;
    };

    // Check expiry with a 60 s buffer
    if (payload.exp && Date.now() / 1000 > payload.exp - 60) {
      return false;
    }

    return true;
  } catch {
    // Malformed token
    return false;
  }
}

// ---------------------------------------------------------------------------
// Full Supabase session helpers (written by web app after login)
// ---------------------------------------------------------------------------

export interface SupabaseSession {
  user_id: string;
  access_token: string;
  refresh_token: string;
  expires_at: number; // Unix timestamp (seconds)
}

/**
 * Returns the full Supabase session stored by the web app, or null.
 */
export async function getSession(): Promise<SupabaseSession | null> {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEYS.SUPABASE_SESSION);
    const session = result[STORAGE_KEYS.SUPABASE_SESSION] as SupabaseSession | undefined;
    if (!session) return null;

    // Check expiry (with 60 s buffer)
    if (Date.now() / 1000 > session.expires_at - 60) {
      return null;
    }

    return session;
  } catch {
    return null;
  }
}

/**
 * Stores a full Supabase session.
 */
export async function storeSession(session: SupabaseSession): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEYS.SUPABASE_SESSION]: session });
}

/**
 * Clears the stored Supabase session.
 */
export async function clearSession(): Promise<void> {
  await chrome.storage.local.remove(STORAGE_KEYS.SUPABASE_SESSION);
}

/**
 * Returns the Authorization header value (Bearer <token>) for API calls.
 * Prefers the explicit auth_token; falls back to the Supabase session token.
 * Returns null if not authenticated.
 */
export async function getAuthHeader(): Promise<string | null> {
  // 1. Try explicit auth_token
  const directToken = await getAuthToken();
  if (directToken) return `Bearer ${directToken}`;

  // 2. Fall back to supabase_session
  const session = await getSession();
  if (session) return `Bearer ${session.access_token}`;

  return null;
}

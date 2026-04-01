/**
 * service-worker/auth.ts
 * Supabase session sharing between the extension and the web app.
 * The extension uses the same Supabase project as the web app.
 * Auth is shared via chrome.storage — user logs in once via web app.
 *
 * See PRD Section 5.3.
 */

const STORAGE_KEY = "supabase_session";

export interface SessionData {
  user_id: string;
  access_token: string;
  refresh_token: string;
  expires_at: number;
}

/**
 * Returns the stored Supabase session, or null if not authenticated.
 * The session is written to chrome.storage.local by a content script
 * injected on the web app's domain.
 */
export async function getSession(): Promise<SessionData | null> {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEY);
    const session = result[STORAGE_KEY] as SessionData | undefined;

    if (!session) return null;

    // Check if token is expired (with 60s buffer)
    if (Date.now() / 1000 > session.expires_at - 60) {
      // TODO: Refresh the token using the refresh_token
      // For MVP, return null and require re-login
      return null;
    }

    return session;
  } catch {
    return null;
  }
}

/**
 * Stores a Supabase session in chrome.storage.local.
 * Called by the web app content script after successful login.
 */
export async function storeSession(session: SessionData): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEY]: session });
}

/**
 * Clears the stored session (logout).
 */
export async function clearSession(): Promise<void> {
  await chrome.storage.local.remove(STORAGE_KEY);
}

/**
 * Returns the Authorization header value for API calls.
 * Null if not authenticated.
 */
export async function getAuthHeader(): Promise<string | null> {
  const session = await getSession();
  if (!session) return null;
  return `Bearer ${session.access_token}`;
}

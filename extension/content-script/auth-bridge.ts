/**
 * content-script/auth-bridge.ts
 * Runs on the web app's pages (localhost:3000 and the production URL).
 *
 * The web app sends the Supabase session via window.postMessage after login.
 * This script receives it and writes it to chrome.storage.local so the
 * service worker can use it to authenticate API calls.
 *
 * No extension ID required — same-origin postMessage is sufficient.
 */

import { STORAGE_KEYS } from "../shared/constants";

interface SessionPayload {
  user_id: string;
  access_token: string;
  refresh_token: string;
  expires_at: number;
}

window.addEventListener("message", (event: MessageEvent) => {
  // Only accept messages from the same window (not iframes or other origins)
  if (event.source !== window) return;
  if (event.data?.type !== "NETWORKING_COACH_AUTH") return;

  const session = event.data.session as SessionPayload | undefined;
  if (!session?.access_token) return;

  chrome.storage.local.set({
    [STORAGE_KEYS.SUPABASE_SESSION]: session,
    // isAuthenticated() checks AUTH_TOKEN — set it too so the popup shows as connected
    [STORAGE_KEYS.AUTH_TOKEN]: session.access_token,
  }, () => {
    console.log("[Auth Bridge] Session stored for extension");
  });
});

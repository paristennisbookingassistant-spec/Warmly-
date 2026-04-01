/**
 * service-worker/index.ts
 * Manifest V3 service worker entry point.
 *
 * Handles only SHORT-LIVED tasks:
 *   - Rate limit checks and state updates
 *   - Auth token reads
 *   - API calls (profile save, session create/update)
 *   - Heartbeat responses
 *
 * NEVER put long-running loops or orchestration here.
 * Long-lived state lives in the content script (orchestrator.ts).
 */

import {
  checkRateLimit,
  recordSessionStart,
  recordSessionEnd,
} from "./rate-limiter";
import { getSession, isAuthenticated } from "./auth";
import {
  saveDiscoveredProfile,
  createDiscoverySession,
  updateDiscoverySession,
} from "./api-client";
import type { ExtractedProfile } from "../shared/types";

// ---------------------------------------------------------------------------
// Message handler
// ---------------------------------------------------------------------------

chrome.runtime.onMessage.addListener(
  (
    message: { type: string; payload?: unknown },
    _sender,
    sendResponse: (response: unknown) => void
  ) => {
    // Return true immediately to signal async response
    handleMessage(message).then(sendResponse).catch((err) => {
      console.error("[SW] Message handler error:", err);
      sendResponse(null);
    });
    return true;
  }
);

async function handleMessage(
  message: { type: string; payload?: unknown }
): Promise<unknown> {
  switch (message.type) {
    // ---- Rate limit --------------------------------------------------------
    case "CHECK_RATE_LIMIT": {
      return checkRateLimit();
    }

    case "RECORD_SESSION_START": {
      await recordSessionStart();
      return { ok: true };
    }

    case "RECORD_SESSION_END": {
      await recordSessionEnd();
      return { ok: true };
    }

    // ---- Auth --------------------------------------------------------------
    case "AUTH_CHECK": {
      const authed = await isAuthenticated();
      if (!authed) return { user_id: null, access_token: null };
      const session = await getSession();
      return {
        user_id: session?.user_id ?? null,
        access_token: session?.access_token ?? null,
      };
    }

    // ---- Session management ------------------------------------------------
    case "CREATE_SESSION": {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- dynamic payload
      const p = message.payload as any;
      const session = await createDiscoverySession(p?.query ?? "", p?.filters);
      return session
        ? { session_id: session.id }
        : { session_id: crypto.randomUUID() }; // Offline fallback
    }

    case "SESSION_UPDATE":
    case "SESSION_COMPLETED": {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- dynamic payload
      const p = message.payload as any;
      if (p?.session_id) {
        await updateDiscoverySession(p.session_id, {
          status: p.status ?? "completed",
          profiles_discovered: p.profiles_saved ?? 0,
        });
      }
      return { ok: true };
    }

    case "SESSION_ERROR": {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- dynamic payload
      const p = message.payload as any;
      console.error("[SW] Session error from content script:", p?.error);
      return { ok: true };
    }

    // ---- Profile saving ----------------------------------------------------
    case "SAVE_PROFILE":
    case "PROFILE_EXTRACTED": {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- dynamic payload
      const p = message.payload as any;
      const profile = p?.profile as ExtractedProfile | undefined;
      const sessionId = p?.session_id as string | undefined;

      if (!profile || !sessionId) {
        console.warn("[SW] SAVE_PROFILE missing profile or session_id");
        return { ok: false };
      }

      const contact = await saveDiscoveredProfile(profile, sessionId);
      return { ok: contact !== null, contact_id: contact?.id ?? null };
    }

    // ---- Heartbeat ---------------------------------------------------------
    case "HEARTBEAT": {
      // Receiving this message keeps the service worker alive.
      // No action needed — just respond so the content script knows we're up.
      return { ok: true, ts: Date.now() };
    }

    // ---- Pause/Resume/Stop (forwarded from popup) --------------------------
    case "PAUSE_DISCOVERY":
    case "RESUME_DISCOVERY":
    case "STOP_DISCOVERY": {
      // The service worker re-broadcasts these to the active LinkedIn tab
      // so the content script orchestrator can act on them.
      const tabs = await chrome.tabs.query({ url: ["*://www.linkedin.com/*"] });
      for (const tab of tabs) {
        if (tab.id) {
          chrome.tabs.sendMessage(tab.id, message).catch(() => {
            // Tab may not have the content script loaded — non-fatal
          });
        }
      }
      return { ok: true };
    }

    // ---- Page bookmark (popup save button) ---------------------------------
    case "PAGE_BOOKMARKED": {
      // The popup sends this; we need to ask the content script to extract
      // the current profile and return it. The content script handles this
      // directly in its own message listener (index.ts).
      return { ok: true };
    }

    default:
      console.warn("[SW] Unknown message type:", message.type);
      return null;
  }
}

// ---------------------------------------------------------------------------
// Keep-alive alarm (belt-and-suspenders)
// ---------------------------------------------------------------------------

chrome.alarms.create("keepAlive", { periodInMinutes: 0.4 }); // ~24 s

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "keepAlive") {
    // Intentional no-op — receiving the alarm event reactivates the SW
  }
});

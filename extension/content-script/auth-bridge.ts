/**
 * content-script/auth-bridge.ts
 * Runs on the web app's pages (localhost:3000 and the production URL).
 *
 * Handles two channels:
 *
 * 1. Auth bridge (existing):
 *    The web app sends the Supabase session via window.postMessage after login.
 *    This script receives it and writes it to chrome.storage.local so the
 *    service worker can use it to authenticate API calls.
 *
 * 2. Network sync bridge (new):
 *    The web app sends START_NETWORK_SYNC, SYNC_STATUS_REQUEST messages.
 *    This script forwards them to the LinkedIn content-script tab (via SW)
 *    and relays SYNC_PROGRESS / SYNC_COMPLETE / SYNC_FAILED back to the web app
 *    via postMessage on the same origin.
 *
 * No extension ID required — same-origin postMessage is sufficient.
 * Origin of all inbound messages is verified before processing.
 */

import { STORAGE_KEYS } from "../shared/constants";
import type {
  StartNetworkSyncPayload,
  SyncProgressPayload,
  SyncCompletePayload,
  SyncFailedPayload,
  StartCompanyDiscoveryPayload,
  DiscoveryStartedPayload,
  DiscoveryProgressPayload,
  DiscoveryDonePayload,
  DiscoveryErrorPayload,
} from "../shared/types";

// ---------------------------------------------------------------------------
// Allowed origins for postMessage
// ---------------------------------------------------------------------------

const ALLOWED_ORIGINS = new Set([
  "https://ai-networking-coach.vercel.app",
  "http://localhost:3000",
]);

function isAllowedOrigin(origin: string): boolean {
  return ALLOWED_ORIGINS.has(origin);
}

// ---------------------------------------------------------------------------
// Existing: Session payload from web app login
// ---------------------------------------------------------------------------

interface SessionPayload {
  user_id: string;
  access_token: string;
  refresh_token: string;
  expires_at: number;
}

// ---------------------------------------------------------------------------
// Relay sync events from SW back to the web app window
// ---------------------------------------------------------------------------

/**
 * Posts a message to the current window (web app) with the Warmly origin marker.
 * The web app's useExtensionBridge hook listens for this pattern.
 */
function postToWebApp(type: string, payload: unknown): void {
  window.postMessage({ source: "WARMLY_EXTENSION", type, payload }, window.location.origin);
}

// ---------------------------------------------------------------------------
// Main message listener
// ---------------------------------------------------------------------------

window.addEventListener("message", (event: MessageEvent) => {
  // Only accept messages from the same window (not iframes or cross-origin)
  if (event.source !== window) return;

  // Verify origin is an allowed web app URL
  if (!isAllowedOrigin(event.origin)) return;

  const data = event.data as { type?: string; [key: string]: unknown } | null;
  if (!data || typeof data.type !== "string") return;

  switch (data.type) {
    // ---- Existing: auth session ----------------------------------------
    case "NETWORKING_COACH_AUTH": {
      const session = data.session as SessionPayload | undefined;
      if (!session?.access_token) return;

      chrome.storage.local.set({
        [STORAGE_KEYS.SUPABASE_SESSION]: session,
        [STORAGE_KEYS.AUTH_TOKEN]: session.access_token,
      }, () => {
        console.log("[Auth Bridge] Session stored for extension");
      });
      break;
    }

    // ---- New: start network sync ---------------------------------------
    case "START_NETWORK_SYNC": {
      const payload = data.payload as StartNetworkSyncPayload | undefined;
      if (!payload?.user_id) {
        console.warn("[Auth Bridge] START_NETWORK_SYNC missing user_id");
        return;
      }

      console.log("[Auth Bridge] Forwarding START_NETWORK_SYNC to SW");
      chrome.runtime.sendMessage({
        type: "START_NETWORK_SYNC",
        payload,
      }).catch((err) => {
        console.error("[Auth Bridge] Failed to forward START_NETWORK_SYNC:", err);
        postToWebApp("SYNC_FAILED", {
          sync_job_id: null,
          reason: "extension_unavailable",
        } satisfies SyncFailedPayload);
      });
      break;
    }

    // ---- New: sync status request -------------------------------------
    case "SYNC_STATUS_REQUEST": {
      chrome.runtime.sendMessage({ type: "SYNC_STATUS_REQUEST" })
        .then((response: unknown) => {
          postToWebApp("SYNC_STATUS_RESPONSE", response);
        })
        .catch((err) => {
          console.warn("[Auth Bridge] SYNC_STATUS_REQUEST failed:", err);
          postToWebApp("SYNC_STATUS_RESPONSE", null);
        });
      break;
    }

    // ---- New: start company discovery ---------------------------------
    // The web app sends WEBAPP_DISCOVER with a StartCompanyDiscoveryPayload.
    // We relay it to the SW which invokes the existing CDP_DISCOVER flow.
    case "WEBAPP_DISCOVER": {
      const payload = data.payload as StartCompanyDiscoveryPayload | undefined;
      if (!payload?.companyName || !payload?.user_id) {
        console.warn("[Auth Bridge] WEBAPP_DISCOVER missing companyName or user_id");
        postToWebApp("DISCOVERY_ERROR", {
          discovery_session_id: null,
          companyName: payload?.companyName ?? "",
          reason: "missing_required_fields",
        } satisfies DiscoveryErrorPayload);
        return;
      }

      console.log("[Auth Bridge] Forwarding WEBAPP_DISCOVER to SW:", payload.companyName);
      chrome.runtime.sendMessage({
        type: "WEBAPP_DISCOVER",
        payload,
      }).catch((err) => {
        console.error("[Auth Bridge] Failed to forward WEBAPP_DISCOVER:", err);
        postToWebApp("DISCOVERY_ERROR", {
          discovery_session_id: payload.discovery_session_id ?? null,
          companyName: payload.companyName,
          reason: "extension_unavailable",
        } satisfies DiscoveryErrorPayload);
      });
      break;
    }

    default:
      // Ignore unrecognized message types from the web app
      break;
  }
});

// ---------------------------------------------------------------------------
// Listen for sync event relays from the service worker
// (SW broadcasts WEBAPP_SYNC_* messages which we forward to the web app page)
// ---------------------------------------------------------------------------

chrome.runtime.onMessage.addListener(
  (message: { type?: string; payload?: unknown }) => {
    if (!message?.type?.startsWith("WEBAPP_")) return;

    const webAppType = message.type.replace(/^WEBAPP_/, "");

    switch (webAppType) {
      case "SYNC_PROGRESS":
        postToWebApp("SYNC_PROGRESS", message.payload as SyncProgressPayload);
        break;
      case "SYNC_COMPLETE":
        postToWebApp("SYNC_COMPLETE", message.payload as SyncCompletePayload);
        break;
      case "SYNC_FAILED":
        postToWebApp("SYNC_FAILED", message.payload as SyncFailedPayload);
        break;
      // ---- Company discovery relay (SW → web app) -------------------
      case "DISCOVERY_STARTED":
        postToWebApp("DISCOVERY_STARTED", message.payload as DiscoveryStartedPayload);
        break;
      case "DISCOVERY_PROGRESS":
        postToWebApp("DISCOVERY_PROGRESS", message.payload as DiscoveryProgressPayload);
        break;
      case "DISCOVERY_DONE":
        postToWebApp("DISCOVERY_DONE", message.payload as DiscoveryDonePayload);
        break;
      case "DISCOVERY_ERROR":
        postToWebApp("DISCOVERY_ERROR", message.payload as DiscoveryErrorPayload);
        break;
      default:
        break;
    }
  }
);

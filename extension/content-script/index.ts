/**
 * content-script/index.ts
 * Entry point — injected on all linkedin.com pages at document_idle.
 *
 * Responsibilities:
 * 1. Listen for control messages from popup / service worker
 * 2. Route them to the orchestrator
 * 3. Handle PAGE_BOOKMARKED (extract + forward current profile)
 */

import {
  startDiscovery,
  pauseDiscovery,
  resumeDiscovery,
  stopDiscovery,
} from "./orchestrator";
import { extractProfileFromDOM } from "./dom-reader";
import { isProfilePage } from "./dom-reader";
import type { StartDiscoveryPayload, ExtensionMessage } from "../shared/types";

// ---------------------------------------------------------------------------
// Message listener
// ---------------------------------------------------------------------------

chrome.runtime.onMessage.addListener(
  (
    message: ExtensionMessage & { payload?: unknown },
    _sender,
    sendResponse: (response: unknown) => void
  ) => {
    switch (message.type) {
      case "START_DISCOVERY": {
        const payload = message.payload as StartDiscoveryPayload;
        startDiscovery(payload)
          .then(() => sendResponse({ ok: true }))
          .catch((err) => sendResponse({ ok: false, error: String(err) }));
        return true; // async
      }

      case "PAUSE_DISCOVERY": {
        pauseDiscovery();
        sendResponse({ ok: true });
        break;
      }

      case "STOP_DISCOVERY": {
        stopDiscovery();
        sendResponse({ ok: true });
        break;
      }

      // RESUME is handled by a custom message from popup → SW → content script
      case "RESUME_DISCOVERY": {
        resumeDiscovery();
        sendResponse({ ok: true });
        break;
      }

      case "PAGE_BOOKMARKED": {
        if (!isProfilePage()) {
          sendResponse({ ok: false, reason: "not_a_profile_page" });
          break;
        }
        const profile = extractProfileFromDOM(null);
        if (!profile) {
          sendResponse({ ok: false, reason: "extraction_failed" });
          break;
        }
        // Forward to service worker for API upload
        chrome.runtime
          .sendMessage({
            type: "SAVE_PROFILE",
            payload: { profile, session_id: null },
          })
          .catch(console.error);
        sendResponse({ ok: true, profile });
        break;
      }

      default:
        sendResponse(null);
    }
  }
);

console.debug("[AI Networking Coach] Content script loaded on", window.location.href);

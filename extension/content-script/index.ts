/**
 * content-script/index.ts
 * Entry point — injected on all linkedin.com pages at document_idle.
 *
 * Responsibilities:
 * 1. Listen for control messages from popup / service worker
 * 2. Route them to the orchestrator
 * 3. Handle PAGE_BOOKMARKED (extract + forward current profile)
 * 4. Initialize messaging-thread capture (injects "Save to Warmly"
 *    button on /messaging/thread/* URLs)
 */

import {
  startDiscovery,
  pauseDiscovery,
  resumeDiscovery,
  stopDiscovery,
} from "./orchestrator";
import { extractProfileFromDOM } from "./dom-reader";
import { isProfilePage } from "./dom-reader";
import { initMessagingCapture } from "./messaging";
import { startSync, abortSync } from "./connections-sync";
import type { StartDiscoveryPayload, ExtensionMessage, StartNetworkSyncPayload } from "../shared/types";

// ---------------------------------------------------------------------------
// Banner log — fires unconditionally on every LinkedIn page load.
// If you don't see this in the console, the content script is not
// loading (extension not reloaded, or Chrome blocked it).
// ---------------------------------------------------------------------------

console.log(
  "%c[WARMLY] content script loaded",
  "background:#b87a4a;color:#fff;padding:2px 8px;border-radius:4px;font-weight:600;"
);

// ---------------------------------------------------------------------------
// One-time initializations on script load
// ---------------------------------------------------------------------------

// Messaging capture polls the DOM for any LinkedIn message thread
// (overlay bubble OR full /messaging/ page) and injects a "Save to
// Warmly" button into each. URL-agnostic.
try {
  initMessagingCapture();
} catch (err) {
  console.error("[WARMLY] initMessagingCapture failed:", err);
}

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

        // Scroll to trigger LinkedIn's lazy-loaded Experience/Education sections
        const scrollAndCollect = async () => {
          const scrollStep = 600;
          for (let i = 0; i < 8; i++) {
            window.scrollBy(0, scrollStep);
            await new Promise<void>((r) => setTimeout(r, 400));
          }
          window.scrollTo(0, 0);
          await new Promise<void>((r) => setTimeout(r, 500));

          // Collect raw page text + avatar + URL for MiniMax extraction
          const main = document.querySelector("main");
          if (!main) return null;

          const fullText = main.innerText;
          const lines = fullText.split("\n");

          // Extract header + Experience + Education sections (same as CDP flow)
          const header = lines.slice(0, 30).join("\n");
          function getSection(startHeading: string, stopHeadings: string[]): string {
            const startIdx = lines.findIndex((l) => l.trim() === startHeading);
            if (startIdx === -1) return "";
            const result = [startHeading];
            for (let i = startIdx + 1; i < lines.length; i++) {
              if (stopHeadings.includes(lines[i].trim())) break;
              result.push(lines[i]);
            }
            return result.join("\n");
          }
          const expSection = getSection("Experience", ["Education", "Skills", "Languages", "Licenses & certifications", "Certifications", "Courses", "Projects", "Volunteering"]);
          const eduSection = getSection("Education", ["Skills", "Languages", "Licenses & certifications", "Certifications", "Courses", "Projects", "Volunteering"]);
          const pageText = [header, expSection, eduSection].filter(Boolean).join("\n\n---\n\n");

          // Avatar
          let avatar: string | null = null;
          const photoAnchor = document.querySelector('[aria-label="Profile photo"]');
          if (photoAnchor) {
            const img = photoAnchor.querySelector<HTMLImageElement>("img")
              ?? photoAnchor.closest("div")?.querySelector<HTMLImageElement>("img")
              ?? photoAnchor.parentElement?.querySelector<HTMLImageElement>("img");
            if (img?.src?.includes("media.licdn.com")) avatar = img.src;
          }
          if (!avatar) {
            const mainImgs = main.querySelectorAll<HTMLImageElement>('img[src*="media.licdn.com"]');
            avatar = mainImgs[0]?.src ?? null;
          }

          return {
            pageText,
            avatar,
            linkedinUrl: window.location.href.split("?")[0],
          };
        };

        scrollAndCollect()
          .then((data) => {
            if (!data?.pageText || data.pageText.length < 50) {
              console.warn("[AI Networking Coach] Could not extract page text");
              sendResponse({ ok: false, reason: "extraction_failed" });
              return;
            }
            console.debug("[AI Networking Coach] Sending page text to MiniMax extraction:", data.pageText.length, "chars");
            // Send raw page text to service worker for MiniMax extraction + save
            chrome.runtime
              .sendMessage({ type: "EXTRACT_AND_SAVE", payload: data })
              .then((swResponse: { ok?: boolean; reason?: string } | undefined) => {
                sendResponse({ ok: swResponse?.ok === true, reason: swResponse?.ok ? undefined : (swResponse?.reason ?? "save_failed") });
              })
              .catch((err: unknown) => {
                console.error("[AI Networking Coach] EXTRACT_AND_SAVE failed:", err);
                sendResponse({ ok: false, reason: "save_failed" });
              });
          })
          .catch((err) => {
            console.error("[AI Networking Coach] scrollAndCollect error:", err);
            sendResponse({ ok: false, reason: "extraction_failed" });
          });
        return true; // keep message channel open for async sendResponse
      }

      // ---- LinkedIn Network Sync ------------------------------------------
      case "TRIGGER_NETWORK_SYNC": {
        const syncPayload = message.payload as StartNetworkSyncPayload & { sync_job_id?: string };
        const userId = syncPayload?.user_id;
        const jobId = syncPayload?.sync_job_id;

        if (!userId) {
          sendResponse({ ok: false, reason: "missing_user_id" });
          break;
        }

        // Fire-and-forget — sync loop runs in background and emits progress via SW
        startSync(userId, jobId)
          .catch((err) => {
            console.error("[Content Script] startSync error:", err);
          });

        sendResponse({ ok: true });
        break;
      }

      case "STOP_NETWORK_SYNC": {
        abortSync();
        sendResponse({ ok: true });
        break;
      }

      default:
        sendResponse(null);
    }
  }
);

console.debug("[AI Networking Coach] Content script loaded on", window.location.href);

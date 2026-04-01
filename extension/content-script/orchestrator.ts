/**
 * content-script/orchestrator.ts
 * Discovery session orchestration loop.
 *
 * CRITICAL: This MUST run in the content script, NOT the service worker.
 * Manifest V3 service workers are terminated after 30s of inactivity.
 * Discovery sessions run for 15-20 minutes.
 * Content scripts stay alive as long as the LinkedIn tab is open.
 * See PRD Section 5.3.
 *
 * The orchestrator:
 * 1. Receives a StartDiscovery message from the service worker/popup
 * 2. Iterates through target companies
 * 3. For each company: navigates to search, collects profile URLs, visits each profile
 * 4. Extracts profile data from each profile page
 * 5. Sends extracted profiles to the service worker for API upload
 * 6. Pings the service worker every 25s (heartbeat) to keep it alive
 * 7. Persists progress to chrome.storage.local for crash recovery
 */

import type {
  DiscoverySessionState,
  StartDiscoveryPayload,
  ExtensionMessage,
} from "../shared/types";
import { extractProfileFromDOM } from "./dom-reader";
import {
  navigateToCompanySearch,
  collectProfileUrlsFromSearchResults,
  navigateToProfile,
  waitForProfileLoad,
  waitBeforeNextProfile,
  isLoginWall,
} from "./navigator";
import { simulateProfileReading, getSessionProfileLimit } from "./behavior-sim";

/** Max profiles per session — hard limit from PRD DIS-08 */
const MAX_PROFILES_PER_SESSION = 25;

/** Heartbeat interval in ms — keeps service worker alive */
const HEARTBEAT_INTERVAL_MS = 25_000;

let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
let sessionState: DiscoverySessionState | null = null;
let isPaused = false;
let isStopped = false;

// ---------------------------------------------------------------------------
// Entry point — called when content script receives START_DISCOVERY message
// ---------------------------------------------------------------------------

export async function startDiscovery(
  payload: StartDiscoveryPayload
): Promise<void> {
  isStopped = false;
  isPaused = false;

  const actualLimit = getSessionProfileLimit(
    Math.min(payload.max_profiles, MAX_PROFILES_PER_SESSION)
  );

  sessionState = {
    session_id: payload.session_id,
    user_id: "",  // populated from auth check
    target_companies: payload.target_companies,
    current_company_index: 0,
    profiles_viewed: 0,
    profiles_scored: 0,
    profiles_saved: 0,
    status: "running",
    started_at: new Date().toISOString(),
    last_heartbeat: new Date().toISOString(),
    completed_companies: [],
    processed_urls: [],
  };

  await persistState();
  startHeartbeat();

  try {
    await runDiscoveryLoop(actualLimit);
  } catch (err) {
    console.error("[Orchestrator] Discovery loop error:", err);
    await updateStatus("failed");
    sendMessage({ type: "SESSION_ERROR", payload: { error: String(err) } });
  } finally {
    stopHeartbeat();
  }
}

// ---------------------------------------------------------------------------
// Main discovery loop
// ---------------------------------------------------------------------------

async function runDiscoveryLoop(maxProfiles: number): Promise<void> {
  if (!sessionState) return;

  for (
    let companyIdx = sessionState.current_company_index;
    companyIdx < sessionState.target_companies.length;
    companyIdx++
  ) {
    if (isStopped) break;

    const company = sessionState.target_companies[companyIdx];
    sessionState.current_company_index = companyIdx;

    await navigateToCompanySearch(company, ["associate", "MBA", "consulting"]);
    await new Promise((resolve) => setTimeout(resolve, 3000));

    if (isLoginWall()) {
      console.warn("[Orchestrator] Login wall detected — pausing discovery");
      await updateStatus("paused");
      sendMessage({ type: "SESSION_ERROR", payload: { error: "LinkedIn session expired" } });
      return;
    }

    const profileUrls = collectProfileUrlsFromSearchResults();

    for (const url of profileUrls) {
      if (isStopped) break;
      if (sessionState.profiles_viewed >= maxProfiles) break;
      if (sessionState.processed_urls.includes(url)) continue;

      while (isPaused && !isStopped) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      if (isStopped) break;

      await navigateToProfile(url);
      const loaded = await waitForProfileLoad();

      if (!loaded) {
        console.warn(`[Orchestrator] Profile failed to load: ${url}`);
        continue;
      }

      await simulateProfileReading();

      const profile = extractProfileFromDOM(sessionState.session_id);

      sessionState.profiles_viewed++;
      sessionState.processed_urls.push(url);

      if (profile) {
        sendMessage({ type: "PROFILE_EXTRACTED", payload: { profile, session_id: sessionState.session_id } });
        sessionState.profiles_saved++;
      }

      sendMessage({
        type: "SESSION_UPDATE",
        payload: {
          session_id: sessionState.session_id,
          profiles_viewed: sessionState.profiles_viewed,
          profiles_scored: sessionState.profiles_scored,
          profiles_saved: sessionState.profiles_saved,
          status: "running",
          current_company: company,
        },
      });

      await persistState();

      if (sessionState.profiles_viewed < maxProfiles) {
        await waitBeforeNextProfile();
      }
    }

    sessionState.completed_companies.push(company);
  }

  await updateStatus("completed");
  sendMessage({
    type: "SESSION_COMPLETED",
    payload: {
      session_id: sessionState?.session_id,
      profiles_saved: sessionState?.profiles_saved,
    },
  });
}

// ---------------------------------------------------------------------------
// Heartbeat — keeps service worker alive during long discovery sessions
// ---------------------------------------------------------------------------

function startHeartbeat() {
  heartbeatTimer = setInterval(() => {
    sendMessage({ type: "HEARTBEAT", payload: { session_id: sessionState?.session_id } });
    if (sessionState) {
      sessionState.last_heartbeat = new Date().toISOString();
      persistState();
    }
  }, HEARTBEAT_INTERVAL_MS);
}

function stopHeartbeat() {
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }
}

// ---------------------------------------------------------------------------
// State persistence
// ---------------------------------------------------------------------------

async function persistState(): Promise<void> {
  if (!sessionState) return;
  await chrome.storage.local.set({ discovery_session: sessionState });
}

async function updateStatus(status: DiscoverySessionState["status"]): Promise<void> {
  if (sessionState) {
    sessionState.status = status;
    await persistState();
  }
}

// ---------------------------------------------------------------------------
// Messaging
// ---------------------------------------------------------------------------

function sendMessage(message: ExtensionMessage): void {
  chrome.runtime.sendMessage(message).catch(() => {
    // Service worker may be temporarily unavailable — heartbeat will reconnect
  });
}

// ---------------------------------------------------------------------------
// External controls — called from message listener in index.ts
// ---------------------------------------------------------------------------

export function pauseDiscovery(): void {
  isPaused = true;
  if (sessionState) {
    sessionState.status = "paused";
    persistState();
  }
}

export function resumeDiscovery(): void {
  isPaused = false;
  if (sessionState) {
    sessionState.status = "running";
    persistState();
  }
}

export function stopDiscovery(): void {
  isStopped = true;
  stopHeartbeat();
  if (sessionState) {
    sessionState.status = "completed";
    persistState();
  }
}

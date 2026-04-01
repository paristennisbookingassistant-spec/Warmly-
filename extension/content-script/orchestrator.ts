/**
 * content-script/orchestrator.ts
 * Discovery session orchestration loop.
 *
 * CRITICAL: This file runs in the CONTENT SCRIPT, NOT the service worker.
 * Manifest V3 service workers are terminated after 30 s of inactivity.
 * Discovery sessions run for 15-20 minutes.
 * Content scripts stay alive as long as the LinkedIn tab is open.
 * See PRD Section 5.3.
 *
 * Architecture:
 * - Orchestrator holds all loop state (never in SW)
 * - SW handles only short-lived tasks: API calls, rate limit storage
 * - Content script pings SW every 25 s (heartbeat) to keep it alive
 * - Progress is broadcast to popup after each profile via chrome.runtime.sendMessage
 * - State is persisted to chrome.storage.local for crash recovery
 */

import type {
  DiscoverySessionState,
  StartDiscoveryPayload,
  ExtensionMessage,
} from "../shared/types";
import { extractProfileFromDOM } from "./dom-reader";
import {
  searchLinkedIn,
  collectProfileUrlsFromSearchResults,
  navigateToProfile,
  waitForProfileLoad,
  isLoginWall,
  goToNextResultsPage,
  type SearchFilters,
} from "./navigator";
import {
  humanDelay,
  simulateProfileReading,
  getSessionProfileLimit,
  naturalScroll,
} from "./behavior-sim";
import {
  MAX_PROFILES_PER_SESSION,
  HEARTBEAT_INTERVAL_MS,
  STORAGE_KEYS,
} from "../shared/constants";

// ---------------------------------------------------------------------------
// Session state types
// ---------------------------------------------------------------------------

export type SessionState =
  | "IDLE"
  | "STARTING"
  | "SEARCHING"
  | "VISITING_PROFILE"
  | "PROCESSING"
  | "PAUSED"
  | "COMPLETED"
  | "RATE_LIMITED"
  | "ERROR";

export interface SessionProgress {
  profilesVisited: number;
  profilesDiscovered: number;
  total: number;
  state: SessionState;
  sessionId: string | null;
}

// ---------------------------------------------------------------------------
// DiscoveryOrchestrator
// ---------------------------------------------------------------------------

export class DiscoveryOrchestrator {
  private state: SessionState = "IDLE";
  private sessionId: string | null = null;
  private profilesVisited = 0;
  private profilesDiscovered = 0;
  private isPaused = false;
  private shouldStop = false;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private sessionLimit = MAX_PROFILES_PER_SESSION;

  // -----------------------------------------------------------------------
  // Public controls
  // -----------------------------------------------------------------------

  async startSession(query: string, filters?: SearchFilters): Promise<void> {
    // 1. Check rate limit via service worker
    const rateLimitResponse = await this.sendMessage({
      type: "CHECK_RATE_LIMIT" as ExtensionMessage["type"],
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- runtime message payload
    const rl = rateLimitResponse as any;
    if (rl && rl.allowed === false) {
      this.transition("RATE_LIMITED");
      throw new Error(rl.reason ?? "Rate limit exceeded");
    }

    this.transition("STARTING");
    this.isPaused = false;
    this.shouldStop = false;
    this.profilesVisited = 0;
    this.profilesDiscovered = 0;
    this.sessionLimit = getSessionProfileLimit(MAX_PROFILES_PER_SESSION);

    // 2. Create session record
    const createResponse = await this.sendMessage({
      type: "CREATE_SESSION" as ExtensionMessage["type"],
      payload: { query, filters },
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- runtime message payload
    const cs = createResponse as any;
    this.sessionId = cs?.session_id ?? crypto.randomUUID();

    // 3. Record session start in rate limiter
    await this.sendMessage({
      type: "RECORD_SESSION_START" as ExtensionMessage["type"],
    });

    this.startHeartbeat();

    try {
      this.transition("SEARCHING");
      await searchLinkedIn(query, filters);
      await this.discoveryLoop(query);
    } catch (err) {
      console.error("[Orchestrator] Discovery loop error:", err);
      this.transition("ERROR");
      await this.broadcastProgress();
      throw err;
    } finally {
      this.stopHeartbeat();
      await this.sendMessage({
        type: "RECORD_SESSION_END" as ExtensionMessage["type"],
      });
    }
  }

  async pauseSession(): Promise<void> {
    this.isPaused = true;
    this.transition("PAUSED");
    await this.persistState();
    await this.broadcastProgress();
  }

  async resumeSession(): Promise<void> {
    this.isPaused = false;
    this.transition("SEARCHING");
    await this.broadcastProgress();
  }

  async stopSession(): Promise<void> {
    this.shouldStop = true;
    this.isPaused = false; // Unblock any pause polling loop
    this.stopHeartbeat();
    this.transition("COMPLETED");
    await this.persistState();
    await this.broadcastProgress();
  }

  getState(): SessionState {
    return this.state;
  }

  getProgress(): SessionProgress {
    return {
      profilesVisited: this.profilesVisited,
      profilesDiscovered: this.profilesDiscovered,
      total: this.sessionLimit,
      state: this.state,
      sessionId: this.sessionId,
    };
  }

  // -----------------------------------------------------------------------
  // Discovery loop — runs entirely in content script
  // -----------------------------------------------------------------------

  private async discoveryLoop(query: string): Promise<void> {
    const visitedUrls = new Set<string>();

    outerLoop: while (
      this.profilesVisited < this.sessionLimit &&
      !this.shouldStop
    ) {
      // Collect profile URLs from current search results page
      const urls = collectProfileUrlsFromSearchResults().filter(
        (u) => !visitedUrls.has(u)
      );

      if (urls.length === 0) {
        // No unvisited URLs on this page — try next page
        const hasNext = await goToNextResultsPage();
        if (!hasNext) break; // No more pages — session complete
        continue;
      }

      for (const url of urls) {
        if (this.shouldStop) break outerLoop;
        if (this.profilesVisited >= this.sessionLimit) break outerLoop;
        if (visitedUrls.has(url)) continue;

        // ---- Pause polling loop ----
        while (this.isPaused && !this.shouldStop) {
          await this.sleep(1000);
        }
        if (this.shouldStop) break outerLoop;

        visitedUrls.add(url);

        // -- Step 1: Scroll search page naturally before leaving --
        this.transition("VISITING_PROFILE");
        await naturalScroll();

        // -- Step 2: Navigate to profile --
        await navigateToProfile(url);
        const loaded = await waitForProfileLoad();

        if (!loaded) {
          console.warn(`[Orchestrator] Profile did not load: ${url}`);
          this.transition("SEARCHING");
          continue;
        }

        // Check for login wall after navigation
        if (isLoginWall()) {
          console.warn("[Orchestrator] Login wall detected — stopping session");
          this.transition("ERROR");
          await this.sendMessage({
            type: "SESSION_ERROR" as ExtensionMessage["type"],
            payload: { error: "LinkedIn session expired — please log in again" },
          });
          return;
        }

        // -- Step 3: Simulate reading the profile --
        this.transition("PROCESSING");
        await simulateProfileReading();

        // -- Step 4: Extract profile data --
        const profile = extractProfileFromDOM(this.sessionId);

        this.profilesVisited++;

        if (profile) {
          this.profilesDiscovered++;
          await this.sendMessage({
            type: "SAVE_PROFILE" as ExtensionMessage["type"],
            payload: { profile, session_id: this.sessionId },
          });
        }

        // -- Step 5: Broadcast progress to popup --
        this.transition("SEARCHING");
        await this.broadcastProgress();
        await this.persistState();

        // -- Step 6: Navigate back to search results --
        window.history.back();
        await this.sleep(2000); // brief wait for navigation

        // -- Step 7: Human delay before visiting next profile --
        if (this.profilesVisited < this.sessionLimit && !this.shouldStop) {
          await humanDelay();
        }
      }

      // After exhausting all URLs on this page, try to go to the next page
      if (!this.shouldStop && this.profilesVisited < this.sessionLimit) {
        const hasNext = await goToNextResultsPage();
        if (!hasNext) break;
      }
    }

    this.transition("COMPLETED");
    await this.persistState();
    await this.broadcastProgress();

    // Send final summary to service worker
    await this.sendMessage({
      type: "SESSION_COMPLETED" as ExtensionMessage["type"],
      payload: {
        session_id: this.sessionId,
        profiles_saved: this.profilesDiscovered,
      },
    });
  }

  // -----------------------------------------------------------------------
  // State machine
  // -----------------------------------------------------------------------

  private transition(next: SessionState): void {
    console.debug(`[Orchestrator] ${this.state} → ${next}`);
    this.state = next;
  }

  // -----------------------------------------------------------------------
  // Heartbeat — keeps service worker alive
  // -----------------------------------------------------------------------

  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      this.sendMessage({
        type: "HEARTBEAT" as ExtensionMessage["type"],
        payload: { session_id: this.sessionId },
      }).catch(() => {
        // Service worker may be briefly unavailable — non-fatal
      });
    }, HEARTBEAT_INTERVAL_MS);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  // -----------------------------------------------------------------------
  // State persistence
  // -----------------------------------------------------------------------

  private async persistState(): Promise<void> {
    const snapshot = {
      session_id: this.sessionId,
      state: this.state,
      profiles_visited: this.profilesVisited,
      profiles_discovered: this.profilesDiscovered,
      session_limit: this.sessionLimit,
    };
    await chrome.storage.local.set({
      [STORAGE_KEYS.DISCOVERY_SESSION]: snapshot,
    });
  }

  // -----------------------------------------------------------------------
  // Progress broadcasting
  // -----------------------------------------------------------------------

  private async broadcastProgress(): Promise<void> {
    await this.sendMessage({
      type: "SESSION_PROGRESS" as ExtensionMessage["type"],
      payload: this.getProgress(),
    });
  }

  // -----------------------------------------------------------------------
  // Messaging
  // -----------------------------------------------------------------------

  private sendMessage(message: { type: string; payload?: unknown }): Promise<unknown> {
    return new Promise((resolve) => {
      try {
        chrome.runtime.sendMessage(message, (response) => {
          if (chrome.runtime.lastError) {
            // Service worker temporarily unavailable — resolve with null
            resolve(null);
            return;
          }
          resolve(response ?? null);
        });
      } catch {
        resolve(null);
      }
    });
  }

  // -----------------------------------------------------------------------
  // Utility
  // -----------------------------------------------------------------------

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// ---------------------------------------------------------------------------
// Module-level instance and legacy function exports
// (kept for backward-compat with the existing index.ts message listener)
// ---------------------------------------------------------------------------

const orchestrator = new DiscoveryOrchestrator();

export async function startDiscovery(payload: StartDiscoveryPayload): Promise<void> {
  const query = payload.target_companies.join(" OR ");
  await orchestrator.startSession(query);
}

export function pauseDiscovery(): void {
  orchestrator.pauseSession().catch(console.error);
}

export function resumeDiscovery(): void {
  orchestrator.resumeSession().catch(console.error);
}

export function stopDiscovery(): void {
  orchestrator.stopSession().catch(console.error);
}

export function getOrchestratorProgress(): SessionProgress {
  return orchestrator.getProgress();
}

// ---------------------------------------------------------------------------
// Legacy session state helpers (used by existing orchestrator consumers)
// ---------------------------------------------------------------------------

let _legacySessionState: DiscoverySessionState | null = null;

export function getLegacySessionState(): DiscoverySessionState | null {
  return _legacySessionState;
}

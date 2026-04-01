/**
 * service-worker/rate-limiter.ts
 * Hard-coded rate limits for LinkedIn browsing activity.
 * Cannot be overridden by user or any other code.
 *
 * State is persisted in chrome.storage.local and resets at midnight.
 * See PRD DIS-08.
 */

import {
  MAX_PROFILES_PER_SESSION,
  MAX_SESSIONS_PER_DAY,
  MIN_COOLDOWN_MS,
  STORAGE_KEYS,
} from "../shared/constants";

export { MAX_PROFILES_PER_SESSION, MAX_SESSIONS_PER_DAY, MIN_COOLDOWN_MS };

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RateLimitState {
  /** ISO date string YYYY-MM-DD — used for midnight rollover detection */
  sessionsToday: number;
  lastSessionStart: number | null;
  lastSessionEnd: number | null;
  /** Canonical date for rollover detection */
  date: string;
}

export interface RateLimitCheck {
  allowed: boolean;
  reason?: "daily_limit" | "cooldown";
  waitMs?: number;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function todayDateString(): string {
  return new Date().toISOString().split("T")[0];
}

async function loadState(): Promise<RateLimitState> {
  const today = todayDateString();
  const result = await chrome.storage.local.get(STORAGE_KEYS.RATE_LIMIT_STATE);
  const stored = result[STORAGE_KEYS.RATE_LIMIT_STATE] as RateLimitState | undefined;

  // Fresh state if no record or date has rolled over (midnight)
  if (!stored || stored.date !== today) {
    const fresh: RateLimitState = {
      date: today,
      sessionsToday: 0,
      lastSessionStart: null,
      lastSessionEnd: null,
    };
    await chrome.storage.local.set({ [STORAGE_KEYS.RATE_LIMIT_STATE]: fresh });
    return fresh;
  }

  return stored;
}

async function saveState(state: RateLimitState): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEYS.RATE_LIMIT_STATE]: state });
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Returns the current persisted rate limit state.
 * Triggers midnight rollover automatically.
 */
export async function getRateLimitState(): Promise<RateLimitState> {
  return loadState();
}

/**
 * Checks whether a new discovery session is allowed right now.
 * Returns { allowed: true } or { allowed: false, reason, waitMs }.
 */
export async function checkRateLimit(): Promise<RateLimitCheck> {
  const state = await loadState();

  // Hard daily session cap
  if (state.sessionsToday >= MAX_SESSIONS_PER_DAY) {
    // Compute wait until next midnight
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    const waitMs = tomorrow.getTime() - now.getTime();

    return { allowed: false, reason: "daily_limit", waitMs };
  }

  // Cooldown between sessions
  if (state.lastSessionEnd !== null) {
    const elapsed = Date.now() - state.lastSessionEnd;
    if (elapsed < MIN_COOLDOWN_MS) {
      const waitMs = MIN_COOLDOWN_MS - elapsed;
      return { allowed: false, reason: "cooldown", waitMs };
    }
  }

  return { allowed: true };
}

/**
 * Records the start of a new discovery session.
 * Must be called immediately when a session begins.
 */
export async function recordSessionStart(): Promise<void> {
  const state = await loadState();
  state.sessionsToday += 1;
  state.lastSessionStart = Date.now();
  await saveState(state);
}

/**
 * Records the end of a discovery session.
 * Must be called when the session completes, is stopped, or errors.
 */
export async function recordSessionEnd(): Promise<void> {
  const state = await loadState();
  state.lastSessionEnd = Date.now();
  await saveState(state);
}

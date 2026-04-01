/**
 * service-worker/rate-limiter.ts
 * Hard-coded rate limits for LinkedIn browsing activity.
 * Cannot be overridden by user or any other code.
 * See PRD DIS-08.
 *
 * Limits are also enforced in /api/discovery/route.ts (server-side).
 * This is a defense-in-depth approach.
 */

import type { RateLimitState } from "../shared/types";

/** Hard limits — mirrors PRD DIS-08 */
export const MAX_PROFILES_PER_SESSION = 25;
export const MAX_SESSIONS_PER_DAY = 2;
/** Minimum milliseconds between sessions: 2 hours */
export const MIN_COOLDOWN_MS = 2 * 60 * 60 * 1000;

const STORAGE_KEY = "rate_limit_state";

/**
 * Returns the current rate limit state, initializing if needed.
 */
async function getState(): Promise<RateLimitState> {
  const today = new Date().toISOString().split("T")[0];
  const result = await chrome.storage.local.get(STORAGE_KEY);
  const stored = result[STORAGE_KEY] as RateLimitState | undefined;

  if (!stored || stored.date !== today) {
    // New day — reset counters
    const fresh: RateLimitState = {
      date: today,
      sessions_today: 0,
      last_session_started_at: null,
      profiles_today: 0,
    };
    await chrome.storage.local.set({ [STORAGE_KEY]: fresh });
    return fresh;
  }

  return stored;
}

/**
 * Checks if a new discovery session is allowed.
 * Returns an object with { allowed: boolean, reason?: string }.
 */
export async function canStartSession(): Promise<{
  allowed: boolean;
  reason?: string;
}> {
  const state = await getState();

  if (state.sessions_today >= MAX_SESSIONS_PER_DAY) {
    return {
      allowed: false,
      reason: `You have reached the limit of ${MAX_SESSIONS_PER_DAY} discovery sessions today. Try again tomorrow.`,
    };
  }

  if (state.last_session_started_at !== null) {
    const elapsed = Date.now() - state.last_session_started_at;
    if (elapsed < MIN_COOLDOWN_MS) {
      const minutesRemaining = Math.ceil((MIN_COOLDOWN_MS - elapsed) / 60_000);
      return {
        allowed: false,
        reason: `Please wait ${minutesRemaining} more minutes before starting another session.`,
      };
    }
  }

  return { allowed: true };
}

/**
 * Records the start of a new discovery session.
 */
export async function recordSessionStart(): Promise<void> {
  const state = await getState();
  state.sessions_today += 1;
  state.last_session_started_at = Date.now();
  await chrome.storage.local.set({ [STORAGE_KEY]: state });
}

/**
 * Records that N profiles were viewed.
 * Returns the remaining profile budget for the current session.
 */
export async function recordProfilesViewed(
  count: number
): Promise<number> {
  const state = await getState();
  state.profiles_today += count;
  await chrome.storage.local.set({ [STORAGE_KEY]: state });
  return MAX_PROFILES_PER_SESSION - count;
}

/**
 * Returns how many profiles remain viewable today.
 */
export async function getRemainingProfiles(): Promise<number> {
  const state = await getState();
  return Math.max(
    0,
    MAX_PROFILES_PER_SESSION * MAX_SESSIONS_PER_DAY - state.profiles_today
  );
}

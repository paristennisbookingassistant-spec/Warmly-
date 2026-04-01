/**
 * tests/extension/rate-limiter.test.ts
 * Unit tests for service-worker/rate-limiter.ts.
 *
 * Mocks chrome.storage.local so the module can run in Node.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import {
  MAX_SESSIONS_PER_DAY,
  MIN_COOLDOWN_MS,
} from "../../extension/shared/constants";

// ---------------------------------------------------------------------------
// Mock chrome.storage.local
// ---------------------------------------------------------------------------

type StorageData = Record<string, unknown>;
let store: StorageData = {};

const chromeMock = {
  storage: {
    local: {
      get: vi.fn(async (key: string | string[]) => {
        if (typeof key === "string") return { [key]: store[key] };
        const result: StorageData = {};
        for (const k of key) result[k] = store[k];
        return result;
      }),
      set: vi.fn(async (items: StorageData) => {
        Object.assign(store, items);
      }),
      remove: vi.fn(async (key: string) => {
        delete store[key];
      }),
    },
  },
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).chrome = chromeMock;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const STORAGE_KEY = "rate_limit_state";

function todayDateString(): string {
  return new Date().toISOString().split("T")[0];
}

function seedState(overrides: Partial<{
  sessionsToday: number;
  lastSessionStart: number | null;
  lastSessionEnd: number | null;
  date: string;
}>): void {
  store[STORAGE_KEY] = {
    date: todayDateString(),
    sessionsToday: 0,
    lastSessionStart: null,
    lastSessionEnd: null,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("checkRateLimit", () => {
  beforeEach(() => {
    store = {};
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("allows the first session when no state exists", async () => {
    const { checkRateLimit } = await import("../../extension/service-worker/rate-limiter");
    const result = await checkRateLimit();
    expect(result.allowed).toBe(true);
    expect(result.reason).toBeUndefined();
  });

  it("allows when sessions_today is 0", async () => {
    seedState({ sessionsToday: 0, lastSessionEnd: null });
    const { checkRateLimit } = await import("../../extension/service-worker/rate-limiter");
    const result = await checkRateLimit();
    expect(result.allowed).toBe(true);
  });

  it("blocks with daily_limit when MAX_SESSIONS_PER_DAY already used", async () => {
    seedState({ sessionsToday: MAX_SESSIONS_PER_DAY });
    const { checkRateLimit } = await import("../../extension/service-worker/rate-limiter");
    const result = await checkRateLimit();
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("daily_limit");
    expect(result.waitMs).toBeGreaterThan(0);
  });

  it("blocks with cooldown when last session ended less than MIN_COOLDOWN_MS ago", async () => {
    const recentEnd = Date.now() - (MIN_COOLDOWN_MS / 2); // half the cooldown ago
    seedState({ sessionsToday: 1, lastSessionEnd: recentEnd });
    const { checkRateLimit } = await import("../../extension/service-worker/rate-limiter");
    const result = await checkRateLimit();
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("cooldown");
    expect(result.waitMs).toBeGreaterThan(0);
    expect(result.waitMs).toBeLessThanOrEqual(MIN_COOLDOWN_MS);
  });

  it("allows when 1 session done and cooldown has elapsed", async () => {
    const longAgoEnd = Date.now() - MIN_COOLDOWN_MS - 60_000; // fully past cooldown
    seedState({ sessionsToday: 1, lastSessionEnd: longAgoEnd });
    const { checkRateLimit } = await import("../../extension/service-worker/rate-limiter");
    const result = await checkRateLimit();
    expect(result.allowed).toBe(true);
  });

  it("cooldown waitMs is approximately correct", async () => {
    const halfCooldownAgo = Date.now() - (MIN_COOLDOWN_MS / 2);
    seedState({ sessionsToday: 1, lastSessionEnd: halfCooldownAgo });
    const { checkRateLimit } = await import("../../extension/service-worker/rate-limiter");
    const result = await checkRateLimit();
    expect(result.allowed).toBe(false);
    // waitMs should be approximately half the cooldown
    expect(result.waitMs).toBeGreaterThan(MIN_COOLDOWN_MS / 2 - 5000);
    expect(result.waitMs).toBeLessThanOrEqual(MIN_COOLDOWN_MS / 2 + 5000);
  });

  it("resets session count for a new day (midnight rollover)", async () => {
    // Seed yesterday's data
    store[STORAGE_KEY] = {
      date: "2020-01-01", // definitely not today
      sessionsToday: MAX_SESSIONS_PER_DAY,
      lastSessionStart: Date.now() - 24 * 60 * 60 * 1000,
      lastSessionEnd: Date.now() - 23 * 60 * 60 * 1000,
    };

    const { checkRateLimit } = await import("../../extension/service-worker/rate-limiter");
    const result = await checkRateLimit();
    // After rollover, counter should reset → allowed
    expect(result.allowed).toBe(true);
  });
});

describe("recordSessionStart", () => {
  beforeEach(() => {
    store = {};
    vi.clearAllMocks();
  });

  it("increments sessions_today", async () => {
    seedState({ sessionsToday: 0 });
    const { recordSessionStart, getRateLimitState } = await import(
      "../../extension/service-worker/rate-limiter"
    );
    await recordSessionStart();
    const state = await getRateLimitState();
    expect(state.sessionsToday).toBe(1);
  });

  it("records lastSessionStart timestamp", async () => {
    seedState({ sessionsToday: 0 });
    const before = Date.now();
    const { recordSessionStart, getRateLimitState } = await import(
      "../../extension/service-worker/rate-limiter"
    );
    await recordSessionStart();
    const state = await getRateLimitState();
    expect(state.lastSessionStart).toBeGreaterThanOrEqual(before);
  });
});

describe("recordSessionEnd", () => {
  beforeEach(() => {
    store = {};
    vi.clearAllMocks();
  });

  it("records lastSessionEnd timestamp", async () => {
    seedState({ sessionsToday: 1, lastSessionStart: Date.now() - 5000 });
    const before = Date.now();
    const { recordSessionEnd, getRateLimitState } = await import(
      "../../extension/service-worker/rate-limiter"
    );
    await recordSessionEnd();
    const state = await getRateLimitState();
    expect(state.lastSessionEnd).toBeGreaterThanOrEqual(before);
  });
});

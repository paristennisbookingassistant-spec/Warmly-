/**
 * tests/extension/orchestrator.test.ts
 * Unit tests for the DiscoveryOrchestrator state machine.
 *
 * Mocks: chrome.runtime.sendMessage, chrome.storage.local,
 *        dom-reader, navigator, behavior-sim.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import type { ExtractedProfile } from "../../extension/shared/types";
import { MAX_PROFILES_PER_SESSION } from "../../extension/shared/constants";

// ---------------------------------------------------------------------------
// Chrome API mocks
// ---------------------------------------------------------------------------

type StorageData = Record<string, unknown>;
let chromeStore: StorageData = {};
const messageSpy = vi.fn();

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).chrome = {
  runtime: {
    sendMessage: (msg: unknown, cb?: (r: unknown) => void) => {
      const result = messageSpy(msg);
      if (cb) cb(result ?? null);
      return Promise.resolve(result ?? null);
    },
    lastError: undefined,
  },
  storage: {
    local: {
      get: vi.fn(async (key: string) => ({ [key]: chromeStore[key] })),
      set: vi.fn(async (items: StorageData) => { Object.assign(chromeStore, items); }),
      remove: vi.fn(async (key: string) => { delete chromeStore[key]; }),
    },
  },
};

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

// behavior-sim — instant, no actual delays
vi.mock("../../extension/content-script/behavior-sim", () => ({
  humanDelay: vi.fn().mockResolvedValue(undefined),
  naturalScroll: vi.fn().mockResolvedValue(undefined),
  simulateProfileReading: vi.fn().mockResolvedValue(undefined),
  getSessionProfileLimit: vi.fn((n: number) => n),
  waitBetweenActions: vi.fn().mockResolvedValue(undefined),
  jitterDelay: vi.fn().mockResolvedValue(undefined),
  waitShort: vi.fn().mockResolvedValue(undefined),
  organicClick: vi.fn().mockResolvedValue(undefined),
}));

// navigator
const mockSearchLinkedIn = vi.fn().mockResolvedValue(undefined);
const mockCollectProfileUrls = vi.fn().mockReturnValue([
  "https://www.linkedin.com/in/alice",
  "https://www.linkedin.com/in/bob",
  "https://www.linkedin.com/in/charlie",
]);
const mockNavigateToProfile = vi.fn().mockResolvedValue(undefined);
const mockWaitForProfileLoad = vi.fn().mockResolvedValue(true);
const mockIsLoginWall = vi.fn().mockReturnValue(false);
const mockGoToNextResultsPage = vi.fn().mockResolvedValue(false); // no next page by default

vi.mock("../../extension/content-script/navigator", () => ({
  searchLinkedIn: mockSearchLinkedIn,
  collectProfileUrlsFromSearchResults: mockCollectProfileUrls,
  navigateToProfile: mockNavigateToProfile,
  waitForProfileLoad: mockWaitForProfileLoad,
  isLoginWall: mockIsLoginWall,
  goToNextResultsPage: mockGoToNextResultsPage,
  goToNextPage: mockGoToNextResultsPage,
  navigateToCompanySearch: vi.fn().mockResolvedValue(true),
  waitBeforeNextProfile: vi.fn().mockResolvedValue(undefined),
}));

// dom-reader
const mockExtractProfile = vi.fn();
vi.mock("../../extension/content-script/dom-reader", () => ({
  extractProfileFromDOM: mockExtractProfile,
  extractProfile: mockExtractProfile,
  isProfilePage: vi.fn().mockReturnValue(true),
  isSearchPage: vi.fn().mockReturnValue(false),
  extractSearchResults: vi.fn().mockReturnValue([]),
  querySelector: vi.fn().mockReturnValue(null),
}));

// ---------------------------------------------------------------------------
// Shared fake profile factory
// ---------------------------------------------------------------------------

function fakeProfile(name: string): ExtractedProfile {
  return {
    linkedin_url: `https://www.linkedin.com/in/${name.toLowerCase()}`,
    name,
    headline: "Engineer",
    current_role: { title: "Engineer", company: "Acme", duration: "2020 – Now" },
    previous_roles: [],
    education: [],
    location: "London",
    mutual_connections: 5,
    captured_at: new Date().toISOString(),
    source_session_id: null,
  };
}

// window.history.back mock
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).window = {
  history: { back: vi.fn() },
  location: { href: "https://www.linkedin.com/search/results/people/" },
  scrollTo: vi.fn(),
  scrollBy: vi.fn(),
  scrollY: 0,
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("DiscoveryOrchestrator state machine", () => {
  beforeEach(() => {
    chromeStore = {};
    messageSpy.mockReset();
    mockExtractProfile.mockReset();
    mockCollectProfileUrls.mockReturnValue([
      "https://www.linkedin.com/in/alice",
      "https://www.linkedin.com/in/bob",
    ]);
    mockGoToNextResultsPage.mockResolvedValue(false);
    mockIsLoginWall.mockReturnValue(false);
    mockWaitForProfileLoad.mockResolvedValue(true);

    // Default: rate limit check passes
    messageSpy.mockImplementation((msg: { type: string }) => {
      if (msg.type === "CHECK_RATE_LIMIT") return { allowed: true };
      if (msg.type === "CREATE_SESSION") return { session_id: "test-session-1" };
      return { ok: true };
    });
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  it("starts in IDLE state", async () => {
    // Re-import to get a fresh module instance
    vi.resetModules();
    const { DiscoveryOrchestrator } = await import("../../extension/content-script/orchestrator");
    const orch = new DiscoveryOrchestrator();
    expect(orch.getState()).toBe("IDLE");
  });

  it("transitions IDLE → STARTING → SEARCHING → COMPLETED for a normal run", async () => {
    vi.resetModules();
    mockExtractProfile.mockReturnValue(fakeProfile("Alice"));
    const { DiscoveryOrchestrator } = await import("../../extension/content-script/orchestrator");
    const orch = new DiscoveryOrchestrator();
    const states: string[] = [orch.getState()];

    // Intercept sendMessage to also track state after key transitions
    messageSpy.mockImplementation((msg: { type: string }) => {
      states.push(orch.getState());
      if (msg.type === "CHECK_RATE_LIMIT") return { allowed: true };
      if (msg.type === "CREATE_SESSION") return { session_id: "sess-1" };
      return { ok: true };
    });

    await orch.startSession("software engineer");
    states.push(orch.getState());

    expect(states).toContain("COMPLETED");
  });

  it("progress reflects visited and discovered counts", async () => {
    vi.resetModules();
    mockCollectProfileUrls.mockReturnValue([
      "https://www.linkedin.com/in/alice",
      "https://www.linkedin.com/in/bob",
    ]);
    mockExtractProfile
      .mockReturnValueOnce(fakeProfile("Alice"))
      .mockReturnValueOnce(fakeProfile("Bob"));

    const { DiscoveryOrchestrator } = await import("../../extension/content-script/orchestrator");
    const orch = new DiscoveryOrchestrator();
    await orch.startSession("engineer");

    const progress = orch.getProgress();
    expect(progress.profilesVisited).toBe(2);
    expect(progress.profilesDiscovered).toBe(2);
    expect(progress.state).toBe("COMPLETED");
  });

  it("does not count profiles that fail extraction", async () => {
    vi.resetModules();
    mockCollectProfileUrls.mockReturnValue([
      "https://www.linkedin.com/in/ghost",
    ]);
    mockExtractProfile.mockReturnValue(null); // extraction fails

    const { DiscoveryOrchestrator } = await import("../../extension/content-script/orchestrator");
    const orch = new DiscoveryOrchestrator();
    await orch.startSession("engineer");

    const progress = orch.getProgress();
    expect(progress.profilesVisited).toBe(1); // we did visit it
    expect(progress.profilesDiscovered).toBe(0); // but nothing extracted
  });

  it("stops immediately when stopSession() is called mid-loop", async () => {
    vi.resetModules();
    // Supply enough URLs that we'd visit many if not stopped
    const manyUrls = Array.from({ length: 10 }, (_, i) => `https://www.linkedin.com/in/user${i}`);
    mockCollectProfileUrls.mockReturnValue(manyUrls);

    let extractCallCount = 0;
    mockExtractProfile.mockImplementation(() => {
      extractCallCount++;
      return fakeProfile(`User${extractCallCount}`);
    });

    const { DiscoveryOrchestrator } = await import("../../extension/content-script/orchestrator");
    const orch = new DiscoveryOrchestrator();

    // Stop after the first profile is saved
    messageSpy.mockImplementation((msg: { type: string }) => {
      if (msg.type === "CHECK_RATE_LIMIT") return { allowed: true };
      if (msg.type === "CREATE_SESSION") return { session_id: "sess-stop" };
      if (msg.type === "SAVE_PROFILE") {
        // Stop after saving first profile
        orch.stopSession();
      }
      return { ok: true };
    });

    await orch.startSession("engineer");
    expect(orch.getState()).toBe("COMPLETED");
    expect(orch.getProgress().profilesVisited).toBeLessThan(manyUrls.length);
  });

  it("pauses and resumes the discovery loop", async () => {
    vi.resetModules();

    const urls = [
      "https://www.linkedin.com/in/user0",
      "https://www.linkedin.com/in/user1",
    ];
    mockCollectProfileUrls.mockReturnValue(urls);

    let callIdx = 0;
    mockExtractProfile.mockImplementation(() => fakeProfile(`User${callIdx++}`));

    const { DiscoveryOrchestrator } = await import("../../extension/content-script/orchestrator");
    const orch = new DiscoveryOrchestrator();

    let pausedAndResumed = false;

    messageSpy.mockImplementation((msg: { type: string }) => {
      if (msg.type === "CHECK_RATE_LIMIT") return { allowed: true };
      if (msg.type === "CREATE_SESSION") return { session_id: "sess-pause" };
      if (msg.type === "SAVE_PROFILE" && !pausedAndResumed) {
        pausedAndResumed = true;
        // Pause, then resume on next tick
        orch.pauseSession();
        setTimeout(() => orch.resumeSession(), 10);
      }
      return { ok: true };
    });

    await orch.startSession("engineer");
    expect(pausedAndResumed).toBe(true);
    expect(orch.getState()).toBe("COMPLETED");
  });

  it("enforces MAX_PROFILES_PER_SESSION", async () => {
    vi.resetModules();
    // Supply more URLs than the hard cap
    const manyUrls = Array.from(
      { length: MAX_PROFILES_PER_SESSION + 10 },
      (_, i) => `https://www.linkedin.com/in/u${i}`
    );
    mockCollectProfileUrls.mockReturnValue(manyUrls);
    mockExtractProfile.mockImplementation(() => fakeProfile("User"));
    // Override getSessionProfileLimit to return hardLimit unchanged
    const behaviorSim = await import("../../extension/content-script/behavior-sim");
    vi.mocked(behaviorSim.getSessionProfileLimit).mockImplementation((n: number) => n);

    // Use fake timers so the sleep(2000) calls after window.history.back()
    // resolve immediately without actually waiting
    vi.useFakeTimers();
    const runPromise = (async () => {
      const { DiscoveryOrchestrator } = await import("../../extension/content-script/orchestrator");
      const orch = new DiscoveryOrchestrator();
      const sessionPromise = orch.startSession("engineer");
      // Drain all pending timers/microtasks in a loop until the session resolves
      for (let i = 0; i < 500; i++) {
        await vi.runAllTimersAsync();
      }
      await sessionPromise;
      return orch;
    })();

    const orch = await runPromise;
    vi.useRealTimers();

    expect(orch.getProgress().profilesVisited).toBeLessThanOrEqual(MAX_PROFILES_PER_SESSION);
  }, 30_000);

  it("blocks session start when rate limit check returns denied", async () => {
    vi.resetModules();
    messageSpy.mockImplementation((msg: { type: string }) => {
      if (msg.type === "CHECK_RATE_LIMIT") {
        return { allowed: false, reason: "daily_limit", waitMs: 3_600_000 };
      }
      return { ok: true };
    });

    const { DiscoveryOrchestrator } = await import("../../extension/content-script/orchestrator");
    const orch = new DiscoveryOrchestrator();

    await expect(orch.startSession("engineer")).rejects.toThrow();
    expect(orch.getState()).toBe("RATE_LIMITED");
  });

  it("transitions to ERROR state when login wall detected", async () => {
    vi.resetModules();
    mockCollectProfileUrls.mockReturnValue(["https://www.linkedin.com/in/alice"]);
    mockIsLoginWall.mockReturnValue(true);

    const { DiscoveryOrchestrator } = await import("../../extension/content-script/orchestrator");
    const orch = new DiscoveryOrchestrator();
    await orch.startSession("engineer");

    expect(orch.getState()).toBe("ERROR");
  });

  it("sends SESSION_PROGRESS message after each profile", async () => {
    vi.resetModules();
    mockCollectProfileUrls.mockReturnValue(["https://www.linkedin.com/in/user0"]);
    mockExtractProfile.mockReturnValue(fakeProfile("User0"));

    const progressMessages: unknown[] = [];
    messageSpy.mockImplementation((msg: { type: string }) => {
      if (msg.type === "CHECK_RATE_LIMIT") return { allowed: true };
      if (msg.type === "CREATE_SESSION") return { session_id: "sess-progress" };
      if (msg.type === "SESSION_PROGRESS") progressMessages.push(msg);
      return { ok: true };
    });

    const { DiscoveryOrchestrator } = await import("../../extension/content-script/orchestrator");
    const orch = new DiscoveryOrchestrator();
    await orch.startSession("engineer");

    expect(progressMessages.length).toBeGreaterThan(0);
  });
});

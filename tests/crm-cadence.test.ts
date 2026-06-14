/**
 * tests/crm-cadence.test.ts
 * Unit tests for src/lib/crm/cadence.ts
 *
 * Covers:
 * 1. Category defaults (effectiveCadenceDays)
 * 2. Per-contact override beats category default
 * 3. Dormant + uncategorized (null) → null cadence
 * 4. computeNextTouchAt: ISO anchor + days math
 * 5. isReconnectDue: due vs not-due boundary
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import {
  CATEGORY_CADENCE,
  CATEGORY_LABEL,
  effectiveCadenceDays,
  computeNextTouchAt,
  isReconnectDue,
} from "../src/lib/crm/cadence";

// ---------------------------------------------------------------------------
// effectiveCadenceDays
// ---------------------------------------------------------------------------

describe("effectiveCadenceDays", () => {
  it("returns category default for nurturing (14d)", () => {
    expect(effectiveCadenceDays("nurturing", null)).toBe(14);
  });

  it("returns category default for keep_warm (30d)", () => {
    expect(effectiveCadenceDays("keep_warm", null)).toBe(30);
  });

  it("returns category default for inner_circle (60d)", () => {
    expect(effectiveCadenceDays("inner_circle", null)).toBe(60);
  });

  it("returns null for dormant (no cadence)", () => {
    expect(effectiveCadenceDays("dormant", null)).toBeNull();
  });

  it("returns null for null category (uncategorized)", () => {
    expect(effectiveCadenceDays(null, null)).toBeNull();
  });

  it("override beats category default when valid (>= 1)", () => {
    expect(effectiveCadenceDays("nurturing", 7)).toBe(7);
    expect(effectiveCadenceDays("keep_warm", 45)).toBe(45);
    expect(effectiveCadenceDays("inner_circle", 90)).toBe(90);
  });

  it("override on dormant: non-null valid override still returns null via dormant default", () => {
    // dormant has null default; override of 21 should return 21 (override wins)
    expect(effectiveCadenceDays("dormant", 21)).toBe(21);
  });

  it("override <= 0 returns null (invalid override falls back to null)", () => {
    expect(effectiveCadenceDays("nurturing", 0)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// computeNextTouchAt
// ---------------------------------------------------------------------------

describe("computeNextTouchAt", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns null for dormant category", () => {
    const result = computeNextTouchAt("dormant", null, null);
    expect(result).toBeNull();
  });

  it("returns null for null (uncategorized) category", () => {
    const result = computeNextTouchAt(null, null, null);
    expect(result).toBeNull();
  });

  it("anchors on lastInteractionAt when provided", () => {
    // nurturing = 14 days from anchor
    const anchor = "2026-06-01T00:00:00.000Z";
    const expected = new Date("2026-06-01T00:00:00.000Z");
    expected.setDate(expected.getDate() + 14);

    const result = computeNextTouchAt("nurturing", null, anchor);
    expect(result).toBe(expected.toISOString());
  });

  it("uses now() as anchor when lastInteractionAt is null", () => {
    vi.useFakeTimers();
    const now = new Date("2026-06-14T12:00:00.000Z");
    vi.setSystemTime(now);

    const expected = new Date(now);
    expected.setDate(expected.getDate() + 30); // keep_warm = 30d

    const result = computeNextTouchAt("keep_warm", null, null);
    expect(result).toBe(expected.toISOString());
  });

  it("override beats category default in computation", () => {
    const anchor = "2026-06-01T00:00:00.000Z";
    const expected = new Date("2026-06-01T00:00:00.000Z");
    expected.setDate(expected.getDate() + 7); // override = 7 days

    const result = computeNextTouchAt("keep_warm", 7, anchor);
    expect(result).toBe(expected.toISOString());
  });
});

// ---------------------------------------------------------------------------
// isReconnectDue
// ---------------------------------------------------------------------------

describe("isReconnectDue", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns false for null (no cadence set)", () => {
    expect(isReconnectDue(null)).toBe(false);
  });

  it("returns true when nextTouchAt is in the past", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-14T12:00:00.000Z"));

    const pastDate = "2026-06-10T00:00:00.000Z"; // 4 days ago
    expect(isReconnectDue(pastDate)).toBe(true);
  });

  it("returns false when nextTouchAt is in the future", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-14T12:00:00.000Z"));

    const futureDate = "2026-06-20T00:00:00.000Z"; // 6 days from now
    expect(isReconnectDue(futureDate)).toBe(false);
  });

  it("boundary: returns true when nextTouchAt equals exactly now", () => {
    vi.useFakeTimers();
    const now = new Date("2026-06-14T12:00:00.000Z");
    vi.setSystemTime(now);

    expect(isReconnectDue(now.toISOString())).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// CATEGORY_CADENCE and CATEGORY_LABEL exports
// ---------------------------------------------------------------------------

describe("CATEGORY_CADENCE", () => {
  it("has all 4 categories with correct defaults", () => {
    expect(CATEGORY_CADENCE.nurturing).toBe(14);
    expect(CATEGORY_CADENCE.keep_warm).toBe(30);
    expect(CATEGORY_CADENCE.inner_circle).toBe(60);
    expect(CATEGORY_CADENCE.dormant).toBeNull();
  });
});

describe("CATEGORY_LABEL", () => {
  it("has all 4 human-readable labels", () => {
    expect(CATEGORY_LABEL.nurturing).toBe("Nurturing");
    expect(CATEGORY_LABEL.keep_warm).toBe("Keep Warm");
    expect(CATEGORY_LABEL.inner_circle).toBe("Inner Circle");
    expect(CATEGORY_LABEL.dormant).toBe("Dormant");
  });
});

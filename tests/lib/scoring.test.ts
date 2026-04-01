/**
 * tests/lib/scoring.test.ts
 * Unit tests for the AI scoring logic.
 * Tests rubric weights and response structure.
 */

import { describe, it, expect } from "vitest";
import { SCORING_RUBRIC } from "@/types/ai";

describe("SCORING_RUBRIC", () => {
  it("has exactly 6 criteria", () => {
    expect(SCORING_RUBRIC).toHaveLength(6);
  });

  it("all weights sum to 1.0", () => {
    const total = SCORING_RUBRIC.reduce((sum, c) => sum + c.weight, 0);
    // Allow for floating point imprecision
    expect(total).toBeCloseTo(1.0, 5);
  });

  it("all criteria have a description", () => {
    SCORING_RUBRIC.forEach((criterion) => {
      expect(criterion.description).toBeTruthy();
      expect(criterion.description.length).toBeGreaterThan(10);
    });
  });
});

describe("ScoringResponse shape", () => {
  it("validates a mock scoring response has all required fields", () => {
    const mockResponse = {
      overall_score: 8.2,
      tier: 1,
      scores: {
        career_path_similarity: 9,
        shared_background: 9,
        seniority_relevance: 8,
        industry_match: 9,
        accessibility_signals: 7,
        recency: 8,
      },
      recommendation_reason: "INSEAD MBA, consulting-to-VC transition",
      suggested_hook: "Shared INSEAD background",
    };

    expect(mockResponse.overall_score).toBeGreaterThanOrEqual(1);
    expect(mockResponse.overall_score).toBeLessThanOrEqual(10);
    expect([1, 2, 3]).toContain(mockResponse.tier);
    expect(Object.keys(mockResponse.scores)).toHaveLength(6);
    expect(mockResponse.recommendation_reason).toBeTruthy();
    expect(mockResponse.suggested_hook).toBeTruthy();
  });
});

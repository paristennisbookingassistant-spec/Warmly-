/**
 * tests/lib/scoring.test.ts
 * Unit tests for the AI scoring engine.
 * Mocks the Anthropic SDK to avoid real API calls.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { SCORING_RUBRIC } from "@/types/ai";

// ---------------------------------------------------------------------------
// Mock the Anthropic SDK before importing scoring
// ---------------------------------------------------------------------------

const { mockCreate } = vi.hoisted(() => ({ mockCreate: vi.fn() }));

vi.mock("@anthropic-ai/sdk", () => {
  function AnthropicMock() {
    return { messages: { create: mockCreate } };
  }
  return { default: AnthropicMock };
});

// Import after mocking
const { scoreContact } = await import("@/lib/ai/scoring");

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

const mockScoringInput = {
  user_profile: {
    career_history: [
      { title: "Consultant", company: "McKinsey", start_date: "2020-01", end_date: "2024-01" },
    ],
    education: [{ school: "INSEAD", degree: "MBA", year: "2026" }],
    goals: {
      type: "job_search" as const,
      target_industries: ["Private Equity", "Venture Capital"],
      target_companies: ["Sequoia", "KKR"],
      target_roles: ["Associate"],
      target_geographies: ["Singapore"],
    },
    networking_preferences: {
      style: "warm",
      outreach_comfort: 3,
      contacts_per_week: 5,
      preferred_channels: ["LinkedIn"],
    },
  },
  contact_profile: {
    name: "Marie Chen",
    current_title: "VP of Investments",
    company: "Sequoia Capital",
    career_history: [
      { title: "Senior Associate", company: "McKinsey", start_date: "2018-09", end_date: "2022-02" },
    ],
    education: [{ school: "INSEAD", degree: "MBA", year: "2022" }],
    location: "Singapore",
    profile_snapshot: null,
  },
  rubric: SCORING_RUBRIC,
};

const mockValidScoringResponse = {
  overall_score: 8.2,
  tier: 1 as const,
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

// ---------------------------------------------------------------------------
// SCORING_RUBRIC tests
// ---------------------------------------------------------------------------

describe("SCORING_RUBRIC", () => {
  it("has exactly 6 criteria", () => {
    expect(SCORING_RUBRIC).toHaveLength(6);
  });

  it("all weights sum to 1.0", () => {
    const total = SCORING_RUBRIC.reduce((sum, c) => sum + c.weight, 0);
    expect(total).toBeCloseTo(1.0, 5);
  });

  it("each criterion has a non-empty description", () => {
    SCORING_RUBRIC.forEach((criterion) => {
      expect(criterion.description.length).toBeGreaterThan(10);
    });
  });

  it("all criteria names match ScoringBreakdown keys", () => {
    const expectedKeys = [
      "career_path_similarity",
      "shared_background",
      "seniority_relevance",
      "industry_match",
      "accessibility_signals",
      "recency",
    ];
    const actualKeys = SCORING_RUBRIC.map((c) => c.name);
    expect(actualKeys.sort()).toEqual(expectedKeys.sort());
  });
});

// ---------------------------------------------------------------------------
// scoreContact() tests
// ---------------------------------------------------------------------------

describe("scoreContact()", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns a valid ScoringResponse on success", async () => {
    mockCreate.mockResolvedValueOnce({
      content: [{ type: "text", text: JSON.stringify(mockValidScoringResponse) }],
      usage: { input_tokens: 500, output_tokens: 150 },
    });

    const result = await scoreContact(mockScoringInput);

    expect(result.overall_score).toBe(8.2);
    expect(result.tier).toBe(1);
    expect(result.scores).toMatchObject({
      career_path_similarity: expect.any(Number),
      shared_background: expect.any(Number),
      seniority_relevance: expect.any(Number),
      industry_match: expect.any(Number),
      accessibility_signals: expect.any(Number),
      recency: expect.any(Number),
    });
    expect(result.recommendation_reason).toBeTruthy();
    expect(result.suggested_hook).toBeTruthy();
  });

  it("calls the Anthropic API with Haiku model", async () => {
    mockCreate.mockResolvedValueOnce({
      content: [{ type: "text", text: JSON.stringify(mockValidScoringResponse) }],
      usage: { input_tokens: 500, output_tokens: 150 },
    });

    await scoreContact(mockScoringInput);

    expect(mockCreate).toHaveBeenCalledOnce();
    const callArgs = mockCreate.mock.calls[0][0];
    expect(callArgs.model).toContain("haiku");
  });

  it("includes user profile and contact in the prompt", async () => {
    mockCreate.mockResolvedValueOnce({
      content: [{ type: "text", text: JSON.stringify(mockValidScoringResponse) }],
      usage: { input_tokens: 500, output_tokens: 150 },
    });

    await scoreContact(mockScoringInput);

    const callArgs = mockCreate.mock.calls[0][0];
    const userPrompt = callArgs.messages[0].content as string;
    expect(userPrompt).toContain("Marie Chen");
    expect(userPrompt).toContain("INSEAD");
  });

  it("throws when model returns non-JSON response", async () => {
    mockCreate.mockResolvedValueOnce({
      content: [{ type: "text", text: "I cannot score this contact." }],
      usage: { input_tokens: 100, output_tokens: 20 },
    });

    await expect(scoreContact(mockScoringInput)).rejects.toThrow(
      "Scoring model returned non-JSON response"
    );
  });

  it("handles tier assignment correctly", async () => {
    // Test tier 2 (score 6.5)
    const tier2Response = { ...mockValidScoringResponse, overall_score: 6.5, tier: 2 as const };
    mockCreate.mockResolvedValueOnce({
      content: [{ type: "text", text: JSON.stringify(tier2Response) }],
      usage: { input_tokens: 500, output_tokens: 150 },
    });

    const result = await scoreContact(mockScoringInput);
    expect(result.tier).toBe(2);
    expect([1, 2, 3]).toContain(result.tier);
  });

  it("extracts JSON even when surrounded by extra text", async () => {
    const responseWithPreamble = `Here is my analysis:\n${JSON.stringify(mockValidScoringResponse)}\n\nI hope this helps!`;
    mockCreate.mockResolvedValueOnce({
      content: [{ type: "text", text: responseWithPreamble }],
      usage: { input_tokens: 500, output_tokens: 200 },
    });

    const result = await scoreContact(mockScoringInput);
    expect(result.overall_score).toBe(8.2);
  });
});

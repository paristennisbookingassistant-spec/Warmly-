/**
 * tests/lib/generation.test.ts
 * Unit tests for artifact generation.
 * Tests all 6 artifact types with mocked MiniMax responses.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { ModelTier } from "@/types/ai";
import type { ArtifactType } from "@/types/artifacts";

// ---------------------------------------------------------------------------
// Mock callMiniMax
// ---------------------------------------------------------------------------

const { mockCallMiniMax } = vi.hoisted(() => ({ mockCallMiniMax: vi.fn() }));

vi.mock("@/lib/ai/minimax", () => ({
  callMiniMax: mockCallMiniMax,
}));

const { generateArtifact } = await import("@/lib/ai/generation");

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

const baseContext = {
  user_profile: {
    career_history: [
      { title: "Consultant", company: "McKinsey", start_date: "2020-01", end_date: "2024-01" },
    ],
    education: [{ school: "INSEAD", degree: "MBA", year: "2026" }],
    goals: {
      type: "job_search" as const,
      target_industries: ["Private Equity"],
      target_companies: ["Sequoia"],
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
  user_memory: null,
  contact_profile: {
    name: "Marie Chen",
    current_title: "VP of Investments",
    company: "Sequoia Capital",
    career_history: [],
    education: [{ school: "INSEAD", degree: "MBA", year: "2022" }],
    location: "Singapore",
    profile_snapshot: null,
  },
  conversation_summary: null,
  recent_messages: [] as Array<{ role: "user" | "agent"; content: string }>,
  artifact_metadata: [] as Array<{ id: string; type: ArtifactType; status: string; created_at: string }>,
};

// Mock content for each artifact type
const mockContentByType: Record<string, object> = {
  connection_note: {
    message: "Hi Marie, I came across your profile. As a fellow INSEAD MBA targeting VC, I'd love to connect!",
    hook: "shared INSEAD background",
    char_count: 100,
  },
  outreach_draft: {
    message: "Hi Marie, I'm reaching out...",
    tone: "warm",
    hook: "INSEAD connection",
    channel: "linkedin_message",
    char_count: 300,
  },
  meeting_prep: {
    person_summary: "Marie Chen is VP at Sequoia...",
    company_intel: {
      description: "Sequoia Capital is a leading VC firm...",
      recent_news: [],
      strategic_priorities: ["AI", "Fintech"],
    },
    discussion_themes: [{ name: "Career transition", questions: ["How did you make the switch?"] }],
    coaching: {
      do_list: ["Be specific"],
      dont_list: ["Don't ask for a job"],
      positioning_advice: "Lead with your McKinsey background",
      recommended_ask: "advice",
    },
  },
  meeting_notes: {
    key_takeaways: ["INSEAD network was key"],
    next_steps: [{ description: "Send thank you", timing: "within 24 hours", completed: false }],
    user_raw_notes: "Great call!",
  },
  action_plan: {
    actions: [{ description: "Follow up", timing: "within 24 hours", priority: "high", completed: false }],
    coaching_note: "Don't ask for a job yet",
  },
  follow_up_draft: {
    message: "Hi Marie, thank you for the call!",
    reference_to_meeting: "Our discussion about operator networks",
    timing_suggestion: "within 24 hours",
    channel: "linkedin_message",
    tone: "warm",
  },
};

function mockMiniMaxResponse(artifactType: string) {
  return {
    content: JSON.stringify(mockContentByType[artifactType]),
    usage: { prompt_tokens: 800, completion_tokens: 300, total_tokens: 1100 },
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("generateArtifact()", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("generates a connection_note with FAST model tier", async () => {
    mockCallMiniMax.mockResolvedValueOnce(mockMiniMaxResponse("connection_note"));

    const result = await generateArtifact({
      artifact_type: "connection_note",
      context: baseContext,
    });

    expect(result.content).toMatchObject({ message: expect.any(String), hook: expect.any(String) });
    expect(result.model_used).toBe(ModelTier.FAST);
    expect(result.tokens_input).toBe(800);
    expect(result.tokens_output).toBe(300);
  });

  it("generates an outreach_draft with REASONING model tier", async () => {
    mockCallMiniMax.mockResolvedValueOnce(mockMiniMaxResponse("outreach_draft"));

    const result = await generateArtifact({
      artifact_type: "outreach_draft",
      context: baseContext,
    });

    expect(result.model_used).toBe(ModelTier.REASONING);
    expect(result.content).toMatchObject({ message: expect.any(String), tone: expect.any(String) });
  });

  it("generates a meeting_prep with REASONING model tier", async () => {
    mockCallMiniMax.mockResolvedValueOnce(mockMiniMaxResponse("meeting_prep"));

    const result = await generateArtifact({
      artifact_type: "meeting_prep",
      context: baseContext,
    });

    expect(result.model_used).toBe(ModelTier.REASONING);
    expect(result.content).toMatchObject({
      person_summary: expect.any(String),
      company_intel: expect.any(Object),
      discussion_themes: expect.any(Array),
      coaching: expect.any(Object),
    });
  });

  it("generates meeting_notes with FAST model tier", async () => {
    mockCallMiniMax.mockResolvedValueOnce(mockMiniMaxResponse("meeting_notes"));

    const result = await generateArtifact({
      artifact_type: "meeting_notes",
      context: baseContext,
    });

    expect(result.model_used).toBe(ModelTier.FAST);
    expect(result.content).toMatchObject({
      key_takeaways: expect.any(Array),
      next_steps: expect.any(Array),
    });
  });

  it("generates an action_plan with REASONING model tier", async () => {
    mockCallMiniMax.mockResolvedValueOnce(mockMiniMaxResponse("action_plan"));

    const result = await generateArtifact({
      artifact_type: "action_plan",
      context: baseContext,
    });

    expect(result.model_used).toBe(ModelTier.REASONING);
    expect(result.content).toMatchObject({
      actions: expect.any(Array),
      coaching_note: expect.any(String),
    });
  });

  it("generates a follow_up_draft with FAST tier by default", async () => {
    mockCallMiniMax.mockResolvedValueOnce(mockMiniMaxResponse("follow_up_draft"));

    const result = await generateArtifact({
      artifact_type: "follow_up_draft",
      context: baseContext,
    });

    expect(result.model_used).toBe(ModelTier.FAST);
  });

  it("upgrades follow_up_draft to REASONING when force_reasoning_model is true", async () => {
    mockCallMiniMax.mockResolvedValueOnce(mockMiniMaxResponse("follow_up_draft"));

    const result = await generateArtifact({
      artifact_type: "follow_up_draft",
      context: baseContext,
      force_reasoning_model: true,
    });

    expect(result.model_used).toBe(ModelTier.REASONING);
  });

  it("includes user_instructions in the prompt when provided", async () => {
    mockCallMiniMax.mockResolvedValueOnce(mockMiniMaxResponse("connection_note"));

    await generateArtifact({
      artifact_type: "connection_note",
      context: baseContext,
      user_instructions: "Make it very concise and mention INSEAD",
    });

    const [messages] = mockCallMiniMax.mock.calls[0];
    const userPrompt = messages[0].content as string;
    expect(userPrompt).toContain("Make it very concise and mention INSEAD");
  });

  it("includes user writing style in system prompt when user_memory is set", async () => {
    mockCallMiniMax.mockResolvedValueOnce(mockMiniMaxResponse("outreach_draft"));

    const contextWithMemory = {
      ...baseContext,
      user_memory: {
        writing_style: {
          tone: "casual",
          avoids: ["overly formal language"],
          preferred_hooks: ["shared alumni"],
          message_length_preference: "short",
          signature_phrases: ["Cheers"],
          last_updated: "2026-04-01T00:00:00Z",
        },
        networking_approach: {
          comfort_with_cold_outreach: 4,
          preferred_channels: ["LinkedIn"],
          follow_up_cadence: "weekly",
          last_updated: "2026-04-01T00:00:00Z",
        },
        learned_patterns: {
          successful_hooks: [],
          best_performing_tone: "casual",
          optimal_message_length: 200,
          last_updated: "2026-04-01T00:00:00Z",
        },
      },
    };

    await generateArtifact({
      artifact_type: "outreach_draft",
      context: contextWithMemory,
    });

    const [, options] = mockCallMiniMax.mock.calls[0];
    expect(options.systemPrompt).toContain("casual");
  });

  it("throws when model returns non-JSON response", async () => {
    mockCallMiniMax.mockResolvedValueOnce({
      content: "Here is a great connection note!",
      usage: { prompt_tokens: 200, completion_tokens: 50, total_tokens: 250 },
    });

    await expect(
      generateArtifact({ artifact_type: "connection_note", context: baseContext })
    ).rejects.toThrow("Generation model returned non-JSON response");
  });

  it("includes company intel in prompt when provided", async () => {
    mockCallMiniMax.mockResolvedValueOnce(mockMiniMaxResponse("meeting_prep"));

    await generateArtifact({
      artifact_type: "meeting_prep",
      context: {
        ...baseContext,
        company_intel_raw: "Sequoia recently raised a $2.85B fund for SEA...",
      },
    });

    const [messages] = mockCallMiniMax.mock.calls[0];
    const userPrompt = messages[0].content as string;
    expect(userPrompt).toContain("$2.85B fund");
  });
});

/**
 * tests/lib/context.test.ts
 * Unit tests for context window management and rolling summarization.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { SUMMARIZATION_THRESHOLD, RECENT_MESSAGES_WINDOW } from "@/lib/ai/context";

// ---------------------------------------------------------------------------
// Mock callMiniMax
// vi.hoisted() ensures mockCallMiniMax is available inside the hoisted vi.mock factory
// ---------------------------------------------------------------------------

const { mockCallMiniMax } = vi.hoisted(() => ({ mockCallMiniMax: vi.fn() }));

vi.mock("@/lib/ai/minimax", () => ({
  callMiniMax: mockCallMiniMax,
}));

const { summarizeConversation, extractStylePreferences, createEmptyUserMemory } =
  await import("@/lib/ai/context");

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

const mockMessages = [
  { role: "user" as const, content: "I want to reach out to Marie Chen at Sequoia." },
  {
    role: "agent" as const,
    content: "Great idea! Marie is a strong match. Shall I draft a connection note?",
  },
  { role: "user" as const, content: "Yes, please draft a connection note." },
  {
    role: "agent" as const,
    content: "I've drafted a connection note for Marie using your shared INSEAD background.",
  },
];

const mockSummaryResponse = {
  key_decisions: ["Draft connection note for Marie Chen using INSEAD hook"],
  user_preferences_expressed: ["Warm tone preferred"],
  artifacts_produced: [{ type: "connection_note", status: "draft", id: "artifact-123" }],
  open_questions: ["Should user reach out via LinkedIn or email?"],
  relationship_stage_changes: ["Marie moved to 'contacted' status"],
};

// ---------------------------------------------------------------------------
// Constants tests
// ---------------------------------------------------------------------------

describe("context constants", () => {
  it("SUMMARIZATION_THRESHOLD is 15", () => {
    expect(SUMMARIZATION_THRESHOLD).toBe(15);
  });

  it("RECENT_MESSAGES_WINDOW is 5", () => {
    expect(RECENT_MESSAGES_WINDOW).toBe(5);
  });
});

// ---------------------------------------------------------------------------
// summarizeConversation() tests
// ---------------------------------------------------------------------------

describe("summarizeConversation()", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns a ConversationSummary with all required fields", async () => {
    mockCallMiniMax.mockResolvedValueOnce({
      content: JSON.stringify(mockSummaryResponse),
      usage: { prompt_tokens: 400, completion_tokens: 100, total_tokens: 500 },
    });

    const result = await summarizeConversation({
      messages: mockMessages,
      existing_summary: null,
    });

    expect(result).toMatchObject({
      key_decisions: expect.any(Array),
      user_preferences_expressed: expect.any(Array),
      artifacts_produced: expect.any(Array),
      open_questions: expect.any(Array),
      relationship_stage_changes: expect.any(Array),
    });
  });

  it("calls callMiniMax once for summarization", async () => {
    mockCallMiniMax.mockResolvedValueOnce({
      content: JSON.stringify(mockSummaryResponse),
      usage: { prompt_tokens: 400, completion_tokens: 100, total_tokens: 500 },
    });

    await summarizeConversation({ messages: mockMessages, existing_summary: null });

    expect(mockCallMiniMax).toHaveBeenCalledOnce();
  });

  it("merges with existing summary when provided", async () => {
    const existingSummary = {
      key_decisions: ["Previous decision"],
      user_preferences_expressed: [],
      artifacts_produced: [],
      open_questions: [],
      relationship_stage_changes: [],
    };

    mockCallMiniMax.mockResolvedValueOnce({
      content: JSON.stringify(mockSummaryResponse),
      usage: { prompt_tokens: 500, completion_tokens: 150, total_tokens: 650 },
    });

    await summarizeConversation({
      messages: mockMessages,
      existing_summary: existingSummary,
    });

    const [messages] = mockCallMiniMax.mock.calls[0];
    const userPrompt = messages[0].content as string;
    expect(userPrompt).toContain("Previous decision");
  });

  it("includes all message roles in the prompt", async () => {
    mockCallMiniMax.mockResolvedValueOnce({
      content: JSON.stringify(mockSummaryResponse),
      usage: { prompt_tokens: 400, completion_tokens: 100, total_tokens: 500 },
    });

    await summarizeConversation({ messages: mockMessages, existing_summary: null });

    const [messages] = mockCallMiniMax.mock.calls[0];
    const userPrompt = messages[0].content as string;
    expect(userPrompt).toContain("user:");
    expect(userPrompt).toContain("agent:");
  });

  it("throws when model returns non-JSON", async () => {
    mockCallMiniMax.mockResolvedValueOnce({
      content: "The conversation was about networking.",
      usage: { prompt_tokens: 100, completion_tokens: 30, total_tokens: 130 },
    });

    await expect(
      summarizeConversation({ messages: mockMessages, existing_summary: null })
    ).rejects.toThrow("Summarization model returned non-JSON response");
  });
});

// ---------------------------------------------------------------------------
// extractStylePreferences() tests
// ---------------------------------------------------------------------------

describe("extractStylePreferences()", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns updated_memory and learning_summary", async () => {
    const mockExtractResponse = {
      updated_memory: {
        writing_style: {
          tone: "casual",
          avoids: ["formal greetings"],
          preferred_hooks: ["shared alumni"],
          message_length_preference: "short",
          signature_phrases: ["Best"],
          last_updated: "2026-04-01T00:00:00Z",
        },
        networking_approach: {
          comfort_with_cold_outreach: 3,
          preferred_channels: ["LinkedIn"],
          follow_up_cadence: "weekly",
          last_updated: "2026-04-01T00:00:00Z",
        },
        learned_patterns: {
          successful_hooks: [],
          best_performing_tone: "casual",
          optimal_message_length: 150,
          last_updated: "2026-04-01T00:00:00Z",
        },
      },
      learning_summary: "User prefers casual tone and short messages",
    };

    mockCallMiniMax.mockResolvedValueOnce({
      content: JSON.stringify(mockExtractResponse),
      usage: { prompt_tokens: 300, completion_tokens: 100, total_tokens: 400 },
    });

    const result = await extractStylePreferences({
      original_draft: "Dear Marie, I hope this message finds you well.",
      edited_version: "Hey Marie, hope you're doing great!",
      current_memory: null,
    });

    expect(result.updated_memory).toBeDefined();
    expect(result.learning_summary).toBeTruthy();
  });

  it("passes original and edited content in the prompt", async () => {
    const mockExtractResponse = {
      updated_memory: createEmptyUserMemory(),
      learning_summary: "No significant changes detected",
    };

    mockCallMiniMax.mockResolvedValueOnce({
      content: JSON.stringify(mockExtractResponse),
      usage: { prompt_tokens: 200, completion_tokens: 80, total_tokens: 280 },
    });

    await extractStylePreferences({
      original_draft: "ORIGINAL_DRAFT_TEXT",
      edited_version: "EDITED_VERSION_TEXT",
      current_memory: null,
    });

    const [messages] = mockCallMiniMax.mock.calls[0];
    const prompt = messages[0].content as string;
    expect(prompt).toContain("ORIGINAL_DRAFT_TEXT");
    expect(prompt).toContain("EDITED_VERSION_TEXT");
  });
});

// ---------------------------------------------------------------------------
// createEmptyUserMemory() tests
// ---------------------------------------------------------------------------

describe("createEmptyUserMemory()", () => {
  it("returns a UserMemory with all required fields", () => {
    const memory = createEmptyUserMemory();

    expect(memory.writing_style).toBeDefined();
    expect(memory.networking_approach).toBeDefined();
    expect(memory.learned_patterns).toBeDefined();

    expect(memory.writing_style.tone).toBe("warm but professional");
    expect(memory.writing_style.avoids).toEqual([]);
    expect(memory.networking_approach.comfort_with_cold_outreach).toBe(3);
    expect(memory.learned_patterns.successful_hooks).toEqual([]);
  });

  it("sets last_updated to a valid ISO date string", () => {
    const memory = createEmptyUserMemory();
    const date = new Date(memory.writing_style.last_updated);
    expect(date.getTime()).not.toBeNaN();
  });
});

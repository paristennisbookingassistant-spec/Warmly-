/**
 * ai/context.ts
 * Context window management — rolling summarization strategy.
 * Prevents context window exhaustion for long-running contact sessions.
 * See PRD Section 5.4.2.
 */

import type {
  ConversationSummary,
  SummarizationRequest,
  StyleExtractionRequest,
  StyleExtractionResponse,
} from "@/types/ai";
import type { UserMemory } from "@/types/database";
import { ModelTier } from "@/types/ai";
import { anthropic, MAX_TOKENS } from "./models";

/**
 * Number of messages in a conversation before triggering summarization.
 * After this threshold, older messages are compressed into a summary.
 */
export const SUMMARIZATION_THRESHOLD = 15;

/**
 * Number of recent messages to always include verbatim (for continuity).
 * See PRD Section 5.4.2.
 */
export const RECENT_MESSAGES_WINDOW = 5;

/**
 * Generates or updates a rolling summary of a conversation.
 * Uses Haiku — summarization follows a clear structure.
 */
export async function summarizeConversation(
  request: SummarizationRequest
): Promise<ConversationSummary> {
  const existingSummaryText = request.existing_summary
    ? `\n\nExisting summary to merge into:\n${JSON.stringify(request.existing_summary, null, 2)}`
    : "";

  const messagesText = request.messages
    .map((m) => `${m.role}: ${m.content}`)
    .join("\n");

  const response = await anthropic.messages.create({
    model: ModelTier.FAST,
    max_tokens: MAX_TOKENS[ModelTier.FAST],
    system: `You are summarizing a networking coaching conversation. Return ONLY a valid JSON object with this structure:
{
  "key_decisions": string[],
  "user_preferences_expressed": string[],
  "artifacts_produced": [{"type": string, "status": string, "id": string}],
  "open_questions": string[],
  "relationship_stage_changes": string[]
}`,
    messages: [
      {
        role: "user",
        content: `Summarize these messages into the structured JSON format.${existingSummaryText}\n\nMessages to process:\n${messagesText}`,
      },
    ],
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text : "{}";
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Summarization model returned non-JSON response");
  }

  return JSON.parse(jsonMatch[0]) as ConversationSummary;
}

/**
 * Extracts style preferences from a user's edit of an AI draft.
 * Updates and returns the user_memory with new learned preferences.
 * Uses Haiku — style extraction is lightweight and structured.
 * See PRD Section 5.9 Layer 1.
 */
export async function extractStylePreferences(
  request: StyleExtractionRequest
): Promise<StyleExtractionResponse> {
  const response = await anthropic.messages.create({
    model: ModelTier.FAST,
    max_tokens: MAX_TOKENS[ModelTier.FAST],
    system: `You analyze the differences between an AI-generated draft and a user's edited version to extract writing style preferences. Return ONLY valid JSON.`,
    messages: [
      {
        role: "user",
        content: `Original AI draft:\n${request.original_draft}\n\nUser's edited version:\n${request.edited_version}\n\nCurrent user memory:\n${JSON.stringify(request.current_memory, null, 2)}\n\nAnalyze the edits and return an updated user_memory JSON plus a brief learning_summary string. Format: {"updated_memory": {...}, "learning_summary": "..."}`,
      },
    ],
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text : "{}";
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Style extraction model returned non-JSON response");
  }

  return JSON.parse(jsonMatch[0]) as StyleExtractionResponse;
}

/**
 * Builds an empty user_memory structure for new users.
 */
export function createEmptyUserMemory(): UserMemory {
  const now = new Date().toISOString();
  return {
    writing_style: {
      tone: "warm but professional",
      avoids: [],
      preferred_hooks: [],
      message_length_preference: "concise",
      signature_phrases: [],
      last_updated: now,
    },
    networking_approach: {
      comfort_with_cold_outreach: 3,
      preferred_channels: ["LinkedIn"],
      follow_up_cadence: "every 2-3 weeks",
      last_updated: now,
    },
    learned_patterns: {
      successful_hooks: [],
      best_performing_tone: "warm",
      optimal_message_length: 0,
      last_updated: now,
    },
  };
}

/**
 * ai/scoring.ts
 * Contact relevance scoring using Claude Haiku.
 * Implements the 6-criteria rubric from PRD Section 5.4.
 */

import { ModelTier, SCORING_RUBRIC } from "@/types/ai";
import type {
  ScoringPromptInput,
  ScoringResponse,
} from "@/types/ai";
import { anthropic, getModelId, MAX_TOKENS } from "./models";

/**
 * Scores a contact against the user's profile using the PRD scoring rubric.
 * Uses Claude Haiku — fast and cheap enough for batch scoring during discovery.
 *
 * @returns ScoringResponse with overall_score (1-10), tier (1-3), per-criteria scores,
 *          recommendation_reason, and suggested_hook.
 */
export async function scoreContact(
  input: ScoringPromptInput
): Promise<ScoringResponse> {
  const prompt = buildScoringPrompt(input);

  const response = await anthropic.messages.create({
    model: getModelId(ModelTier.FAST),
    max_tokens: MAX_TOKENS[ModelTier.FAST],
    system: SCORING_SYSTEM_PROMPT,
    messages: [{ role: "user", content: prompt }],
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text : "";

  // Extract JSON from the response (model may include surrounding text)
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error(`Scoring model returned non-JSON response: ${text}`);
  }

  const parsed = JSON.parse(jsonMatch[0]) as ScoringResponse;
  return parsed;
}

const SCORING_SYSTEM_PROMPT = `You are a professional networking advisor. Given a user's profile and networking goals, evaluate a potential contact's relevance.

Always respond with ONLY a valid JSON object matching this exact structure:
{
  "overall_score": <number 1-10, one decimal place>,
  "tier": <1 | 2 | 3>,
  "scores": {
    "career_path_similarity": <number 1-10>,
    "shared_background": <number 1-10>,
    "seniority_relevance": <number 1-10>,
    "industry_match": <number 1-10>,
    "accessibility_signals": <number 1-10>,
    "recency": <number 1-10>
  },
  "recommendation_reason": "<one sentence explaining why this person is relevant>",
  "suggested_hook": "<the strongest outreach angle based on mutual context>"
}

Tier assignment: 1 = Strong match (score >= 7.5), 2 = Good match (score 5-7.4), 3 = Worth considering (score < 5).
No hallucination — only reference facts present in the provided profiles.`;

function buildScoringPrompt(input: ScoringPromptInput): string {
  const rubricText = SCORING_RUBRIC.map(
    (c) => `- ${c.name} (${Math.round(c.weight * 100)}%): ${c.description}`
  ).join("\n");

  return `## User Profile
Career History: ${JSON.stringify(input.user_profile.career_history)}
Education: ${JSON.stringify(input.user_profile.education)}
Goals: ${JSON.stringify(input.user_profile.goals)}
Networking Preferences: ${JSON.stringify(input.user_profile.networking_preferences)}

## Contact Profile
Name: ${input.contact_profile.name}
Current Role: ${input.contact_profile.current_role ?? "Unknown"}
Company: ${input.contact_profile.company ?? "Unknown"}
Location: ${input.contact_profile.location ?? "Unknown"}
Career History: ${JSON.stringify(input.contact_profile.career_history)}
Education: ${JSON.stringify(input.contact_profile.education)}

## Scoring Rubric
${rubricText}

Evaluate this contact and return the JSON scoring response.`;
}

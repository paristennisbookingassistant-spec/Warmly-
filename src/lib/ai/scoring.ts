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
import { MAX_TOKENS } from "./models";
import { callMiniMax } from "./minimax";

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

  const response = await callMiniMax(
    [{ role: "user", content: prompt }],
    { systemPrompt: SCORING_SYSTEM_PROMPT, maxTokens: MAX_TOKENS[ModelTier.FAST] }
  );

  const text = response.content;

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
Current Role: ${input.contact_profile.current_title ?? "Unknown"}
Company: ${input.contact_profile.company ?? "Unknown"}
Location: ${input.contact_profile.location ?? "Unknown"}
Career History: ${JSON.stringify(input.contact_profile.career_history)}
Education: ${JSON.stringify(input.contact_profile.education)}

## Scoring Rubric
${rubricText}

Evaluate this contact and return the JSON scoring response.`;
}

// ===========================================================================
// BATCH RANKING — compares candidates against each other AND against the
// user's profile narrative. Single LLM call, returns ranked array with
// per-pick rationale that gets shown to the user.
// ===========================================================================

import type { ContactProfileForScoring, UserProfileForScoring } from "@/types/ai";
import type { UserMemory } from "@/types/database";

export interface BatchRankCandidate {
  contact_id: string;
  profile: ContactProfileForScoring;
}

export interface BatchRankResult {
  contact_id: string;
  rank: number;        // 1-based, lower = better
  score: number;       // 0-10
  tier: 1 | 2 | 3;
  reasoning: string;   // ONE sentence — shown to the user
  hook: string;        // strongest outreach angle
}

export interface BatchRankInput {
  user_profile: UserProfileForScoring;
  /** Markdown identity narrative — primary "who is the user" signal. */
  user_profile_md: string | null;
  user_memory?: UserMemory | null;
  candidates: BatchRankCandidate[];
  /** Cap how many ranked results to return. Defaults to 10. */
  topN?: number;
}

const BATCH_RANK_SYSTEM_PROMPT = `You rank networking candidates for a specific user.

Your job is to compare candidates against EACH OTHER and against the user's profile narrative, then return a ranked list with specific reasoning.

Critical rules:
- The reasoning is shown to the user in the UI. Make every reasoning specific and useful — never generic.
  GOOD: "Picked because: shared INSEAD class with you, same Bain → growth VC pivot you're targeting, Paris-based"
  BAD:  "Strong match based on background and location"
- Cite the actual signal: school name, employer, transition arc, geography, language.
- If the user has a profile narrative, prefer signals that connect to its specific phrases / hooks.
- Tier rule: 1 = strong match (score ≥ 7.5), 2 = good match (5-7.4), 3 = worth considering (< 5).
- Score scale: 0-10, one decimal place.
- Return JSON only. No code fences, no commentary outside the JSON.

JSON schema:
{
  "rankings": [
    {
      "contact_id": <string — exactly the id passed in>,
      "rank": <number, 1-based>,
      "score": <number, 0-10, one decimal>,
      "tier": <1 | 2 | 3>,
      "reasoning": <string — ONE sentence, specific>,
      "hook": <string — strongest outreach angle for this person>
    }
  ]
}`;

function buildBatchRankPrompt(input: BatchRankInput): string {
  const blocks: string[] = [];

  // Identity narrative (primary signal)
  if (input.user_profile_md && input.user_profile_md.trim().length > 0) {
    blocks.push(
      `## User identity (this is who the user is — use this to judge fit)\n${input.user_profile_md.trim()}`
    );
  }

  // Structured fallback (always include — useful even when narrative exists)
  blocks.push(
    `## User structured fields\nCareer history: ${JSON.stringify(input.user_profile.career_history)}\nEducation: ${JSON.stringify(input.user_profile.education)}\nGoals: ${JSON.stringify(input.user_profile.goals)}`
  );

  // Voice / preferences signal
  if (input.user_memory?.writing_style) {
    blocks.push(
      `## User voice notes\n${JSON.stringify(input.user_memory.writing_style)}`
    );
  }

  // Candidates — concise per-row format
  const candidateBlocks = input.candidates.map((c, i) => {
    const p = c.profile;
    const lines = [
      `### Candidate ${i + 1} · contact_id="${c.contact_id}"`,
      `Name: ${p.name}`,
      `Current role: ${p.current_title ?? "Unknown"} at ${p.company ?? "Unknown"}`,
      `Location: ${p.location ?? "Unknown"}`,
    ];
    if (p.career_history?.length) {
      lines.push(`Career: ${JSON.stringify(p.career_history)}`);
    }
    if (p.education?.length) {
      lines.push(`Education: ${JSON.stringify(p.education)}`);
    }
    return lines.join("\n");
  });
  blocks.push(`## Candidates (${input.candidates.length})\n\n${candidateBlocks.join("\n\n")}`);

  // Task
  const topN = Math.min(input.topN ?? 10, input.candidates.length);
  blocks.push(
    `## Task\nRank the ${topN} best candidates for this user. Compare them against each other — your reasoning should explain WHY this candidate beats the others, not just describe them. Return JSON matching the schema.`
  );

  return blocks.join("\n\n");
}

/**
 * Ranks a batch of candidates against the user's profile and against each
 * other in a single LLM call. Returns the top N with per-pick rationale.
 *
 * Uses REASONING tier — comparison + judgment is more expensive than
 * pattern-matching, and the rationale quality is what makes the rank
 * feel earned vs. opaque.
 */
export async function rankContactsBatch(
  input: BatchRankInput
): Promise<BatchRankResult[]> {
  if (input.candidates.length === 0) return [];

  const prompt = buildBatchRankPrompt(input);

  const response = await callMiniMax(
    [{ role: "user", content: prompt }],
    {
      systemPrompt: BATCH_RANK_SYSTEM_PROMPT,
      maxTokens: MAX_TOKENS[ModelTier.REASONING],
      temperature: 0.3,
    }
  );

  const text = response.content;

  // Strip code fences if the model wraps output despite instructions
  const fenced = text.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
  const candidate = fenced ? fenced[1] : text;
  const jsonMatch = candidate.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    console.error(
      "[rankContactsBatch] Non-JSON response. First 500 chars:",
      text.slice(0, 500)
    );
    throw new Error("Ranking model returned non-JSON response");
  }

  let parsed: { rankings?: BatchRankResult[] };
  try {
    parsed = JSON.parse(jsonMatch[0]);
  } catch (err) {
    console.error(
      "[rankContactsBatch] JSON parse failed:",
      err,
      jsonMatch[0].slice(0, 300)
    );
    throw new Error("Ranking model returned malformed JSON");
  }

  if (!Array.isArray(parsed.rankings)) {
    console.error("[rankContactsBatch] Missing rankings array:", parsed);
    throw new Error("Ranking response missing rankings array");
  }

  // Defensive — only return rankings whose contact_id was in the input.
  // Drops any hallucinated IDs.
  const validIds = new Set(input.candidates.map((c) => c.contact_id));
  return parsed.rankings
    .filter((r) => validIds.has(r.contact_id))
    .map((r) => ({
      contact_id: r.contact_id,
      rank: Number(r.rank),
      score: Number(r.score),
      tier: (r.tier === 1 || r.tier === 2 || r.tier === 3 ? r.tier : 3) as 1 | 2 | 3,
      reasoning: String(r.reasoning ?? ""),
      hook: String(r.hook ?? ""),
    }));
}

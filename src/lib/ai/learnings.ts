/**
 * ai/learnings.ts
 *
 * Closes the self-improvement loop. When the user marks an outreach artifact
 * as sent, we compare what we drafted against what they actually sent and
 * distill 1-3 candidate "learnings" — generalizable patterns the agent
 * should apply to future drafts.
 *
 * Each candidate gets:
 *   - learning: plain-English description
 *   - category: voice | strategy | gate | hook | tone | other
 *   - confidence: 1-10
 *
 * Auto-approval gate (per user decision May 6):
 *   - confidence >= 8: auto-approve, becomes active immediately
 *   - confidence 5-7: pending, surfaced to user for explicit approval
 *   - confidence < 5: discarded silently (not even shown)
 *
 * Approved learnings flow back into prompts via
 * `lib/ai/prompts/buildOutreachPrompt.ts` (will read from user_learnings
 * table when wired up server-side).
 *
 * See PRD Section 5.9 Layer 2.
 */

import { callMiniMax } from "./minimax";
import { MAX_TOKENS } from "./models";
import { ModelTier } from "@/types/ai";
import type { LearningCategory } from "@/types/database";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface LearningCandidate {
  learning: string;
  category: LearningCategory;
  confidence: number;
  /**
   * If we have approved learnings already in `existing_learnings`, we
   * include this flag — true means the candidate doesn't conflict with
   * any prior learning. Auto-approval requires no_conflict=true AND
   * confidence>=8.
   */
  no_conflict: boolean;
}

export interface DistillRequest {
  original_draft: string;
  sent_version: string;
  /** Existing approved learnings — used to avoid duplicates and check for conflicts */
  existing_learnings: string[];
  /** Optional context — what type of artifact, who it was sent to */
  artifact_type?: string;
  contact_name?: string;
}

// ---------------------------------------------------------------------------
// Distillation prompt
// ---------------------------------------------------------------------------

const DISTILL_SYSTEM_PROMPT = `You analyze the difference between an AI-drafted outreach message and the version a user actually sent. Your job is to extract 1-3 GENERALIZABLE learnings — patterns that should apply to future drafts, not one-off edits.

Each learning has:
- learning: a plain-English description of the pattern (e.g., "User replaces 'I'd love to' with 'I want to' — never use 'I'd love to' in future drafts")
- category: voice | strategy | gate | hook | tone | other
  - voice: phrasing, vocabulary, sentence rhythm
  - strategy: framing, who-leads-with-what, the 2-step approach
  - gate: hard rules (always avoid X, always use Y)
  - hook: connection-point preferences (lead with school, lead with shared employer, etc.)
  - tone: warmth level, formality
  - other: anything else
- confidence: 1-10
  - 9-10: clearly visible pattern, multiple instances, high signal
  - 7-8: clear single-instance pattern, generalizable
  - 5-6: possible pattern, low signal, might be one-off
  - 1-4: noise, don't include
- no_conflict: true if this learning doesn't contradict any existing approved learning, false otherwise

Rules:
- Skip trivial edits (typo fixes, whitespace).
- Skip personalization edits ("change John to Jane") — those aren't generalizable.
- Prioritize patterns that match anti-AI gates (em-dashes, "I'd love to", "I came across") — these are high-signal.
- If nothing meaningful was learned, return an empty array.
- Return AT MOST 3 candidates. Quality over quantity.
- If the user added meaningful new content (not just editing the AI's version), the learning might be "user prefers X angle when Y" — that's valid.

Return ONLY valid JSON: { "candidates": [{learning, category, confidence, no_conflict}, ...] }`;

export async function distillLearnings(
  request: DistillRequest
): Promise<LearningCandidate[]> {
  const userPrompt = `## Original AI draft
${request.original_draft}

## What the user actually sent
${request.sent_version}

${request.artifact_type ? `## Artifact type\n${request.artifact_type}\n` : ""}
${request.contact_name ? `## Sent to\n${request.contact_name}\n` : ""}

## Existing approved learnings (avoid duplicates, flag conflicts)
${
  request.existing_learnings.length === 0
    ? "(none yet)"
    : request.existing_learnings.map((l, i) => `${i + 1}. ${l}`).join("\n")
}

Return the JSON.`;

  const response = await callMiniMax(
    [{ role: "user", content: userPrompt }],
    {
      systemPrompt: DISTILL_SYSTEM_PROMPT,
      maxTokens: MAX_TOKENS[ModelTier.FAST],
      temperature: 0.2,
    }
  );

  const text = response.content || "{}";
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return [];

  try {
    const parsed = JSON.parse(jsonMatch[0]) as { candidates?: LearningCandidate[] };
    return Array.isArray(parsed.candidates) ? parsed.candidates : [];
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Auto-approval rule
// ---------------------------------------------------------------------------

/**
 * Per the May 6 decision: confidence >= 8 + no_conflict auto-approves.
 * Everything else (5-7 confidence, OR has_conflict) is pending → user reviews.
 * Confidence < 5 should already have been filtered out by the LLM.
 */
export function shouldAutoApprove(candidate: LearningCandidate): boolean {
  return candidate.confidence >= 8 && candidate.no_conflict;
}

/**
 * Threshold below which a candidate isn't worth surfacing at all.
 * The LLM is instructed to filter these out, but we double-check.
 */
export function shouldDiscard(candidate: LearningCandidate): boolean {
  return candidate.confidence < 5;
}

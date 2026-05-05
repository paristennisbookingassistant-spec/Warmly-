/**
 * ai/models.ts
 * Model routing logic — maps task types to the correct MiniMax model tier.
 * FAST tier for scoring/simple tasks; REASONING tier for complex reasoning.
 * See PRD Section 5.4.1.
 */

import { ModelTier, ARTIFACT_MODEL_ROUTING } from "@/types/ai";
import type { ArtifactType } from "@/types/artifacts";

/**
 * Canonical model IDs used in all API calls.
 * Both tiers currently resolve to the same MiniMax model; the distinction
 * controls max_tokens budget only.
 */
export const MODELS = {
  FAST: "MiniMax-M2.7-highspeed",
  REASONING: "MiniMax-M2.7-highspeed",
} as const;

export type ModelId = (typeof MODELS)[keyof typeof MODELS];

/**
 * Estimated cost per 1M tokens (USD) — used for logging and cost monitoring.
 * TODO: verify against current MiniMax pricing at https://www.minimaxi.com/pricing
 * Placeholder values: ~$0.20 input / $1.10 output per million tokens.
 */
export const COST_PER_MILLION_TOKENS: Record<
  ModelTier,
  { input: number; output: number }
> = {
  [ModelTier.FAST]: { input: 0.20, output: 1.10 },
  [ModelTier.REASONING]: { input: 0.20, output: 1.10 },
};

/** Max tokens budget per model tier — prevents runaway costs */
export const MAX_TOKENS: Record<ModelTier, number> = {
  [ModelTier.FAST]: 1024,
  [ModelTier.REASONING]: 4096,
};

/**
 * Maps a ModelTier enum value to the actual MiniMax model string.
 */
export function getModelId(tier: ModelTier): string {
  return tier === ModelTier.FAST ? MODELS.FAST : MODELS.REASONING;
}

/**
 * Returns the correct model tier for a given artifact type.
 * follow_up_draft upgrades to REASONING when meeting context is present.
 */
export function getModelForArtifact(
  artifactType: ArtifactType,
  forceReasoningModel = false
): ModelTier {
  if (artifactType === "follow_up_draft" && forceReasoningModel) {
    // Follow-up with meeting context needs the reasoning budget for nuanced references
    return ModelTier.REASONING;
  }
  return ARTIFACT_MODEL_ROUTING[artifactType];
}

/**
 * Returns the correct model tier for conversational coaching.
 * Simple factual Q&A → FAST. Strategic coaching → REASONING.
 */
export function getModelForConversation(
  isStrategicCoaching: boolean
): ModelTier {
  return isStrategicCoaching ? ModelTier.REASONING : ModelTier.FAST;
}

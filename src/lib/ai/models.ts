/**
 * ai/models.ts
 * Model routing logic — maps task types to the correct Claude model.
 * Haiku for fast/structured tasks; Sonnet for complex reasoning.
 * See PRD Section 5.4.1.
 */

import Anthropic from "@anthropic-ai/sdk";
import { ModelTier, ARTIFACT_MODEL_ROUTING } from "@/types/ai";
import type { ArtifactType } from "@/types/artifacts";

/** Shared Anthropic client — instantiated once per server process */
export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

/**
 * Returns the correct model ID for a given artifact type.
 * follow_up_draft upgrades to Sonnet when meeting context is present.
 */
export function getModelForArtifact(
  artifactType: ArtifactType,
  hasMeetingContext = false
): ModelTier {
  if (artifactType === "follow_up_draft" && hasMeetingContext) {
    // Follow-up with meeting context needs Sonnet for nuanced references
    return ModelTier.REASONING;
  }
  return ARTIFACT_MODEL_ROUTING[artifactType];
}

/**
 * Returns the correct model ID for conversational coaching.
 * Simple factual Q&A → Haiku. Strategic coaching → Sonnet.
 */
export function getModelForConversation(
  isStrategicCoaching: boolean
): ModelTier {
  return isStrategicCoaching ? ModelTier.REASONING : ModelTier.FAST;
}

/** Max tokens budget per model tier — prevents runaway costs */
export const MAX_TOKENS: Record<ModelTier, number> = {
  [ModelTier.FAST]: 1024,
  [ModelTier.REASONING]: 4096,
};

/** Estimated token cost per million tokens (USD) — for logging/budgeting */
export const TOKEN_COST_PER_MILLION: Record<
  ModelTier,
  { input: number; output: number }
> = {
  [ModelTier.FAST]: { input: 0.25, output: 1.25 },
  [ModelTier.REASONING]: { input: 3.0, output: 15.0 },
};

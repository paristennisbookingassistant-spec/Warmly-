/**
 * ai/models.ts
 * Model routing logic — maps task types to the correct Claude model.
 * Haiku for fast/structured tasks; Sonnet for complex reasoning.
 * See PRD Section 5.4.1.
 */

import Anthropic from "@anthropic-ai/sdk";
import { ModelTier, ARTIFACT_MODEL_ROUTING } from "@/types/ai";
import type { ArtifactType } from "@/types/artifacts";

/**
 * Canonical model IDs used in all API calls.
 * These are the actual model strings passed to the Anthropic SDK.
 */
export const MODELS = {
  HAIKU: "claude-haiku-4-5-20251001",
  SONNET: "claude-sonnet-4-6",
} as const;

export type ModelId = (typeof MODELS)[keyof typeof MODELS];

/**
 * Estimated cost per 1M tokens (USD) — used for logging and cost monitoring.
 */
export const COST_PER_MILLION_TOKENS: Record<
  ModelTier,
  { input: number; output: number }
> = {
  [ModelTier.FAST]: { input: 0.25, output: 1.25 },
  [ModelTier.REASONING]: { input: 3.0, output: 15.0 },
};

/** Max tokens budget per model tier — prevents runaway costs */
export const MAX_TOKENS: Record<ModelTier, number> = {
  [ModelTier.FAST]: 1024,
  [ModelTier.REASONING]: 4096,
};

/**
 * Shared Anthropic client — instantiated once per server process.
 * In serverless (Vercel), this is re-created per cold start.
 */
export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

/**
 * Maps a ModelTier enum value to the actual Anthropic model string.
 */
export function getModelId(tier: ModelTier): string {
  return tier === ModelTier.FAST ? MODELS.HAIKU : MODELS.SONNET;
}

/**
 * Returns the correct model tier for a given artifact type.
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
 * Returns the correct model tier for conversational coaching.
 * Simple factual Q&A → Haiku. Strategic coaching → Sonnet.
 */
export function getModelForConversation(
  isStrategicCoaching: boolean
): ModelTier {
  return isStrategicCoaching ? ModelTier.REASONING : ModelTier.FAST;
}

/**
 * Creates a fresh Anthropic client.
 * Useful in tests where the shared singleton might be mocked.
 */
export function createAnthropicClient(): Anthropic {
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
}

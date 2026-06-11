/**
 * components/v2/draft/types.ts
 * Shared type definitions for the Draft editor components.
 * Kept local per Agent B's mandate (do not edit primitives.tsx).
 */

export type VariantKey = "initial" | "shorter" | "formal" | "ask" | "paris";

export type LangKey = "fr-tu" | "fr-vous" | "en";

export interface GenerateResult {
  artifact_id: string;
  message: string;
}

export interface RefineMessage {
  role: "user" | "agent";
  text: string;
  hint?: { label: string };
}

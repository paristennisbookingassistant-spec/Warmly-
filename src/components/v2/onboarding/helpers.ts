/**
 * components/v2/onboarding/helpers.ts
 * Normalisation helpers for fields returned by POST /api/onboarding/parse-cv.
 *
 * The AI sometimes returns target_industry / target_role as a single string
 * when it finds one value, or as a string[] when it finds multiple. Both shapes
 * are valid from the server's perspective. These helpers guarantee a stable
 * string (first element wins) or string[] for safe display + editing.
 */

import type { ExtractedFields } from "@/types/onboarding";

/** Normalise a string | string[] | null to a plain string (or empty). */
export function normaliseToString(value: string | string[] | null | undefined): string {
  if (!value) return "";
  if (Array.isArray(value)) return value[0] ?? "";
  return value;
}

/** Normalise a string | string[] | null to a string[]. */
export function normaliseToArray(value: string | string[] | null | undefined): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  return value ? [value] : [];
}

/**
 * The AI may return target_industry / target_role as string OR string[].
 * Cast the parsed JSON blob to a looser type before normalising.
 */
export interface RawExtractedFields extends Omit<ExtractedFields, "target_industry" | "target_role"> {
  target_industry: string | string[] | null;
  target_role: string | string[] | null;
}

/** Convert raw AI output to a stable ExtractedFields shape. */
export function normaliseExtractedFields(raw: RawExtractedFields): ExtractedFields {
  return {
    prior_industry: raw.prior_industry ?? null,
    prior_function: raw.prior_function ?? null,
    nationality: raw.nationality ?? null,
    work_authorization: raw.work_authorization ?? [],
    insead_class: raw.insead_class ?? null,
    target_industry: normaliseToString(raw.target_industry),
    target_role: normaliseToString(raw.target_role),
    target_companies: raw.target_companies ?? [],
    target_geography: raw.target_geography ?? [],
  };
}

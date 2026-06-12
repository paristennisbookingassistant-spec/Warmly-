/**
 * types/onboarding.ts
 * Types for the CV-parse endpoint and onboarding flow.
 */

import type { ApiResponse } from "./api";

/**
 * Structured fields extracted from a CV by the AI.
 * Every field is nullable — the AI must not invent values that aren't in the CV.
 * Arrays default to [] (empty) when not found.
 */
export interface ExtractedFields {
  /** Primary industry the candidate worked in (e.g. "Management Consulting", "Pharma/Life Sciences") */
  prior_industry: string | null;
  /** Primary function / discipline (e.g. "Strategy", "Operations", "Finance") */
  prior_function: string | null;
  /** Nationality as stated in the CV (e.g. "Chinese", "French") */
  nationality: string | null;
  /** Work authorisation regions/countries mentioned (e.g. ["EU", "France"]) */
  work_authorization: string[];
  /** INSEAD cohort if mentioned (e.g. "December 2026") */
  insead_class: string | null;
  /** Target industry the candidate is aiming for */
  target_industry: string | null;
  /** Target role/function the candidate is seeking */
  target_role: string | null;
  /** Target companies explicitly listed */
  target_companies: string[];
  /** Target geographies (countries or regions) */
  target_geography: string[];
}

/**
 * Response body for POST /api/onboarding/parse-cv
 */
export interface ParseCvResponseData {
  /** Full extracted text (truncated to 20 000 chars for AI processing) */
  text: string;
  /**
   * Structured fields extracted by the AI.
   * null when kind !== "cv" or when the AI output could not be parsed.
   */
  fields: ExtractedFields | null;
}

export type ParseCvResponse = ApiResponse<ParseCvResponseData>;

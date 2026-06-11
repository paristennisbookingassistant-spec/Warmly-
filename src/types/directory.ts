/**
 * directory.ts
 * Types for the shared INSEAD directory_profiles table.
 * Used by GET /api/directory, POST /api/directory/save, POST /api/directory/rank.
 */

import type { ISODateString, LinkedInEducationEntry, LinkedInExperienceEntry } from "./database";
import type { PaginatedResponse } from "./api";

// ---------------------------------------------------------------------------
// DirectoryProfile — mirrors the directory_profiles table
// ---------------------------------------------------------------------------

export interface DirectoryProfile {
  id: string;
  directory_key: string;
  source: "insead_cv_book";

  // Identity
  name: string;
  first_name: string | null;
  last_name: string | null;
  headline: string | null;
  current_title: string | null;
  company: string | null;
  location: string | null;
  photo_url: string | null;
  linkedin_url: string | null;

  // INSEAD-specific facets
  cohort: string | null;
  nationality: string[];
  languages: string[];
  industries: string[];
  functions: string[];
  geography: string[];

  // Deep data — same JSONB shapes as contacts.experience / contacts.education_v2
  experience: LinkedInExperienceEntry[];
  education_v2: LinkedInEducationEntry[];

  created_at: ISODateString;
  updated_at: ISODateString;
}

// ---------------------------------------------------------------------------
// API response types for directory endpoints
// ---------------------------------------------------------------------------

import type { ApiResponse } from "./api";
import type { Contact } from "./database";

export type ListDirectoryResponse = ApiResponse<PaginatedResponse<DirectoryProfile>>;

export interface SaveDirectoryResponse {
  data: Contact | null;
  already_saved: boolean;
  error: { code: string; message: string } | null;
}

export interface DirectoryRankingItem {
  directory_id: string;
  score: number;
  tier: 1 | 2 | 3;
  reasoning: string;
  hook: string;
  rank: number;
}

export interface RankDirectoryResponseData {
  rankings: DirectoryRankingItem[];
}

export type RankDirectoryResponse = ApiResponse<RankDirectoryResponseData>;

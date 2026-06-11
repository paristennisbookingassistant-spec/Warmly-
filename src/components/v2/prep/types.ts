/**
 * components/v2/prep/types.ts
 * Typed shapes for the meeting_prep artifact content.
 * Mirrors the schema in src/lib/ai/generation.ts ~line 213.
 * All fields are optional because the API renders defensively (any field may
 * be missing from the LLM response).
 */

// ---------------------------------------------------------------------------
// Intake form state (local only, never persisted)
// ---------------------------------------------------------------------------

export type PurposeOption =
  | "First intro or coffee chat"
  | "Reconnect after a while"
  | "Pitch a role or an idea"
  | "Ask for a specific intro or referral"
  | "Investor or customer conversation"
  | "Something else";

export type DurationOption = "15" | "30" | "45" | "60";

export interface IntakeFormValues {
  purpose: PurposeOption;
  duration: DurationOption;
  goal: string;
  focus: string;
}

// ---------------------------------------------------------------------------
// Meeting prep artifact content
// ---------------------------------------------------------------------------

export interface NewsItem {
  headline: string;
  date?: string;
}

export interface CompanyIntel {
  description?: string;
  recent_news?: NewsItem[];
  strategic_priorities?: string[];
}

export interface DiscussionTheme {
  name: string;
  questions: string[];
}

export type RecommendedAsk =
  | "advice"
  | "referral"
  | "introduction"
  | "none yet"
  | string; // defensive: backend may return other values

export interface Coaching {
  do_list?: string[];
  dont_list?: string[];
  positioning_advice?: string;
  recommended_ask?: RecommendedAsk;
}

/** The full content object returned by POST /api/ai/generate for meeting_prep */
export interface MeetingPrepContent {
  person_summary?: string;
  company_intel?: CompanyIntel;
  discussion_themes?: DiscussionTheme[];
  coaching?: Coaching;
}

// ---------------------------------------------------------------------------
// Generated brief — combines artifact content with intake metadata
// ---------------------------------------------------------------------------

export interface GeneratedBrief {
  artifactId: string;
  content: MeetingPrepContent;
  intake: IntakeFormValues;
}

// ---------------------------------------------------------------------------
// Tab identifiers
// ---------------------------------------------------------------------------

export type PrepTab = "snapshot" | "company" | "questions" | "agenda";

// ---------------------------------------------------------------------------
// Live notes — keyed by question index or fixed slot
// ---------------------------------------------------------------------------

export type LiveNotes = Record<string, string>;

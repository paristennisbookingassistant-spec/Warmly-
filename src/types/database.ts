/**
 * database.ts
 * TypeScript interfaces mirroring every table in the Supabase PostgreSQL schema.
 * These are the authoritative shapes used throughout the application.
 * Generated types from `supabase gen types typescript` would augment these.
 */

// ---------------------------------------------------------------------------
// Shared primitives
// ---------------------------------------------------------------------------

/** ISO-8601 datetime string returned by Postgres/Supabase */
export type ISODateString = string;

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

export interface CareerHistoryEntry {
  title: string;
  company: string;
  /** e.g. "2020-01" */
  start_date: string;
  /** null = current role */
  end_date: string | null;
  description?: string;
}

export interface EducationEntry {
  school: string;
  degree: string;
  field?: string;
  /** graduation year as string e.g. "2026" */
  year: string;
  /** for schools with multiple campuses e.g. "Singapore/Fontainebleau" */
  campus?: string;
}

export interface UserGoals {
  type: "job_search" | "industry_exploration" | "relationship_building" | "other";
  target_industries: string[];
  target_companies: string[];
  target_roles: string[];
  target_geographies: string[];
}

export interface NetworkingPreferences {
  /** warm | professional | casual */
  style: string;
  /** 1–5 scale: 1 = uncomfortable, 5 = very comfortable */
  outreach_comfort: number;
  /** desired new contacts per week */
  contacts_per_week: number;
  /** preferred first-contact channels in priority order */
  preferred_channels: string[];
}

/**
 * Accumulated agent understanding of the user.
 * Stored as a JSON column on the Users table.
 * Updated incrementally after each user edit of an AI draft.
 * See PRD Section 5.9.
 */
export interface UserMemory {
  writing_style: {
    tone: string;
    avoids: string[];
    preferred_hooks: string[];
    message_length_preference: string;
    signature_phrases: string[];
    last_updated: ISODateString;
  };
  networking_approach: {
    comfort_with_cold_outreach: number;
    preferred_channels: string[];
    follow_up_cadence: string;
    last_updated: ISODateString;
  };
  learned_patterns: {
    successful_hooks: Array<{
      hook_type: string;
      success_rate: number;
      sample_size: number;
    }>;
    best_performing_tone: string;
    /** avg characters of messages that received responses */
    optimal_message_length: number;
    last_updated: ISODateString;
  };
}

export type SubscriptionTier = "free" | "pro" | "team";
export type SubscriptionStatus = "active" | "trialing" | "past_due" | "canceled";

export interface User {
  id: string;
  email: string;
  name: string;
  created_at: ISODateString;
  updated_at: ISODateString;
  career_history: CareerHistoryEntry[];
  education: EducationEntry[];
  goals: UserGoals;
  networking_preferences: NetworkingPreferences;
  /** Agent's long-term memory — nullable until first interaction */
  user_memory: UserMemory | null;
  subscription_status: SubscriptionStatus;
  subscription_tier: SubscriptionTier;
}

// ---------------------------------------------------------------------------
// Conversations
// ---------------------------------------------------------------------------

export type ConversationType = "general" | "contact_session";
export type ConversationStatus = "active" | "archived";

export interface Conversation {
  id: string;
  user_id: string;
  created_at: ISODateString;
  updated_at: ISODateString;
  type: ConversationType;
  /** null for general sessions; FK to Contacts.id for contact_session */
  contact_id: string | null;
  /** Auto-generated from first message or contact name */
  title: string;
  status: ConversationStatus;
  /**
   * AI-generated rolling summary.
   * Updated after every N messages (default 15) to compress context.
   * See PRD Section 5.4.2.
   */
  summary: string | null;
}

// ---------------------------------------------------------------------------
// ConversationMessages
// ---------------------------------------------------------------------------

export type MessageRole = "user" | "agent";

export interface ConversationMessage {
  id: string;
  conversation_id: string;
  created_at: ISODateString;
  role: MessageRole;
  /** Plain text message body */
  content: string;
  /**
   * Array of artifact IDs created as a result of this specific agent message.
   * Allows the UI to render inline artifact cards beneath the message.
   */
  artifacts_generated: string[];
}

// ---------------------------------------------------------------------------
// Contacts
// ---------------------------------------------------------------------------

export type ContactSource =
  | "discovery"
  | "manual_chat"
  | "manual_url"
  | "extension_bookmark";

export type ContactStatus =
  | "discovered"
  | "contacted"
  | "connected"
  | "met"
  | "ongoing";

export type ContactFeedback = "great_match" | "not_relevant";

/**
 * Raw profile data captured from the LinkedIn DOM by the browser extension.
 * Shape mirrors the extension's extraction output (see PRD Section 5.3).
 */
export interface ProfileSnapshot {
  linkedin_url: string;
  name: string;
  headline: string;
  current_role: {
    title: string;
    company: string;
    duration: string;
  };
  previous_roles: Array<{
    title: string;
    company: string;
    duration: string;
  }>;
  education: Array<{
    school: string;
    degree: string;
    field?: string;
    dates?: string;
  }>;
  location: string;
  mutual_connections: number;
  captured_at: ISODateString;
  source_session_id: string | null;
}

export interface ScoringBreakdown {
  career_path_similarity: number;
  shared_background: number;
  seniority_relevance: number;
  industry_match: number;
  accessibility_signals: number;
  recency: number;
}

export interface Contact {
  id: string;
  user_id: string;
  created_at: ISODateString;
  updated_at: ISODateString;
  /** Unique per user_id — enforced by DB UNIQUE(user_id, linkedin_url) */
  linkedin_url: string | null;
  name: string;
  current_role: string | null;
  company: string | null;
  location: string | null;
  career_history: CareerHistoryEntry[];
  education: EducationEntry[];
  /**
   * Raw DOM-extracted profile data from the extension.
   * Null for manually-added contacts with no extension capture.
   */
  profile_snapshot: ProfileSnapshot | null;
  /** 1–10 overall relevance score from scoring engine */
  relevance_score: number | null;
  /** 1 = Strong, 2 = Good, 3 = Adjacent */
  tier: 1 | 2 | 3 | null;
  scoring_breakdown: ScoringBreakdown | null;
  /** One-line explanation of why this contact is relevant */
  recommendation_reason: string | null;
  /** Strongest outreach angle identified during scoring */
  suggested_hook: string | null;
  source: ContactSource;
  status: ContactStatus;
  discovered_at: ISODateString;
  last_interaction_at: ISODateString | null;
  user_feedback: ContactFeedback | null;
  /** FK to DiscoverySessions.id — only set for discovery-sourced contacts */
  discovery_session_id: string | null;
  /** User's own free-text annotations */
  notes: string | null;
}

// ---------------------------------------------------------------------------
// Artifacts
// ---------------------------------------------------------------------------

export type ArtifactType =
  | "connection_note"
  | "outreach_draft"
  | "meeting_prep"
  | "meeting_notes"
  | "action_plan"
  | "follow_up_draft";

export type ArtifactStatus = "draft" | "finalized" | "sent" | "archived";

export type ArtifactOutcome =
  | "no_response"
  | "response_received"
  | "meeting_booked"
  | "referral_received";

export interface Artifact {
  id: string;
  user_id: string;
  contact_id: string;
  conversation_id: string;
  created_at: ISODateString;
  updated_at: ISODateString;
  type: ArtifactType;
  /**
   * JSON content — structure varies by artifact type.
   * See artifacts.ts for each type's content interface.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  content: Record<string, any>;
  status: ArtifactStatus;
  /** Increments each time user edits and saves in conversation */
  version: number;
  /** Tracked for outreach-type artifacts; null until user updates */
  artifact_outcome: ArtifactOutcome | null;
  /**
   * Characters changed from AI draft to user's final version.
   * Lower = better AI quality. Used by agent learning system.
   */
  user_edit_distance: number | null;
  /**
   * Type-specific metadata: tone, hook_used, meeting_date, etc.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metadata: Record<string, any>;
}

// ---------------------------------------------------------------------------
// DiscoverySessions
// ---------------------------------------------------------------------------

export type DiscoverySessionStatus = "running" | "paused" | "completed" | "failed";

export interface SearchStrategy {
  companies: string[];
  target_roles: string[];
  target_seniority: string[];
  keywords: string[];
  max_profiles_per_company: number;
  rationale: string;
}

export interface DiscoverySession {
  id: string;
  user_id: string;
  /** FK to Conversations.id — the General Chat that triggered this discovery */
  conversation_id: string;
  started_at: ISODateString;
  ended_at: ISODateString | null;
  target_companies: string[];
  search_strategy: SearchStrategy;
  profiles_viewed: number;
  profiles_scored: number;
  profiles_saved: number;
  status: DiscoverySessionStatus;
  /** Remaining profile views for the day across all sessions */
  rate_limit_remaining: number;
}

// ---------------------------------------------------------------------------
// NetworkingGoals
// ---------------------------------------------------------------------------

export type GoalType =
  | "job_search"
  | "industry_exploration"
  | "relationship_building"
  | "other";

export type GoalStatus = "active" | "paused" | "achieved";

/**
 * Computed progress — derived from real Contacts/Artifacts data.
 * Not manually entered. See PRD Section 5.6 Flow 4.
 */
export interface GoalProgress {
  contacts_found: number;
  messages_sent: number;
  meetings_held: number;
  /** contacts who have responded to outreach */
  responses_received: number;
}

export interface NetworkingGoal {
  id: string;
  user_id: string;
  created_at: ISODateString;
  updated_at: ISODateString;
  goal_type: GoalType;
  description: string;
  target_companies: string[];
  target_roles: string[];
  target_contacts_per_month: number;
  target_meetings_per_month: number;
  /** Computed from real data — see PRD Section 5.6 */
  progress: GoalProgress;
  status: GoalStatus;
}

// ---------------------------------------------------------------------------
// ContactScores (optional denormalised read model for scoring history)
// ---------------------------------------------------------------------------

/**
 * Persists each scoring run so the agent can show "re-scored" history
 * and the outcome learning system can correlate scores with real results.
 */
export interface ContactScore {
  id: string;
  contact_id: string;
  user_id: string;
  scored_at: ISODateString;
  overall_score: number;
  tier: 1 | 2 | 3;
  scores: ScoringBreakdown;
  recommendation_reason: string;
  suggested_hook: string;
  /** Model used — Haiku for scoring by default */
  model_used: string;
}

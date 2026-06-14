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

// ---------------------------------------------------------------------------
// User Learnings — closes the self-improvement loop
// ---------------------------------------------------------------------------

export type LearningStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "archived";

export type LearningCategory =
  | "voice"
  | "strategy"
  | "gate"
  | "hook"
  | "tone"
  | "other";

export interface UserLearning {
  id: string;
  user_id: string;
  learning: string;
  status: LearningStatus;
  approved_at: ISODateString | null;
  /** 1-10. >=8 with no_conflict auto-approves. */
  confidence: number;
  source_artifact_id: string | null;
  category: LearningCategory;
  original_draft_excerpt: string | null;
  sent_excerpt: string | null;
  created_at: ISODateString;
  updated_at: ISODateString;
}

/**
 * Raw text the user shared during the multi-material upload step in
 * onboarding. Each field is optional — user chose which to share.
 * Used to (re)build profile_md and voice_md, and editable later in a
 * Settings page (future feature).
 */
export interface OnboardingMaterials {
  /** Plain-text CV content (extracted from PDF/DOCX or pasted directly) */
  cv?: string;
  /** Past LinkedIn/email message samples — feeds voice_md */
  past_messages?: string;
  /** Cover letter or bio samples — feeds voice_md */
  cover_letter?: string;
  /** Career assessment results + label (CareerLeader/MBTI/Hogan/DISC/Other) */
  career_assessment?: {
    text: string;
    kind: "CareerLeader" | "MBTI" | "Hogan" | "DISC" | "Other";
  };
  /** ISO timestamps per key for "last updated" indicators in Settings */
  uploaded_at?: Partial<Record<
    "cv" | "past_messages" | "cover_letter" | "career_assessment",
    ISODateString
  >>;
}

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
  /**
   * Free-form markdown IDENTITY narrative — auto-built from onboarding
   * answers, optional CV upload, and structured career history.
   * Slow-changing. Editable by user via Settings. Injected into outreach
   * prompts to ground content references (schools, employers, transition).
   */
  profile_md: string | null;
  /**
   * Free-form markdown VOICE narrative — distinct from profile_md.
   * Built from past message uploads + cover letter samples + finalized
   * artifacts + learned edits. Continuously updated. Higher-priority
   * voice signal than user_memory.writing_style.
   */
  voice_md: string | null;
  /** Has the user finished (or skipped) onboarding? Replaces localStorage check. */
  onboarded: boolean;
  /** Raw materials the user shared during multi-material upload step. */
  onboarding_materials: OnboardingMaterials;
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
  | "extension_bookmark"
  | "cv_book";

export type ContactStatus =
  | "discovered"
  | "contacted"
  | "connected"
  | "met"
  | "ongoing";

/**
 * User's triage decision from the Tinder-style swipe deck.
 * - "pending":  awaiting review (default for new discoveries from the extension)
 * - "saved":    right-swiped, visible in /contacts
 * - "skipped":  left-swiped, hidden from /contacts but data preserved
 * - "starred":  up-swiped, saved + outreach draft initiated
 * - null:       legacy rows from before this column existed; treated as already-reviewed
 */
export type ContactUserAction = "pending" | "saved" | "skipped" | "starred";

export type ContactFeedback = "great_match" | "not_relevant";

/**
 * CRM relationship category. Orthogonal to tier.
 * null (uncategorized) = no reminders until explicitly tagged.
 */
export type RelationshipCategory = "nurturing" | "keep_warm" | "inner_circle" | "dormant";

/**
 * Raw profile data captured from the LinkedIn DOM by the browser extension.
 * Shape mirrors the extension's extraction output (see PRD Section 5.3).
 */
export interface ProfileSnapshot {
  linkedin_url: string;
  name: string;
  headline: string;
  current_title: {
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
  current_title: string | null;
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
  // ---------------------------------------------------------------------------
  // CRM relationship-maintenance fields (added in migration 20260613000000)
  // ---------------------------------------------------------------------------
  /** CRM category: nurturing|keep_warm|inner_circle|dormant|null(uncategorized). Orthogonal to tier. */
  relationship_category: RelationshipCategory | null;
  /** Per-contact cadence override in days; null = inherit CATEGORY_CADENCE default */
  cadence_days: number | null;
  /** Materialized due timestamp = (last_interaction_at ?? now()) + effective_cadence; null = no cadence */
  next_touch_at: ISODateString | null;
  /** Profile photo URL — populated by extension or enrichment */
  avatar_url: string | null;
  /**
   * Triage decision from the Tinder-style swipe deck. See ContactUserAction
   * docstring for state semantics. New discoveries default to 'pending';
   * existing rows from before this column existed are NULL (treated as
   * already-reviewed for display purposes).
   */
  user_action: ContactUserAction | null;
  /** Timestamp of the swipe action. NULL until the user makes a decision. */
  reviewed_at: ISODateString | null;

  // ---------------------------------------------------------------------------
  // LinkedIn Network Sync enrichment fields (added in migration 20260529000001)
  // ---------------------------------------------------------------------------

  /** LinkedIn profile URN, e.g. "urn:li:fsd_profile:ACoAAA...". Set in Phase 1. */
  linkedin_urn: string | null;
  /** LinkedIn "About" / headline text. Set in Phase 2. */
  linkedin_bio: string | null;
  /**
   * LinkedIn work experience entries from Phase 2 deep profile.
   * Shape: LinkedInExperienceEntry[]
   */
  experience: LinkedInExperienceEntry[] | null;
  /**
   * LinkedIn education entries from Phase 2 deep profile.
   * Stored in education_v2 to avoid overwriting hand-entered education data.
   * Shape: LinkedInEducationEntry[]
   */
  education_v2: LinkedInEducationEntry[] | null;
  /** LinkedIn CDN profile photo URL. v1 URL-only; Storage upload is v2. */
  photo_url: string | null;
  /** FK to sync_jobs.id — which bulk sync created/last updated this contact. */
  sync_job_id: string | null;
  /**
   * FK to directory_profiles.id — links a saved INSEAD alum back to its origin.
   * Only set for contacts with source='cv_book'. Null for all other sources.
   */
  directory_profile_id: string | null;
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
// LinkedIn Network Sync
// ---------------------------------------------------------------------------

export type SyncJobStatus = "pending" | "in_progress" | "paused" | "completed" | "failed";
export type SyncJobPhase = "list" | "batch" | "done";

/**
 * Tracks the state of a bulk LinkedIn connection sync for a user.
 * Resumable: last_completed_page (Phase 1) and last_processed_urn_index (Phase 2)
 * allow the extension to pick up exactly where it left off after a browser close.
 */
export interface SyncJob {
  id: string;
  user_id: string;
  status: SyncJobStatus;
  phase: SyncJobPhase;
  /** Total connections discovered in Phase 1 (updated as pages arrive) */
  total_contacts: number;
  /** Contacts fully processed (upserted into the contacts table) */
  processed_contacts: number;
  /** Last connections-list page successfully flushed to the backend (0 = not started) */
  last_completed_page: number;
  /** Last URN index processed during Phase 2 batch enrichment (0 = not started) */
  last_processed_urn_index: number;
  /** Human-readable error when status is "failed" or "paused" */
  error: string | null;
  started_at: ISODateString;
  updated_at: ISODateString;
  completed_at: ISODateString | null;
}

/**
 * One work-experience entry from a LinkedIn deep profile (Phase 2 enrichment).
 * Stored in contacts.experience (JSONB array).
 */
export interface LinkedInExperienceEntry {
  title: string;
  company: string;
  dateRange: { start: string | null; end: string | null };
  description?: string;
  location?: string;
}

/**
 * One education entry from a LinkedIn deep profile (Phase 2 enrichment).
 * Stored in contacts.education_v2 (JSONB array).
 */
export interface LinkedInEducationEntry {
  school: string;
  degree?: string;
  fieldOfStudy?: string;
  dateRange: { start: string | null; end: string | null };
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

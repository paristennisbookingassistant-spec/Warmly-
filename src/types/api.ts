/**
 * api.ts
 * Request and response types for every API route in the application.
 * These types are the contract between frontend and backend.
 * API stubs return mock data matching these shapes exactly.
 */

import type {
  Artifact,
  ArtifactOutcome,
  ArtifactStatus,
  ArtifactType,
  CareerHistoryEntry,
  Contact,
  ContactFeedback,
  ContactSource,
  ContactStatus,
  Conversation,
  ConversationMessage,
  ConversationStatus,
  ConversationType,
  DiscoverySession,
  EducationEntry,
  GoalStatus,
  GoalType,
  LinkedInEducationEntry,
  LinkedInExperienceEntry,
  NetworkingGoal,
  NetworkingPreferences,
  SyncJob,
  SyncJobPhase,
  SyncJobStatus,
  User,
  UserGoals,
} from "./database";
import type { ScoringResponse, GenerationResponse } from "./ai";

// ---------------------------------------------------------------------------
// Generic wrappers
// ---------------------------------------------------------------------------

export interface ApiSuccess<T> {
  data: T;
  error: null;
}

export interface ApiError {
  data: null;
  error: {
    code: string;
    message: string;
    /** Field-level validation errors from Zod */
    field_errors?: Record<string, string[]>;
  };
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

// ---------------------------------------------------------------------------
// Pagination
// ---------------------------------------------------------------------------

export interface PaginationParams {
  page?: number;
  per_page?: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  per_page: number;
  has_more: boolean;
}

// ---------------------------------------------------------------------------
// AI — /api/ai/score
// ---------------------------------------------------------------------------

export interface ScoreContactRequest {
  contact_id: string;
}

export type ScoreContactResponse = ApiResponse<
  ScoringResponse & { contact_id: string; scored_at: string }
>;

// ---------------------------------------------------------------------------
// AI — /api/ai/generate
// ---------------------------------------------------------------------------

export interface GenerateArtifactRequest {
  artifact_type: ArtifactType;
  contact_id: string;
  conversation_id: string;
  user_instructions?: string;
  /** Override model tier — used when follow_up needs meeting context */
  force_reasoning_model?: boolean;
}

export type GenerateArtifactResponse = ApiResponse<
  GenerationResponse & { artifact_id: string }
>;

// ---------------------------------------------------------------------------
// AI — /api/ai/search
// ---------------------------------------------------------------------------

export interface CompanySearchRequest {
  company_name: string;
  /** Only return results newer than this ISO date */
  since_date?: string;
}

export interface CompanySearchResponseData {
  company_name: string;
  snippets: Array<{
    title: string;
    body: string;
    source_url?: string;
    published_date?: string;
  }>;
  cached: boolean;
}

export type CompanySearchApiResponse = ApiResponse<CompanySearchResponseData>;

// ---------------------------------------------------------------------------
// Contacts — /api/contacts
// ---------------------------------------------------------------------------

export interface ListContactsQuery extends PaginationParams {
  status?: ContactStatus;
  company?: string;
  tier?: 1 | 2 | 3;
  /** ISO date — only contacts discovered after this date */
  discovered_after?: string;
  sort_by?: "relevance_score" | "discovered_at" | "last_interaction_at";
  sort_order?: "asc" | "desc";
  /**
   * Filter to contacts tagged with a specific discovery session UUID.
   * Used by the Discover deck to poll for contacts scraped by the extension
   * during a company discovery run. When set, the default triage filter
   * (which hides "pending" contacts) is suppressed so newly-scraped contacts
   * appear immediately.
   */
  discovery_session_id?: string;
}

export type ListContactsResponse = ApiResponse<PaginatedResponse<Contact>>;

export interface CreateContactRequest {
  name: string;
  linkedin_url?: string;
  current_title?: string;
  company?: string;
  location?: string;
  source: ContactSource;
  notes?: string;
}

export type CreateContactResponse = ApiResponse<Contact>;

// ---------------------------------------------------------------------------
// Contacts — /api/contacts/[id]
// ---------------------------------------------------------------------------

export type GetContactResponse = ApiResponse<Contact>;

export interface UpdateContactRequest {
  name?: string;
  linkedin_url?: string;
  current_title?: string;
  company?: string;
  location?: string;
  status?: ContactStatus;
  notes?: string;
  user_feedback?: ContactFeedback;
}

export type UpdateContactResponse = ApiResponse<Contact>;

export type DeleteContactResponse = ApiResponse<{ deleted: true }>;

// ---------------------------------------------------------------------------
// Conversations — /api/conversations
// ---------------------------------------------------------------------------

export interface ListConversationsQuery extends PaginationParams {
  type?: ConversationType;
  contact_id?: string;
  status?: ConversationStatus;
}

export type ListConversationsResponse = ApiResponse<
  PaginatedResponse<Conversation>
>;

export interface CreateConversationRequest {
  type: ConversationType;
  contact_id?: string;
  title?: string;
}

export type CreateConversationResponse = ApiResponse<Conversation>;

// ---------------------------------------------------------------------------
// Conversations — /api/conversations/[id]
// ---------------------------------------------------------------------------

export type GetConversationResponse = ApiResponse<Conversation>;

export interface UpdateConversationRequest {
  title?: string;
  status?: ConversationStatus;
}

export type UpdateConversationResponse = ApiResponse<Conversation>;

// ---------------------------------------------------------------------------
// Messages — /api/conversations/[id]/messages
// ---------------------------------------------------------------------------

export interface ListMessagesQuery extends PaginationParams {
  /** Return messages after this message ID (for cursor-based pagination) */
  after_id?: string;
}

export type ListMessagesResponse = ApiResponse<
  PaginatedResponse<ConversationMessage>
>;

export interface SendMessageRequest {
  content: string;
}

export interface SendMessageResponseData {
  user_message: ConversationMessage;
  agent_message: ConversationMessage;
  /** Artifacts created by the agent in response to this message */
  artifacts_created: Artifact[];
}

export type SendMessageResponse = ApiResponse<SendMessageResponseData>;

// ---------------------------------------------------------------------------
// Artifacts — /api/artifacts
// ---------------------------------------------------------------------------

export interface ListArtifactsQuery extends PaginationParams {
  contact_id?: string;
  conversation_id?: string;
  type?: ArtifactType;
  status?: ArtifactStatus;
}

export type ListArtifactsResponse = ApiResponse<PaginatedResponse<Artifact>>;

export interface CreateArtifactRequest {
  contact_id: string;
  conversation_id: string;
  type: ArtifactType;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  content: Record<string, any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metadata?: Record<string, any>;
}

export type CreateArtifactResponse = ApiResponse<Artifact>;

// ---------------------------------------------------------------------------
// Artifacts — /api/artifacts/[id]
// ---------------------------------------------------------------------------

export type GetArtifactResponse = ApiResponse<Artifact>;

export interface UpdateArtifactRequest {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  content?: Record<string, any>;
  status?: ArtifactStatus;
  artifact_outcome?: ArtifactOutcome;
  /** Characters changed from previous version */
  user_edit_distance?: number;
}

export type UpdateArtifactResponse = ApiResponse<Artifact>;

export type DeleteArtifactResponse = ApiResponse<{ deleted: true }>;

// ---------------------------------------------------------------------------
// Discovery — /api/discovery
// ---------------------------------------------------------------------------

export interface ListDiscoverySessionsQuery extends PaginationParams {
  status?: string;
}

export type ListDiscoverySessionsResponse = ApiResponse<
  PaginatedResponse<DiscoverySession>
>;

export interface StartDiscoveryRequest {
  /**
   * FK to Conversations.id. Optional — omit when triggering from the Discover
   * screen outside a chat context.
   */
  conversation_id?: string | null;
  target_companies: string[];
  /** Max profiles to view in this session — hard cap is 25 (PRD DIS-08) */
  max_profiles?: number;
  /**
   * Free-form company disambiguation hint (e.g. "the AI agent startup").
   * Forwarded to the extension's CDP_DISCOVER path via WEBAPP_DISCOVER.
   */
  company_hint?: string;
  /** School filter label for alumni search. Default: "INSEAD". */
  school_label?: string;
  /** Location filter label (e.g. "Paris", "London"). */
  location_label?: string;
  /** LinkedIn function filter label (e.g. "Finance", "Consulting"). */
  function_label?: string;
}

export type StartDiscoveryResponse = ApiResponse<DiscoverySession>;

export interface UpdateDiscoverySessionRequest {
  status?: "paused" | "completed";
  profiles_viewed?: number;
  profiles_scored?: number;
  profiles_saved?: number;
}

export type UpdateDiscoverySessionResponse = ApiResponse<DiscoverySession>;

// ---------------------------------------------------------------------------
// Goals — /api/goals
// ---------------------------------------------------------------------------

export type ListGoalsResponse = ApiResponse<NetworkingGoal[]>;

export interface CreateGoalRequest {
  goal_type: GoalType;
  description: string;
  target_companies?: string[];
  target_roles?: string[];
  target_contacts_per_month: number;
  target_meetings_per_month: number;
}

export type CreateGoalResponse = ApiResponse<NetworkingGoal>;

// ---------------------------------------------------------------------------
// Goals — /api/goals/[id]
// ---------------------------------------------------------------------------

export type GetGoalResponse = ApiResponse<NetworkingGoal>;

export interface UpdateGoalRequest {
  description?: string;
  target_companies?: string[];
  target_roles?: string[];
  target_contacts_per_month?: number;
  target_meetings_per_month?: number;
  status?: GoalStatus;
}

export type UpdateGoalResponse = ApiResponse<NetworkingGoal>;

export type DeleteGoalResponse = ApiResponse<{ deleted: true }>;

// ---------------------------------------------------------------------------
// User profile — /api/users/me (used by onboarding and settings)
// ---------------------------------------------------------------------------

export type GetUserResponse = ApiResponse<User>;

export interface UpdateUserRequest {
  name?: string;
  career_history?: CareerHistoryEntry[];
  education?: EducationEntry[];
  goals?: UserGoals;
  networking_preferences?: NetworkingPreferences;
}

export type UpdateUserResponse = ApiResponse<User>;

// ---------------------------------------------------------------------------
// LinkedIn Network Sync — /api/sync-jobs
// ---------------------------------------------------------------------------

export interface CreateSyncJobRequest {
  // No body required — server creates the job for the authed user
}

export type CreateSyncJobResponse = ApiResponse<SyncJob>;

export interface PatchSyncJobRequest {
  status?: SyncJobStatus;
  phase?: SyncJobPhase;
  total_contacts?: number;
  processed_contacts?: number;
  last_completed_page?: number;
  last_processed_urn_index?: number;
  error?: string | null;
  completed_at?: string | null;
}

export type PatchSyncJobResponse = ApiResponse<SyncJob>;

export type GetSyncJobResponse = ApiResponse<SyncJob>;

/**
 * GET /api/sync-jobs (no id) → returns the user's most recent sync_job,
 * regardless of status, or null if the user has never synced.
 * Used by Settings → Connections to render a "last sync" summary row.
 */
export type GetLatestSyncJobResponse = ApiResponse<SyncJob | null>;

// ---------------------------------------------------------------------------
// LinkedIn Network Sync — /api/contacts/bulk-import
// ---------------------------------------------------------------------------

/** Date range shape shared by experience and education entries */
export interface VoyagerDateRange {
  start: string | null;
  end: string | null;
}

/** Single contact record as sent by the extension (Phase 1 or Phase 2) */
export interface BulkImportContactItem {
  linkedinUrl: string;
  linkedinUrn: string;
  name: string;
  headline?: string;
  photoUrl?: string;
  currentCompany?: string;
  currentTitle?: string;
  // Phase 2 only — omitted during Phase 1 list sync
  bio?: string;
  experience?: Array<{
    title: string;
    company: string;
    dateRange?: VoyagerDateRange;
    description?: string;
    location?: string;
  }>;
  education?: Array<{
    school: string;
    degree?: string;
    fieldOfStudy?: string;
    dateRange?: VoyagerDateRange;
  }>;
  location?: string;
}

export interface BulkImportRequest {
  /** The sync_job this batch belongs to */
  syncJobId: string;
  /** "list" = Phase 1 basic data; "batch" = Phase 2 deep enrichment */
  phase: "list" | "batch";
  /** Up to 50 contacts per batch (extension enforces this client-side) */
  batch: BulkImportContactItem[];
}

export interface BulkImportResponseData {
  /** Contacts that did not previously exist and were inserted */
  inserted: number;
  /** Contacts that already existed and were updated */
  updated: number;
  /** Per-item failures — batch as a whole still succeeds */
  errors: Array<{ linkedinUrn: string; error: string }>;
}

export type BulkImportResponse = ApiResponse<BulkImportResponseData>;

// Re-export enrichment entry types for convenience (frontend + extension can import from api.ts)
export type { LinkedInExperienceEntry, LinkedInEducationEntry, SyncJob, SyncJobStatus, SyncJobPhase };

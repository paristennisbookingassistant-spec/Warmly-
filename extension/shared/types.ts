/**
 * extension/shared/types.ts
 * Types shared between content script and service worker.
 * Must not import from src/ (extension is a separate bundle).
 */

// ---------------------------------------------------------------------------
// Profile data extracted from LinkedIn DOM
// Mirrors ProfileSnapshot in src/types/database.ts
// ---------------------------------------------------------------------------

export interface ExtractedRole {
  title: string;
  company: string;
  duration: string;
}

export interface ExtractedEducation {
  school: string;
  degree: string;
  field?: string;
  dates?: string;
}

export interface ExtractedProfile {
  linkedin_url: string;
  name: string;
  headline: string;
  current_title: ExtractedRole;
  previous_roles: ExtractedRole[];
  education: ExtractedEducation[];
  location: string;
  /** LinkedIn profile photo URL, if visible on the page */
  avatar?: string;
  /** Number of shared connections shown on the profile */
  mutual_connections: number;
  captured_at: string;
  source_session_id: string | null;
}

// ---------------------------------------------------------------------------
// Discovery session state — persisted in chrome.storage.local
// ---------------------------------------------------------------------------

export type DiscoverySessionStatus =
  | "idle"
  | "running"
  | "paused"
  | "completed"
  | "failed";

export interface DiscoverySessionState {
  session_id: string;
  user_id: string;
  target_companies: string[];
  current_company_index: number;
  profiles_viewed: number;
  profiles_scored: number;
  profiles_saved: number;
  status: DiscoverySessionStatus;
  started_at: string;
  last_heartbeat: string;
  /** Company names already processed */
  completed_companies: string[];
  /** Profile URLs already processed to avoid duplicates */
  processed_urls: string[];
}

// ---------------------------------------------------------------------------
// Messages between content script and service worker
// ---------------------------------------------------------------------------

export type ExtensionMessageType =
  | "START_DISCOVERY"
  | "PAUSE_DISCOVERY"
  | "RESUME_DISCOVERY"
  | "STOP_DISCOVERY"
  | "PROFILE_EXTRACTED"
  | "PROFILE_SCORED"
  | "SESSION_UPDATE"
  | "SESSION_COMPLETED"
  | "SESSION_ERROR"
  | "SESSION_PROGRESS"
  | "HEARTBEAT"
  | "AUTH_CHECK"
  | "AUTH_RESPONSE"
  | "PAGE_BOOKMARKED"
  | "CHECK_RATE_LIMIT"
  | "RECORD_SESSION_START"
  | "RECORD_SESSION_END"
  | "CREATE_SESSION"
  | "SAVE_PROFILE"
  // Network sync messages (CS ↔ SW)
  | "SYNC_CREATE_JOB"
  | "SYNC_UPDATE_JOB"
  | "SYNC_BULK_IMPORT"
  | "SYNC_GET_JOB"
  // Triggered by SW relay → LinkedIn content script
  | "TRIGGER_NETWORK_SYNC"
  | "STOP_NETWORK_SYNC";

export interface ExtensionMessage {
  type: ExtensionMessageType;
  payload?: unknown;
}

export interface StartDiscoveryPayload {
  session_id: string;
  target_companies: string[];
  max_profiles: number;
  /** LinkedIn numeric company ID for structured filter search */
  company_id?: string;
  /** LinkedIn numeric school ID (e.g. INSEAD = 5176) */
  school_id?: string;
}

export interface ProfileExtractedPayload {
  profile: ExtractedProfile;
  session_id: string;
}

export interface SessionUpdatePayload {
  session_id: string;
  profiles_viewed: number;
  profiles_scored: number;
  profiles_saved: number;
  status: DiscoverySessionStatus;
  current_company: string;
}

export interface AuthResponsePayload {
  user_id: string | null;
  access_token: string | null;
}

// ---------------------------------------------------------------------------
// Rate limit state — persisted in chrome.storage.local
// ---------------------------------------------------------------------------

export interface RateLimitState {
  /** ISO date string for today's date */
  date: string;
  /** Number of sessions started today */
  sessions_today: number;
  /** Timestamp of last session start */
  last_session_started_at: number | null;
  /** Total profiles viewed today across all sessions */
  profiles_today: number;
}

// ---------------------------------------------------------------------------
// LinkedIn Network Sync — Voyager API types
// ---------------------------------------------------------------------------

/**
 * A single connection record from the connections-list endpoint (Phase 1).
 * Fields are nullable because Voyager response shapes vary and we degrade
 * gracefully rather than failing the whole page on a missing field.
 */
export interface VoyagerConnection {
  /** The full URN, e.g. "urn:li:fsd_profile:ACoAA..." */
  urn: string;
  /** Numeric entity ID extracted from the URN */
  entityId: string;
  name: string | null;
  headline: string | null;
  /** Current employer name, if present in the list response */
  currentCompany: string | null;
  /** LinkedIn public identifier (vanity slug), e.g. "marc-becker-489151".
   *  Required by Phase 2 to build the details-page URL. Null when missing. */
  publicId: string | null;
  /** LinkedIn profile URL derived from the public identifier */
  linkedinUrl: string | null;
  /** Profile photo URL (LinkedIn CDN) */
  photoUrl: string | null;
  connectedAt: string | null;
}

/**
 * Minimal profile reference stored per-connection in collected_profiles.
 * Carries both the URN (needed for deduplication + lookup) and the
 * publicIdentifier (needed for Phase 2 RSC detail-page URL construction).
 */
export interface CollectedProfile {
  urn: string;
  publicId: string | null;
}

/**
 * A deep profile record from the batch enrichment endpoint (Phase 2).
 */
export interface VoyagerProfile {
  urn: string;
  entityId: string;
  name: string | null;
  headline: string | null;
  location: string | null;
  linkedinUrl: string | null;
  photoUrl: string | null;
  bio: string | null;
  experience: Array<{
    title: string;
    company: string;
    duration: string | null;
    startDate: string | null;
    endDate: string | null;
  }>;
  education: Array<{
    school: string;
    degree: string | null;
    fieldOfStudy: string | null;
    startYear: string | null;
    endYear: string | null;
  }>;
}

/**
 * Payload sent to /api/contacts/bulk-import.
 * Phase 1 sends basic contacts; Phase 2 sends enriched contacts.
 */
export interface BulkImportRequest {
  sync_job_id: string;
  phase: 1 | 2;
  contacts: BulkImportContact[];
}

export interface BulkImportContact {
  linkedin_url: string | null;
  linkedin_urn: string;
  name: string | null;
  headline: string | null;
  current_company: string | null;
  photo_url: string | null;
  location: string | null;
  linkedin_bio: string | null;
  experience: VoyagerProfile["experience"] | null;
  education: VoyagerProfile["education"] | null;
  connected_at: string | null;
}

/**
 * Sync job record — mirrors the backend sync_jobs table.
 * Also persisted to chrome.storage.local for resumability.
 */
export type SyncJobStatus =
  | "pending"
  | "running"
  | "paused"
  | "completed"
  | "failed";

export interface SyncJob {
  id: string;
  user_id: string;
  status: SyncJobStatus;
  /** ISO timestamp of creation */
  created_at: string;
  /** Total connections discovered in Phase 1 */
  total_connections: number | null;
  /** Connections imported so far (Phase 1 progress) */
  connections_imported: number;
  /** Profiles enriched so far (Phase 2 progress) */
  profiles_enriched: number;
  /** Last successfully completed Phase 1 page index (0-based, for resume) */
  last_completed_page: number;
  /** Last successfully processed URN index in Phase 2 (for resume) */
  last_processed_urn_index: number;
  /**
   * All collected URNs — kept for backward compatibility and deduplication
   * during Phase 1. Phase 2 uses collected_profiles for publicId access.
   */
  collected_urns: string[];
  /**
   * Parallel to collected_urns. Carries { urn, publicId } per connection so
   * Phase 2 can build https://www.linkedin.com/in/<publicId>/details/experience/
   * without a second lookup. Populated during Phase 1 alongside collected_urns.
   */
  collected_profiles: CollectedProfile[];
  /** Whether the 2500-cap was hit */
  cap_hit: boolean;
  /** Consecutive 429/999 count (for exponential backoff) */
  backoff_count: number;
  /** Timestamp when sync can auto-resume after a backoff pause (ms) */
  resume_after_ts: number | null;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// Web app ↔ extension sync message types
// ---------------------------------------------------------------------------

export type SyncMessageType =
  | "START_NETWORK_SYNC"
  | "SYNC_PROGRESS"
  | "SYNC_COMPLETE"
  | "SYNC_FAILED"
  | "SYNC_STATUS_REQUEST"
  | "SYNC_STATUS_RESPONSE";

export interface StartNetworkSyncPayload {
  /** Supabase user ID — verified against stored session */
  user_id: string;
  /** Existing sync_job_id to resume, or omit for a fresh sync */
  sync_job_id?: string;
}

export interface SyncProgressPayload {
  sync_job_id: string;
  status: SyncJobStatus;
  phase: 1 | 2;
  connections_imported: number;
  profiles_enriched: number;
  total_connections: number | null;
  cap_hit: boolean;
}

export interface SyncCompletePayload {
  sync_job_id: string;
  connections_imported: number;
  profiles_enriched: number;
  total_connections: number | null;
  cap_hit: boolean;
}

export interface SyncFailedPayload {
  sync_job_id: string | null;
  reason: string;
}

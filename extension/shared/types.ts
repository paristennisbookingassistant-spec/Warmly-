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
  | "SAVE_PROFILE";

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

/**
 * types/meeting.ts
 * Mock-only meeting/recording shape for the Meetings frontend.
 * Backend persistence (Whisper, action extraction, mentions linking) is deferred.
 */

export type Sentiment = "warm" | "neutral" | "cool";
export type RecordingMedium = "video" | "phone" | "in-person" | "audio";
export type RecordingSource = "live" | "upload";
export type RecordingStatus = "recapped" | "processing" | "draft";

export interface MeetingAction {
  id: string;
  what: string;
  /** Who's responsible — typically "Alex" (user) or the contact's first name or "Coach" */
  who: string;
  /** Human-readable due — "Today", "+1 week", "+3 weeks", "Done" */
  due: string;
  done: boolean;
}

export interface MeetingMention {
  name: string;
  reason: string;
  /** Set if the mention is a tracked contact — used for deep-linking from Recap */
  contactId?: string;
}

export interface TranscriptSegment {
  /** Timestamp in mm:ss format */
  t: string;
  /** Speaker name */
  who: string;
  text: string;
}

export interface Recording {
  id: string;
  contactId: string;
  contactName: string;
  contactRole: string;
  title: string;
  /** Absolute date string for display */
  date: string;
  /** Relative date for compact rendering — "3 days ago" */
  relativeDate: string;
  /** mm:ss formatted duration */
  duration: string;
  /** Duration in minutes — used for usage meter math */
  durationMin: number;
  medium: RecordingMedium;
  /** Free-text location, e.g. "Google Meet", "Modern Pantry, Clerkenwell" */
  location: string;
  source: RecordingSource;
  status: RecordingStatus;
  topics: string[];
  sentiment: Sentiment;
  /**
   * Markdown-light summary. Phrases wrapped in **double asterisks** become inline
   * checkbox actions in the Recap view, indexed in source order against `actions`.
   */
  summaryRich: string;
  actions: MeetingAction[];
  mentions: MeetingMention[];
  transcript: TranscriptSegment[];
  coachNotes: string;
}

export interface Plan {
  tier: "free" | "pro";
  freeMinutesUsed: number;
  freeMinutesCap: number;
}

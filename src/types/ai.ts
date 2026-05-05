/**
 * ai.ts
 * Types for the AI engine: prompt inputs/outputs, model routing, scoring rubric.
 * All AI logic that hits Claude API must flow through types defined here.
 */

import type { ArtifactType } from "./artifacts";
import type {
  CareerHistoryEntry,
  EducationEntry,
  ProfileSnapshot,
  ScoringBreakdown,
  UserGoals,
  UserMemory,
  NetworkingPreferences,
} from "./database";

// ---------------------------------------------------------------------------
// Model tiers — maps to PRD Section 5.4.1
// ---------------------------------------------------------------------------

export enum ModelTier {
  /** MiniMax fast tier — used for scoring and simple tasks */
  FAST = "MiniMax-M2.7-highspeed",
  /** MiniMax reasoning tier — used for coaching and long-form generation */
  REASONING = "MiniMax-M2.7-highspeed-reasoning",
}

/**
 * Routing table: artifact type → which model tier to use.
 * Haiku is used where structured output follows a clear rubric;
 * Sonnet is used where multi-variable reasoning is required.
 * See PRD Section 5.4.1.
 */
export const ARTIFACT_MODEL_ROUTING: Record<ArtifactType, ModelTier> = {
  connection_note: ModelTier.FAST,
  outreach_draft: ModelTier.REASONING,
  meeting_prep: ModelTier.REASONING,
  meeting_notes: ModelTier.FAST,
  action_plan: ModelTier.REASONING,
  // follow_up_draft uses FAST for simple, REASONING if referencing meeting context
  // The generation function makes the final call based on whether meeting_notes exist
  follow_up_draft: ModelTier.FAST,
};

// ---------------------------------------------------------------------------
// Scoring rubric — mirrors PRD Section 5.4
// ---------------------------------------------------------------------------

export interface ScoringCriteria {
  name: keyof ScoringBreakdown;
  weight: number;
  description: string;
}

/** The 6 scoring criteria with their PRD-specified weights */
export const SCORING_RUBRIC: ScoringCriteria[] = [
  {
    name: "career_path_similarity",
    weight: 0.25,
    description:
      "Has this person made a similar career transition to what the user wants?",
  },
  {
    name: "shared_background",
    weight: 0.2,
    description:
      "Shared alma mater, previous employer, nationality, or geography?",
  },
  {
    name: "seniority_relevance",
    weight: 0.15,
    description:
      "Is this person at the right level to be helpful (not too senior to be unreachable, not too junior to be uninformed)?",
  },
  {
    name: "industry_match",
    weight: 0.2,
    description: "Does this person work in the user's target industry/company?",
  },
  {
    name: "accessibility_signals",
    weight: 0.1,
    description:
      "Does this person show signs of being open to networking (active on LinkedIn, mentor roles, content creator)?",
  },
  {
    name: "recency",
    weight: 0.1,
    description:
      "How recently did this person make their transition? (More recent = more relevant tactical advice)",
  },
];

// ---------------------------------------------------------------------------
// Scoring prompt inputs/outputs
// ---------------------------------------------------------------------------

export interface UserProfileForScoring {
  career_history: CareerHistoryEntry[];
  education: EducationEntry[];
  goals: UserGoals;
  networking_preferences: NetworkingPreferences;
}

export interface ContactProfileForScoring {
  name: string;
  current_title: string | null;
  company: string | null;
  career_history: CareerHistoryEntry[];
  education: EducationEntry[];
  location: string | null;
  profile_snapshot: ProfileSnapshot | null;
}

export interface ScoringPromptInput {
  user_profile: UserProfileForScoring;
  contact_profile: ContactProfileForScoring;
  rubric: ScoringCriteria[];
}

export interface ScoringResponse {
  overall_score: number;
  tier: 1 | 2 | 3;
  scores: ScoringBreakdown;
  recommendation_reason: string;
  suggested_hook: string;
}

// ---------------------------------------------------------------------------
// Artifact generation prompt inputs/outputs
// ---------------------------------------------------------------------------

export interface GenerationContext {
  user_profile: UserProfileForScoring;
  /** Agent's accumulated style memory — injected into system prompt */
  user_memory: UserMemory | null;
  contact_profile: ContactProfileForScoring;
  /** Compressed conversation history (rolling summary) */
  conversation_summary: string | null;
  /** Last N messages for continuity */
  recent_messages: Array<{ role: "user" | "agent"; content: string }>;
  /** Metadata for all artifacts linked to this contact */
  artifact_metadata: Array<{
    id: string;
    type: ArtifactType;
    status: string;
    created_at: string;
  }>;
  /** Company intel injected from web search (for meeting_prep) */
  company_intel_raw?: string;
}

export interface GenerationRequest {
  artifact_type: ArtifactType;
  context: GenerationContext;
  /** Additional user instructions from the chat message that triggered generation */
  user_instructions?: string;
  /** For follow_up_draft: override model tier to REASONING if meeting notes exist */
  force_reasoning_model?: boolean;
}

export interface GenerationResponse {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  content: Record<string, any>;
  model_used: ModelTier;
  /** Tokens consumed — used for cost tracking */
  tokens_input: number;
  tokens_output: number;
}

// ---------------------------------------------------------------------------
// Conversation / coaching
// ---------------------------------------------------------------------------

export interface CoachingContext {
  user_profile: UserProfileForScoring;
  user_memory: UserMemory | null;
  conversation_summary: string | null;
  recent_messages: Array<{ role: "user" | "agent"; content: string }>;
  contact_profile?: ContactProfileForScoring;
}

export interface CoachingRequest {
  context: CoachingContext;
  user_message: string;
}

export interface CoachingResponse {
  agent_message: string;
  /** If the agent decides to generate an artifact as part of this response */
  trigger_artifact?: ArtifactType;
  model_used: ModelTier;
  tokens_input: number;
  tokens_output: number;
}

// ---------------------------------------------------------------------------
// Context window management — rolling summarization
// See PRD Section 5.4.2
// ---------------------------------------------------------------------------

export interface ConversationSummary {
  /** Key decisions made in the conversation */
  key_decisions: string[];
  /** Preferences the user expressed (tone, style, etc.) */
  user_preferences_expressed: string[];
  /** Artifacts produced so far with their types and statuses */
  artifacts_produced: Array<{ type: ArtifactType; status: string; id: string }>;
  /** Unresolved questions or open loops */
  open_questions: string[];
  /** Any relationship stage changes logged */
  relationship_stage_changes: string[];
}

export interface SummarizationRequest {
  messages: Array<{ role: "user" | "agent"; content: string }>;
  existing_summary: ConversationSummary | null;
}

// ---------------------------------------------------------------------------
// User memory extraction — agent learning
// See PRD Section 5.9
// ---------------------------------------------------------------------------

export interface StyleExtractionRequest {
  /** The AI's original draft */
  original_draft: string;
  /** The user's edited version */
  edited_version: string;
  /** Current user memory to merge into */
  current_memory: UserMemory | null;
}

export interface StyleExtractionResponse {
  updated_memory: UserMemory;
  /** Human-readable summary of what was learned */
  learning_summary: string;
}

// ---------------------------------------------------------------------------
// Web search for company intel — PRD Section 5.4.3
// ---------------------------------------------------------------------------

export interface CompanySearchRequest {
  company_name: string;
  /** ISO date — only surface news from the past N days */
  since_date?: string;
}

export interface CompanySearchResult {
  company_name: string;
  snippets: Array<{
    title: string;
    body: string;
    source_url?: string;
    published_date?: string;
  }>;
  /** Raw concatenated text injected into the LLM prompt */
  raw_context: string;
  /** Unix timestamp of when this search was cached */
  cached_at: number;
}

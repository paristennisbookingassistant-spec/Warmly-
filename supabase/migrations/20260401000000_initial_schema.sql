-- =============================================================================
-- Migration: 20260401000000_initial_schema
-- AI Networking Coach — Initial database schema
-- All tables have RLS enabled per project conventions.
-- =============================================================================

-- Enable the pgcrypto extension for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================================
-- USERS
-- Extends Supabase auth.users with application-level profile data.
-- The id column mirrors auth.users.id (UUID).
-- =============================================================================

CREATE TABLE public.users (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email         TEXT NOT NULL,
  name          TEXT NOT NULL DEFAULT '',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- JSON: CareerHistoryEntry[] — see src/types/database.ts
  career_history  JSONB NOT NULL DEFAULT '[]'::jsonb,

  -- JSON: EducationEntry[] — array of school/degree/year objects
  education       JSONB NOT NULL DEFAULT '[]'::jsonb,

  -- JSON: UserGoals — { type, target_industries[], target_companies[],
  --                     target_roles[], target_geographies[] }
  goals           JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- JSON: NetworkingPreferences — { style, outreach_comfort, contacts_per_week,
  --                                  preferred_channels[] }
  networking_preferences JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- JSON: UserMemory — agent's accumulated learning about this user.
  -- Shape: { writing_style, networking_approach, learned_patterns }
  -- Updated by style-extraction Haiku calls after each user edit.
  -- See PRD Section 5.9.
  user_memory     JSONB,

  subscription_status TEXT NOT NULL DEFAULT 'trialing'
    CHECK (subscription_status IN ('active', 'trialing', 'past_due', 'canceled')),
  subscription_tier   TEXT NOT NULL DEFAULT 'free'
    CHECK (subscription_tier IN ('free', 'pro', 'team'))
);

-- Automatically create a user row when someone signs up via Supabase Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.users (id, email, name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Keep updated_at current
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER users_set_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users: read own row"
  ON public.users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "users: update own row"
  ON public.users FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Index for email lookups (used by auth flows)
CREATE INDEX users_email_idx ON public.users (email);

-- =============================================================================
-- CONVERSATIONS
-- Each conversation is either a General session or a Contact Session.
-- See PRD Section 5.5.
-- =============================================================================

CREATE TABLE public.conversations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  type        TEXT NOT NULL DEFAULT 'general'
    CHECK (type IN ('general', 'contact_session')),

  -- FK to contacts.id — NULL for general sessions
  contact_id  UUID,

  -- Auto-generated from first message or contact name
  title       TEXT NOT NULL DEFAULT 'New conversation',

  status      TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'archived')),

  -- JSON: ConversationSummary — AI-generated rolling recap.
  -- Updated after every ~15 messages to compress context window.
  -- Shape: { key_decisions[], user_preferences_expressed[], artifacts_produced[],
  --          open_questions[], relationship_stage_changes[] }
  -- See PRD Section 5.4.2.
  summary     JSONB
);

CREATE TRIGGER conversations_set_updated_at
  BEFORE UPDATE ON public.conversations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- RLS
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "conversations: read own"
  ON public.conversations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "conversations: insert own"
  ON public.conversations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "conversations: update own"
  ON public.conversations FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "conversations: delete own"
  ON public.conversations FOR DELETE
  USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX conversations_user_id_idx      ON public.conversations (user_id);
CREATE INDEX conversations_contact_id_idx   ON public.conversations (contact_id);
CREATE INDEX conversations_updated_at_idx   ON public.conversations (updated_at DESC);
CREATE INDEX conversations_type_idx         ON public.conversations (user_id, type);

-- =============================================================================
-- CONVERSATION_MESSAGES
-- Individual messages in a conversation thread.
-- =============================================================================

CREATE TABLE public.conversation_messages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  role    TEXT NOT NULL CHECK (role IN ('user', 'agent')),

  -- Plain text message body
  content TEXT NOT NULL,

  -- JSON: string[] — array of artifact IDs created by this agent message.
  -- Empty array for user messages and agent messages that didn't produce artifacts.
  artifacts_generated JSONB NOT NULL DEFAULT '[]'::jsonb
);

-- RLS: user can access messages in conversations they own
ALTER TABLE public.conversation_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "messages: read via conversation ownership"
  ON public.conversation_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = conversation_id AND c.user_id = auth.uid()
    )
  );

CREATE POLICY "messages: insert via conversation ownership"
  ON public.conversation_messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = conversation_id AND c.user_id = auth.uid()
    )
  );

-- Indexes
CREATE INDEX messages_conversation_id_idx ON public.conversation_messages (conversation_id);
CREATE INDEX messages_created_at_idx      ON public.conversation_messages (conversation_id, created_at ASC);

-- =============================================================================
-- CONTACTS
-- The permanent record for each person in the user's network.
-- UNIQUE(user_id, linkedin_url) prevents duplicates.
-- See PRD Section 5.5.
-- =============================================================================

CREATE TABLE public.contacts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Unique per user — enforced below.
  -- NULL allowed for manually-added contacts with no LinkedIn URL yet.
  linkedin_url  TEXT,

  name          TEXT NOT NULL,
  current_title TEXT,
  company       TEXT,
  location      TEXT,

  -- JSON: CareerHistoryEntry[]
  career_history  JSONB NOT NULL DEFAULT '[]'::jsonb,

  -- JSON: EducationEntry[]
  education       JSONB NOT NULL DEFAULT '[]'::jsonb,

  -- JSON: ProfileSnapshot — raw data captured from LinkedIn DOM by extension.
  -- NULL for manually-added contacts with no extension capture.
  -- Shape: { linkedin_url, name, headline, current_title, previous_roles[],
  --          education[], location, mutual_connections, captured_at, source_session_id }
  profile_snapshot  JSONB,

  -- Scoring fields — populated by AI scoring engine
  relevance_score     NUMERIC(4, 2),  -- 1.00–10.00
  tier                SMALLINT CHECK (tier IN (1, 2, 3)),

  -- JSON: ScoringBreakdown — { career_path_similarity, shared_background,
  --                             seniority_relevance, industry_match,
  --                             accessibility_signals, recency }
  scoring_breakdown   JSONB,

  recommendation_reason TEXT,
  suggested_hook        TEXT,

  source  TEXT NOT NULL DEFAULT 'manual_chat'
    CHECK (source IN ('discovery', 'manual_chat', 'manual_url', 'extension_bookmark')),

  status  TEXT NOT NULL DEFAULT 'discovered'
    CHECK (status IN ('discovered', 'contacted', 'connected', 'met', 'ongoing')),

  discovered_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_interaction_at TIMESTAMPTZ,

  user_feedback TEXT CHECK (user_feedback IN ('great_match', 'not_relevant')),

  -- FK to discovery_sessions.id — only for discovery-sourced contacts
  discovery_session_id UUID,

  -- User's free-text annotations
  notes TEXT
);

-- UNIQUE constraint: prevent duplicate contacts per user per LinkedIn URL.
-- NULL values are excluded — a user can have multiple contacts without LinkedIn URLs.
-- Merge logic in the application layer handles re-discovery of same person.
CREATE UNIQUE INDEX contacts_user_linkedin_unique
  ON public.contacts (user_id, linkedin_url)
  WHERE linkedin_url IS NOT NULL;

CREATE TRIGGER contacts_set_updated_at
  BEFORE UPDATE ON public.contacts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- RLS
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "contacts: read own"
  ON public.contacts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "contacts: insert own"
  ON public.contacts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "contacts: update own"
  ON public.contacts FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "contacts: delete own"
  ON public.contacts FOR DELETE
  USING (auth.uid() = user_id);

-- Indexes for common queries
CREATE INDEX contacts_user_id_idx         ON public.contacts (user_id);
CREATE INDEX contacts_company_idx         ON public.contacts (user_id, company);
CREATE INDEX contacts_status_idx          ON public.contacts (user_id, status);
CREATE INDEX contacts_tier_idx            ON public.contacts (user_id, tier);
CREATE INDEX contacts_score_idx           ON public.contacts (user_id, relevance_score DESC NULLS LAST);
CREATE INDEX contacts_discovered_at_idx   ON public.contacts (user_id, discovered_at DESC);

-- =============================================================================
-- ARTIFACTS
-- Produced in conversations and linked to contacts.
-- 6 types: connection_note, outreach_draft, meeting_prep, meeting_notes,
--          action_plan, follow_up_draft.
-- See PRD Section 5.5.
-- =============================================================================

CREATE TABLE public.artifacts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  contact_id      UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  type  TEXT NOT NULL CHECK (type IN (
    'connection_note', 'outreach_draft', 'meeting_prep',
    'meeting_notes', 'action_plan', 'follow_up_draft'
  )),

  -- JSON: content structure varies by type — see src/types/artifacts.ts.
  -- connection_note:  { message, hook, char_count }
  -- outreach_draft:   { message, tone, hook, channel, char_count }
  -- meeting_prep:     { person_summary, company_intel, discussion_themes[], coaching }
  -- meeting_notes:    { key_takeaways[], next_steps[], user_raw_notes }
  -- action_plan:      { actions[], coaching_note }
  -- follow_up_draft:  { message, reference_to_meeting, timing_suggestion, channel, tone }
  content   JSONB NOT NULL DEFAULT '{}'::jsonb,

  status    TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'finalized', 'sent', 'archived')),

  -- Increments on each user edit — enables version history
  version   INTEGER NOT NULL DEFAULT 1,

  -- Tracked for outreach artifacts; NULL until user updates outcome
  artifact_outcome  TEXT
    CHECK (artifact_outcome IN (
      'no_response', 'response_received', 'meeting_booked', 'referral_received'
    )),

  -- Characters changed from AI draft before sending.
  -- Lower = better AI draft quality. Drives agent learning.
  user_edit_distance  INTEGER,

  -- JSON: type-specific metadata
  -- e.g. { tone, hook_used, meeting_date, channel, search_cached_at }
  metadata  JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE TRIGGER artifacts_set_updated_at
  BEFORE UPDATE ON public.artifacts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- RLS
ALTER TABLE public.artifacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "artifacts: read own"
  ON public.artifacts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "artifacts: insert own"
  ON public.artifacts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "artifacts: update own"
  ON public.artifacts FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "artifacts: delete own"
  ON public.artifacts FOR DELETE
  USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX artifacts_user_id_idx          ON public.artifacts (user_id);
CREATE INDEX artifacts_contact_id_idx       ON public.artifacts (contact_id);
CREATE INDEX artifacts_conversation_id_idx  ON public.artifacts (conversation_id);
CREATE INDEX artifacts_type_idx             ON public.artifacts (user_id, type);
CREATE INDEX artifacts_status_idx           ON public.artifacts (user_id, status);

-- =============================================================================
-- DISCOVERY_SESSIONS
-- Tracks each LinkedIn discovery run initiated from the extension.
-- Orchestration runs in the content script (NOT service worker — see PRD 5.3).
-- =============================================================================

CREATE TABLE public.discovery_sessions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  started_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at        TIMESTAMPTZ,

  -- JSON: string[] — companies targeted in this session
  target_companies  JSONB NOT NULL DEFAULT '[]'::jsonb,

  -- JSON: SearchStrategy — the plan the agent proposed and user approved.
  -- Shape: { companies[], target_roles[], target_seniority[],
  --          keywords[], max_profiles_per_company, rationale }
  search_strategy   JSONB NOT NULL DEFAULT '{}'::jsonb,

  profiles_viewed   INTEGER NOT NULL DEFAULT 0,
  profiles_scored   INTEGER NOT NULL DEFAULT 0,
  profiles_saved    INTEGER NOT NULL DEFAULT 0,

  status  TEXT NOT NULL DEFAULT 'running'
    CHECK (status IN ('running', 'paused', 'completed', 'failed')),

  -- Remaining profile views across all sessions today.
  -- Hard limit: 25/session, 2 sessions/day per PRD DIS-08.
  rate_limit_remaining  INTEGER NOT NULL DEFAULT 25
);

-- RLS
ALTER TABLE public.discovery_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "discovery_sessions: read own"
  ON public.discovery_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "discovery_sessions: insert own"
  ON public.discovery_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "discovery_sessions: update own"
  ON public.discovery_sessions FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Indexes
CREATE INDEX discovery_sessions_user_id_idx  ON public.discovery_sessions (user_id);
CREATE INDEX discovery_sessions_status_idx   ON public.discovery_sessions (user_id, status);

-- =============================================================================
-- NETWORKING_GOALS
-- User's networking goals with targets. Progress is computed from real data.
-- See PRD Section 5.5 and Section 5.6 Flow 4.
-- =============================================================================

CREATE TABLE public.networking_goals (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  goal_type   TEXT NOT NULL
    CHECK (goal_type IN (
      'job_search', 'industry_exploration', 'relationship_building', 'other'
    )),

  description TEXT NOT NULL,

  -- JSON: string[] — company names
  target_companies  JSONB NOT NULL DEFAULT '[]'::jsonb,

  -- JSON: string[] — role names
  target_roles      JSONB NOT NULL DEFAULT '[]'::jsonb,

  target_contacts_per_month   INTEGER NOT NULL DEFAULT 5,
  target_meetings_per_month   INTEGER NOT NULL DEFAULT 2,

  -- JSON: GoalProgress — computed from real Contacts/Artifacts data.
  -- Shape: { contacts_found, messages_sent, meetings_held, responses_received }
  -- Updated periodically, not in real-time.
  -- See PRD Section 5.6 Flow 4.
  progress    JSONB NOT NULL DEFAULT '{"contacts_found":0,"messages_sent":0,"meetings_held":0,"responses_received":0}'::jsonb,

  status  TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'paused', 'achieved'))
);

CREATE TRIGGER networking_goals_set_updated_at
  BEFORE UPDATE ON public.networking_goals
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- RLS
ALTER TABLE public.networking_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "goals: read own"
  ON public.networking_goals FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "goals: insert own"
  ON public.networking_goals FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "goals: update own"
  ON public.networking_goals FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "goals: delete own"
  ON public.networking_goals FOR DELETE
  USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX goals_user_id_idx  ON public.networking_goals (user_id);
CREATE INDEX goals_status_idx   ON public.networking_goals (user_id, status);

-- =============================================================================
-- CONTACT_SCORES
-- Audit trail of every scoring run — enables learning and re-scoring.
-- See src/types/database.ts ContactScore.
-- =============================================================================

CREATE TABLE public.contact_scores (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id  UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  scored_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  overall_score   NUMERIC(4, 2) NOT NULL,
  tier            SMALLINT NOT NULL CHECK (tier IN (1, 2, 3)),

  -- JSON: ScoringBreakdown — { career_path_similarity, shared_background,
  --                             seniority_relevance, industry_match,
  --                             accessibility_signals, recency }
  scores          JSONB NOT NULL,

  recommendation_reason TEXT NOT NULL,
  suggested_hook        TEXT NOT NULL,

  -- Model used — should always be Haiku for scoring
  model_used  TEXT NOT NULL DEFAULT 'claude-haiku-4-5'
);

-- RLS
ALTER TABLE public.contact_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "contact_scores: read own"
  ON public.contact_scores FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "contact_scores: insert own"
  ON public.contact_scores FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "contact_scores: delete own"
  ON public.contact_scores FOR DELETE
  USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX contact_scores_contact_id_idx ON public.contact_scores (contact_id);
CREATE INDEX contact_scores_user_id_idx    ON public.contact_scores (user_id);

-- =============================================================================
-- Foreign key back-references (added after all tables exist)
-- =============================================================================

-- contacts → discovery_sessions
ALTER TABLE public.contacts
  ADD CONSTRAINT contacts_discovery_session_id_fk
  FOREIGN KEY (discovery_session_id)
  REFERENCES public.discovery_sessions(id)
  ON DELETE SET NULL;

-- conversations → contacts (contact_id)
ALTER TABLE public.conversations
  ADD CONSTRAINT conversations_contact_id_fk
  FOREIGN KEY (contact_id)
  REFERENCES public.contacts(id)
  ON DELETE SET NULL;
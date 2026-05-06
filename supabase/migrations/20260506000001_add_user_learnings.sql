-- user_learnings table — closes the self-improvement loop.
--
-- When the user marks an outreach artifact as sent, the backend compares
-- the original AI draft against what the user actually sent and asks an LLM
-- to distill 1-3 candidate "learnings" — generalizable patterns the agent
-- should apply to future drafts.
--
-- Each candidate gets a confidence score (1-10):
--   - confidence >= 8 with no_conflict: auto-approved (becomes active)
--   - confidence 5-7: pending — surfaced to the user for explicit approval
--   - confidence < 5: discarded silently
--
-- Once approved (manually or auto), the learning is injected into future
-- outreach prompts via the per-user identity section.
--
-- See PRD Section 5.9 for the full Layer 2 specification.

CREATE TABLE IF NOT EXISTS public.user_learnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,

  -- The learning itself, in plain English. Example:
  -- "User consistently replaces 'I'd love to' with 'I want to' — avoid 'I'd love to' in future drafts."
  learning TEXT NOT NULL,

  -- Lifecycle
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected', 'archived')),
  approved_at TIMESTAMPTZ,

  -- Auto-approval gate. Confidence is 1-10. >=8 + no_conflict → auto-approved.
  confidence INTEGER NOT NULL CHECK (confidence >= 1 AND confidence <= 10),

  -- Provenance — which sent message taught us this
  source_artifact_id UUID REFERENCES public.artifacts(id) ON DELETE SET NULL,

  -- Bucket the learning so we can present them grouped
  category TEXT NOT NULL DEFAULT 'voice'
    CHECK (category IN ('voice', 'strategy', 'gate', 'hook', 'tone', 'other')),

  -- Optional: the original draft + sent text snippet that triggered the
  -- distillation. Useful for showing "you taught me this when…" context.
  original_draft_excerpt TEXT,
  sent_excerpt TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS user_learnings_user_status_idx
  ON public.user_learnings (user_id, status);

CREATE INDEX IF NOT EXISTS user_learnings_user_created_idx
  ON public.user_learnings (user_id, created_at DESC);

-- RLS: users only see their own learnings
ALTER TABLE public.user_learnings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own learnings"
  ON public.user_learnings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own learnings"
  ON public.user_learnings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own learnings"
  ON public.user_learnings FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own learnings"
  ON public.user_learnings FOR DELETE
  USING (auth.uid() = user_id);

COMMENT ON TABLE public.user_learnings IS
  'Per-user accumulated lessons distilled from sent messages. High-confidence learnings auto-approve; medium-confidence surface for explicit user approval; low-confidence discarded. Approved learnings are injected into future outreach prompts to make the agent demonstrably smarter every week.';

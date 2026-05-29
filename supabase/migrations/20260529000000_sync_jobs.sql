-- =============================================================================
-- Migration: 20260529000000_sync_jobs
-- LinkedIn Network Sync v1 — sync_jobs table
-- Tracks the state of a bulk LinkedIn connection sync for a user.
-- Resumable across browser sessions via last_completed_page / last_processed_urn_index.
-- =============================================================================

CREATE TABLE public.sync_jobs (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  status                    TEXT NOT NULL
    CHECK (status IN ('pending', 'in_progress', 'paused', 'completed', 'failed')),

  phase                     TEXT NOT NULL DEFAULT 'list'
    CHECK (phase IN ('list', 'batch', 'done')),

  -- Running count of total connections discovered during Phase 1
  total_contacts            INTEGER NOT NULL DEFAULT 0,

  -- Running count of contacts fully processed (inserted/updated)
  processed_contacts        INTEGER NOT NULL DEFAULT 0,

  -- Last connections-list page completed (0 = not started).
  -- Used to resume Phase 1 after interruption.
  last_completed_page       INTEGER NOT NULL DEFAULT 0,

  -- Last URN index processed in Phase 2 batch enrichment (0 = not started).
  -- Used to resume Phase 2 after interruption.
  last_processed_urn_index  INTEGER NOT NULL DEFAULT 0,

  -- Human-readable error if status = 'failed' or 'paused'
  error                     TEXT,

  started_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at              TIMESTAMPTZ
);

-- Keep updated_at current on every write
CREATE TRIGGER sync_jobs_set_updated_at
  BEFORE UPDATE ON public.sync_jobs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Fast lookup: "does this user have an in-progress sync?"
CREATE INDEX sync_jobs_user_status_idx ON public.sync_jobs (user_id, status);

-- =============================================================================
-- Row Level Security
-- Users may only read and mutate their own sync_job rows.
-- =============================================================================

ALTER TABLE public.sync_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sync_jobs: read own"
  ON public.sync_jobs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "sync_jobs: insert own"
  ON public.sync_jobs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "sync_jobs: update own"
  ON public.sync_jobs FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

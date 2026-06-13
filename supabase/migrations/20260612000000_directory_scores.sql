-- ============================================================================
-- Per-user cache of directory-profile relevance scores.
--
-- Scoring an INSEAD directory deck against the user's profile is a MiniMax
-- reasoning call (~15-45s, highly variable) — too slow/flaky to run live on
-- every deck open. This caches the result per (user, directory_profile) so the
-- first successful rank sticks: subsequent opens read cached scores instantly,
-- and only never-scored profiles trigger a (smaller, faster) live rank.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.directory_scores (
  user_id              UUID NOT NULL,
  directory_profile_id UUID NOT NULL REFERENCES public.directory_profiles(id) ON DELETE CASCADE,
  score                NUMERIC,
  tier                 SMALLINT,
  reasoning            TEXT,
  hook                 TEXT,
  scored_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, directory_profile_id)
);

COMMENT ON TABLE public.directory_scores IS
  'Per-user cache of directory-profile relevance scores (read-through from /api/directory/rank).';

CREATE INDEX IF NOT EXISTS directory_scores_user_idx ON public.directory_scores (user_id);

ALTER TABLE public.directory_scores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own scores read"   ON public.directory_scores;
DROP POLICY IF EXISTS "own scores insert" ON public.directory_scores;
DROP POLICY IF EXISTS "own scores update" ON public.directory_scores;

CREATE POLICY "own scores read"   ON public.directory_scores FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own scores insert" ON public.directory_scores FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own scores update" ON public.directory_scores FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

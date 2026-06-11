-- ============================================================================
-- Shared INSEAD directory (the "INSEAD CV book" discovery door source).
--
-- Distinct from `contacts`, which is PER-USER (RLS-scoped to user_id) and holds
-- a user's private LinkedIn-synced network + anyone they SAVE from this
-- directory. `directory_profiles` is SHARED reference data: one copy of each
-- alum, readable by every authenticated beta user, written only by the
-- ingestion (service role bypasses RLS). Refreshing the CV book re-runs the
-- ingest and updates rows in place (idempotent on directory_key).
--
-- Column shapes mirror `contacts` (experience / education_v2 JSONB, same field
-- names) so the discovery deck renders both doors with one component and a
-- "Save" copies the JSONB straight into the user's contacts.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.directory_profiles (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Stable idempotency / dedup key from the canonical dataset
  -- (e.g. "mba26d-0280"). Re-ingest upserts on this.
  directory_key TEXT NOT NULL UNIQUE,
  source        TEXT NOT NULL DEFAULT 'insead_cv_book'
                  CHECK (source IN ('insead_cv_book')),

  -- Identity (mirrors contacts)
  name          TEXT NOT NULL,
  first_name    TEXT,
  last_name     TEXT,
  headline      TEXT,
  current_title TEXT,
  company       TEXT,            -- maps from CV-book current_company
  location      TEXT,
  photo_url     TEXT,
  linkedin_url  TEXT,

  -- INSEAD-specific facets (CV book exposes these; LinkedIn does not)
  cohort        TEXT,            -- 'mba26d' | 'mba26j' | 'gemba_g27e'
  nationality   TEXT[] NOT NULL DEFAULT '{}',
  languages     TEXT[] NOT NULL DEFAULT '{}',
  industries    TEXT[] NOT NULL DEFAULT '{}',
  functions     TEXT[] NOT NULL DEFAULT '{}',
  geography     TEXT[] NOT NULL DEFAULT '{}',

  -- Deep data, same JSONB shapes as contacts.experience / contacts.education_v2
  experience    JSONB NOT NULL DEFAULT '[]'::jsonb,
  education_v2  JSONB NOT NULL DEFAULT '[]'::jsonb,

  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.directory_profiles IS
  'Shared INSEAD CV-book alumni directory. Read by all authenticated users; '
  'written only by the ingestion (service role). The INSEAD discovery door '
  'reads from here; saving an alum copies the row into the user''s contacts.';
COMMENT ON COLUMN public.directory_profiles.experience IS
  'Array of work experience entries (same shape as contacts.experience): '
  '{ title, company, dateRange:{start,end}, location, description }.';
COMMENT ON COLUMN public.directory_profiles.education_v2 IS
  'Array of education entries (same shape as contacts.education_v2): '
  '{ school, degree, fieldOfStudy, dateRange:{start,end} }.';

-- Filtering indexes for the directory door
CREATE INDEX IF NOT EXISTS directory_profiles_cohort_idx     ON public.directory_profiles (cohort);
CREATE INDEX IF NOT EXISTS directory_profiles_company_idx    ON public.directory_profiles (lower(company));
CREATE INDEX IF NOT EXISTS directory_profiles_industries_idx ON public.directory_profiles USING GIN (industries);
CREATE INDEX IF NOT EXISTS directory_profiles_functions_idx  ON public.directory_profiles USING GIN (functions);
CREATE INDEX IF NOT EXISTS directory_profiles_geography_idx  ON public.directory_profiles USING GIN (geography);

-- Keep updated_at fresh on re-ingest
CREATE OR REPLACE FUNCTION public.touch_directory_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_directory_profiles_updated_at ON public.directory_profiles;
CREATE TRIGGER trg_directory_profiles_updated_at
  BEFORE UPDATE ON public.directory_profiles
  FOR EACH ROW EXECUTE FUNCTION public.touch_directory_profiles_updated_at();

-- ----------------------------------------------------------------------------
-- RLS: shared read for any authenticated user; no row-writes from clients
-- (the ingestion uses the service role, which bypasses RLS).
-- ----------------------------------------------------------------------------
ALTER TABLE public.directory_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "directory readable by authenticated" ON public.directory_profiles;
CREATE POLICY "directory readable by authenticated"
  ON public.directory_profiles
  FOR SELECT
  TO authenticated
  USING (true);

-- ----------------------------------------------------------------------------
-- Link a saved contact back to its directory origin (dedup + provenance), and
-- allow 'cv_book' as a contacts.source so the card can badge INSEAD vs LinkedIn.
-- ----------------------------------------------------------------------------
ALTER TABLE public.contacts
  ADD COLUMN IF NOT EXISTS directory_profile_id UUID REFERENCES public.directory_profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS contacts_directory_profile_id_idx ON public.contacts (directory_profile_id);

ALTER TABLE public.contacts DROP CONSTRAINT IF EXISTS contacts_source_check;
ALTER TABLE public.contacts ADD CONSTRAINT contacts_source_check
  CHECK (source IN ('discovery', 'manual_chat', 'manual_url', 'extension_bookmark', 'cv_book'));

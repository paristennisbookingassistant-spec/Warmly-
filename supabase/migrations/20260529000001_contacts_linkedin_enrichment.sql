-- =============================================================================
-- Migration: 20260529000001_contacts_linkedin_enrichment
-- LinkedIn Network Sync v1 — enrichment columns for contacts table.
-- Adds LinkedIn-sourced fields written by the bulk-import endpoint.
-- Manual fields (description, notes, etc.) are never overwritten by sync.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- New columns
-- ---------------------------------------------------------------------------

ALTER TABLE public.contacts
  ADD COLUMN IF NOT EXISTS linkedin_urn   TEXT,
  ADD COLUMN IF NOT EXISTS linkedin_bio   TEXT,
  ADD COLUMN IF NOT EXISTS experience     JSONB,
  ADD COLUMN IF NOT EXISTS education_v2   JSONB,
  ADD COLUMN IF NOT EXISTS photo_url      TEXT,
  ADD COLUMN IF NOT EXISTS sync_job_id    UUID REFERENCES public.sync_jobs(id) ON DELETE SET NULL;

-- ---------------------------------------------------------------------------
-- JSONB column documentation
-- ---------------------------------------------------------------------------

COMMENT ON COLUMN public.contacts.experience IS
  'Array of LinkedIn work experience entries. '
  'Shape: [{ title: string, company: string, dateRange: { start: string | null, end: string | null }, description?: string, location?: string }]. '
  'Populated by Phase 2 bulk enrichment. Never overwritten by manual edits.';

COMMENT ON COLUMN public.contacts.education_v2 IS
  'Array of LinkedIn education entries. '
  'Shape: [{ school: string, degree?: string, fieldOfStudy?: string, dateRange: { start: string | null, end: string | null } }]. '
  'Populated by Phase 2 bulk enrichment. Stored separately from the legacy education column to avoid clobbering hand-entered data.';

COMMENT ON COLUMN public.contacts.linkedin_urn IS
  'LinkedIn profile URN, e.g. "urn:li:fsd_profile:ACoAAA...". '
  'Extracted from the Voyager connections-list API during Phase 1 sync.';

COMMENT ON COLUMN public.contacts.linkedin_bio IS
  'LinkedIn "About" / headline text extracted from Phase 2 deep profile. '
  'May be NULL for Phase 1-only contacts until enrichment runs.';

COMMENT ON COLUMN public.contacts.photo_url IS
  'LinkedIn CDN profile photo URL. v1 stores URL only; Supabase Storage upload is v2.';

COMMENT ON COLUMN public.contacts.sync_job_id IS
  'FK to sync_jobs.id. Records which bulk sync session created or last updated this contact. NULL for manually-entered contacts.';

-- ---------------------------------------------------------------------------
-- UNIQUE constraint: (user_id, linkedin_url)
-- Guard: only add if not already present (earlier migrations may have it).
-- ---------------------------------------------------------------------------

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM   pg_indexes
    WHERE  tablename  = 'contacts'
    AND    indexname  = 'contacts_user_linkedin_unique'
  ) THEN
    CREATE UNIQUE INDEX contacts_user_linkedin_unique
      ON public.contacts (user_id, linkedin_url)
      WHERE linkedin_url IS NOT NULL;
  END IF;
END
$$;

-- Index to speed up "find contacts from a specific sync job" queries
CREATE INDEX IF NOT EXISTS contacts_sync_job_id_idx ON public.contacts (sync_job_id);

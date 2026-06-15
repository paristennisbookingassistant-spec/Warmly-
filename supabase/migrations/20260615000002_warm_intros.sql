-- ============================================================================
-- Warm Intros: Phase 4 cross-user 2nd-degree graph
-- Additive: 2 columns on users + 1 index on contacts.
-- No new tables — graph is computed at query time from users + contacts.
-- ============================================================================

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS linkedin_urn TEXT;

COMMENT ON COLUMN public.users.linkedin_urn IS
  'The user''s own LinkedIn profile URN (e.g. urn:li:fsd_profile:ACoAAA…). '
  'Lets other Warmly users detect they are connected to this user via their '
  'contacts table. Captured at network sync or manually set. Null until synced.';

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS share_network_for_intros BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN public.users.share_network_for_intros IS
  'Explicit opt-in: when true, this user''s synced connections are eligible to '
  'be surfaced to peers they are connected to as warm-intro candidates. '
  'Default false. Only opted-in networks are ever matchable. '
  'Both A and B must be opted in for a match to occur.';

-- Index for the warm-intros matching query: find users whose own LinkedIn URN
-- appears in a requester's contacts. Partial index skips NULLs for efficiency.
CREATE INDEX IF NOT EXISTS idx_contacts_linkedin_urn
  ON public.contacts (linkedin_urn)
  WHERE linkedin_urn IS NOT NULL;

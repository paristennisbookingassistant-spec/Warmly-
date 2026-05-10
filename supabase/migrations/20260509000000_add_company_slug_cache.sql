-- Cache for LLM-resolved LinkedIn company slugs.
--
-- Why this exists: every time a user discovers contacts at "Wonderful",
-- the extension would otherwise re-run a MiniMax call to disambiguate
-- which of the 1,400 Wonderfuls is the right one. Caching the resolution
-- by (company name + user context) makes the second + onward query
-- instant and free.
--
-- Cache is global (not per-user) — the resolution of "Wonderful — the AI
-- agent company" is the same answer for everyone. RLS allows all
-- authenticated users to read; only the service role writes.

CREATE TABLE company_slug_cache (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Normalized: lowercase, trimmed, single-spaced. Includes user-context
  -- when present, e.g. "wonderful|the ai agent company".
  search_key      TEXT NOT NULL,
  resolved_slug   TEXT NOT NULL,
  resolved_url    TEXT NOT NULL,
  resolved_name   TEXT,
  reasoning       TEXT,
  resolved_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT company_slug_cache_search_key_unique UNIQUE (search_key)
);

CREATE INDEX company_slug_cache_search_key_idx ON company_slug_cache (search_key);

ALTER TABLE company_slug_cache ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read the cache (it's global identity data,
-- not user-specific).
CREATE POLICY "Authenticated users can read company_slug_cache"
  ON company_slug_cache
  FOR SELECT
  TO authenticated
  USING (true);

-- Inserts go through the API route which uses the service role.
-- Locking inserts to service_role prevents users from poisoning the cache.
CREATE POLICY "Service role can insert company_slug_cache"
  ON company_slug_cache
  FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Service role can update company_slug_cache"
  ON company_slug_cache
  FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

COMMENT ON TABLE company_slug_cache IS
  'LLM-resolved LinkedIn company slugs. Keyed by (company_name + optional user_context). Global, read-anywhere, write-service-role.';
COMMENT ON COLUMN company_slug_cache.search_key IS
  'Normalized cache key. Format: "<lowercase company name>" or "<lowercase company name>|<lowercase user context>"';

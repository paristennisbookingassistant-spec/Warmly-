-- Add the numeric LinkedIn company ID to the slug cache.
--
-- Previously, the cache stored slug + URL + name. The numeric ID is required
-- as the actual `currentCompany` filter value in people-search. Without it
-- cached, the extension had to re-navigate to the company page and re-scrape
-- the ID each time — slow and error-prone for global parents (Bain, McKinsey)
-- whose company pages don't reliably expose their own URN.
--
-- New extraction path (commit landing alongside this migration) reads the
-- ID directly from search-result row HTML. This column caches that value so
-- subsequent discoveries skip both the search-page navigation AND the
-- company-page navigation, going straight to people-search.
--
-- Nullable: legacy rows resolved before this column existed return null and
-- fall through to the existing /about/ extraction path harmlessly.

ALTER TABLE company_slug_cache
  ADD COLUMN resolved_company_id TEXT;

COMMENT ON COLUMN company_slug_cache.resolved_company_id IS
  'Numeric LinkedIn company ID (the fsd_company URN integer). Used directly as the currentCompany filter value in alumni searches. Populated from search-row scrape or user picker. Nullable for legacy rows resolved before this column existed.';

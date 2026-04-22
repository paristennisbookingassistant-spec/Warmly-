-- Add avatar_url column to contacts table.
-- Populated by the Chrome extension (extracted from LinkedIn DOM) or enrichment APIs.
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS avatar_url TEXT;

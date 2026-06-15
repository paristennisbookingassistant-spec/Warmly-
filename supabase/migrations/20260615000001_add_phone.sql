-- ============================================================================
-- Add phone column to contacts and directory_profiles.
-- Used for WhatsApp click-to-chat: wa.me/<digits>.
-- Source: INSEAD CV book (parsed_people.json).
-- ============================================================================

ALTER TABLE public.contacts
  ADD COLUMN IF NOT EXISTS phone TEXT;

COMMENT ON COLUMN public.contacts.phone IS
  'E.164-ish phone from the INSEAD CV book; used for wa.me click-to-chat.';

ALTER TABLE public.directory_profiles
  ADD COLUMN IF NOT EXISTS phone TEXT;

COMMENT ON COLUMN public.directory_profiles.phone IS
  'E.164-ish phone from the INSEAD CV book; used for wa.me click-to-chat.';

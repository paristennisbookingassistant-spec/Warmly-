-- Add profile_md column to users table.
--
-- profile_md is a free-form markdown identity narrative auto-built from:
--   - Onboarding answers (career, education, goals, transition story)
--   - Optional: uploaded CV / cover letter / past messages
--   - Ongoing conversation context that surfaces new identity facts
--
-- Used by lib/ai/prompts/buildOutreachPrompt.ts to inject the user's
-- specific identity, hooks, and voice preferences into every artifact
-- generation call. Sits alongside (not replacing) the structured columns
-- (career_history, education, goals, networking_preferences) and the
-- auto-extracted user_memory JSON.
--
-- Editable: yes — users can refine their profile anytime via Settings.
-- Auto-enriched: yes — every new conversation can surface identity
-- updates (e.g., "I'm pivoting from healthcare consulting to AI") that
-- get appended.

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS profile_md TEXT;

COMMENT ON COLUMN public.users.profile_md IS
  'Free-form markdown identity narrative. Auto-built from onboarding + CV upload + ongoing conversation. Editable. Injected into outreach prompts to make drafts specifically the user''s voice.';

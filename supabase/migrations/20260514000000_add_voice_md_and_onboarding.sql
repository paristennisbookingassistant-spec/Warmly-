-- Three additions to support the multi-material onboarding step:
--
-- 1. users.onboarded — boolean flag, replaces the localStorage-based check.
--    Previously, the frontend stored "onboarded=1" in localStorage. That's
--    per-browser-domain, NOT per-user, so multiple accounts sharing a
--    browser inherit each other's onboarded state. Real example: when
--    Liyang signed up a separate test account in the same Chrome, the
--    new account skipped onboarding because his real account's
--    localStorage flag was still set. Moving to a DB column fixes this.
--
-- 2. users.voice_md — separate from profile_md. Profile is identity
--    (slow-changing narrative); voice is tone/style (continuously updated
--    from message edits + uploaded samples). Splitting these prevents
--    voice updates from drifting identity content, and lets prompts
--    pull each independently with different priority weighting.
--
-- 3. users.onboarding_materials — JSONB store of the raw text the user
--    shared during the multi-material upload step. Includes CV text,
--    past message samples, cover letter samples, career assessment
--    text, all with provenance. Used to (re)build profile_md and
--    voice_md, and viewable later in a Settings page (future feature).

ALTER TABLE users
  ADD COLUMN onboarded BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN voice_md TEXT,
  ADD COLUMN onboarding_materials JSONB NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN users.onboarded IS
  'True once the user completes (or skips) onboarding. Replaces the previous localStorage-based check.';

COMMENT ON COLUMN users.voice_md IS
  'Continuously-updated voice/tone markdown — distinct from profile_md (identity). Fed by past message uploads, cover letter samples, finalized artifacts, and learned edits. Read by message-drafting prompts as a higher-priority voice signal than user_memory.writing_style.';

COMMENT ON COLUMN users.onboarding_materials IS
  'Raw text the user shared during the multi-material upload step. Keys: cv (string), past_messages (string), cover_letter (string), career_assessment ({text, kind: CareerLeader|MBTI|Hogan|DISC|Other}), uploaded_at (ISO timestamp per key). Used to (re)build profile_md / voice_md and editable later in Settings.';

-- Backfill: any users who already exist when this migration runs are
-- treated as already onboarded (they were onboarded under the
-- localStorage scheme). New users get the default FALSE.
UPDATE users SET onboarded = TRUE WHERE created_at < NOW();

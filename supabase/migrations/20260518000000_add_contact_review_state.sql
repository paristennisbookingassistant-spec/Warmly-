-- Tinder-style profile review state.
--
-- After discovery scrapes profiles, the user reviews them one at a time
-- in a swipe deck. Each swipe records the user's decision: save the
-- contact, skip it, or save and immediately draft outreach (starred).
--
-- Why user_action and not a new status value:
-- contacts.status already tracks where a contact is on the outreach
-- timeline (discovered → contacted → connected → met → ongoing). Adding
-- "pending_review" there would conflate two different concepts: the
-- user's triage decision vs. the relationship-stage progression. We
-- separate them so a `discovered` contact can independently be
-- pending_review OR already saved.
--
-- Filter logic:
--   /review     → user_action = 'pending'
--   /contacts   → user_action IS DISTINCT FROM 'pending'
--                 AND user_action IS DISTINCT FROM 'skipped'
--   (so saved + starred + null all show in /contacts)
--
-- NULL values for existing rows are treated as "already reviewed"
-- (visible in /contacts). Only new contacts that the extension saves
-- after this migration will start with user_action = 'pending'.

ALTER TABLE contacts
  ADD COLUMN user_action TEXT
    CHECK (
      user_action IS NULL
      OR user_action IN ('pending', 'saved', 'skipped', 'starred')
    ),
  ADD COLUMN reviewed_at TIMESTAMPTZ;

COMMENT ON COLUMN contacts.user_action IS
  'Triage decision from the Tinder-style swipe deck. pending = awaiting review (default for new discoveries). saved = right-swiped, visible in /contacts. skipped = left-swiped, hidden from /contacts but data preserved. starred = up-swiped, saved + outreach draft initiated. NULL = legacy rows from before this column existed, treated as already reviewed.';

COMMENT ON COLUMN contacts.reviewed_at IS
  'Timestamp of the swipe action. NULL until the user makes a decision.';

-- Index to make the pending count query fast for the sidebar badge.
CREATE INDEX contacts_user_id_user_action_idx
  ON contacts (user_id, user_action)
  WHERE user_action = 'pending';

-- Migration: 20260615000000_discovery_session_nullable_conversation
--
-- Makes discovery_sessions.conversation_id nullable so that sessions can be
-- created from the Discover screen (outside a chat context) via the
-- WEBAPP_DISCOVER company discovery flow (P3b Module 2).
--
-- The FK constraint and ON DELETE CASCADE are preserved — sessions linked to a
-- conversation still cascade correctly. Sessions without a conversation_id
-- (company discovery trigger) simply have NULL here and are unaffected by
-- conversation deletes.

ALTER TABLE public.discovery_sessions
  ALTER COLUMN conversation_id DROP NOT NULL;

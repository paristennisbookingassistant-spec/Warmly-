-- =============================================================================
-- seed.sql
-- Founder profile seed data for prototype testing.
-- See PRD Section 5.8.
--
-- IMPORTANT: This seed requires an existing auth.users row for the founder.
-- When running locally:
--   1. Sign up via the web app as liyang@example.com
--   2. Copy the UUID from auth.users
--   3. Replace FOUNDER_USER_ID below with that UUID
--   OR use the Supabase dashboard to insert the auth user first.
--
-- For CI/automated testing, the trigger on auth.users will auto-create
-- the public.users row, so only the profile update below is needed.
-- =============================================================================

-- Replace this with the actual founder user UUID after sign-up
DO $$
DECLARE
  founder_id UUID;
  founder_conversation_id UUID;
  founder_goal_id UUID;
BEGIN

  -- Try to find the founder user by email
  SELECT id INTO founder_id FROM public.users WHERE email = 'liyang@example.com' LIMIT 1;

  IF founder_id IS NULL THEN
    RAISE NOTICE 'Founder user not found. Sign up as liyang@example.com first, then re-run seed.';
    RETURN;
  END IF;

  -- -------------------------------------------------------------------------
  -- Update founder profile — PRD Section 5.8
  -- -------------------------------------------------------------------------
  UPDATE public.users
  SET
    name = 'Liyang Guo',
    education = '[
      {
        "school": "INSEAD",
        "degree": "MBA",
        "field": "Business Administration",
        "year": "2026",
        "campus": "Singapore/Fontainebleau"
      }
    ]'::jsonb,
    career_history = '[
      {
        "title": "To be imported from LinkedIn",
        "company": "Previous Company",
        "start_date": "2020-01",
        "end_date": "2024-08",
        "description": "Career history to be populated via LinkedIn import or manual entry"
      }
    ]'::jsonb,
    goals = '{
      "type": "job_search",
      "target_industries": ["Private Equity", "Venture Capital", "Strategy Consulting"],
      "target_companies": ["Sequoia", "KKR", "Blackstone", "Apollo", "BCG", "McKinsey", "Bain"],
      "target_roles": ["Associate", "Senior Associate", "VP"],
      "target_geographies": ["Singapore", "Hong Kong", "London", "Paris"]
    }'::jsonb,
    networking_preferences = '{
      "style": "warm",
      "outreach_comfort": 3,
      "contacts_per_week": 5,
      "preferred_channels": ["LinkedIn", "email"]
    }'::jsonb,
    user_memory = '{
      "writing_style": {
        "tone": "warm but professional",
        "avoids": [],
        "preferred_hooks": [],
        "message_length_preference": "concise",
        "signature_phrases": [],
        "last_updated": "2026-04-01T00:00:00Z"
      },
      "networking_approach": {
        "comfort_with_cold_outreach": 3,
        "preferred_channels": ["LinkedIn", "email"],
        "follow_up_cadence": "every 2-3 weeks",
        "last_updated": "2026-04-01T00:00:00Z"
      },
      "learned_patterns": {
        "successful_hooks": [],
        "best_performing_tone": "warm",
        "optimal_message_length": 0,
        "last_updated": "2026-04-01T00:00:00Z"
      }
    }'::jsonb,
    subscription_tier = 'pro',
    subscription_status = 'active'
  WHERE id = founder_id;

  -- -------------------------------------------------------------------------
  -- Seed a welcome General Chat conversation
  -- -------------------------------------------------------------------------
  INSERT INTO public.conversations (id, user_id, type, title, status)
  VALUES (
    gen_random_uuid(),
    founder_id,
    'general',
    'Welcome to AI Networking Coach',
    'active'
  )
  RETURNING id INTO founder_conversation_id;

  -- Welcome message from agent
  INSERT INTO public.conversation_messages (conversation_id, role, content)
  VALUES (
    founder_conversation_id,
    'agent',
    'Welcome, Liyang! I''m your AI networking coach. I can see you''re targeting PE, VC, and strategy consulting roles across Singapore, Hong Kong, London, and Paris. Let''s build your network strategically. Ready to find some relevant contacts at your target companies?'
  );

  -- -------------------------------------------------------------------------
  -- Seed a sample contact (Marie Chen at Sequoia — from PRD examples)
  -- -------------------------------------------------------------------------
  INSERT INTO public.contacts (
    user_id,
    linkedin_url,
    name,
    current_role,
    company,
    location,
    career_history,
    education,
    profile_snapshot,
    relevance_score,
    tier,
    scoring_breakdown,
    recommendation_reason,
    suggested_hook,
    source,
    status
  ) VALUES (
    founder_id,
    'https://linkedin.com/in/marie-chen-sample',
    'Marie Chen',
    'VP of Investments',
    'Sequoia Capital',
    'Singapore',
    '[
      {"title": "VP of Investments", "company": "Sequoia Capital", "start_date": "2022-03", "end_date": null},
      {"title": "Senior Associate", "company": "McKinsey & Company", "start_date": "2018-09", "end_date": "2022-02"}
    ]'::jsonb,
    '[
      {"school": "INSEAD", "degree": "MBA", "year": "2022", "campus": "Fontainebleau"}
    ]'::jsonb,
    '{
      "linkedin_url": "https://linkedin.com/in/marie-chen-sample",
      "name": "Marie Chen",
      "headline": "VP of Investments at Sequoia Capital | INSEAD MBA",
      "current_role": {"title": "VP", "company": "Sequoia Capital", "duration": "2y"},
      "previous_roles": [
        {"title": "Senior Associate", "company": "McKinsey & Company", "duration": "4y"}
      ],
      "education": [
        {"school": "INSEAD", "degree": "MBA", "field": "Business", "dates": "2021-2022"}
      ],
      "location": "Singapore",
      "mutual_connections": 3,
      "captured_at": "2026-04-01T00:00:00Z",
      "source_session_id": null
    }'::jsonb,
    8.2,
    1,
    '{
      "career_path_similarity": 9,
      "shared_background": 9,
      "seniority_relevance": 8,
      "industry_match": 9,
      "accessibility_signals": 7,
      "recency": 8
    }'::jsonb,
    'INSEAD MBA ''22, transitioned from McKinsey to Sequoia — exactly the path you are targeting. Based in Singapore.',
    'We both went through INSEAD and you are following a similar consulting-to-VC path — her experience transitioning from McKinsey to Sequoia is directly relevant to your goals.',
    'manual_chat',
    'discovered'
  );

  -- -------------------------------------------------------------------------
  -- Seed a networking goal
  -- -------------------------------------------------------------------------
  INSERT INTO public.networking_goals (
    user_id,
    goal_type,
    description,
    target_companies,
    target_roles,
    target_contacts_per_month,
    target_meetings_per_month,
    status
  ) VALUES (
    founder_id,
    'job_search',
    'Land an Associate or Senior Associate role at a top PE/VC fund or strategy consulting firm in Singapore or London by September 2026.',
    '["Sequoia", "KKR", "Blackstone", "Apollo", "BCG", "McKinsey", "Bain"]'::jsonb,
    '["Associate", "Senior Associate", "VP"]'::jsonb,
    8,
    4,
    'active'
  )
  RETURNING id INTO founder_goal_id;

  RAISE NOTICE 'Seed completed successfully for founder_id: %', founder_id;
  RAISE NOTICE 'Welcome conversation: %', founder_conversation_id;
  RAISE NOTICE 'Goal: %', founder_goal_id;

END $$;

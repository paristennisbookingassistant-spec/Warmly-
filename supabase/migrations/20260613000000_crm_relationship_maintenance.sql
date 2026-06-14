alter table contacts add column if not exists relationship_category text;   -- nurturing|keep_warm|inner_circle|dormant|null
alter table contacts add column if not exists cadence_days int;             -- per-contact override; null = category default
alter table contacts add column if not exists next_touch_at timestamptz;    -- materialized "due" timestamp; null = no cadence
comment on column contacts.relationship_category is 'CRM category: nurturing|keep_warm|inner_circle|dormant|null(uncategorized). Orthogonal to tier. See docs/specs/V2_P5B_CRM_MVP.md';
comment on column contacts.cadence_days is 'Per-contact cadence override in days; null = inherit CATEGORY_CADENCE default';
comment on column contacts.next_touch_at is 'Materialized due timestamp = (last_interaction_at ?? now()) + effective_cadence; null = no cadence (dormant/uncategorized)';
create index if not exists idx_contacts_next_touch on contacts (user_id, next_touch_at) where next_touch_at is not null;

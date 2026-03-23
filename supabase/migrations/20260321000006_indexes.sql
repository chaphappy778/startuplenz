-- =============================================================================
-- File:         20260321_000006_indexes.sql
-- Description:  All indexes, kept separate so they can be tuned or rebuilt
--               independently without touching table definitions
-- Dependencies: 20260321_000002_core_tables.sql
--               20260321_000003_cost_data_tables.sql
--               20260321_000004_user_content_tables.sql
--               20260321_000005_alert_tables.sql
-- =============================================================================

-- ---------------------------------------------------------------------------
-- users
-- ---------------------------------------------------------------------------
create index if not exists idx_users_auth_user_id
  on users (auth_user_id);

create index if not exists idx_users_email
  on users (email);

-- ---------------------------------------------------------------------------
-- user_subscriptions
-- ---------------------------------------------------------------------------
create index if not exists idx_user_subscriptions_user_id
  on user_subscriptions (user_id);

-- Partial index: active subscriptions are the hot path for entitlement checks
create index if not exists idx_user_subscriptions_active
  on user_subscriptions (user_id, tier_id)
  where status = 'active';

-- ---------------------------------------------------------------------------
-- vertical_inputs & data_source_mappings
-- ---------------------------------------------------------------------------
create index if not exists idx_vertical_inputs_vertical_id
  on vertical_inputs (vertical_id);

create index if not exists idx_vertical_inputs_formula_key
  on vertical_inputs (formula_key);

create index if not exists idx_data_source_mappings_input_id
  on data_source_mappings (vertical_input_id);

create index if not exists idx_data_source_mappings_active
  on data_source_mappings (is_active)
  where is_active = true;

-- ---------------------------------------------------------------------------
-- cost_snapshots — hot path: plan recalculation reads current snapshots
-- ---------------------------------------------------------------------------

-- Partial unique index: only one current snapshot per mapping at a time.
-- The sync worker flips is_current inside a transaction.
create unique index if not exists idx_cost_snapshots_current
  on cost_snapshots (data_source_mapping_id)
  where is_current = true;

create index if not exists idx_cost_snapshots_sync_run
  on cost_snapshots (sync_run_id);

-- Descending effective_at for "show me last N changes" queries
create index if not exists idx_cost_snapshots_effective_at
  on cost_snapshots (data_source_mapping_id, effective_at desc);

-- ---------------------------------------------------------------------------
-- sync_runs
-- ---------------------------------------------------------------------------
create index if not exists idx_sync_runs_status
  on sync_runs (status, started_at desc);

-- ---------------------------------------------------------------------------
-- saved_plans
-- ---------------------------------------------------------------------------
create index if not exists idx_saved_plans_user_id
  on saved_plans (user_id);

create index if not exists idx_saved_plans_vertical_id
  on saved_plans (vertical_id);

-- Most-recently-updated plans for the user's dashboard list
create index if not exists idx_saved_plans_user_updated
  on saved_plans (user_id, updated_at desc)
  where is_archived = false;

-- JSONB expression index — enables queries like
-- "all plans where units_per_month > 500" without a full table scan
create index if not exists idx_saved_plans_slider_values
  on saved_plans using gin (slider_values);

-- ---------------------------------------------------------------------------
-- plan_snapshots
-- ---------------------------------------------------------------------------

-- Most-recent version lookup per plan
create index if not exists idx_plan_snapshots_plan_version
  on plan_snapshots (saved_plan_id, version_number desc);

-- ---------------------------------------------------------------------------
-- alert_events
-- ---------------------------------------------------------------------------
create index if not exists idx_alert_events_mapping_id
  on alert_events (data_source_mapping_id, detected_at desc);

create index if not exists idx_alert_events_sync_run
  on alert_events (sync_run_id);

-- ---------------------------------------------------------------------------
-- user_alert_queue — worker polls this constantly
-- ---------------------------------------------------------------------------

-- Primary worker poll index: pending items ordered by age
create index if not exists idx_alert_queue_pending
  on user_alert_queue (queued_at asc)
  where status = 'pending';

create index if not exists idx_alert_queue_user_id
  on user_alert_queue (user_id, queued_at desc);

-- ---------------------------------------------------------------------------
-- alert_notification_log
-- ---------------------------------------------------------------------------
create index if not exists idx_notification_log_queue_id
  on alert_notification_log (user_alert_queue_id);

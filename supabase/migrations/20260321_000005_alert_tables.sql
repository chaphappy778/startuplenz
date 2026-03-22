-- =============================================================================
-- File:         20260321_000005_alert_tables.sql
-- Description:  Alert detection, fan-out queue, and notification delivery log
-- Dependencies: 20260321_000002_core_tables.sql
--               20260321_000003_cost_data_tables.sql
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Alert events
-- One row per detected cost change that crossed a threshold.
-- Written by the sync worker; the fan-out function reads from here.
-- ---------------------------------------------------------------------------
create table if not exists alert_events (
  id                      uuid              primary key default uuid_generate_v4(),
  data_source_mapping_id  uuid              not null references data_source_mappings(id),
  sync_run_id             uuid              not null references sync_runs(id),
  old_value               numeric           not null,
  new_value               numeric           not null,
  change_pct              numeric           not null,
  change_direction        change_direction  not null,
  detected_at             timestamptz       not null default now()
);

-- ---------------------------------------------------------------------------
-- User alert queue
-- Fan-out table: one row per (user, alert_event, channel) combination.
-- Decoupled from detection so a slow email provider never stalls the sync.
-- The unique constraint prevents duplicate queue entries on re-runs.
-- ---------------------------------------------------------------------------
create table if not exists user_alert_queue (
  id              uuid               primary key default uuid_generate_v4(),
  user_id         uuid               not null references users(id) on delete cascade,
  alert_event_id  uuid               not null references alert_events(id) on delete cascade,
  status          alert_queue_status not null default 'pending',
  channel         alert_channel      not null default 'email',
  queued_at       timestamptz        not null default now(),
  processed_at    timestamptz,
  unique (user_id, alert_event_id, channel)
);

-- ---------------------------------------------------------------------------
-- Alert notification log
-- Immutable delivery receipt per queue item. Written by the email worker
-- after each send attempt — used for retry logic and delivery debugging.
-- ---------------------------------------------------------------------------
create table if not exists alert_notification_log (
  id                    uuid        primary key default uuid_generate_v4(),
  user_alert_queue_id   uuid        not null references user_alert_queue(id) on delete cascade,
  provider              text        not null,     -- 'resend' | 'sendgrid' | etc.
  provider_message_id   text,
  delivery_status       text        not null default 'sent',
  error_detail          text,
  sent_at               timestamptz not null default now()
);

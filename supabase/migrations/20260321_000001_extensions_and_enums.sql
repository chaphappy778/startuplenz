-- =============================================================================
-- File:         20260321_000001_extensions_and_enums.sql
-- Description:  Enable required Postgres extensions and define all custom types
-- Dependencies: None — must run first
-- =============================================================================

-- Extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pg_cron";
create extension if not exists "pg_net";    -- needed by pg_cron to call Edge Functions

-- ---------------------------------------------------------------------------
-- Enums
-- Each block catches duplicate_object so re-runs are safe.
-- ---------------------------------------------------------------------------

-- Subscription status
do $$ begin
  create type subscription_status as enum (
    'active',
    'past_due',
    'cancelled',
    'trialing'
  );
exception when duplicate_object then null;
end $$;

-- Sync run status
do $$ begin
  create type sync_run_status as enum (
    'running',
    'completed',
    'failed',
    'partial'
  );
exception when duplicate_object then null;
end $$;

-- Direction of a cost change
do $$ begin
  create type change_direction as enum (
    'up',
    'down'
  );
exception when duplicate_object then null;
end $$;

-- Alert delivery status in the queue
do $$ begin
  create type alert_queue_status as enum (
    'pending',
    'processing',
    'sent',
    'failed',
    'suppressed'
  );
exception when duplicate_object then null;
end $$;

-- Alert delivery channel
do $$ begin
  create type alert_channel as enum (
    'email',
    'in_app',
    'webhook'
  );
exception when duplicate_object then null;
end $$;

-- External data source identifiers
do $$ begin
  create type data_source_name as enum (
    'BLS_CPI',
    'USITC_TARIFF',
    'ETSY_FEE',
    'SHOPIFY_FEE',
    'SHIPPO_RATE',
    'CUSTOM'
  );
exception when duplicate_object then null;
end $$;

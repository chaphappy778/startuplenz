-- =============================================================================
-- File:         20260321_000003_cost_data_tables.sql
-- Description:  Live data pipeline tables — vertical input definitions,
--               external API source mappings, sync run log, cost snapshots
-- Dependencies: 20260321_000002_core_tables.sql
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Vertical inputs
-- Defines the named sliders/inputs for each vertical, including formula
-- keys and whether the value is sourced from a live external feed.
-- ---------------------------------------------------------------------------
create table if not exists vertical_inputs (
  id              uuid        primary key default uuid_generate_v4(),
  vertical_id     uuid        not null references verticals(id) on delete cascade,
  input_key       text        not null,       -- machine key, e.g. 'units_per_month'
  display_label   text        not null,       -- human label, e.g. 'Units sold / month'
  unit_label      text,                       -- '$' | 'units' | 'lbs' | '%'
  default_value   numeric     not null,
  min_value       numeric     not null,
  max_value       numeric     not null,
  step_size       numeric     not null default 1,
  formula_key     text        not null,       -- maps to app-layer formula registry
  is_live_data    boolean     not null default false,
  sort_order      int         not null default 0,
  unique (vertical_id, input_key)
);

-- ---------------------------------------------------------------------------
-- Data source mappings
-- Binds a vertical input to an external API feed. Each mapping tells the
-- sync worker where to fetch, how to extract the value, and what change
-- percentage should trigger a user alert.
-- ---------------------------------------------------------------------------
create table if not exists data_source_mappings (
  id                          uuid             primary key default uuid_generate_v4(),
  vertical_input_id           uuid             not null references vertical_inputs(id) on delete cascade,
  source_name                 data_source_name not null,
  api_endpoint                text             not null,
  json_path_selector          text             not null,  -- JSONPath to extract value
                                                          -- e.g. '$.Results.series[0].data[0].value'
  transform_expression        text,                       -- optional normalization expression
  change_alert_threshold_pct  numeric          not null default 5.0,
  is_active                   boolean          not null default true,
  created_at                  timestamptz      not null default now()
);

-- ---------------------------------------------------------------------------
-- Sync runs
-- One row per nightly (or on-demand) job execution. Tracks status,
-- row counts, and any errors for observability.
-- ---------------------------------------------------------------------------
create table if not exists sync_runs (
  id              uuid            primary key default uuid_generate_v4(),
  job_name        text            not null,
  status          sync_run_status not null default 'running',
  rows_inserted   int             default 0,
  rows_unchanged  int             default 0,
  error_message   text,
  started_at      timestamptz     not null default now(),
  completed_at    timestamptz
);

-- ---------------------------------------------------------------------------
-- Cost snapshots
-- Immutable versioned ledger of all external data pulls. Never update or
-- delete rows — flip is_current atomically within a transaction instead.
-- The partial unique index enforces at most one current snapshot per mapping.
-- ---------------------------------------------------------------------------
create table if not exists cost_snapshots (
  id                      uuid        primary key default uuid_generate_v4(),
  data_source_mapping_id  uuid        not null references data_source_mappings(id),
  sync_run_id             uuid        not null references sync_runs(id),
  raw_value               numeric     not null,
  normalized_value        numeric     not null,   -- after transform_expression applied
  currency_code           text        not null default 'USD',
  metadata_json           jsonb,                  -- tariff code, fee %, region, etc.
  is_current              boolean     not null default false,
  effective_at            timestamptz not null default now(),
  created_at              timestamptz not null default now()
);

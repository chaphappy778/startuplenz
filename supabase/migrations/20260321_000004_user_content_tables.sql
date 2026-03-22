-- =============================================================================
-- File:         20260321_000004_user_content_tables.sql
-- Description:  User-generated content — saved plans and versioned snapshots
-- Dependencies: 20260321_000002_core_tables.sql
--               20260321_000003_cost_data_tables.sql
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Saved plans
-- Each row is one named scenario a user has saved for a specific vertical.
-- slider_values JSONB holds the full input state, e.g.:
--   { "units_per_month": 500, "material_cost_per_unit": 3.20, ... }
-- last_cost_snapshot_id lets the app detect "costs changed since you last
-- opened this plan" by comparing against the current snapshot.
-- ---------------------------------------------------------------------------
create table if not exists saved_plans (
  id                    uuid        primary key default uuid_generate_v4(),
  user_id               uuid        not null references users(id) on delete cascade,
  vertical_id           uuid        not null references verticals(id),
  name                  text        not null default 'Untitled Plan',
  description           text,
  slider_values         jsonb       not null,
  last_cost_snapshot_id uuid        references cost_snapshots(id) on delete set null,
  is_archived           boolean     not null default false,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Plan snapshots
-- Append-only version history for each saved plan. A new row is written
-- every time the user saves, capturing the slider state and computed
-- financial outputs at that moment in time.
-- computed_outputs JSONB example:
--   { "gross_revenue": 12400, "cogs": 4200, "net_profit": 3100,
--     "profit_margin_pct": 25.0, "phase_1_months": 6 }
-- ---------------------------------------------------------------------------
create table if not exists plan_snapshots (
  id                uuid        primary key default uuid_generate_v4(),
  saved_plan_id     uuid        not null references saved_plans(id) on delete cascade,
  version_number    int         not null,
  slider_values     jsonb       not null,
  computed_outputs  jsonb       not null,
  cost_snapshot_id  uuid        references cost_snapshots(id) on delete set null,
  created_at        timestamptz not null default now(),
  unique (saved_plan_id, version_number)
);

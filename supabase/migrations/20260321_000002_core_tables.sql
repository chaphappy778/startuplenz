-- =============================================================================
-- File:         20260321_000002_core_tables.sql
-- Description:  Foundational tables — subscription tiers, users, verticals,
--               and the access-limit bridge between tiers and verticals
-- Dependencies: 20260321_000001_extensions_and_enums.sql
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Subscription tiers (reference data — seeded in 000008)
-- ---------------------------------------------------------------------------
create table if not exists subscription_tiers (
  id                  uuid        primary key default uuid_generate_v4(),
  name                text        not null,
  slug                text        not null unique,          -- 'free' | 'pro' | 'team'
  monthly_price_usd   numeric(8,2) not null default 0,
  max_saved_plans     int         not null default 3,
  max_verticals       int,                                  -- null = unlimited
  alerts_enabled      boolean     not null default false,
  team_features       boolean     not null default false,
  created_at          timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Users (mirrors auth.users — one row per authenticated account)
-- ---------------------------------------------------------------------------
create table if not exists users (
  id                      uuid        primary key default uuid_generate_v4(),
  auth_user_id            uuid        not null unique references auth.users(id) on delete cascade,
  email                   text        not null,
  full_name               text,
  avatar_url              text,
  -- active_subscription_id added via ALTER below (circular FK with user_subscriptions)
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- User subscriptions
-- ---------------------------------------------------------------------------
create table if not exists user_subscriptions (
  id                      uuid                  primary key default uuid_generate_v4(),
  user_id                 uuid                  not null references users(id) on delete cascade,
  tier_id                 uuid                  not null references subscription_tiers(id),
  stripe_subscription_id  text                  unique,
  status                  subscription_status   not null default 'active',
  current_period_start    timestamptz,
  current_period_end      timestamptz,
  cancelled_at            timestamptz,
  created_at              timestamptz           not null default now()
);

-- Resolve the circular FK now that user_subscriptions exists
do $$ begin
  alter table users
    add column active_subscription_id uuid
    references user_subscriptions(id) on delete set null;
exception when duplicate_column then null;
end $$;

-- ---------------------------------------------------------------------------
-- Verticals (business categories)
-- ---------------------------------------------------------------------------
create table if not exists verticals (
  id            uuid        primary key default uuid_generate_v4(),
  slug          text        not null unique,     -- 'food-truck' | 'candle-bath' | etc.
  display_name  text        not null,
  description   text,
  icon_key      text,                            -- maps to frontend icon library key
  is_active     boolean     not null default true,
  sort_order    int         not null default 0,
  created_at    timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Vertical access limits (tier ↔ vertical bridge)
-- Controls which verticals each subscription tier can access
-- ---------------------------------------------------------------------------
create table if not exists vertical_access_limits (
  id            uuid    primary key default uuid_generate_v4(),
  tier_id       uuid    not null references subscription_tiers(id) on delete cascade,
  vertical_id   uuid    not null references verticals(id) on delete cascade,
  is_accessible boolean not null default true,
  unique (tier_id, vertical_id)
);

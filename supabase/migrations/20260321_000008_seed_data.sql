-- =============================================================================
-- File:         20260321_000008_seed_data.sql
-- Description:  Static reference data — subscription tiers and launch verticals.
--               Uses INSERT ... ON CONFLICT DO UPDATE so re-runs are safe and
--               price/config changes can be applied by re-running this file.
-- Dependencies: 20260321_000002_core_tables.sql
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Subscription tiers
-- ---------------------------------------------------------------------------
insert into subscription_tiers (
  id, name, slug, monthly_price_usd,
  max_saved_plans, max_verticals,
  alerts_enabled, team_features
)
values
  (
    'a0000000-0000-0000-0000-000000000001',
    'Free', 'free', 0.00,
    3, 3,
    false, false
  ),
  (
    'a0000000-0000-0000-0000-000000000002',
    'Pro', 'pro', 19.00,
    50, null,         -- null = unlimited verticals
    true, false
  ),
  (
    'a0000000-0000-0000-0000-000000000003',
    'Team', 'team', 49.00,
    200, null,
    true, true
  )
on conflict (slug) do update set
  name                = excluded.name,
  monthly_price_usd   = excluded.monthly_price_usd,
  max_saved_plans     = excluded.max_saved_plans,
  max_verticals       = excluded.max_verticals,
  alerts_enabled      = excluded.alerts_enabled,
  team_features       = excluded.team_features;

-- ---------------------------------------------------------------------------
-- Launch verticals
-- ---------------------------------------------------------------------------
insert into verticals (id, slug, display_name, description, icon_key, sort_order)
values
  (
    'b0000000-0000-0000-0000-000000000001',
    'handmade-craft',
    'Handmade / Craft',
    'Etsy-style handmade goods with material, platform, and shipping costs',
    'icon-scissors',
    10
  ),
  (
    'b0000000-0000-0000-0000-000000000002',
    'food-truck',
    'Food Truck',
    'Mobile food service with permit, commissary, ingredient, and event costs',
    'icon-truck',
    20
  ),
  (
    'b0000000-0000-0000-0000-000000000003',
    'subscription-box',
    'Subscription Box',
    'Monthly product boxes with sourcing, packaging, fulfillment, and churn modeling',
    'icon-box',
    30
  ),
  (
    'b0000000-0000-0000-0000-000000000004',
    'candle-bath-body',
    'Candle / Bath & Body',
    'Cosmetic and home fragrance products with raw materials, compliance, and DTC costs',
    'icon-flame',
    40
  )
on conflict (slug) do update set
  display_name  = excluded.display_name,
  description   = excluded.description,
  icon_key      = excluded.icon_key,
  sort_order    = excluded.sort_order;

-- ---------------------------------------------------------------------------
-- Vertical access limits
-- Free: first 3 verticals only (handmade, food-truck, subscription-box)
-- Pro & Team: all verticals
-- ---------------------------------------------------------------------------

-- Free tier restrictions (insert/update per vertical)
insert into vertical_access_limits (tier_id, vertical_id, is_accessible)
values
  ('a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', true),
  ('a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000002', true),
  ('a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000003', true),
  ('a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000004', false), -- locked on Free

  ('a0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000001', true),
  ('a0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000002', true),
  ('a0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000003', true),
  ('a0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000004', true),

  ('a0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000001', true),
  ('a0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000002', true),
  ('a0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000003', true),
  ('a0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000004', true)
on conflict (tier_id, vertical_id) do update set
  is_accessible = excluded.is_accessible;

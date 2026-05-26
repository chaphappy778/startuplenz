-- =============================================================================
-- Migration: 20260524000033_default_value_recalibration
-- Purpose:   First pass on calibrating commodity-driven default values that
--            don't match real-world current pricing. Each update reflects a
--            specific gap surfaced during the 2026-05-24 default audit:
--
--   Candle (4 updates)
--     • material_cost_per_unit  $4.50 → $5.25  — wax + fragrance + jar edge
--                                                 of range at small batch
--     • labor_minutes_per_unit  25    → 35     — honest hand-pour accounting
--                                                 (pour + cool + cure + label)
--     • maker_hourly_rate       $18   → $22    — above min-wage threshold
--                                                 in most states
--     • marketing_per_month     $200  → $300   — mid-tier growth assumption
--                                                 (not hobby tier)
--
--   Slime (1 update)
--     • ad_spend_per_month      $200  → $400   — real growth-tier figure;
--                                                 $200 was side-hustle-only
--
--   House flipping (2 updates)
--     • holding_costs_per_month $400  → $550   — national blended tax +
--                                                 insurance + utilities;
--                                                 $400 was LOW for half
--                                                 the country
--     • holding_time_months     4     → 5      — national median is 5-6;
--                                                 4 was hot-market only
--
--   Cleaning service (1 update)
--     • supplies_cost_per_job   $8    → $12    — realistic residential
--                                                 supply cost (chemicals,
--                                                 microfiber, gloves,
--                                                 amortized equipment);
--                                                 $8 was the surfacing
--                                                 issue that started the
--                                                 whole audit
--
-- All updates use vertical slug + input_key lookup so the migration is
-- safe to rerun and resilient to row-id changes.
-- =============================================================================

BEGIN;

-- Helper-less inline approach: each UPDATE is self-contained for auditability.

-- ─── Candle / Bath & Body ──────────────────────────────────────────────────

UPDATE public.vertical_inputs vi
   SET default_value = 5.25
  FROM public.verticals v
 WHERE vi.vertical_id = v.id
   AND v.slug         = 'candle-bath-body'
   AND vi.input_key   = 'material_cost_per_unit';

UPDATE public.vertical_inputs vi
   SET default_value = 35
  FROM public.verticals v
 WHERE vi.vertical_id = v.id
   AND v.slug         = 'candle-bath-body'
   AND vi.input_key   = 'labor_minutes_per_unit';

UPDATE public.vertical_inputs vi
   SET default_value = 22
  FROM public.verticals v
 WHERE vi.vertical_id = v.id
   AND v.slug         = 'candle-bath-body'
   AND vi.input_key   = 'maker_hourly_rate';

UPDATE public.vertical_inputs vi
   SET default_value = 300
  FROM public.verticals v
 WHERE vi.vertical_id = v.id
   AND v.slug         = 'candle-bath-body'
   AND vi.input_key   = 'marketing_per_month';

-- ─── Slime Brand ───────────────────────────────────────────────────────────

UPDATE public.vertical_inputs vi
   SET default_value = 400
  FROM public.verticals v
 WHERE vi.vertical_id = v.id
   AND v.slug         = 'slime-business'
   AND vi.input_key   = 'ad_spend_per_month';

-- ─── House Flipping ────────────────────────────────────────────────────────

UPDATE public.vertical_inputs vi
   SET default_value = 550
  FROM public.verticals v
 WHERE vi.vertical_id = v.id
   AND v.slug         = 'house-flipping'
   AND vi.input_key   = 'holding_costs_per_month';

UPDATE public.vertical_inputs vi
   SET default_value = 5
  FROM public.verticals v
 WHERE vi.vertical_id = v.id
   AND v.slug         = 'house-flipping'
   AND vi.input_key   = 'holding_time_months';

-- ─── Cleaning Service ──────────────────────────────────────────────────────

UPDATE public.vertical_inputs vi
   SET default_value = 12
  FROM public.verticals v
 WHERE vi.vertical_id = v.id
   AND v.slug         = 'cleaning-service'
   AND vi.input_key   = 'supplies_cost_per_job';

COMMIT;

-- =============================================================================
-- Migration: 20260625000036_default_value_recalibration_v2
-- Purpose:   30-day default-value audit (last recalibration was
--            20260524000033). Cross-checked every priced default against
--            current market sources; most held within ~10%. Five drifted
--            far enough to update.
--
--   Slime brand (1 update)
--     • material_cost_per_unit  $3.25 → $2.75  — bulk PVA per gallon at
--                                                 current Walmart/Amazon
--                                                 pricing puts pure
--                                                 materials at $1.30-$1.80
--                                                 per 8oz; $2.75 keeps a
--                                                 buffer for premium scents
--                                                 and waste, $3.25 was high
--
--   Digital products (1 update)
--     • marketplace_fee_pct      8%    → 10%    — Gumroad 10%+$0.50,
--                                                 Etsy digital ~11%,
--                                                 Shopify 2.9%+$0.30 plus
--                                                 plan — blended reality is
--                                                 10-13%, 8% understated
--
--   House flipping (1 update)
--     • realtor_commission_pct   6%    → 5.7%   — NAR settlement drift;
--                                                 listing 2.88% +
--                                                 buyer 2.82% = 5.7% per
--                                                 Clever 2026 survey
--
--   Slime brand (1 update — separate row from above)
--     • tiktok_fee_pct           9%    → 6%     — TikTok Shop now charges
--                                                 a flat 6% referral with
--                                                 processing bundled; the
--                                                 9% combined was based on
--                                                 the prior structure
--
--   Cleaning service (1 update)
--     • insurance_per_month      $180  → $60    — solo cleaner GL ($37-48)
--                                                 + janitorial bond ($11)
--                                                 = $48-70/mo per Insureon
--                                                 quotes; $180 only makes
--                                                 sense once commercial
--                                                 auto is bundled in, which
--                                                 it shouldn't be here
--
-- Sources consulted: Etsy fees policy, TikTok Shop Seller Fees 2026,
-- Gumroad pricing, Stripe + Square pricing, Clever 2026 commission
-- survey, Insureon cleaning quotes, NEXT pressure-washing quotes,
-- Walmart/Amazon bulk glue pricing, Candlewic wax pricing, pool-supply
-- sodium hypochlorite pricing. Full audit summary kept with the
-- pulse changelog entry that ships alongside this migration.
--
-- Not updated (drifted < 10%):
--   Etsy combined fees (we're ~13% vs live ~11.3%; carve-out for Offsite
--   Ads keeps the higher default defensible). Stripe card processing
--   2.9%+$0.30 (unchanged). Hard-money rate 12% (live midpoint ~11.25%,
--   within range). Hard-money points 2 (live midpoint 2.25, within
--   range). Candle materials $5.25 (live midpoint ~$5.15). Sodium
--   hypochlorite range ($25-$45/5gal). Power-washing insurance $220/mo
--   (just shipped; borderline but inside range).
--
-- All updates use vertical slug + input_key lookup so the migration is
-- safe to rerun and resilient to row-id changes.
-- =============================================================================

BEGIN;

-- ─── Slime Brand ───────────────────────────────────────────────────────────

UPDATE public.vertical_inputs vi
   SET default_value = 2.75
  FROM public.verticals v
 WHERE vi.vertical_id = v.id
   AND v.slug         = 'slime-business'
   AND vi.input_key   = 'material_cost_per_unit';

UPDATE public.vertical_inputs vi
   SET default_value = 6
  FROM public.verticals v
 WHERE vi.vertical_id = v.id
   AND v.slug         = 'slime-business'
   AND vi.input_key   = 'tiktok_fee_pct';

-- ─── Digital Products ──────────────────────────────────────────────────────

UPDATE public.vertical_inputs vi
   SET default_value = 10
  FROM public.verticals v
 WHERE vi.vertical_id = v.id
   AND v.slug         = 'digital-products'
   AND vi.input_key   = 'marketplace_fee_pct';

-- ─── House Flipping ────────────────────────────────────────────────────────

UPDATE public.vertical_inputs vi
   SET default_value = 5.7
  FROM public.verticals v
 WHERE vi.vertical_id = v.id
   AND v.slug         = 'house-flipping'
   AND vi.input_key   = 'realtor_commission_pct';

-- ─── Cleaning Service ──────────────────────────────────────────────────────

UPDATE public.vertical_inputs vi
   SET default_value = 60
  FROM public.verticals v
 WHERE vi.vertical_id = v.id
   AND v.slug         = 'cleaning-service'
   AND vi.input_key   = 'insurance_per_month';

COMMIT;

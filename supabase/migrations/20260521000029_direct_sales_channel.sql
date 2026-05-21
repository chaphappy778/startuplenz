-- =============================================================================
-- File:         20260521000029_direct_sales_channel.sql
-- Description:  Adds a "direct sales" channel to slime-business and
--               handmade-craft so own-site sales (Shopify, Big Cartel, IG-link
--               → Stripe checkout) aren't lumped under Etsy. Each direct sale
--               only pays card processing (~2.9%) — significantly higher
--               margin than the platform channels.
--
--               Slime + handmade both had a single channel-share slider for
--               their primary platform. The model treated everything else as
--               the OTHER platform, which mismodels indie brands running off
--               TikTok / IG → own site.
-- =============================================================================

BEGIN;

-- ─── slime-business ────────────────────────────────────────────────────────
DO $$
DECLARE
    v_id uuid;
BEGIN
    SELECT id INTO v_id FROM public.verticals WHERE slug = 'slime-business';
    IF v_id IS NULL THEN RAISE EXCEPTION 'Vertical slime-business not found.'; END IF;

    -- Lower the TikTok default so the three channels can sum to ~100
    UPDATE public.vertical_inputs
       SET default_value = 40,
           help_text     = 'Percent of REVENUE through TikTok Shop. Set alongside Etsy and Direct shares below — together they should sum to 100. Not percent of customers or units.'
     WHERE vertical_id = v_id
       AND input_key   = 'platform_mix_tiktok_pct';

    INSERT INTO public.vertical_inputs (
        id, vertical_id, input_key, display_label, unit_label,
        min_value, max_value, default_value, step_size,
        formula_key, is_live_data, sort_order, help_text
    ) VALUES
    (gen_random_uuid(), v_id, 'platform_mix_etsy_pct',
        'Etsy Share', '%',
        0, 100, 30, 5,
        'platform_mix_etsy_pct', false, 135,
        'Percent of REVENUE through Etsy. Pays the ~13% Etsy combined fee.'),
    (gen_random_uuid(), v_id, 'platform_mix_direct_pct',
        'Own Site / Direct Share', '%',
        0, 100, 30, 5,
        'platform_mix_direct_pct', false, 138,
        'Percent of REVENUE through your own site (Shopify, Big Cartel, IG-link checkout). Pays only ~2.9% card processing — meaningfully higher margin than Etsy or TikTok Shop.')

    ON CONFLICT (vertical_id, input_key) DO NOTHING;

    RAISE NOTICE 'slime-business: added direct + etsy channel sliders';
END $$;

-- ─── handmade-craft ────────────────────────────────────────────────────────
-- Existing input is `platform_mix_etsy_pct` (default 80, treating rest as
-- TikTok). Lower the default and add TikTok + Direct as explicit sliders.
DO $$
DECLARE
    v_id uuid;
BEGIN
    SELECT id INTO v_id FROM public.verticals WHERE slug = 'handmade-craft';
    IF v_id IS NULL THEN RAISE EXCEPTION 'Vertical handmade-craft not found.'; END IF;

    UPDATE public.vertical_inputs
       SET default_value = 55,
           help_text     = 'Percent of REVENUE through Etsy. Set alongside TikTok and Direct shares — together they should sum to 100. Pays the ~13% Etsy combined fee.'
     WHERE vertical_id = v_id
       AND input_key   = 'platform_mix_etsy_pct';

    INSERT INTO public.vertical_inputs (
        id, vertical_id, input_key, display_label, unit_label,
        min_value, max_value, default_value, step_size,
        formula_key, is_live_data, sort_order, help_text
    ) VALUES
    (gen_random_uuid(), v_id, 'platform_mix_tiktok_pct',
        'TikTok Shop Share', '%',
        0, 100, 25, 5,
        'platform_mix_tiktok_pct', false, 122,
        'Percent of REVENUE through TikTok Shop. Pays a combined ~9% in referral + payment fees plus any creator affiliate commission set below.'),
    (gen_random_uuid(), v_id, 'platform_mix_direct_pct',
        'Own Site / Direct Share', '%',
        0, 100, 20, 5,
        'platform_mix_direct_pct', false, 125,
        'Percent of REVENUE through your own site (Shopify, Big Cartel, IG-link checkout). Pays only ~2.9% card processing — highest-margin channel.')

    ON CONFLICT (vertical_id, input_key) DO NOTHING;

    RAISE NOTICE 'handmade-craft: added direct + tiktok channel sliders';
END $$;

COMMIT;

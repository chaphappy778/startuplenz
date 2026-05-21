-- =============================================================================
-- File:         20260521000028_vertical_inputs_help_text.sql
-- Description:  Adds a per-input help_text column to vertical_inputs and
--               populates it for every slider across all 10 verticals.
--               Help text renders as a tooltip on the slider label so
--               first-time founders aren't guessing at slider semantics.
--
--               Schema change is additive (column nullable). Backfill is
--               idempotent via WHERE clauses — re-running won't double up.
-- =============================================================================

BEGIN;

ALTER TABLE public.vertical_inputs
    ADD COLUMN IF NOT EXISTS help_text text;

-- ─── Helper inline-update macro ──────────────────────────────────────────────
-- We write a tiny PL/pgSQL block to keep the body compact: pass vertical slug
-- and a record of (input_key, text) pairs. It only updates rows whose
-- help_text is null OR empty, so admin edits won't be clobbered on re-run.
DO $$
DECLARE
    pair record;
    pairs jsonb;
    vsdef record;
BEGIN
    -- One JSON object per vertical: { slug: 'handmade-craft', items: { input_key: 'help text', ... } }
    FOR vsdef IN
        SELECT v.id AS vertical_id, vp.slug, vp.items
        FROM (VALUES

        -- ─── handmade-craft ─────────────────────────────────────────────────
        ('handmade-craft', '{
          "units_per_drop":               "How many individual handmade units you make and list in each drop or restock event.",
          "drops_per_month":              "Number of distinct restocks or new-product launches you run each month. More drops = more visibility but more time per month spent on listing work.",
          "sell_through_rate":            "What percent of listed units actually sell within the month. Listed-but-unsold units still cost you material, packaging, and labor.",
          "price_per_unit":               "Retail listing price for a single unit before any discounts. Cross-channel: this is your direct-to-consumer price.",
          "avg_order_size":               "Average number of units per customer order. Higher average orders improve your shipping economics — each shipping label covers more revenue.",
          "material_cost_per_unit":       "Total raw-material cost (resin, pigment, wax, etc.) to make one unit. Excludes packaging.",
          "packaging_cost_per_unit":      "Box, mailer, tissue, inserts, branded touches per shipped unit.",
          "labor_minutes_per_unit":       "Active making + packing time per unit. Combined with your hourly rate, gives an optional labor cost in COGS.",
          "maker_hourly_rate":            "What you value your own time at. Set 0 to ignore labor and see pure product margin; set realistic to see what hiring your replacement would cost.",
          "avg_shipping_cost_per_order":  "Carrier cost to ship one customer order, NOT the shipping price you charge buyers.",
          "free_shipping_threshold":      "Order subtotal at which you absorb all shipping. Set 0 to never offer free shipping; common values are $35–50.",
          "platform_mix_etsy_pct":        "Percent of total REVENUE coming through Etsy. The remainder is assumed to come through TikTok Shop. Not percent of customers or percent of units — revenue share.",
          "etsy_offsite_ads_opt_out":     "Set 1 if your Etsy shop earned under $10k in the past year and you have opted out of Offsite Ads. Saves you the 15% Offsite Ads fee.",
          "ad_spend_pct_revenue":         "Combined Etsy Ads + TikTok Ads budget expressed as a percent of gross revenue.",
          "tiktok_affiliate_rate":        "Commission rate paid to TikTok creators per affiliate sale. Industry average ~10–15%.",
          "return_rate":                  "Percent of orders that result in a refund. Lowers net revenue and adds reprocessing cost."
        }'::jsonb),

        -- ─── food-truck ─────────────────────────────────────────────────────
        ('food-truck', '{
          "days_open_per_month":          "Days the truck actually operates and serves customers. Full-time operators run 20–24 days; less than 20 usually means part-time or weather-limited.",
          "avg_covers_per_day":           "Customers served per operating day. A strong lunch service typically does 60–150 covers.",
          "avg_ticket_size":              "Dollar amount of an average customer transaction. Most trucks land $10–15.",
          "beverage_revenue_pct":         "Percent of revenue from drinks. Beverages run 70–80% gross margin vs 65–72% for food, so this dial directly impacts profitability.",
          "food_cost_pct":                "Ingredient + supply cost as a percent of food revenue. Healthy range: 28–35%. Over 40% means something is wrong.",
          "beverage_cost_pct":            "Drink ingredient cost as a percent of beverage revenue. Soda + water typically 20–30%; alcohol higher.",
          "labor_hourly_rate":            "Blended hourly wage across all crew (yourself included). $15–25 is typical depending on market.",
          "labor_hours_per_day":          "Total labor hours per operating day, summed across all crew members. A two-person truck working 6 hours = 12 labor hours.",
          "fuel_cost_per_day":            "Fuel and basic vehicle wear per operating day. Doesn''t include the loan payment.",
          "event_fee_per_month":          "What you pay to event organizers, parking spots, or location agreements each month.",
          "truck_loan_payment":           "Monthly loan or lease payment on the truck itself. Set 0 if owned outright.",
          "insurance_per_month":          "Truck + liability insurance, monthly.",
          "license_fees_per_month":       "Health permit, business license, food handler renewals amortized to a monthly figure.",
          "propane_supplies_per_month":   "Cooking fuel + consumable supplies (paper, gloves, sanitizer, etc.) per month.",
          "marketing_per_month":          "Social media, paid ads, printed flyers, etc.",
          "credit_card_fee_pct":          "Combined card processing fees as a percent of revenue. Square, Toast, etc. typically 2.5–3%."
        }'::jsonb),

        -- ─── subscription-box ───────────────────────────────────────────────
        ('subscription-box', '{
          "subscribers_active":           "Active paying subscribers at the start of the month. The number revenue is calculated from.",
          "monthly_new_signups":          "New subscribers acquired each month through ads, organic, referrals.",
          "monthly_churn_pct":            "Percent of subscribers who cancel each month. 5–10% is normal for indie boxes; 12%+ is a warning sign.",
          "monthly_box_price":            "What a subscriber pays each month for one box.",
          "annual_discount_pct":          "Discount applied to annual plans vs the monthly rate. 10–20% is typical.",
          "annual_plan_share_pct":        "Percent of subscribers on annual billing. Annual reduces churn but ties up cash.",
          "cogs_per_box":                 "Cost of the actual contents going into the box — products, samples, exclusives.",
          "packaging_per_box":            "Box itself + filler + insert + branding per shipped box.",
          "shipping_cost_per_box":        "Your actual carrier cost (USPS, UPS, etc.) per box shipped.",
          "shipping_charged_per_box":     "What you charge the buyer for shipping. The gap between this and the carrier cost is absorbed by you.",
          "cac":                          "Customer Acquisition Cost — total marketing spend divided by new subscribers acquired in that period.",
          "payment_processing_pct":       "Stripe / PayPal / processor fee on every recurring charge. ~2.9% + $0.30 is typical.",
          "platform_fee_pct":             "Cratejoy, Subbly, or similar subscription-platform fee. Set 0 if running on your own Shopify or custom stack.",
          "warehouse_cost_per_month":     "Warehouse rent, storage, fulfillment-center fee per month.",
          "customer_service_per_month":   "Support tooling + any contractor hours for customer service.",
          "tools_software_per_month":     "Software stack — Shopify, Klaviyo, accounting, etc.",
          "founder_draw_per_month":       "What you pay yourself monthly. Set 0 to see business profit before paying yourself."
        }'::jsonb),

        -- ─── candle-bath-body ──────────────────────────────────────────────
        ('candle-bath-body', '{
          "units_produced_per_month":     "Total units of candles or bath product made each month, before splitting by channel.",
          "price_per_unit":               "Direct retail price you charge consumers. Wholesale gets a discount applied automatically.",
          "channel_mix_direct_pct":       "Percent of units sold through your own site or in-person markets. Highest margin channel.",
          "channel_mix_etsy_pct":         "Percent of units sold through Etsy. Fees apply.",
          "channel_mix_wholesale_pct":    "Percent of units sold to retailers at wholesale pricing. Lower margin but moves volume.",
          "wholesale_discount_pct":       "Discount applied to wholesale price vs retail. Industry standard is 50%.",
          "material_cost_per_unit":       "Wax, fragrance, wick, jar, dye combined per unit.",
          "packaging_cost_per_unit":      "Outer packaging — labels, sleeves, gift boxes — per unit.",
          "labor_minutes_per_unit":       "Active making + curing-supervision + packing time per unit.",
          "maker_hourly_rate":            "What you value your time at. Set 0 to ignore labor; set realistic to see what a hire would cost.",
          "avg_shipping_cost_per_direct_order": "Your actual carrier cost to ship a direct-channel order.",
          "avg_order_size":               "Average units per direct customer order. Higher = better shipping economics.",
          "etsy_fee_pct":                 "Etsy combined transaction, payment, and offsite-ads fees. ~13% all-in is typical.",
          "studio_rent_per_month":        "Dedicated production space cost per month. Set 0 if working from home with no allocated rent.",
          "supplies_overhead_per_month":  "Consumable supplies + shared overhead — utilities, insurance — per month.",
          "marketing_per_month":          "Combined ad spend + creator gifting + paid social per month."
        }'::jsonb),

        -- ─── print-on-demand ───────────────────────────────────────────────
        ('print-on-demand', '{
          "orders_per_month":             "Number of orders fulfilled per month. Each order = one shipping event.",
          "avg_units_per_order":          "Average units in one order. POD shoppers often buy 1 shirt or 1 print at a time.",
          "avg_retail_price_per_unit":    "Your retail selling price per unit, after any product upcharge.",
          "pod_base_cost_per_unit":       "What the POD provider (Printful, Printify, etc.) charges you per unit before shipping.",
          "pod_shipping_per_order":       "POD provider''s shipping charge per order.",
          "customer_shipping_paid":       "What the buyer pays for shipping. Often $0 (free shipping) but can offset POD shipping.",
          "return_rate_pct":              "Percent of orders refunded or reprinted. Sizing issues on apparel push this up.",
          "storefront_platform_fee_pct":  "Per-transaction fee on your storefront. Shopify ~2.9%, Etsy ~13%, own-site processor only.",
          "storefront_monthly_fee":       "Monthly storefront subscription. Shopify Basic $39, Etsy $0 monthly.",
          "design_cost_per_month":        "Designer freelance fees, stock-graphic subscriptions, design tools.",
          "ad_spend_per_month":           "Monthly ad budget across Meta, TikTok, Google.",
          "ad_attributed_revenue_pct":    "Percent of revenue you attribute to paid ads. Use 100% if ads is your only marketing channel; less if you have organic/email contributing.",
          "tools_software_per_month":     "Email, analytics, design tools, automations.",
          "founder_draw_per_month":       "Monthly take-home you pay yourself. Set 0 to see business profit before paying yourself."
        }'::jsonb),

        -- ─── digital-products ──────────────────────────────────────────────
        ('digital-products', '{
          "sales_per_month":              "Number of sales / transactions per month. One person buying a bundle = one sale.",
          "avg_order_value":              "Average revenue per sale before bundle uplift. Single-product price.",
          "bundle_uplift_pct":            "Lift to AOV from bundling related products. Bundling typically increases AOV 15–35%.",
          "refund_rate_pct":              "Percent of sales refunded. Templates ~1–3%; courses 5–10%.",
          "payment_processing_pct":       "Stripe / processor fee per transaction. ~2.9% + $0.30 typical.",
          "marketplace_fee_pct":          "Marketplace cut on platforms like Gumroad, Etsy, Lemon Squeezy. Set 0 if selling on your own site only.",
          "affiliate_payout_pct":         "What you pay affiliates per attributed sale. 30–50% is typical for digital products.",
          "affiliate_share_of_sales_pct": "Percent of sales coming through your affiliate network.",
          "ad_spend_per_month":           "Monthly paid-ad budget.",
          "ad_attributed_sales_pct":      "Percent of sales attributed to paid ads. Email + organic + ads should sum to your total source mix.",
          "email_capture_rate_pct":       "Percent of visitors who join your email list. Real asset you''re building.",
          "visitors_per_month":           "Total website visitors per month from all sources.",
          "tools_software_per_month":     "Hosting, email tool, course platform, analytics.",
          "founder_draw_per_month":       "Monthly take-home you pay yourself."
        }'::jsonb),

        -- ─── reseller ──────────────────────────────────────────────────────
        ('reseller', '{
          "items_sold_per_month":         "Number of items you sell each month, not number listed. Listed-but-unsold inventory carries time + capital cost.",
          "avg_sale_price":               "Average price an item sells for.",
          "avg_sourcing_cost_per_item":   "What you pay to acquire an item — thrift store, estate sale, wholesale lot price.",
          "sell_through_rate_pct":        "Percent of items listed that actually sell. Lower sell-through means more time per item sold.",
          "minutes_per_listing":          "Time to photograph, write description, package, and ship one item.",
          "your_hourly_rate":             "What you value your time at. Used to compute effective hourly wage in the insight.",
          "platform_fee_pct":             "Platform commission. eBay ~13%, Poshmark ~20% over $15, Mercari ~10%, Depop ~10%.",
          "payment_processing_pct":       "Payment processor fee on top of platform fee. ~2.9% + $0.30 typical.",
          "shipping_cost_per_item":       "Actual carrier cost to ship one item.",
          "shipping_paid_by_buyer":       "What the buyer pays for shipping. Gap between this and the carrier cost is absorbed by you.",
          "supplies_per_month":           "Boxes, mailers, tape, labels, thermal paper per month.",
          "mileage_per_month":            "Sourcing-trip mileage (thrift trips, estate sales, etc.) expressed as a dollar amount.",
          "tools_per_month":              "Cross-listing tool (Vendoo, List Perfectly, Crosslist) subscription per month."
        }'::jsonb),

        -- ─── cleaning-service ──────────────────────────────────────────────
        ('cleaning-service', '{
          "jobs_per_week":                "Jobs completed per week, not jobs booked. The calculator multiplies by 4.33 for monthly numbers.",
          "avg_hours_per_job":            "Billable hours per job — what the customer actually pays for.",
          "billable_rate":                "Your hourly billing rate to customers. Cleaning typically $35–75/hr depending on market.",
          "repeat_customer_pct":          "Percent of bookings from existing customers. Higher = lower marketing cost per job.",
          "supplies_cost_per_job":        "Cleaning chemicals, microfiber, vacuum bags per job.",
          "crew_size":                    "People per job (including you). Crew of 2 doubles labor cost but halves job duration.",
          "crew_wage_per_hour":           "What you pay each crew member per hour. Set 0 if solo and not paying yourself.",
          "travel_minutes_per_job":       "Drive + setup time between jobs. Billed to nobody but eats your day.",
          "vehicle_cost_per_month":       "Truck or van payment + fuel + maintenance per month.",
          "insurance_per_month":          "General liability + bonding monthly cost.",
          "scheduling_software_per_month":"Booking + dispatch software (Jobber, Housecall Pro, etc.) per month.",
          "marketing_per_month":          "Yard signs, Google ads, flyers, lead-gen services per month.",
          "card_processing_pct":          "Card payment fee. Most cleaning ops use Square or Stripe at ~2.9%.",
          "no_show_pct":                  "Percent of scheduled jobs that no-show or cancel last-minute without enough notice to rebook."
        }'::jsonb),

        -- ─── house-flipping ────────────────────────────────────────────────
        ('house-flipping', '{
          "flips_per_year":               "Number of flips completed per year. Most beginners do 1–3; experienced flippers run 4–8.",
          "purchase_price":               "What you pay to acquire the property. Use the actual offer, not the asking price.",
          "acquisition_closing_pct":      "Closing costs on the purchase, as a percent of purchase price. Typically 2–3%.",
          "inspection_due_diligence":     "Inspector, appraisal, title search, attorney fees during due diligence.",
          "down_payment_pct":             "Percent of the purchase paid in cash. Hard money typically 70/30 — you put 30% down. The rest is financed.",
          "loan_interest_rate_pct":       "Annual interest rate on your acquisition loan. Hard money typically 10–14%.",
          "loan_points_pct":              "Origination fee paid up-front, as a percent of the loan. Hard money typically 1–3 points.",
          "rehab_budget":                 "Pre-contingency rehab cost — the contractor estimate before surprises.",
          "rehab_contingency_pct":        "Buffer added to the rehab budget for surprises. First-time flippers should use 25–30%; experienced 10–15%.",
          "holding_time_months":          "Months you''ll own the property from close to sale. Longer = more interest + carry cost.",
          "holding_costs_per_month":      "Property tax + insurance + utilities + HOA per month while owning.",
          "after_repair_value":           "Conservative ARV — what comparable updated houses are selling for in the same neighborhood. Use the LOW end of comps.",
          "realtor_commission_pct":       "Realtor commission on sale. Industry standard 5–6% (split between agents).",
          "selling_closing_pct":          "Seller-side closing costs at sale. Title, transfer tax, attorney. Typically 1–2%.",
          "staging_marketing":            "Staging furniture rental + professional photos + open-house costs."
        }'::jsonb),

        -- ─── slime-business ────────────────────────────────────────────────
        ('slime-business', '{
          "drops_per_month":              "Number of distinct slime releases per month. Indie brands typically run 1–4 drops.",
          "units_per_drop":               "Slimes available in each release. New brands start 20–50; established 80–200.",
          "sell_through_rate":            "Percent of a drop that sells. Engaged followings hit 80–95% within hours.",
          "price_per_unit":               "Retail price for a single 8oz slime. Industry range $8–15 depending on brand and texture.",
          "avg_units_per_order":          "Average slimes per customer order. Slime buyers commonly buy in pairs — 1.5–2 is normal.",
          "material_cost_per_unit":       "Glue + activator + scent + colorant + charms + glitter, all combined per slime.",
          "container_cost_per_unit":      "Clear plastic jar (with lid) + label per slime.",
          "shipping_supplies_per_order":  "Box + bubble wrap + filler + branded touches per shipped order.",
          "temp_pack_cost_per_order":     "Average temp-pack cost spread across ALL orders. If 30% need a $1.50 pack, set this to ~$0.45.",
          "labor_minutes_per_unit":       "Mixing + activating + labeling + jarring + photographing time per slime.",
          "maker_hourly_rate":            "What you value your time at. Set 0 to ignore labor; set realistic to see what your effective wage actually is.",
          "avg_shipping_cost_per_order":  "Carrier (USPS, UPS) cost per shipped order, before any buyer-paid shipping.",
          "platform_mix_tiktok_pct":      "Percent of REVENUE through TikTok Shop. Remainder is assumed Etsy. Not percent of customers or units.",
          "tiktok_fee_pct":               "TikTok Shop combined fees — referral, payment, sometimes affiliate. ~8–10% all-in.",
          "etsy_fee_pct":                 "Etsy combined fees — transaction, payment, offsite ads if not opted out. ~13% all-in.",
          "ad_spend_per_month":           "Paid ads + creator gifting + affiliate budget per month."
        }'::jsonb)

        ) AS vp(slug, items)
        JOIN public.verticals v ON v.slug = vp.slug
    LOOP
        FOR pair IN
            SELECT * FROM jsonb_each_text(vsdef.items)
        LOOP
            UPDATE public.vertical_inputs
               SET help_text = pair.value
             WHERE vertical_id = vsdef.vertical_id
               AND input_key   = pair.key
               AND (help_text IS NULL OR help_text = '');
        END LOOP;
    END LOOP;
END $$;

COMMIT;

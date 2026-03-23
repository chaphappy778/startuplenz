/**
 * StartupLenz — Handmade / Craft E-commerce: Input Schema
 *
 * Each entry mirrors a row in the `vertical_inputs` table.
 * Fields:
 *   formulaKey   — machine key used by model.js and the DB formula_key column
 *   label        — human-readable slider label shown in the UI
 *   unit         — display unit appended to the value (USD, %, units, hrs, etc.)
 *   min / max    — hard slider bounds
 *   defaultValue — pre-filled starting value
 *   step         — slider increment
 *   liveData     — true when the default/current value can be overridden by a
 *                  cost_snapshot (i.e. has a data_source_mapping row)
 *   description  — one-sentence help text shown on hover / tap
 */

export const inputs = [
  // ─── DROP / INVENTORY ────────────────────────────────────────────────────
  {
    formulaKey:   'units_per_drop',
    label:        'Units per Drop',
    unit:         'units',
    min:          1,
    max:          500,
    defaultValue: 24,
    step:         1,
    liveData:     false,
    description:
      'How many individual product units you make and list in each product drop or restocking event.',
  },
  {
    formulaKey:   'drops_per_month',
    label:        'Drops per Month',
    unit:         'drops',
    min:          1,
    max:          12,
    defaultValue: 2,
    step:         1,
    liveData:     false,
    description:
      'Number of distinct restocking or new-product launches you run each calendar month.',
  },
  {
    formulaKey:   'sell_through_rate',
    label:        'Sell-Through Rate',
    unit:         '%',
    min:          10,
    max:          100,
    defaultValue: 75,
    step:         5,
    liveData:     false,
    description:
      'Percentage of listed units that actually sell within the month; the remainder stays as unsold inventory.',
  },

  // ─── PRICING ─────────────────────────────────────────────────────────────
  {
    formulaKey:   'price_per_unit',
    label:        'Price per Unit',
    unit:         'USD',
    min:          1,
    max:          500,
    defaultValue: 14,
    step:         0.5,
    liveData:     false,
    description:
      'The retail listing price a customer pays for one unit of your product, before any discounts.',
  },
  {
    formulaKey:   'avg_order_size',
    label:        'Average Order Size',
    unit:         'units',
    min:          1,
    max:          10,
    defaultValue: 2,
    step:         0.5,
    liveData:     false,
    description:
      'Average number of units per customer order; higher average order sizes improve your per-order shipping economics.',
  },

  // ─── MATERIAL & PRODUCTION COSTS ─────────────────────────────────────────
  {
    formulaKey:   'material_cost_per_unit',
    label:        'Material Cost per Unit',
    unit:         'USD',
    min:          0.10,
    max:          200,
    defaultValue: 2.50,
    step:         0.10,
    liveData:     true,   // can be updated by BLS/USITC cost snapshots
    description:
      'Total cost of all raw materials (resin, pigment, glitter, yarn, clay, wax, etc.) consumed to make one unit.',
  },
  {
    formulaKey:   'packaging_cost_per_unit',
    label:        'Packaging Cost per Unit',
    unit:         'USD',
    min:          0.05,
    max:          20,
    defaultValue: 0.75,
    step:         0.05,
    liveData:     true,   // can be updated by BLS PPI paper/packaging series
    description:
      'Cost of boxes, mailers, tissue paper, labels, and any branded inserts per shipped unit.',
  },
  {
    formulaKey:   'labor_minutes_per_unit',
    label:        'Labor per Unit',
    unit:         'mins',
    min:          1,
    max:          480,
    defaultValue: 20,
    step:         1,
    liveData:     false,
    description:
      'Minutes of active maker time to produce one unit; combined with your hourly rate this gives an optional labor cost component.',
  },
  {
    formulaKey:   'maker_hourly_rate',
    label:        'Maker Hourly Rate',
    unit:         'USD/hr',
    min:          0,
    max:          150,
    defaultValue: 15,
    step:         1,
    liveData:     false,
    description:
      'The hourly rate you value your own labor at; set to 0 to exclude labor from COGS and see pure product margin.',
  },

  // ─── SHIPPING ─────────────────────────────────────────────────────────────
  {
    formulaKey:   'avg_shipping_cost_per_order',
    label:        'Avg. Shipping Cost per Order',
    unit:         'USD',
    min:          0,
    max:          30,
    defaultValue: 4.50,
    step:         0.25,
    liveData:     true,   // driven by Shippo USPS First Class rate snapshots
    description:
      'Your actual carrier cost to ship one customer order (not the shipping price charged to the buyer).',
  },
  {
    formulaKey:   'free_shipping_threshold',
    label:        'Free Shipping Threshold',
    unit:         'USD',
    min:          0,
    max:          200,
    defaultValue: 35,
    step:         5,
    liveData:     false,
    description:
      'Order subtotal at which you absorb all shipping costs to compete with Etsy's free-shipping badge; set 0 to never offer free shipping.',
  },

  // ─── PLATFORM & ADVERTISING ───────────────────────────────────────────────
  {
    formulaKey:   'platform_mix_etsy_pct',
    label:        'Etsy Channel Mix',
    unit:         '%',
    min:          0,
    max:          100,
    defaultValue: 80,
    step:         5,
    liveData:     false,
    description:
      'Percentage of total revenue coming through Etsy; the remainder is assumed to go through TikTok Shop.',
  },
  {
    formulaKey:   'etsy_offsite_ads_opt_out',
    label:        'Etsy Offsite Ads Opted Out',
    unit:         'bool',
    min:          0,
    max:          1,
    defaultValue: 0,
    step:         1,
    liveData:     false,
    description:
      'Set to 1 if your shop has less than $10k annual revenue and you have opted out of Etsy Offsite Ads (eliminates the 15% offsite-ads fee).',
  },
  {
    formulaKey:   'ad_spend_pct_revenue',
    label:        'Ad Spend (% of Revenue)',
    unit:         '%',
    min:          0,
    max:          30,
    defaultValue: 5,
    step:         1,
    liveData:     false,
    description:
      'Combined Etsy Ads and/or TikTok Ads budget expressed as a percentage of gross revenue.',
  },
  {
    formulaKey:   'tiktok_affiliate_rate',
    label:        'TikTok Affiliate Rate',
    unit:         '%',
    min:          0,
    max:          30,
    defaultValue: 10,
    step:         1,
    liveData:     false,
    description:
      'Creator affiliate commission rate for TikTok Shop orders; typically negotiated per creator, industry average 10%.',
  },

  // ─── RETURNS & REFUNDS ────────────────────────────────────────────────────
  {
    formulaKey:   'return_rate',
    label:        'Return / Refund Rate',
    unit:         '%',
    min:          0,
    max:          20,
    defaultValue: 2,
    step:         0.5,
    liveData:     false,
    description:
      'Percentage of completed orders that result in a refund or return; affects net revenue and adds re-processing cost.',
  },
];

/**
 * Lookup helper: find an input definition by its formulaKey.
 * Used by model.js and tariff-sensitivity.js.
 */
export function getInput(formulaKey) {
  return inputs.find((i) => i.formulaKey === formulaKey) ?? null;
}

export default inputs;

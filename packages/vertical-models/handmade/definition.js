/**
 * StartupLenz — Handmade / Craft E-commerce Vertical
 * Vertical ID is resolved at runtime from the `verticals` table.
 * This file is the canonical source of truth for metadata consumed
 * by the seed migration, the formula engine, and the UI shell.
 */

export const VERTICAL_SLUG = 'handmade-craft';

export const definition = {
  slug: VERTICAL_SLUG,
  name: 'Handmade / Craft E-commerce',
  description:
    'Model the unit economics of a handmade product business selling on ' +
    'Etsy, TikTok Shop, or both. Accounts for material costs, packaging, ' +
    'platform fees, ad spend, and shipping — with live tariff and CPI updates ' +
    'flowing in from BLS and USITC.',

  /** Subscription tier required to unlock this vertical (1 = Free). */
  tier: 1,

  /** Broad cost categories this vertical touches. */
  costCategories: [
    'materials',      // raw inputs (resin, glue, pigment, yarn, clay…)
    'packaging',      // boxes, mailers, tissue, labels
    'shipping',       // carrier rates via Shippo
    'platformFees',   // Etsy listing + transaction + payment processing
    'advertising',    // Etsy Ads / TikTok Ads
    'labor',          // optional maker-hour valuation
  ],

  /** Platforms whose fee structures are modelled in benchmarks.js */
  platforms: [
    {
      slug: 'etsy',
      name: 'Etsy',
      feeComponents: [
        { key: 'listing',     label: 'Listing fee',              type: 'flat',    value: 0.20 },
        { key: 'transaction', label: 'Transaction fee',          type: 'percent', value: 0.065 },
        { key: 'payment',     label: 'Payment processing fee',   type: 'percent', value: 0.03,
          plus: 0.25 /* USD flat per transaction */ },
        { key: 'offsite_ads', label: 'Offsite Ads fee (opt-out eligible)', type: 'percent',
          value: 0.15, note: '12% after $10k annual revenue' },
      ],
    },
    {
      slug: 'tiktok_shop',
      name: 'TikTok Shop',
      feeComponents: [
        { key: 'referral',    label: 'Referral fee',             type: 'percent', value: 0.06 },
        { key: 'payment',     label: 'Payment processing',       type: 'percent', value: 0.03 },
        { key: 'affiliate',   label: 'Creator affiliate (avg)',  type: 'percent', value: 0.10,
          note: 'Variable; 5–20% depending on creator deal' },
      ],
    },
  ],

  /** data_source_mappings keys this vertical depends on */
  dataSources: [
    'bls_cpi_crafts_materials',
    'bls_ppi_paper_packaging',
    'usitc_hts_resin_import',
    'usitc_hts_yarn_import',
    'shippo_usps_first_class',
    'shippo_usps_priority',
    'etsy_transaction_fee_rate',
  ],

  /** UI display hints */
  display: {
    icon: '🧶',
    color: '#E8956D',
    sortOrder: 1,
    isActive: true,
    examples: ['slime', 'candles', 'jewelry', 'resin art', 'knitting', 'ceramics'],
  },
};

export default definition;

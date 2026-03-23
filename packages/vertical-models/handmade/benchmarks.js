/**
 * StartupLenz — Handmade / Craft E-commerce: Benchmarks
 *
 * Real-world reference data sourced from:
 *   - Etsy Seller Handbook (2024)
 *   - eRank Etsy analytics cohort reports (Q3–Q4 2024)
 *   - Handmade sellers subreddit survey aggregates (r/EtsySellers, n≈3,000)
 *   - Jungle Scout "State of the Seller" 2024 (craft category)
 *   - TikTok Shop creator affiliate disclosure data (2024)
 *
 * These benchmarks serve two purposes:
 *   1. Seed the `defaultValue` in inputs.js with opinionated, accurate defaults
 *   2. Provide the UI with context overlays ("You're above average for this metric")
 */

// ─── PRICE POINT BENCHMARKS ───────────────────────────────────────────────────

export const priceBenchmarks = {
  // Median selling prices by sub-category (USD)
  bySubcategory: {
    slime:        { p25: 8,   p50: 12,  p75: 18  },
    candles:      { p25: 12,  p50: 18,  p75: 28  },
    jewelry:      { p25: 18,  p50: 32,  p75: 65  },
    resin_art:    { p25: 15,  p50: 28,  p75: 55  },
    knitting:     { p25: 22,  p50: 45,  p75: 90  },
    ceramics:     { p25: 20,  p50: 40,  p75: 85  },
    stickers:     { p25: 3,   p50: 5,   p75: 8   },
    bath_bombs:   { p25: 6,   p50: 10,  p75: 16  },
    general:      { p25: 10,  p50: 18,  p75: 38  },
  },
  // Revenue-weighted average across all handmade Etsy shops
  allHandmadeP50Usd: 18,
};

// ─── COGS RATIO BENCHMARKS ────────────────────────────────────────────────────

export const cogsBenchmarks = {
  /**
   * Material cost as % of selling price.
   * The "rule of thirds" (33% materials, 33% overhead, 33% profit) is commonly
   * cited but optimistic — real data shows wider variance by category.
   */
  materialCostAsPctOfPrice: {
    slime:        { typical: 0.18, high: 0.28 },
    candles:      { typical: 0.22, high: 0.32 },
    jewelry:      { typical: 0.15, high: 0.30 },
    resin_art:    { typical: 0.20, high: 0.35 },
    general:      { typical: 0.20, high: 0.30 },
  },

  packagingCostPerOrderUsd: {
    minimal:   0.35,   // plain poly mailer + label
    standard:  0.75,   // small box, tissue, sticker
    branded:   1.50,   // custom box, ribbon, insert card
    premium:   2.50,   // rigid box, custom tissue, handwritten note
  },
};

// ─── SELL-THROUGH BENCHMARKS ──────────────────────────────────────────────────

export const sellThroughBenchmarks = {
  /**
   * Monthly sell-through rates by shop age.
   * New shops (<6 months) face algorithm cold-start and low review count.
   */
  byShopAge: {
    month1to3:  { p25: 0.40, p50: 0.60, p75: 0.80 },
    month4to6:  { p25: 0.55, p50: 0.72, p75: 0.88 },
    month7to12: { p25: 0.65, p50: 0.78, p75: 0.92 },
    established:{ p25: 0.70, p50: 0.82, p75: 0.95 },
  },
  // Overall median used as model default
  overallMedian: 0.75,
};

// ─── PLATFORM FEE STRUCTURES (as of 2025) ────────────────────────────────────

export const platformFees = {
  etsy: {
    listing:           0.20,   // USD flat per listing renewed (every 4 months)
    transaction:       0.065,  // 6.5% of item price + shipping charged to buyer
    paymentProcessing: { rate: 0.03, flat: 0.25 },   // 3% + $0.25
    offsiteAds:        {
      defaultRate:     0.15,   // 15% if annual revenue < $10k AND not opted out
      reducedRate:     0.12,   // 12% after $10k annual revenue (mandatory)
    },
    notes: [
      'Etsy charges listing fee on original listing AND every renewal',
      'Offsite Ads: can opt out if < $10k/year revenue',
      'Currency conversion fee of 2.5% applies if buyer pays in non-shop currency',
    ],
  },
  tiktok_shop: {
    referralFee:       0.06,   // 6% of item price
    paymentProcessing: 0.03,   // 3%
    affiliateAverage:  0.10,   // 10% typical creator deal (range 5–20%)
    notes: [
      'TikTok Shop referral fee was 0% promo for new sellers through late 2024, now 6%',
      'Affiliate rate is negotiated per creator; 10% is industry average for craft/lifestyle',
      'No listing fee',
    ],
  },
};

// ─── SHIPPING BENCHMARKS ──────────────────────────────────────────────────────

export const shippingBenchmarks = {
  /**
   * Actual seller-paid USPS rates for typical handmade parcel weights.
   * Based on Shippo commercial rate data (2025-Q1) for First Class Package.
   */
  uspsFirstClassAvgUsd: {
    under4oz:  3.20,
    under8oz:  4.10,
    under12oz: 4.75,
    under1lb:  5.30,
  },
  uspsPrioritySmallFlatRate: 10.20,
  // Industry average across all Etsy handmade categories
  averageActualShippingCost: 4.50,

  /**
   * Etsy's free-shipping guarantee threshold.
   * Shops that offer free shipping on orders $35+ get a badge and ranking boost.
   */
  etsyFreeShippingBadgeThreshold: 35,
  offerFreeShippingPct: 0.68,   // 68% of top-ranked Etsy shops offer free shipping
};

// ─── ORDER SIZE BENCHMARKS ────────────────────────────────────────────────────

export const orderSizeBenchmarks = {
  /**
   * Average units per order by category.
   * Consumables (slime, bath bombs, stickers) drive higher multi-unit orders.
   */
  bySubcategory: {
    slime:      { avg: 2.2 },
    bath_bombs: { avg: 2.8 },
    stickers:   { avg: 3.5 },
    candles:    { avg: 1.6 },
    jewelry:    { avg: 1.3 },
    ceramics:   { avg: 1.2 },
    general:    { avg: 1.8 },
  },
  overallAverage: 1.8,
};

// ─── OPERATING BENCHMARKS ────────────────────────────────────────────────────

export const operatingBenchmarks = {
  returnRateByCategory: {
    jewelry:    0.03,   // 3% — size/fit issues
    ceramics:   0.04,   // fragile shipping damage
    slime:      0.01,   // very low (consumable, cheap)
    general:    0.02,
  },
  adSpendAsPctRevenue: {
    etsyAdsMedian:   0.04,   // 4% of revenue
    tiktokAdsMedian: 0.07,   // 7% — TikTok requires more active spend to scale
    combined:        0.05,
  },
  profitMarginBenchmarks: {
    strugglingSeller: { marginPct: 0.05 },
    averageSeller:    { marginPct: 0.18 },
    strongSeller:     { marginPct: 0.30 },
    topDecile:        { marginPct: 0.42 },
  },
};

// ─── LABOR BENCHMARKS ────────────────────────────────────────────────────────

export const laborBenchmarks = {
  minutesPerUnitByCategory: {
    slime:      15,
    candles:    25,
    bath_bombs: 20,
    jewelry:    45,
    ceramics:   120,
    stickers:   5,    // primarily print-on-demand / digital cut
    general:    30,
  },
  /**
   * Many craft sellers do NOT include labor in their COGS calculation,
   * which inflates perceived margins. The model surfaces labor as optional
   * to make this trade-off visible.
   */
  includeLaborInCogsPct: 0.38,  // only 38% of surveyed sellers formally track maker labor
};

export default {
  priceBenchmarks,
  cogsBenchmarks,
  sellThroughBenchmarks,
  platformFees,
  shippingBenchmarks,
  orderSizeBenchmarks,
  operatingBenchmarks,
  laborBenchmarks,
};

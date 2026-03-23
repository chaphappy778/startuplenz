/**
 * StartupLenz — Handmade / Craft E-commerce: Formula Engine
 *
 * Usage:
 *   import { runModel } from './model.js';
 *   const output = runModel(userInputs, costSnapshots);
 *
 * @param {Object} inputs         — key/value map of formulaKey → numeric value
 *                                  (all values from the sliders; see inputs.js)
 * @param {Object} snapshots      — key/value map of formulaKey → snapshot value
 *                                  populated from the `current_costs` view rows
 *                                  for this vertical's data_source_mappings.
 *                                  Overrides the user's manual input for live-data
 *                                  fields when present.
 * @returns {ModelOutput}
 */

// ─── PLATFORM FEE CALCULATORS ────────────────────────────────────────────────

/**
 * Etsy fee breakdown for a single order.
 * @param {number} orderRevenue   — gross order value (price * units in order)
 * @param {number} unitsInOrder
 * @param {boolean} offsiteAdsOptOut
 * @returns {{ listing, transaction, payment, offsiteAds, total }}
 */
function calcEtsyFees(orderRevenue, unitsInOrder, offsiteAdsOptOut) {
  const listing     = unitsInOrder * 0.20;          // $0.20 per listing renewed
  const transaction = orderRevenue * 0.065;
  const payment     = orderRevenue * 0.03 + 0.25;
  const offsiteAds  = offsiteAdsOptOut ? 0 : orderRevenue * 0.15;
  const total       = listing + transaction + payment + offsiteAds;
  return { listing, transaction, payment, offsiteAds, total };
}

/**
 * TikTok Shop fee breakdown for a single order.
 * @param {number} orderRevenue
 * @param {number} affiliateRate  — decimal, e.g. 0.10
 * @returns {{ referral, payment, affiliate, total }}
 */
function calcTikTokFees(orderRevenue, affiliateRate) {
  const referral  = orderRevenue * 0.06;
  const payment   = orderRevenue * 0.03;
  const affiliate = orderRevenue * affiliateRate;
  const total     = referral + payment + affiliate;
  return { referral, payment, affiliate, total };
}

// ─── GROWTH TRAJECTORY ────────────────────────────────────────────────────────

/**
 * Projects monthly net profit across 12 months using three growth phases.
 * Phases are defined by sell-through multipliers informed by real Etsy cohort
 * data — new shops typically see slow early traction, acceleration at month 4,
 * and plateau/steady-state around month 9.
 *
 * @param {number} baseMonthlyNetProfit — month-1 net profit from the base model
 * @param {Object} inputs               — full resolved inputs
 * @returns {Array<{ month, multiplier, projectedNetProfit, phase }>}
 */
function buildGrowthTrajectory(baseMonthlyNetProfit, inputs) {
  // Phase multipliers on SELL-THROUGH (not revenue directly):
  // Launch (1–3): 60–80% of steady-state sell-through
  // Traction (4–8): 80–100%, reviews accumulate, algorithm picks up shop
  // Scale (9–12): 100–130%, repeat buyers + off-site traffic
  const phaseMultipliers = [
    // Month: [sellThroughMult, dropsMultiplier]
    { month: 1,  sellThrough: 0.60, drops: 1.0,  phase: 'launch'   },
    { month: 2,  sellThrough: 0.68, drops: 1.0,  phase: 'launch'   },
    { month: 3,  sellThrough: 0.76, drops: 1.0,  phase: 'launch'   },
    { month: 4,  sellThrough: 0.82, drops: 1.0,  phase: 'traction' },
    { month: 5,  sellThrough: 0.88, drops: 1.1,  phase: 'traction' },
    { month: 6,  sellThrough: 0.91, drops: 1.1,  phase: 'traction' },
    { month: 7,  sellThrough: 0.94, drops: 1.2,  phase: 'traction' },
    { month: 8,  sellThrough: 0.97, drops: 1.2,  phase: 'traction' },
    { month: 9,  sellThrough: 1.00, drops: 1.3,  phase: 'scale'    },
    { month: 10, sellThrough: 1.05, drops: 1.3,  phase: 'scale'    },
    { month: 11, sellThrough: 1.10, drops: 1.4,  phase: 'scale'    },
    { month: 12, sellThrough: 1.15, drops: 1.5,  phase: 'scale'    },
  ];

  // Baseline sell-through is user's input (already in 0–1 decimal form inside model)
  const baseSellThrough = inputs._sellThroughDecimal;
  const baseDrops       = inputs.drops_per_month;

  return phaseMultipliers.map(({ month, sellThrough, drops, phase }) => {
    const adjustedSellThrough = Math.min(baseSellThrough * (sellThrough / 1.0), 1.0);
    const adjustedDrops       = baseDrops * drops;
    const adjustedInputs      = {
      ...inputs,
      _sellThroughDecimal: adjustedSellThrough,
      drops_per_month:     adjustedDrops,
    };
    const { netProfit } = _calcCore(adjustedInputs);
    return {
      month,
      phase,
      sellThroughMultiplier: round2(sellThrough),
      dropsMultiplier:       round2(drops),
      projectedNetProfit:    round2(netProfit),
    };
  });
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────

const round2 = (n) => Math.round(n * 100) / 100;

/**
 * Merge live cost snapshots over user inputs for live-data fields.
 * Snapshot values win over manual slider values — the UI shows a
 * "live data applied" badge when this happens.
 */
function resolveInputs(rawInputs, snapshots = {}) {
  return {
    ...rawInputs,
    material_cost_per_unit:       snapshots.material_cost_per_unit        ?? rawInputs.material_cost_per_unit,
    packaging_cost_per_unit:      snapshots.packaging_cost_per_unit       ?? rawInputs.packaging_cost_per_unit,
    avg_shipping_cost_per_order:  snapshots.avg_shipping_cost_per_order   ?? rawInputs.avg_shipping_cost_per_order,
    // Internal convenience: sell-through as 0–1 decimal
    _sellThroughDecimal: (rawInputs.sell_through_rate ?? 75) / 100,
  };
}

// ─── CORE CALCULATION (extracted so trajectory can call it too) ───────────────

function _calcCore(inp) {
  const sellThrough     = inp._sellThroughDecimal ?? (inp.sell_through_rate / 100);
  const unitsListed     = inp.units_per_drop * inp.drops_per_month;
  const unitsSold       = unitsListed * sellThrough;
  const ordersPerMonth  = unitsSold / inp.avg_order_size;
  const grossRevenue    = unitsSold * inp.price_per_unit;

  // Returns & refunds
  const returnRate      = (inp.return_rate ?? 2) / 100;
  const refundDeduction = grossRevenue * returnRate;
  const netRevenue      = grossRevenue - refundDeduction;

  // COGS
  const materialCost    = unitsSold * inp.material_cost_per_unit;
  const packagingCost   = ordersPerMonth * inp.packaging_cost_per_unit; // per order (not per unit)
  const laborCostPerUnit= (inp.labor_minutes_per_unit / 60) * inp.maker_hourly_rate;
  const laborCost       = unitsSold * laborCostPerUnit;

  // Shipping
  const etsyMix         = (inp.platform_mix_etsy_pct ?? 80) / 100;
  const tiktokMix       = 1 - etsyMix;
  const freeShipThreshold = inp.free_shipping_threshold ?? 35;
  const avgOrderValue   = inp.price_per_unit * inp.avg_order_size;
  // If avg order exceeds threshold, we absorb shipping cost
  const shippingAbsorbed = avgOrderValue >= freeShipThreshold
    ? inp.avg_shipping_cost_per_order
    : inp.avg_shipping_cost_per_order * 0.4; // partial absorption below threshold
  const totalShippingCost = ordersPerMonth * shippingAbsorbed;

  // Platform fees (blended across channel mix)
  const etsyOptOut      = (inp.etsy_offsite_ads_opt_out ?? 0) === 1;
  const affiliateRate   = (inp.tiktok_affiliate_rate ?? 10) / 100;

  let etsyFeeTotal = 0;
  let tiktokFeeTotal = 0;
  let etsyFeeBreakdown = {};
  let tiktokFeeBreakdown = {};

  if (etsyMix > 0 && ordersPerMonth > 0) {
    const etsyOrders     = ordersPerMonth * etsyMix;
    const etsyOrderValue = (netRevenue * etsyMix) / Math.max(etsyOrders, 1);
    const feesPerOrder   = calcEtsyFees(etsyOrderValue, inp.avg_order_size, etsyOptOut);
    etsyFeeTotal         = feesPerOrder.total * etsyOrders;
    etsyFeeBreakdown     = {
      listing:    round2(feesPerOrder.listing    * etsyOrders),
      transaction: round2(feesPerOrder.transaction * etsyOrders),
      payment:    round2(feesPerOrder.payment    * etsyOrders),
      offsiteAds: round2(feesPerOrder.offsiteAds * etsyOrders),
    };
  }

  if (tiktokMix > 0 && ordersPerMonth > 0) {
    const tiktokOrders    = ordersPerMonth * tiktokMix;
    const tiktokOrderVal  = (netRevenue * tiktokMix) / Math.max(tiktokOrders, 1);
    const feesPerOrder    = calcTikTokFees(tiktokOrderVal, affiliateRate);
    tiktokFeeTotal        = feesPerOrder.total * tiktokOrders;
    tiktokFeeBreakdown    = {
      referral:  round2(feesPerOrder.referral  * tiktokOrders),
      payment:   round2(feesPerOrder.payment   * tiktokOrders),
      affiliate: round2(feesPerOrder.affiliate * tiktokOrders),
    };
  }

  const totalPlatformFees = etsyFeeTotal + tiktokFeeTotal;

  // Advertising
  const adSpend = grossRevenue * ((inp.ad_spend_pct_revenue ?? 5) / 100);

  // Final aggregation
  const totalCOGS   = materialCost + packagingCost + laborCost;
  const grossProfit = netRevenue - totalCOGS;
  const netProfit   = grossProfit - totalPlatformFees - totalShippingCost - adSpend;
  const profitMargin = netRevenue > 0 ? (netProfit / netRevenue) * 100 : 0;

  return {
    grossRevenue,
    netRevenue,
    refundDeduction,
    materialCost,
    packagingCost,
    laborCost,
    totalCOGS,
    grossProfit,
    etsyFeeBreakdown,
    tiktokFeeBreakdown,
    totalPlatformFees,
    totalShippingCost,
    adSpend,
    netProfit,
    profitMargin,
    ordersPerMonth,
    unitsSold,
    unitsListed,
  };
}

// ─── PUBLIC ENTRY POINT ───────────────────────────────────────────────────────

/**
 * @typedef {Object} ModelOutput
 * @property {string}   vertical          — always "handmade-craft"
 * @property {string}   generatedAt       — ISO timestamp
 * @property {Object}   inputs            — resolved inputs used (after snapshot merge)
 * @property {Object}   monthly           — single-month base model numbers
 * @property {Object}   monthly.revenue   — gross/net/refund breakdown
 * @property {Object}   monthly.cogs      — material/packaging/labor/total
 * @property {Object}   monthly.fees      — etsy/tiktok breakdown + total
 * @property {Object}   monthly.shipping  — total shipping cost absorbed
 * @property {Object}   monthly.advertising
 * @property {Object}   monthly.profit    — netProfit, profitMargin
 * @property {Object}   monthly.volume    — unitsListed, unitsSold, ordersPerMonth
 * @property {Array}    trajectory        — 12-month growth projection
 * @property {Object}   annualized        — simple 12× of base month (not trajectory)
 * @property {Object}   liveDataApplied   — which fields were overridden by snapshots
 */
export function runModel(rawInputs, snapshots = {}) {
  const inp = resolveInputs(rawInputs, snapshots);

  const core = _calcCore(inp);

  // Detect which inputs were overridden by live snapshots
  const liveDataApplied = {
    material_cost_per_unit:      snapshots.material_cost_per_unit      !== undefined,
    packaging_cost_per_unit:     snapshots.packaging_cost_per_unit     !== undefined,
    avg_shipping_cost_per_order: snapshots.avg_shipping_cost_per_order !== undefined,
  };

  // Expose resolved inputs to trajectory builder
  inp._sellThroughDecimal = inp._sellThroughDecimal ?? (inp.sell_through_rate / 100);
  const trajectory = buildGrowthTrajectory(core.netProfit, inp);

  return {
    vertical: 'handmade-craft',
    generatedAt: new Date().toISOString(),

    inputs: {
      units_per_drop:               inp.units_per_drop,
      drops_per_month:              inp.drops_per_month,
      sell_through_rate:            inp.sell_through_rate,
      price_per_unit:               inp.price_per_unit,
      avg_order_size:               inp.avg_order_size,
      material_cost_per_unit:       inp.material_cost_per_unit,
      packaging_cost_per_unit:      inp.packaging_cost_per_unit,
      labor_minutes_per_unit:       inp.labor_minutes_per_unit,
      maker_hourly_rate:            inp.maker_hourly_rate,
      avg_shipping_cost_per_order:  inp.avg_shipping_cost_per_order,
      free_shipping_threshold:      inp.free_shipping_threshold,
      platform_mix_etsy_pct:        inp.platform_mix_etsy_pct,
      etsy_offsite_ads_opt_out:     inp.etsy_offsite_ads_opt_out,
      ad_spend_pct_revenue:         inp.ad_spend_pct_revenue,
      tiktok_affiliate_rate:        inp.tiktok_affiliate_rate,
      return_rate:                  inp.return_rate,
    },

    monthly: {
      revenue: {
        gross:           round2(core.grossRevenue),
        refundDeduction: round2(core.refundDeduction),
        net:             round2(core.netRevenue),
      },
      cogs: {
        materials:  round2(core.materialCost),
        packaging:  round2(core.packagingCost),
        labor:      round2(core.laborCost),
        total:      round2(core.totalCOGS),
      },
      fees: {
        etsy:    core.etsyFeeBreakdown,
        tiktok:  core.tiktokFeeBreakdown,
        total:   round2(core.totalPlatformFees),
      },
      shipping: {
        total: round2(core.totalShippingCost),
      },
      advertising: {
        total: round2(core.adSpend),
      },
      profit: {
        gross:        round2(core.grossProfit),
        net:          round2(core.netProfit),
        marginPct:    round2(core.profitMargin),
      },
      volume: {
        unitsListed:   round2(core.unitsListed),
        unitsSold:     round2(core.unitsSold),
        ordersPerMonth: round2(core.ordersPerMonth),
      },
    },

    trajectory,

    annualized: {
      grossRevenue:       round2(core.grossRevenue * 12),
      netRevenue:         round2(core.netRevenue * 12),
      totalCOGS:          round2(core.totalCOGS * 12),
      totalPlatformFees:  round2(core.totalPlatformFees * 12),
      totalShippingCost:  round2(core.totalShippingCost * 12),
      adSpend:            round2(core.adSpend * 12),
      netProfit:          round2(core.netProfit * 12),
    },

    liveDataApplied,
  };
}

export default runModel;

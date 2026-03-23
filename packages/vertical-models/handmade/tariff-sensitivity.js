/**
 * StartupLenz — Handmade / Craft E-commerce: Tariff & Cost Sensitivity
 *
 * Maps this vertical's key material inputs to their:
 *   - HTS (Harmonized Tariff Schedule) codes — for USITC import duty monitoring
 *   - BLS series IDs — for domestic Producer Price Index (PPI) / CPI monitoring
 *   - formulaKey — which input in inputs.js this affects
 *   - passthrough — estimated fraction of a cost change that flows through to
 *                   the material_cost_per_unit input (1.0 = full pass-through)
 *
 * The alert engine (services/sync) reads these mappings and creates
 * `alert_events` rows when thresholds are crossed, then fans out to
 * `user_alert_queue`. The `downstream_margin_impact` function here lets
 * the alert notification tell a user "a 10% resin tariff increase would
 * reduce your net margin by ~X%".
 *
 * USITC HTS reference: https://hts.usitc.gov
 * BLS PPI series finder: https://www.bls.gov/ppi/
 * BLS CPI series finder: https://www.bls.gov/cpi/
 */

// ─── MATERIAL → HTS MAPPINGS ─────────────────────────────────────────────────

export const htsCodeMappings = [
  {
    materialName:    'Craft Resin (Epoxy)',
    htsCode:         '3907.30.0000',
    htsDescription:  'Epoxy resins, in primary forms',
    tradePartners:   ['CN', 'DE', 'TW'],   // top import origins
    formulaKey:      'material_cost_per_unit',
    passThroughRate: 0.45,   // resin is ~45% of material cost for resin art
    alertThresholdPct: 5,
    notes:           'China tariff exposure high; 301 tariffs apply. Monitor for Section 301 list changes.',
  },
  {
    materialName:    'Glitter & Cosmetic Mica',
    htsCode:         '3212.90.0000',
    htsDescription:  'Pigments (including metallic powders/flakes) dispersed in non-aqueous media',
    tradePartners:   ['CN', 'IN'],
    formulaKey:      'material_cost_per_unit',
    passThroughRate: 0.15,
    alertThresholdPct: 8,
    notes:           'Often imported as cosmetic colorants; mica sourcing scrutiny for supply chain compliance.',
  },
  {
    materialName:    'Polyester Yarn / Acrylic Fiber',
    htsCode:         '5509.21.0060',
    htsDescription:  'Yarn of polyester staple fibers, not put up for retail sale',
    tradePartners:   ['CN', 'IN', 'BD'],
    formulaKey:      'material_cost_per_unit',
    passThroughRate: 0.60,   // yarn is primary material cost for knitting
    alertThresholdPct: 5,
    notes:           'Key input for knitting, crochet, and fiber arts sellers.',
  },
  {
    materialName:    'Natural Soy Wax',
    htsCode:         '1516.20.9190',
    htsDescription:  'Vegetable fats and oils, hydrogenated — other',
    tradePartners:   ['US', 'BR'],   // largely domestic for US sellers
    formulaKey:      'material_cost_per_unit',
    passThroughRate: 0.50,
    alertThresholdPct: 7,
    notes:           'Soy wax is primarily US-sourced; monitor agricultural commodity prices, not tariffs.',
  },
  {
    materialName:    'Fragrance Oils',
    htsCode:         '3302.10.2000',
    htsDescription:  'Mixtures of odoriferous substances used as raw materials in industry',
    tradePartners:   ['FR', 'CN', 'US'],
    formulaKey:      'material_cost_per_unit',
    passThroughRate: 0.25,
    alertThresholdPct: 6,
    notes:           'Used in candles and bath products; French fragrance houses have premium pricing.',
  },
  {
    materialName:    'Polymer Clay',
    htsCode:         '3901.90.1000',
    htsDescription:  'Polymers of ethylene, in primary forms — other',
    tradePartners:   ['DE', 'US', 'JP'],
    formulaKey:      'material_cost_per_unit',
    passThroughRate: 0.70,   // clay is the primary material for ceramics/clay
    alertThresholdPct: 6,
    notes:           'FIMO (DE), Sculpey (US) — track manufacturer price changes, not just tariffs.',
  },
  {
    materialName:    'Kraft Paper / Cardboard Packaging',
    htsCode:         '4819.20.0040',
    htsDescription:  'Folding cartons, boxes and cases, of non-corrugated paper or paperboard',
    tradePartners:   ['CN', 'US', 'CA'],
    formulaKey:      'packaging_cost_per_unit',
    passThroughRate: 0.80,
    alertThresholdPct: 5,
    notes:           'Core packaging input; BLS PPI for paper/paperboard (WPU0911) is the better signal.',
  },
  {
    materialName:    'Poly Mailers / Bubble Mailers',
    htsCode:         '3923.21.0085',
    htsDescription:  'Sacks and bags of polymers of ethylene',
    tradePartners:   ['CN', 'US'],
    formulaKey:      'packaging_cost_per_unit',
    passThroughRate: 0.85,
    alertThresholdPct: 5,
    notes:           'High China import exposure; 301 tariffs already baked in to current pricing baseline.',
  },
];

// ─── BLS SERIES MAPPINGS ──────────────────────────────────────────────────────

export const blsSeriesMappings = [
  {
    seriesId:        'PCU325510325510',
    seriesName:      'PPI — Industrial Chemicals, Plastics & Resins',
    measureType:     'ppi',
    formulaKey:      'material_cost_per_unit',
    passThroughRate: 0.30,
    alertThresholdPct: 3,
    notes:           'Broad upstream signal for resin-based craft materials.',
  },
  {
    seriesId:        'WPU0911',
    seriesName:      'PPI — Paper and Paperboard',
    measureType:     'ppi',
    formulaKey:      'packaging_cost_per_unit',
    passThroughRate: 0.70,
    alertThresholdPct: 4,
    notes:           'Direct driver of kraft and cardboard packaging costs.',
  },
  {
    seriesId:        'WPU0915',
    seriesName:      'PPI — Paperboard Containers and Boxes',
    measureType:     'ppi',
    formulaKey:      'packaging_cost_per_unit',
    passThroughRate: 0.80,
    alertThresholdPct: 4,
    notes:           'More specific to finished packaging products than WPU0911.',
  },
  {
    seriesId:        'CUSR0000SAGC',
    seriesName:      'CPI — Apparel (proxy for textile/yarn retail pricing)',
    measureType:     'cpi',
    formulaKey:      'material_cost_per_unit',
    passThroughRate: 0.20,
    alertThresholdPct: 5,
    notes:           'Loose proxy for yarn/fiber cost trends visible at retail.',
  },
  {
    seriesId:        'PCU484122484122',
    seriesName:      'PPI — Couriers and Messengers',
    measureType:     'ppi',
    formulaKey:      'avg_shipping_cost_per_order',
    passThroughRate: 0.90,
    alertThresholdPct: 3,
    notes:           'Leading indicator for USPS/UPS/FedEx rate changes; Shippo live rates are primary signal.',
  },
];

// ─── DOWNSTREAM MARGIN IMPACT CALCULATOR ─────────────────────────────────────

/**
 * Estimate how a cost change in a monitored input affects net profit margin.
 *
 * Called by the alert notification composer to personalize the alert message:
 * "Epoxy resin import duties rose 12%. Based on your saved plans, this
 *  reduces your estimated net margin by ~2.1 percentage points."
 *
 * @param {Object} params
 * @param {string} params.formulaKey        — which input is affected
 * @param {number} params.costChangePct     — e.g. 0.10 for a 10% increase
 * @param {number} params.passThroughRate   — from the mapping above (0–1)
 * @param {Object} params.savedPlanSnapshot — the user's slider values + last model output
 * @returns {{ marginImpactPpts: number, revenueImpactPct: number, message: string }}
 */
export function calcDownstreamMarginImpact({
  formulaKey,
  costChangePct,
  passThroughRate,
  savedPlanSnapshot,
}) {
  const { inputs: planInputs, monthly: planOutput } = savedPlanSnapshot ?? {};

  if (!planInputs || !planOutput) {
    return { marginImpactPpts: null, revenueImpactPct: null, message: 'Insufficient plan data' };
  }

  const currentInputValue   = planInputs[formulaKey] ?? 0;
  const absoluteCostIncrease = currentInputValue * costChangePct * passThroughRate;

  // Determine how many units this affects per month
  const unitsSold = planOutput.volume?.unitsSold ?? 0;
  const ordersPerMonth = planOutput.volume?.ordersPerMonth ?? 0;

  let additionalMonthlyBurden = 0;

  if (formulaKey === 'material_cost_per_unit') {
    additionalMonthlyBurden = absoluteCostIncrease * unitsSold;
  } else if (formulaKey === 'packaging_cost_per_unit') {
    additionalMonthlyBurden = absoluteCostIncrease * ordersPerMonth;
  } else if (formulaKey === 'avg_shipping_cost_per_order') {
    additionalMonthlyBurden = absoluteCostIncrease * ordersPerMonth;
  }

  const baseNetRevenue     = planOutput.revenue?.net ?? 1;
  const baseNetProfit      = planOutput.profit?.net ?? 0;
  const baseMarginPct      = planOutput.profit?.marginPct ?? 0;

  const newNetProfit       = baseNetProfit - additionalMonthlyBurden;
  const newMarginPct       = baseNetRevenue > 0 ? (newNetProfit / baseNetRevenue) * 100 : 0;
  const marginImpactPpts   = +(newMarginPct - baseMarginPct).toFixed(2);
  const revenueImpactPct   = baseNetRevenue > 0
    ? +((additionalMonthlyBurden / baseNetRevenue) * 100).toFixed(2)
    : 0;

  return {
    marginImpactPpts,
    revenueImpactPct,
    additionalMonthlyCost: +additionalMonthlyBurden.toFixed(2),
    message: `A ${(costChangePct * 100).toFixed(1)}% change in ${formulaKey} reduces estimated monthly net profit by $${additionalMonthlyBurden.toFixed(2)} (${Math.abs(marginImpactPpts).toFixed(1)} margin points).`,
  };
}

// ─── CONVENIENCE LOOKUP ───────────────────────────────────────────────────────

/**
 * Get all sensitivity mappings that affect a given formulaKey.
 * Used by the alert engine to find which cost changes are relevant
 * to a specific vertical input.
 */
export function getMappingsForInput(formulaKey) {
  return [
    ...htsCodeMappings.filter((m) => m.formulaKey === formulaKey),
    ...blsSeriesMappings.filter((m) => m.formulaKey === formulaKey),
  ];
}

export default {
  htsCodeMappings,
  blsSeriesMappings,
  calcDownstreamMarginImpact,
  getMappingsForInput,
};

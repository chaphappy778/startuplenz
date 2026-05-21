/**
 * StartupLenz — Print-on-Demand: Formula Engine
 *
 * POD model: a fulfillment provider (Printful, Printify, etc.) prints,
 * packs, and ships each order. The seller's cost per unit is the POD base
 * cost. Margin = (retail price − POD cost − fees − ad CAC).
 */

const round = (n) => Math.round(n);

function buildInsight(margin, monthlyRev, roas) {
  if (monthlyRev <= 0) return "No orders yet — set orders/month, AOV, or ramp ads.";
  if (roas !== null && roas < 1.5) return "Ads aren't paying back. ROAS under 1.5× usually means the offer or creative needs work before scaling spend.";
  if (margin >= 0.25) return "Strong unit economics. Reinvest into ad spend or new designs to expand.";
  if (margin >= 0.12) return "Healthy POD margins. Watch for AOV creep and price-tested upsells to push higher.";
  if (margin >= 0)    return "Breakeven. Tighten POD provider pricing tier or raise retail price by $2–3.";
  return "Losing money. Most common cause: ad spend exceeds gross margin. Pause ads, test organic.";
}

function runModel(v, _snap = {}) {
  const orders     = +v.orders_per_month             || 0;
  const aupo       = +v.avg_units_per_order          || 1;
  const retail     = +v.avg_retail_price_per_unit    || 0;
  const podBase    = +v.pod_base_cost_per_unit       || 0;
  const podShip    = +v.pod_shipping_per_order       || 0;
  const custShip   = +v.customer_shipping_paid       || 0;
  const returnPct  = +v.return_rate_pct              || 0;
  const sfFeePct   = +v.storefront_platform_fee_pct  || 0;
  const sfMonthly  = +v.storefront_monthly_fee       || 0;
  const designMo   = +v.design_cost_per_month        || 0;
  const adSpend    = +v.ad_spend_per_month           || 0;
  const adAttrPct  = +v.ad_attributed_revenue_pct    || 0;
  const tools      = +v.tools_software_per_month     || 0;
  const founder    = +v.founder_draw_per_month       || 0;

  const units = orders * aupo;
  const grossSales = units * retail + orders * custShip;
  const refundLoss = grossSales * (returnPct / 100);
  const netRevenue = grossSales - refundLoss;

  const podCogs    = units * podBase + orders * podShip;
  const platformFees = netRevenue * (sfFeePct / 100);
  const fixed = sfMonthly + designMo + tools + founder + adSpend;

  const netProfit  = netRevenue - podCogs - platformFees - fixed;
  const margin     = netRevenue > 0 ? netProfit / netRevenue : 0;

  // ROAS for the ad spend portion
  const adRevenue  = netRevenue * (adAttrPct / 100);
  const roas       = adSpend > 0 ? adRevenue / adSpend : null;

  // Growth — orders compound with ad budget + organic
  const project = (ordersMult) => {
    const o = orders * ordersMult;
    const u = o * aupo;
    const gross = u * retail + o * custShip;
    const refund = gross * (returnPct / 100);
    const rev = gross - refund;
    const cogs = u * podBase + o * podShip;
    const fees = rev * (sfFeePct / 100);
    return round(rev - cogs - fees - fixed);
  };

  return {
    grossRevenue:        round(netRevenue),
    costOfGoods:         round(podCogs),
    platformAndShipping: round(platformFees),
    netProfit:           round(netProfit),
    profitMargin:        margin,
    ordersPerMonth:      Math.round(orders),
    growth: {
      launch:   { months: "1–3",  netProfit: project(0.5), label: "First designs validated, ad creative iterated" },
      traction: { months: "4–8",  netProfit: project(1.0), label: "Repeat buyers + winning designs scale" },
      scale:    { months: "9–12", netProfit: project(1.6), label: "Catalog depth + email list compound" },
    },
    costBreakdown: [
      { label: "POD product cost", value: round(units * podBase) },
      { label: "POD shipping",     value: round(orders * podShip) },
      { label: "Refunds",          value: round(refundLoss) },
      { label: "Platform fees",    value: round(platformFees) },
      { label: "Ad spend",         value: round(adSpend) },
      { label: "Fixed costs",      value: round(sfMonthly + designMo + tools + founder) },
    ].filter((x) => x.value > 0.5).map((x) => ({
      ...x,
      pct: netRevenue > 0 ? x.value / netRevenue : 0,
    })),
    insight: buildInsight(margin, netRevenue, roas),
  };
}

export { runModel };
export default runModel;

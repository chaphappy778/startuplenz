/**
 * StartupLenz — Digital Products: Formula Engine
 *
 * Zero-COGS model. The interesting numbers are:
 *   • Conversion rate (visitors → sales)
 *   • Refunds
 *   • Affiliate payout cost (separate from ads)
 *   • Email list growth (the actual asset being built)
 */

const round = (n) => Math.round(n);

function buildInsight(margin, monthlyRev, conversionPct, emailListGrowth) {
  if (monthlyRev <= 0) return "No sales yet. Send traffic OR adjust AOV/conversion to see the model react.";
  if (conversionPct < 0.5) return `Conversion is ${conversionPct.toFixed(2)}% — under 1% usually means the offer or landing page needs work before scaling traffic.`;
  if (margin >= 0.40) return `Excellent margins. Your real asset is the email list — you're capturing ~${Math.round(emailListGrowth)} new subs/month.`;
  if (margin >= 0.20) return "Healthy. Test a higher-priced bundle or a $97 course tier — most digital sellers leave money on the table here.";
  if (margin >= 0)    return "Around breakeven. Cut ad spend in half and watch organic + email — if revenue holds, the ads weren't paying back.";
  return "Losing money. The two usual culprits: high refunds (>10%) or ad spend with no conversion lift.";
}

function runModel(v, _snap = {}) {
  const sales         = +v.sales_per_month             || 0;
  const aov           = +v.avg_order_value             || 0;
  const bundleUplift  = +v.bundle_uplift_pct           || 0;
  const refundPct     = +v.refund_rate_pct             || 0;
  const procPct       = +v.payment_processing_pct      || 0;
  const marketPct     = +v.marketplace_fee_pct         || 0;
  const affPayoutPct  = +v.affiliate_payout_pct        || 0;
  const affShare      = +v.affiliate_share_of_sales_pct|| 0;
  const adSpend       = +v.ad_spend_per_month          || 0;
  const adAttrPct     = +v.ad_attributed_sales_pct     || 0;
  const captureRate   = +v.email_capture_rate_pct      || 0;
  const visitors      = +v.visitors_per_month          || 0;
  const tools         = +v.tools_software_per_month    || 0;
  const founder       = +v.founder_draw_per_month      || 0;

  const effectiveAOV  = aov * (1 + bundleUplift / 100);
  const grossRevenue  = sales * effectiveAOV;
  const refunds       = grossRevenue * (refundPct / 100);
  const netRevenue    = grossRevenue - refunds;

  const procFees      = netRevenue * (procPct / 100);
  const marketFees    = netRevenue * (marketPct / 100);
  const affPayout     = netRevenue * (affShare / 100) * (affPayoutPct / 100);

  const fixed = tools + founder + adSpend;

  const netProfit  = netRevenue - procFees - marketFees - affPayout - fixed;
  const margin     = netRevenue > 0 ? netProfit / netRevenue : 0;

  const conversionPct = visitors > 0 ? (sales / visitors) * 100 : 0;
  const emailListGrowth = visitors * (captureRate / 100);

  const project = (visitorsMult, conversionMult) => {
    const visitorsNext = visitors * visitorsMult;
    const salesNext    = Math.round(visitorsNext * (conversionPct / 100) * conversionMult);
    const rev          = salesNext * effectiveAOV * (1 - refundPct / 100);
    const fees         = rev * (procPct / 100) + rev * (marketPct / 100) + rev * (affShare / 100) * (affPayoutPct / 100);
    return round(rev - fees - fixed);
  };

  return {
    grossRevenue:        round(netRevenue),
    costOfGoods:         0,
    platformAndShipping: round(procFees + marketFees),
    netProfit:           round(netProfit),
    profitMargin:        margin,
    ordersPerMonth:      Math.round(sales),
    growth: {
      launch:   { months: "1–3",  netProfit: project(0.7, 0.8), label: "First product validated, ads paying back" },
      traction: { months: "4–8",  netProfit: project(1.2, 1.0), label: "Email list compounds, more launches per quarter" },
      scale:    { months: "9–12", netProfit: project(1.8, 1.2), label: "Affiliate network + bundle launches stack" },
    },
    costBreakdown: [
      { label: "Refunds",         value: round(refunds) },
      { label: "Payment fees",    value: round(procFees) },
      { label: "Marketplace fees",value: round(marketFees) },
      { label: "Affiliate payout",value: round(affPayout) },
      { label: "Ad spend",        value: round(adSpend) },
      { label: "Fixed costs",     value: round(tools + founder) },
    ].filter((x) => x.value > 0.5).map((x) => ({
      ...x,
      pct: netRevenue > 0 ? x.value / netRevenue : 0,
    })),
    insight: buildInsight(margin, netRevenue, conversionPct, emailListGrowth),
  };
}

export { runModel };
export default runModel;

/**
 * StartupLenz — Subscription Box: Formula Engine
 *
 * Returns the UI-ready ModelOutput shape directly.
 *
 * Notes on the math:
 *   • Effective subscriber count for the month uses mid-month averaging:
 *       avg = active + (new - churned) / 2
 *     so revenue isn't double-counted when growth or churn is high.
 *   • Annual plan revenue is discounted from monthly; the share-on-annual
 *     slider lets the user tweak the mix without changing prices.
 *   • CAC is paid in the month new signups land — modeled as an outflow.
 */

const round = (n) => Math.round(n);

function buildInsight(margin, netSubs, churnPct, monthlyRevenue) {
  if (monthlyRevenue <= 0) return "No revenue — add subscribers or set a box price.";
  if (netSubs < 0)         return `You're losing ${Math.abs(round(netSubs))} subscribers/month. CAC has to come down or churn has to come down — otherwise this shrinks.`;
  if (churnPct > 12)       return "Churn is high. Improve onboarding, theme variety, or pause-don't-cancel UX before scaling acquisition.";
  if (margin >= 0.25)      return "Strong margins. Reinvest in retention experiments — small drops in churn compound fast.";
  if (margin >= 0.10)      return "Healthy for an indie box. Squeeze the COGS-per-box line and you'll free up real cash.";
  if (margin >= 0)         return "Roughly breakeven. Watch CAC and shipping subsidy carefully.";
  return "Losing money. Most likely culprits: CAC + shipping subsidy. Try a $5 shipping charge or pause paid ads.";
}

function runModel(v, _snap = {}) {
  const active        = Math.max(0, +v.subscribers_active        || 0);
  const newSignups    = Math.max(0, +v.monthly_new_signups       || 0);
  const churnPct      = Math.max(0, +v.monthly_churn_pct         || 0);
  const boxPrice      = +v.monthly_box_price                     || 0;
  const annualDisc    = +v.annual_discount_pct                   || 0;
  const annualShare   = +v.annual_plan_share_pct                 || 0;
  const cogsBox       = +v.cogs_per_box                          || 0;
  const packagingBox  = +v.packaging_per_box                     || 0;
  const shipCost      = +v.shipping_cost_per_box                 || 0;
  const shipCharge    = +v.shipping_charged_per_box              || 0;
  const cac           = +v.cac                                   || 0;
  const procPct       = +v.payment_processing_pct                || 0;
  const platformPct   = +v.platform_fee_pct                      || 0;
  const warehouse     = +v.warehouse_cost_per_month              || 0;
  const support       = +v.customer_service_per_month            || 0;
  const tools         = +v.tools_software_per_month              || 0;
  const founderDraw   = +v.founder_draw_per_month                || 0;

  // ── Subscriber dynamics ──────────────────────────────────────────────────
  const churned       = active * (churnPct / 100);
  const netChange     = newSignups - churned;
  const effectiveSubs = Math.max(0, active + netChange / 2);

  // ── Revenue (blended monthly + annual) ──────────────────────────────────
  const annualEffective  = boxPrice * (1 - annualDisc / 100);
  const annualSubs       = effectiveSubs * (annualShare / 100);
  const monthlySubs      = effectiveSubs - annualSubs;
  const gross            = monthlySubs * boxPrice + annualSubs * annualEffective;
  // Shipping charged to buyer adds to gross revenue
  const shippingRevenue  = effectiveSubs * shipCharge;
  const totalRevenue     = gross + shippingRevenue;

  // ── COGS per box (contents + packaging + carrier cost) ──────────────────
  const cogsPerBoxTotal  = cogsBox + packagingBox + shipCost;
  const cogsTotal        = effectiveSubs * cogsPerBoxTotal;

  // ── Fees ─────────────────────────────────────────────────────────────────
  const paymentFees   = totalRevenue * (procPct / 100);
  const platformFees  = totalRevenue * (platformPct / 100);
  const acquisition   = newSignups * cac;

  // ── Fixed ────────────────────────────────────────────────────────────────
  const fixed = warehouse + support + tools + founderDraw;

  const totalCosts = cogsTotal + paymentFees + platformFees + acquisition + fixed;
  const netProfit  = totalRevenue - totalCosts;
  const margin     = totalRevenue > 0 ? netProfit / totalRevenue : 0;

  // ── Growth: subscriber count compounds, churn applies each month ────────
  const project = (months) => {
    let subs = active;
    let cumProfit = 0;
    for (let m = 1; m <= months; m++) {
      const ch = subs * (churnPct / 100);
      const net = newSignups - ch;
      const effSubs = Math.max(0, subs + net / 2);
      const annual  = effSubs * (annualShare / 100);
      const monthly = effSubs - annual;
      const rev = monthly * boxPrice + annual * annualEffective + effSubs * shipCharge;
      const cogs = effSubs * cogsPerBoxTotal;
      const pay  = rev * (procPct / 100);
      const plat = rev * (platformPct / 100);
      const acq  = newSignups * cac;
      const monthProfit = rev - cogs - pay - plat - acq - fixed;
      cumProfit += monthProfit;
      subs = Math.max(0, subs + net);
    }
    return Math.round(cumProfit / months);
  };

  return {
    grossRevenue:        round(totalRevenue),
    costOfGoods:         round(cogsTotal),
    platformAndShipping: round(paymentFees + platformFees + Math.max(0, shipCost - shipCharge) * effectiveSubs),
    netProfit:           round(netProfit),
    profitMargin:        margin,
    ordersPerMonth:      Math.round(effectiveSubs),
    growth: {
      launch:   { months: "1–3",  netProfit: project(3),  label: "Subscriber base forming, retention unproven" },
      traction: { months: "4–8",  netProfit: project(8),  label: "Repeat shipments, theme cadence found" },
      scale:    { months: "9–12", netProfit: project(12), label: "Churn stabilizes, CAC improves with referrals" },
    },
    costBreakdown: [
      { label: "Box contents",      value: round(effectiveSubs * cogsBox) },
      { label: "Packaging",         value: round(effectiveSubs * packagingBox) },
      { label: "Shipping",          value: round(Math.max(0, shipCost - shipCharge) * effectiveSubs) },
      { label: "Payment fees",      value: round(paymentFees) },
      { label: "Platform fees",     value: round(platformFees) },
      { label: "Acquisition",       value: round(acquisition) },
      { label: "Fixed costs",       value: round(fixed) },
    ].filter((x) => x.value > 0.5).map((x) => ({
      ...x,
      pct: totalRevenue > 0 ? x.value / totalRevenue : 0,
    })),
    insight: buildInsight(margin, netChange, churnPct, totalRevenue),
  };
}

export { runModel };
export default runModel;

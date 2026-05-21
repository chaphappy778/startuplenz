/**
 * StartupLenz — House Flipping: Formula Engine
 *
 * Project-based unit economics (not recurring revenue). Returns the
 * UI-ready ModelOutput shape directly.
 *
 * The model surfaces three things real flippers actually care about:
 *   • Profit per flip (after all costs, including interest)
 *   • Cash-on-cash return (profit / cash out of pocket)
 *   • Whether the deal passes the "70% rule" heuristic
 *     (max offer = ARV × 0.70 − rehab)
 *
 * The growth trajectory phases represent year 1, year 2 (with experience),
 * and year 3 (with optimization), rather than 3-month phases — flipping is
 * a slow cadence business and 12-week phases don't make sense.
 */

const round = (n) => Math.round(n);

function buildInsight(profit, margin, arv, purchasePrice, rehabWithContingency, holdingMonths) {
  // 70% rule check
  const maxOfferByRule = arv * 0.70 - rehabWithContingency;
  const overpaidVsRule = purchasePrice - maxOfferByRule;

  if (arv <= 0 || purchasePrice <= 0) return "Set purchase price + ARV to see the math.";

  if (profit < 0) {
    return overpaidVsRule > 5000
      ? `Losing $${Math.abs(round(profit)).toLocaleString()} per flip — you're paying $${round(overpaidVsRule).toLocaleString()} more than the 70% rule allows. Lower the offer or find higher-ARV comps.`
      : `Losing $${Math.abs(round(profit)).toLocaleString()} per flip. Likely culprits: holding time, rehab overrun, or weak comps.`;
  }

  if (holdingMonths > 6 && profit > 0) {
    return `Profitable, but holding ${holdingMonths.toFixed(1)} months. Every extra month of holding eats interest + carry — shorter timelines compound fast.`;
  }

  if (overpaidVsRule > 5000 && profit > 0) {
    return `Profit looks fine but you're $${round(overpaidVsRule).toLocaleString()} over the 70% rule. Working — but a softer market would eat the cushion.`;
  }

  if (margin >= 0.18) return "Strong margins. Replicable. Look at rehab pace next — cutting holding time by 2 months would compound nicely.";
  if (margin >= 0.10) return "Healthy. The cushion lets you absorb 1–2 unexpected rehab surprises per flip without going underwater.";
  if (margin >= 0.05) return "Tight. One bad surprise (foundation, roof, mold) eats the whole flip. Build a bigger rehab contingency before scaling.";
  return "Razor margin. Walk away from this deal or renegotiate the purchase price.";
}

function runModel(v, _snap = {}) {
  const flipsPerYear   = +v.flips_per_year           || 0;
  const purchasePrice  = +v.purchase_price           || 0;
  const acqClosingPct  = +v.acquisition_closing_pct  || 0;
  const inspection     = +v.inspection_due_diligence || 0;
  const downPmtPct     = +v.down_payment_pct         || 0;
  const interestPct    = +v.loan_interest_rate_pct   || 0;
  const pointsPct      = +v.loan_points_pct          || 0;
  const rehabBudget    = +v.rehab_budget             || 0;
  const rehabBufferPct = +v.rehab_contingency_pct    || 0;
  const holdingMonths  = +v.holding_time_months      || 0;
  const holdingPerMo   = +v.holding_costs_per_month  || 0;
  const arv            = +v.after_repair_value       || 0;
  const realtorPct     = +v.realtor_commission_pct   || 0;
  const sellClosingPct = +v.selling_closing_pct      || 0;
  const stagingMkt     = +v.staging_marketing        || 0;

  // ── Acquisition ─────────────────────────────────────────────────────────
  const acqClosing   = purchasePrice * (acqClosingPct / 100);
  const acquisition  = purchasePrice + acqClosing + inspection;

  // ── Financing ───────────────────────────────────────────────────────────
  const downPayment    = purchasePrice * (downPmtPct / 100);
  const financedAmount = Math.max(0, purchasePrice - downPayment);
  const pointsCost     = financedAmount * (pointsPct / 100);
  const interestPerMo  = (financedAmount * (interestPct / 100)) / 12;
  const interestTotal  = interestPerMo * holdingMonths;

  // ── Rehab ───────────────────────────────────────────────────────────────
  const rehabWithBuffer = rehabBudget * (1 + rehabBufferPct / 100);

  // ── Holding ─────────────────────────────────────────────────────────────
  const holdingCarry = holdingPerMo * holdingMonths;

  // ── Sale ────────────────────────────────────────────────────────────────
  const realtorFee   = arv * (realtorPct / 100);
  const sellClosing  = arv * (sellClosingPct / 100);
  const sellingTotal = realtorFee + sellClosing + stagingMkt;

  // ── P&L for one flip ────────────────────────────────────────────────────
  // Total project cost = purchase + acquisition closing + inspection + rehab +
  //                      points + interest + holding carry + selling fees
  const totalProjectCost =
    purchasePrice + acqClosing + inspection +
    rehabWithBuffer +
    pointsCost + interestTotal + holdingCarry +
    sellingTotal;

  const profitPerFlip = arv - totalProjectCost;
  const margin = arv > 0 ? profitPerFlip / arv : 0;

  // Cash out of pocket (the flipper's actual exposure)
  const cashOutOfPocket =
    downPayment + acqClosing + inspection +
    rehabWithBuffer +
    pointsCost + interestTotal + holdingCarry +
    sellingTotal;

  // Annualized profit
  const annualProfit = profitPerFlip * flipsPerYear;

  // Cash-on-cash return per flip (annualized via flip count)
  const cocReturnAnnual = cashOutOfPocket > 0
    ? (annualProfit / cashOutOfPocket) * 100
    : 0;

  // ── "Growth" trajectory — for flipping, this is year 1 / year 2 / year 3 ─
  const project = (flipsMultiplier, marginMultiplier) => {
    const flips = flipsPerYear * flipsMultiplier;
    const adjustedProfit = profitPerFlip * marginMultiplier;
    return round(flips * adjustedProfit);
  };

  return {
    grossRevenue:        round(arv),                            // sale price
    costOfGoods:         round(rehabWithBuffer + acquisition - purchasePrice),
                                                                 // rehab + non-mortgage acquisition costs
    platformAndShipping: round(interestTotal + pointsCost),    // financing costs
    netProfit:           round(profitPerFlip),
    profitMargin:        margin,
    ordersPerMonth:      flipsPerYear > 0
                          ? Math.round((flipsPerYear / 12) * 100) / 100
                          : 0,                                   // flips per month, rounded to 2 decimals
    growth: {
      launch:   { months: "Year 1",  netProfit: project(1.0, 1.00), label: `${flipsPerYear} flip${flipsPerYear===1?"":"s"} — learning the process` },
      traction: { months: "Year 2",  netProfit: project(1.5, 1.05), label: "Faster timelines, repeat contractors, 50% more deals" },
      scale:    { months: "Year 3+", netProfit: project(2.0, 1.10), label: "Crew + dedicated lender, 2× volume with tighter margins" },
    },
    costBreakdown: [
      { label: "Purchase price",        value: round(purchasePrice) },
      { label: "Acquisition closing",   value: round(acqClosing + inspection) },
      { label: "Rehab + contingency",   value: round(rehabWithBuffer) },
      { label: "Loan points",           value: round(pointsCost) },
      { label: "Holding interest",      value: round(interestTotal) },
      { label: "Holding carry costs",   value: round(holdingCarry) },
      { label: "Selling fees",          value: round(sellingTotal) },
    ].filter((x) => x.value > 0.5).map((x) => ({
      ...x,
      pct: arv > 0 ? x.value / arv : 0,
    })),
    insight: buildInsight(profitPerFlip, margin, arv, purchasePrice, rehabWithBuffer, holdingMonths),
  };
}

export { runModel };
export default runModel;

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

/**
 * Build the rules-of-thumb checklist that flippers use to sanity-check a deal
 * outside the spreadsheet. These are the same five heuristics most active
 * flippers will rattle off if you ask them how they evaluate a property in
 * five seconds. Surfacing them structurally (pass / warn / fail) lets the
 * calculator teach as it scores — a user can change one input and watch a
 * rule flip color in real time, which is more honest than a single narrative
 * insight sentence.
 *
 * Each rule returns:
 *   rule    — display name
 *   status  — "pass" | "warn" | "fail"
 *   message — one-line explanation of the user's specific number
 *   detail  — what the rule means and why it exists (used by tooltips / blog)
 */
function buildRulesCheck(args) {
  const {
    arv,
    purchasePrice,
    rehabWithBuffer,
    rehabBufferPct,
    profitPerFlip,
    margin,
    holdingMonths,
    cocReturnAnnual,
  } = args;
  const rules = [];
  const round = (n) => Math.round(n);

  // No ARV or purchase price — the calculator isn't usable yet. Return a
  // neutral placeholder so the UI still renders the card structure.
  if (arv <= 0 || purchasePrice <= 0) {
    return [{
      rule: "Rules of thumb",
      status: "warn",
      message: "Enter purchase price and ARV to see how this deal scores.",
      detail: "The calculator runs five standard checks once the basic numbers are in.",
    }];
  }

  // ── 1. 70% Rule ──────────────────────────────────────────────────────────
  // Max Allowable Offer = ARV × 70% − rehab. The 30% buffer covers holding,
  // financing, selling fees, and the flipper's profit. This is the single
  // most cited rule in the field; almost every active flipper applies it.
  const maxOfferByRule = arv * 0.70 - rehabWithBuffer;
  const overpaidVsRule = purchasePrice - maxOfferByRule;
  if (overpaidVsRule <= 0) {
    rules.push({
      rule: "70% Rule",
      status: "pass",
      message: `Offer is $${Math.abs(round(overpaidVsRule)).toLocaleString()} under the max allowable.`,
      detail: "Max Allowable Offer = ARV × 70% − rehab. Used by most active flippers as a first-pass deal filter.",
    });
  } else if (overpaidVsRule <= 5000) {
    rules.push({
      rule: "70% Rule",
      status: "warn",
      message: `Offer is $${round(overpaidVsRule).toLocaleString()} over the max — thin cushion.`,
      detail: "Max Allowable Offer = ARV × 70% − rehab. You're slightly above the heuristic. Works if your ARV is conservative.",
    });
  } else {
    rules.push({
      rule: "70% Rule",
      status: "fail",
      message: `Offer is $${round(overpaidVsRule).toLocaleString()} over the max — high risk if market softens.`,
      detail: "Max Allowable Offer = ARV × 70% − rehab. Above this line, your margin depends on the market staying strong.",
    });
  }

  // ── 2. Gross Margin ≥ 20% ────────────────────────────────────────────────
  // Profit / ARV. Below 20% one surprise eats the flip; below 10% the deal
  // is functionally a coin flip with extra steps.
  const marginPct = margin * 100;
  if (marginPct >= 20) {
    rules.push({
      rule: "Margin ≥ 20%",
      status: "pass",
      message: `Margin is ${marginPct.toFixed(1)}% — room for surprises.`,
      detail: "Gross margin = profit ÷ ARV. 20% is the cushion most flippers want before they sign.",
    });
  } else if (marginPct >= 10) {
    rules.push({
      rule: "Margin ≥ 20%",
      status: "warn",
      message: `Margin is ${marginPct.toFixed(1)}% — tight. One surprise hurts.`,
      detail: "Gross margin = profit ÷ ARV. Between 10–20% works in steady markets but absorbs little risk.",
    });
  } else {
    rules.push({
      rule: "Margin ≥ 20%",
      status: "fail",
      message: `Margin is ${marginPct.toFixed(1)}% — razor thin or negative.`,
      detail: "Gross margin = profit ÷ ARV. Below 10% one bad surprise (foundation, roof, mold) puts the flip underwater.",
    });
  }

  // ── 3. Holding ≤ 6 months ────────────────────────────────────────────────
  // Past 6 months the carry costs compound and the local market's seasonality
  // becomes a real risk. Most successful flippers target ≤ 5 months end to end.
  if (holdingMonths > 0 && holdingMonths <= 5) {
    rules.push({
      rule: "Holding ≤ 6 months",
      status: "pass",
      message: `${holdingMonths.toFixed(1)} months — within range.`,
      detail: "Each extra month adds interest, taxes, insurance, and utilities. Most successful flips close inside 5 months.",
    });
  } else if (holdingMonths > 0 && holdingMonths <= 6) {
    rules.push({
      rule: "Holding ≤ 6 months",
      status: "warn",
      message: `${holdingMonths.toFixed(1)} months — at the edge of the window.`,
      detail: "Each extra month adds interest, taxes, insurance, and utilities. Past 6 months, seasonality risk also kicks in.",
    });
  } else if (holdingMonths > 6) {
    rules.push({
      rule: "Holding ≤ 6 months",
      status: "fail",
      message: `${holdingMonths.toFixed(1)} months — carry costs are eating profit.`,
      detail: "Each extra month adds interest, taxes, insurance, and utilities. Compresses margins fast past month 6.",
    });
  }

  // ── 4. Rehab Contingency ≥ 15% ──────────────────────────────────────────
  // Walls and foundations hide things. Experienced flippers carry 15–20%
  // contingency on top of the bid because the bid is wrong about something.
  if (rehabBufferPct >= 15) {
    rules.push({
      rule: "Rehab Contingency ≥ 15%",
      status: "pass",
      message: `${rehabBufferPct.toFixed(0)}% buffer — surprise-tolerant.`,
      detail: "Rehab estimates miss something on most flips. 15–20% buffer is the floor for an experienced operator.",
    });
  } else if (rehabBufferPct >= 10) {
    rules.push({
      rule: "Rehab Contingency ≥ 15%",
      status: "warn",
      message: `${rehabBufferPct.toFixed(0)}% buffer — covers small surprises only.`,
      detail: "Rehab estimates miss something on most flips. Under 15% buffer, mid-sized surprises eat the margin.",
    });
  } else {
    rules.push({
      rule: "Rehab Contingency ≥ 15%",
      status: "fail",
      message: `${rehabBufferPct.toFixed(0)}% buffer — one surprise wipes it.`,
      detail: "Rehab estimates miss something on most flips. Under 10% buffer is functionally no buffer at all.",
    });
  }

  // ── 5. Cash-on-Cash > 20% annualized ────────────────────────────────────
  // The benchmark that says the work and risk are worth it vs. a passive
  // alternative. The math accounts for actual cash exposure, not just
  // sticker profit.
  if (cocReturnAnnual >= 20) {
    rules.push({
      rule: "Cash-on-Cash > 20%",
      status: "pass",
      message: `${cocReturnAnnual.toFixed(1)}% annualized — strong return for the work.`,
      detail: "Cash-on-cash = annual profit ÷ cash out of pocket. Above 20% beats most passive alternatives at this risk level.",
    });
  } else if (cocReturnAnnual >= 10) {
    rules.push({
      rule: "Cash-on-Cash > 20%",
      status: "warn",
      message: `${cocReturnAnnual.toFixed(1)}% annualized — fine, not exciting.`,
      detail: "Cash-on-cash = annual profit ÷ cash out of pocket. 10–20% works but the marginal flip vs. passive deployment gets harder to justify.",
    });
  } else {
    rules.push({
      rule: "Cash-on-Cash > 20%",
      status: "fail",
      message: `${cocReturnAnnual.toFixed(1)}% annualized — the work isn't paying.`,
      detail: "Cash-on-cash = annual profit ÷ cash out of pocket. Below 10% is hard to justify against passive alternatives at the same risk.",
    });
  }

  return rules;
}

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
    rulesCheck: buildRulesCheck({
      arv,
      purchasePrice,
      rehabWithBuffer,
      rehabBufferPct,
      profitPerFlip,
      margin,
      holdingMonths,
      cocReturnAnnual,
    }),
  };
}

export { runModel };
export default runModel;

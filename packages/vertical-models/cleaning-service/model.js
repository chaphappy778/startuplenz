/**
 * StartupLenz — Cleaning / Handyman Service: Formula Engine
 *
 * Service-business unit economics. Revenue is hours × rate. Cost is
 * crew wages + supplies + vehicle + insurance + booking software + marketing.
 *
 * Travel time matters — it eats your day without being billable.
 */

const round = (n) => Math.round(n);

function buildInsight(margin, monthlyRev, utilization, noShowPct) {
  if (monthlyRev <= 0) return "No jobs scheduled yet — set jobs/week and hourly rate.";
  if (utilization < 50) return `Only ${utilization.toFixed(0)}% of paid hours are actually billable (rest is travel/setup). Tighten route density or batch by neighborhood.`;
  if (noShowPct > 10) return `${noShowPct}% no-show rate is costing real money. Add a cancellation fee or deposit before scaling marketing.`;
  if (margin >= 0.30) return "Strong service margins. Hire your first part-timer to add capacity without working more yourself.";
  if (margin >= 0.15) return "Healthy. Push repeat-customer share — every recurring booking removes a marketing cost.";
  if (margin >= 0)    return "Breakeven. Either raise rate by $5–10/hr or cut vehicle/insurance load.";
  return "Losing money. Most likely cause: rate is below market for your hours-per-job profile.";
}

function runModel(v, _snap = {}) {
  const jobsWeek    = +v.jobs_per_week               || 0;
  const hrsJob      = +v.avg_hours_per_job           || 0;
  const rate        = +v.billable_rate               || 0;
  const repeatPct   = +v.repeat_customer_pct         || 0;
  const supplyJob   = +v.supplies_cost_per_job       || 0;
  const crew        = Math.max(1, +v.crew_size       || 1);
  const wage        = +v.crew_wage_per_hour          || 0;
  const travelMin   = +v.travel_minutes_per_job      || 0;
  const vehicle     = +v.vehicle_cost_per_month      || 0;
  const insurance   = +v.insurance_per_month         || 0;
  const software    = +v.scheduling_software_per_month || 0;
  const marketing   = +v.marketing_per_month         || 0;
  const cardPct     = +v.card_processing_pct         || 0;
  const noShowPct   = +v.no_show_pct                 || 0;

  // ~4.33 weeks per month
  const jobsScheduled = jobsWeek * 4.33;
  const jobsCompleted = jobsScheduled * (1 - noShowPct / 100);

  // Revenue based on completed jobs
  const billableHrs = jobsCompleted * hrsJob;
  const grossRevenue = billableHrs * rate;

  // Crew is paid for billable + travel + 15% overhead time
  const travelHrs = jobsCompleted * (travelMin / 60);
  const paidHrs   = (billableHrs + travelHrs) * 1.15;
  const laborCost = paidHrs * wage * crew;

  // Owner is in the crew so subtract one "wage" from labor if crew >= 1
  // Treat owner pay as residual (the netProfit IS owner take-home).
  const supplies  = jobsCompleted * supplyJob;
  const cardFees  = grossRevenue * (cardPct / 100);
  const fixedOps  = vehicle + insurance + software + marketing;

  const totalCosts = laborCost + supplies + cardFees + fixedOps;
  const netProfit  = grossRevenue - totalCosts;
  const margin     = grossRevenue > 0 ? netProfit / grossRevenue : 0;

  const utilization = paidHrs > 0 ? (billableHrs / paidHrs) * 100 : 0;

  const project = (jobsMult, rateMult) => {
    const js = jobsWeek * 4.33 * jobsMult;
    const jc = js * (1 - noShowPct / 100);
    const r  = rate * rateMult;
    const bh = jc * hrsJob;
    const rev = bh * r;
    const th = jc * (travelMin / 60);
    const ph = (bh + th) * 1.15;
    const lc = ph * wage * crew;
    const sup = jc * supplyJob;
    const cf  = rev * (cardPct / 100);
    return round(rev - lc - sup - cf - fixedOps);
  };

  return {
    grossRevenue:        round(grossRevenue),
    costOfGoods:         round(supplies),
    platformAndShipping: round(cardFees),
    netProfit:           round(netProfit),
    profitMargin:        margin,
    ordersPerMonth:      Math.round(jobsCompleted),
    growth: {
      launch:   { months: "1–3",  netProfit: project(0.6, 1.0), label: "Filling the calendar, first reviews land" },
      traction: { months: "4–8",  netProfit: project(1.0, 1.05), label: "Repeat bookings + small rate increase" },
      scale:    { months: "9–12", netProfit: project(1.4, 1.10), label: "Crew added, route density improves margins" },
    },
    costBreakdown: [
      { label: "Crew wages",       value: round(laborCost) },
      { label: "Supplies",         value: round(supplies) },
      { label: "Card fees",        value: round(cardFees) },
      { label: "Vehicle",          value: round(vehicle) },
      { label: "Insurance",        value: round(insurance) },
      { label: "Software + tools", value: round(software) },
      { label: "Marketing",        value: round(marketing) },
    ].filter((x) => x.value > 0.5).map((x) => ({
      ...x,
      pct: grossRevenue > 0 ? x.value / grossRevenue : 0,
    })),
    insight: buildInsight(margin, grossRevenue, utilization, noShowPct),
  };
}

export { runModel };
export default runModel;

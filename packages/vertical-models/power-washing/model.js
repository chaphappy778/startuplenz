/**
 * StartupLenz — Power Washing / Exterior Cleaning: Formula Engine
 *
 * Mobile service business. Revenue is jobs × hours × effective rate,
 * but pros usually quote flat-rate per house/driveway. The model
 * keeps the hourly shape (so it stays comparable to other service
 * verticals) and lets the operator tune avg_hours_per_job and rate
 * to reflect their per-job pricing.
 *
 * Two things make this vertical its own animal:
 *   1. Equipment cap-ex. A starter rig (pressure washer + surface
 *      cleaner + hose reels + chemicals) is $3K–$10K up front, often
 *      financed. We capture that as a separate monthly line so the
 *      "vehicle" input stays meaningful for truck/trailer only.
 *   2. Seasonality. Many regions are 8-month seasons; the calculator
 *      reports steady-month economics and the insight prompts thinking
 *      about the off-season elsewhere (commercial fleet washing,
 *      Christmas-light installs, etc.).
 *
 * Travel time matters here too: a driveway is 90 minutes but the
 * round trip can be 45.
 */

const round = (n) => Math.round(n);

function buildInsight(margin, monthlyRev, utilization, noShowPct) {
  if (monthlyRev <= 0) return "No jobs scheduled yet — set jobs/week and avg revenue per job.";
  if (utilization < 50) return `Only ${utilization.toFixed(0)}% of paid hours are billable (rest is travel and setup). Tighten route density or batch by neighborhood.`;
  if (noShowPct > 10) return `${noShowPct}% no-show rate is costing real money. Add a card-on-file deposit before scaling marketing.`;
  if (margin >= 0.30) return "Strong service margins. Add a second rig and a part-timer before adding more marketing.";
  if (margin >= 0.15) return "Healthy. Push annual recurring contracts on commercial accounts — every recurring job removes a marketing cost.";
  if (margin >= 0)    return "Breakeven. Either raise your per-job price by 10–15% or trim the equipment + vehicle load.";
  return "Losing money. Most likely cause: rate is below market for your average-job size, or fuel and chemical costs are leaking margin.";
}

function runModel(v, _snap = {}) {
  const jobsWeek     = +v.jobs_per_week                || 0;
  const hrsJob       = +v.avg_hours_per_job            || 0;
  const rate         = +v.billable_rate                || 0;
  const repeatPct    = +v.repeat_customer_pct          || 0;
  const chemJob      = +v.chemicals_cost_per_job       || 0;
  const crew         = Math.max(1, +v.crew_size        || 1);
  const wage         = +v.crew_wage_per_hour           || 0;
  const travelMin    = +v.travel_minutes_per_job       || 0;
  const vehicle      = +v.vehicle_cost_per_month       || 0;
  const equipment    = +v.equipment_payment_per_month  || 0;
  const insurance    = +v.insurance_per_month          || 0;
  const software     = +v.scheduling_software_per_month || 0;
  const marketing    = +v.marketing_per_month          || 0;
  const cardPct      = +v.card_processing_pct          || 0;
  const noShowPct    = +v.no_show_pct                  || 0;

  // ~4.33 weeks per month
  const jobsScheduled = jobsWeek * 4.33;
  const jobsCompleted = jobsScheduled * (1 - noShowPct / 100);

  // Revenue based on completed jobs
  const billableHrs = jobsCompleted * hrsJob;
  const grossRevenue = billableHrs * rate;

  // Crew is paid for billable + travel + 15% overhead time (setup,
  // teardown, equipment maintenance, refueling, runs to the supply shop).
  const travelHrs = jobsCompleted * (travelMin / 60);
  const paidHrs   = (billableHrs + travelHrs) * 1.15;
  const laborCost = paidHrs * wage * crew;

  // Owner take-home is the residual; we don't double-count owner wages.
  const chemicals = jobsCompleted * chemJob;
  const cardFees  = grossRevenue * (cardPct / 100);
  const fixedOps  = vehicle + equipment + insurance + software + marketing;

  const totalCosts = laborCost + chemicals + cardFees + fixedOps;
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
    const ch = jc * chemJob;
    const cf  = rev * (cardPct / 100);
    return round(rev - lc - ch - cf - fixedOps);
  };

  return {
    grossRevenue:        round(grossRevenue),
    costOfGoods:         round(chemicals),
    platformAndShipping: round(cardFees),
    netProfit:           round(netProfit),
    profitMargin:        margin,
    ordersPerMonth:      Math.round(jobsCompleted),
    growth: {
      launch:   { months: "1–3",  netProfit: project(0.6, 1.0),  label: "First reviews land, calendar starting to fill" },
      traction: { months: "4–8",  netProfit: project(1.0, 1.05), label: "Repeat residential + small per-job price increase" },
      scale:    { months: "9–12", netProfit: project(1.4, 1.10), label: "Commercial accounts added, route density up" },
    },
    costBreakdown: [
      { label: "Crew wages",           value: round(laborCost) },
      { label: "Chemicals",            value: round(chemicals) },
      { label: "Card fees",            value: round(cardFees) },
      { label: "Vehicle (truck/trailer)", value: round(vehicle) },
      { label: "Equipment payment",    value: round(equipment) },
      { label: "Insurance",            value: round(insurance) },
      { label: "Software + tools",     value: round(software) },
      { label: "Marketing",            value: round(marketing) },
    ].filter((x) => x.value > 0.5).map((x) => ({
      ...x,
      pct: grossRevenue > 0 ? x.value / grossRevenue : 0,
    })),
    insight: buildInsight(margin, grossRevenue, utilization, noShowPct),
  };
}

export { runModel };
export default runModel;

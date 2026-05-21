/**
 * StartupLenz — Food Truck: Formula Engine
 *
 * Returns the UI-ready ModelOutput shape directly (no adapter step needed).
 * See apps/web/lib/types.ts for the ModelOutput interface.
 *
 * @param {Object} v       — flat inputs map keyed by formula_key
 * @param {Object} _snap   — reserved for live cost-snapshot overrides (Phase 3.5)
 */

const round = (n) => Math.round(n);

function buildInsight(margin, monthlyRevenue) {
  if (monthlyRevenue <= 0) {
    return "No revenue yet — try increasing days open, customers per day, or average ticket.";
  }
  if (margin >= 0.25) return "Solid margins for a food truck. Reinvest in route expansion or a second truck.";
  if (margin >= 0.12) return "Healthy margins. Look at labor scheduling and ticket size to push higher.";
  if (margin >= 0.04) return "Margins are tight. Trim food cost % or raise tickets by $1–2 before scaling.";
  if (margin >= 0)    return "Breaking even. One disciplined month on labor hours can flip this.";
  return "Losing money. Cut event fees, reduce labor hours, or rethink pricing before continuing.";
}

function runModel(v, _snap = {}) {
  // ── Defaults & coercion ──────────────────────────────────────────────────
  const days       = +v.days_open_per_month        || 22;
  const covers     = +v.avg_covers_per_day         || 80;
  const ticket     = +v.avg_ticket_size            || 12;
  const bevMixPct  = +v.beverage_revenue_pct       || 20;
  const foodPct    = +v.food_cost_pct              || 30;
  const bevPct     = +v.beverage_cost_pct          || 25;
  const wage       = +v.labor_hourly_rate          || 18;
  const laborHrs   = +v.labor_hours_per_day        || 12;
  const fuelDay    = +v.fuel_cost_per_day          || 30;
  const eventFee   = +v.event_fee_per_month        || 600;
  const truckLoan  = +v.truck_loan_payment         || 800;
  const insurance  = +v.insurance_per_month        || 200;
  const licenseFee = +v.license_fees_per_month     || 150;
  const propane    = +v.propane_supplies_per_month || 200;
  const marketing  = +v.marketing_per_month        || 300;
  const cardPct    = +v.credit_card_fee_pct        || 2.6;

  // ── Revenue ──────────────────────────────────────────────────────────────
  const monthlyRevenue = days * covers * ticket;
  const bevRevenue     = monthlyRevenue * (bevMixPct / 100);
  const foodRevenue    = monthlyRevenue - bevRevenue;

  // ── COGS ─────────────────────────────────────────────────────────────────
  const foodCogs  = foodRevenue * (foodPct / 100);
  const bevCogs   = bevRevenue  * (bevPct  / 100);
  const totalCogs = foodCogs + bevCogs;

  // ── Operating costs ──────────────────────────────────────────────────────
  const laborCost = wage * laborHrs * days;
  const fuelCost  = fuelDay * days;
  const cardFees  = monthlyRevenue * (cardPct / 100);
  const fixedOps  = eventFee + truckLoan + insurance + licenseFee + propane + marketing;
  const operatingTotal = laborCost + fuelCost + cardFees + fixedOps;

  // ── P&L ───────────────────────────────────────────────────────────────────
  const netProfit    = monthlyRevenue - totalCogs - operatingTotal;
  const profitMargin = monthlyRevenue > 0 ? netProfit / monthlyRevenue : 0;
  const ordersPerMonth = days * covers;

  // ── Growth trajectory (3 phases, monthly averages) ───────────────────────
  // Food trucks ramp on covers (route discovery + repeat lunch crowd).
  // Phase 1: 60% covers (still building routes); Phase 2: 100% (steady route);
  // Phase 3: 130% covers + 5% ticket lift (events + catering add-ons).
  const projectAt = (coversMult, ticketMult) => {
    const rev   = days * (covers * coversMult) * (ticket * ticketMult);
    const bev   = rev * (bevMixPct / 100);
    const food  = rev - bev;
    const cogs  = food * (foodPct / 100) + bev * (bevPct / 100);
    const card  = rev * (cardPct / 100);
    return round(rev - cogs - laborCost - fuelCost - fixedOps - card);
  };

  const launchProfit   = projectAt(0.60, 1.00);
  const tractionProfit = projectAt(1.00, 1.00);
  const scaleProfit    = projectAt(1.30, 1.05);

  // ── Cost breakdown (for the UI bar chart) ────────────────────────────────
  const breakdown = [
    { label: "Food COGS",     value: round(foodCogs)  },
    { label: "Beverage COGS", value: round(bevCogs)   },
    { label: "Labor",         value: round(laborCost) },
    { label: "Fuel",          value: round(fuelCost)  },
    { label: "Fixed costs",   value: round(fixedOps)  },
    { label: "Card fees",     value: round(cardFees)  },
  ]
    .filter((item) => item.value > 0.5)
    .map((item) => ({
      ...item,
      pct: monthlyRevenue > 0 ? item.value / monthlyRevenue : 0,
    }));

  return {
    grossRevenue:        round(monthlyRevenue),
    costOfGoods:         round(totalCogs),
    platformAndShipping: round(cardFees + fuelCost),
    netProfit:           round(netProfit),
    profitMargin,
    ordersPerMonth:      Math.round(ordersPerMonth),
    growth: {
      launch:   { months: "1–3",  netProfit: launchProfit,   label: "Building the route, lunch crowd forming" },
      traction: { months: "4–8",  netProfit: tractionProfit, label: "Repeat customers, steady stops" },
      scale:    { months: "9–12", netProfit: scaleProfit,    label: "Events + catering bookings stack on top" },
    },
    costBreakdown: breakdown,
    insight: buildInsight(profitMargin, monthlyRevenue),
  };
}

export { runModel };
export default runModel;

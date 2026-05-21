/**
 * StartupLenz — Reseller / Thrift Flip: Formula Engine
 *
 * Margin model + an "hourly wage" calculation, because for resellers the
 * time-per-listing trade-off is everything — the calculator surfaces both
 * the cash margin and the effective $/hour the operator is netting.
 */

const round = (n) => Math.round(n);

function buildInsight(margin, monthlyRev, effectiveHourly) {
  if (monthlyRev <= 0) return "No items moved yet — set items sold + average sale price.";
  if (effectiveHourly < 10) return `You're effectively making $${effectiveHourly.toFixed(0)}/hr. Either source faster (lots, bulk) or list higher-value items before scaling.`;
  if (margin >= 0.35) return `Strong cash margin AND $${effectiveHourly.toFixed(0)}/hr — replicable and worth scaling listings.`;
  if (margin >= 0.18) return `Decent unit margins. Effective wage is $${effectiveHourly.toFixed(0)}/hr — automate cross-listing to push it up.`;
  if (margin >= 0)    return "Breakeven on cash, but you're not really paying yourself. Time per listing is the dial to turn.";
  return "Losing money on the unit. Either sourcing is too expensive or shipping is being absorbed without buyer fees covering it.";
}

function runModel(v, _snap = {}) {
  const sold        = +v.items_sold_per_month         || 0;
  const price       = +v.avg_sale_price               || 0;
  const sourceCost  = +v.avg_sourcing_cost_per_item   || 0;
  const sellPct     = +v.sell_through_rate_pct        || 45;
  const minsListing = +v.minutes_per_listing          || 0;
  const wage        = +v.your_hourly_rate             || 0;
  const platformPct = +v.platform_fee_pct             || 0;
  const procPct     = +v.payment_processing_pct       || 0;
  const shipCost    = +v.shipping_cost_per_item       || 0;
  const shipPaid    = +v.shipping_paid_by_buyer       || 0;
  const supplies    = +v.supplies_per_month           || 0;
  const mileage     = +v.mileage_per_month            || 0;
  const tools       = +v.tools_per_month              || 0;

  // To sell `sold` items at `sellPct` sell-through, you need to list:
  const itemsListed = sellPct > 0 ? sold * (100 / sellPct) : sold;

  // Revenue
  const grossSale = sold * price;
  const shipRevenue = sold * shipPaid;
  const totalRevenue = grossSale + shipRevenue;

  // COGS
  const cogs  = sold * sourceCost;

  // Fees
  const platformFees = totalRevenue * (platformPct / 100);
  const procFees     = totalRevenue * (procPct / 100);

  // Shipping cost (assume seller eats anything over what buyer paid)
  const shipNet = sold * Math.max(0, shipCost - shipPaid);

  // Fixed-ish monthly
  const fixed = supplies + mileage + tools;

  // Time cost
  const hoursListing = (itemsListed * minsListing) / 60;
  const timeCost = hoursListing * wage; // not subtracted from cash profit but used for effective wage

  const cashProfit = totalRevenue - cogs - platformFees - procFees - shipNet - fixed;
  const margin     = totalRevenue > 0 ? cashProfit / totalRevenue : 0;

  // Effective hourly: cash profit divided by hours spent listing
  const effectiveHourly = hoursListing > 0 ? cashProfit / hoursListing : 0;

  const project = (volumeMult) => {
    const s = sold * volumeMult;
    const listed = sellPct > 0 ? s * (100 / sellPct) : s;
    const rev = s * price + s * shipPaid;
    const c = s * sourceCost;
    const fees = rev * (platformPct / 100) + rev * (procPct / 100);
    const ship = s * Math.max(0, shipCost - shipPaid);
    const hrs = (listed * minsListing) / 60;
    return round(rev - c - fees - ship - fixed);
  };

  return {
    grossRevenue:        round(totalRevenue),
    costOfGoods:         round(cogs),
    platformAndShipping: round(platformFees + procFees + shipNet),
    netProfit:           round(cashProfit),
    profitMargin:        margin,
    ordersPerMonth:      Math.round(sold),
    growth: {
      launch:   { months: "1–3",  netProfit: project(0.6), label: "Sourcing routine forming, listings backlog" },
      traction: { months: "4–8",  netProfit: project(1.0), label: "Cross-listing tool + repeat sourcing leverage" },
      scale:    { months: "9–12", netProfit: project(1.5), label: "Bulk sourcing + faster turnaround compound" },
    },
    costBreakdown: [
      { label: "Sourcing (COGS)",  value: round(cogs) },
      { label: "Platform fees",    value: round(platformFees) },
      { label: "Payment fees",     value: round(procFees) },
      { label: "Shipping net",     value: round(shipNet) },
      { label: "Supplies + mileage", value: round(supplies + mileage) },
      { label: "Tools",            value: round(tools) },
    ].filter((x) => x.value > 0.5).map((x) => ({
      ...x,
      pct: totalRevenue > 0 ? x.value / totalRevenue : 0,
    })),
    insight: buildInsight(margin, totalRevenue, effectiveHourly),
  };
}

export { runModel };
export default runModel;

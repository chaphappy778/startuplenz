/**
 * StartupLenz — Candle / Bath & Body: Formula Engine
 *
 * Three-channel model: own site/markets, Etsy, and wholesale to retailers.
 * Each channel has different revenue per unit and different fee structure.
 * Returns the UI-ready ModelOutput shape directly.
 */

const round = (n) => Math.round(n);

function buildInsight(margin, monthlyRevenue, wholesaleShare) {
  if (monthlyRevenue <= 0) return "No revenue — set units, price, and channel mix to see numbers.";
  if (margin >= 0.30) return "Excellent margins. Lean into Etsy SEO and wholesale outreach to scale volume.";
  if (margin >= 0.18) return "Healthy margins. Look at material cost per unit — fragrance + wax are the usual culprits.";
  if (margin >= 0.08) return wholesaleShare > 40
    ? "Margins are thin. Wholesale at 50% off is eating into them — consider trimming wholesale share or raising MSRP."
    : "Margins are tight. Trim materials or raise price by $1–2 before scaling production.";
  if (margin >= 0)    return "Breakeven. One pricing adjustment usually flips this.";
  return "Losing money. Likely fixes: cut wholesale share, raise price, or reduce material cost per unit.";
}

function runModel(v, _snap = {}) {
  const units      = +v.units_produced_per_month || 0;
  const price      = +v.price_per_unit           || 0;
  const directPct  = +v.channel_mix_direct_pct   || 0;
  const etsyPct    = +v.channel_mix_etsy_pct     || 0;
  const wholeshPct = +v.channel_mix_wholesale_pct || 0;
  const wholesaleDiscPct = +v.wholesale_discount_pct || 50;
  const material   = +v.material_cost_per_unit   || 0;
  const packaging  = +v.packaging_cost_per_unit  || 0;
  const laborMin   = +v.labor_minutes_per_unit   || 0;
  const wage       = +v.maker_hourly_rate        || 0;
  const shipDirect = +v.avg_shipping_cost_per_direct_order || 0;
  const orderSize  = Math.max(1, +v.avg_order_size || 1);
  const etsyFeePct = +v.etsy_fee_pct             || 0;
  const studio     = +v.studio_rent_per_month    || 0;
  const overhead   = +v.supplies_overhead_per_month || 0;
  const marketing  = +v.marketing_per_month      || 0;

  // ── Normalize channel mix if it doesn't sum to 100 ──────────────────────
  const mixSum = directPct + etsyPct + wholeshPct;
  const norm   = mixSum > 0 ? 100 / mixSum : 0;
  const dPct = directPct * norm;
  const ePct = etsyPct   * norm;
  const wPct = wholeshPct * norm;

  // ── Units per channel ───────────────────────────────────────────────────
  const unitsDirect = units * (dPct / 100);
  const unitsEtsy   = units * (ePct / 100);
  const unitsWhole  = units * (wPct / 100);

  // ── Revenue per channel ─────────────────────────────────────────────────
  const wholesalePrice = price * (1 - wholesaleDiscPct / 100);
  const revDirect = unitsDirect * price;
  const revEtsy   = unitsEtsy   * price;
  const revWhole  = unitsWhole  * wholesalePrice;
  const totalRevenue = revDirect + revEtsy + revWhole;

  // ── COGS (materials + packaging + labor, all per unit) ──────────────────
  const laborPerUnit = (laborMin / 60) * wage;
  const cogsPerUnit  = material + packaging + laborPerUnit;
  const totalCogs    = units * cogsPerUnit;

  // ── Channel fees + shipping ─────────────────────────────────────────────
  const etsyFees    = revEtsy * (etsyFeePct / 100);
  const directOrders = unitsDirect / orderSize;
  const directShip  = directOrders * shipDirect;
  // Assume wholesale ships freight billed to retailer (no shipping cost to maker)
  // Assume Etsy ships at the maker's cost — same per-order rate as direct
  const etsyOrders  = unitsEtsy / orderSize;
  const etsyShip    = etsyOrders * shipDirect * 0.8; // Etsy often discounts shipping

  const fixed = studio + overhead + marketing;

  const netProfit    = totalRevenue - totalCogs - etsyFees - directShip - etsyShip - fixed;
  const profitMargin = totalRevenue > 0 ? netProfit / totalRevenue : 0;

  // ── Growth: production volume grows; pricing flat ───────────────────────
  const projectAt = (unitsMult) => {
    const u  = units * unitsMult;
    const ud = u * (dPct / 100);
    const ue = u * (ePct / 100);
    const uw = u * (wPct / 100);
    const rev = ud * price + ue * price + uw * wholesalePrice;
    const cg  = u * cogsPerUnit;
    const ef  = ue * price * (etsyFeePct / 100);
    const ds  = (ud / orderSize) * shipDirect;
    const es  = (ue / orderSize) * shipDirect * 0.8;
    return round(rev - cg - ef - ds - es - fixed);
  };

  return {
    grossRevenue:        round(totalRevenue),
    costOfGoods:         round(totalCogs),
    platformAndShipping: round(etsyFees + directShip + etsyShip),
    netProfit:           round(netProfit),
    profitMargin,
    ordersPerMonth:      Math.round(directOrders + etsyOrders + unitsWhole / orderSize),
    growth: {
      launch:   { months: "1–3",  netProfit: projectAt(0.65), label: "Building product line + initial listings" },
      traction: { months: "4–8",  netProfit: projectAt(1.00), label: "Returning buyers, first wholesale accounts" },
      scale:    { months: "9–12", netProfit: projectAt(1.35), label: "Holiday volume + retailer reorders" },
    },
    costBreakdown: [
      { label: "Materials",     value: round(units * material)            },
      { label: "Packaging",     value: round(units * packaging)           },
      { label: "Labor",         value: round(units * laborPerUnit)        },
      { label: "Etsy fees",     value: round(etsyFees)                    },
      { label: "Shipping",      value: round(directShip + etsyShip)       },
      { label: "Fixed costs",   value: round(fixed)                       },
    ].filter((x) => x.value > 0.5).map((x) => ({
      ...x,
      pct: totalRevenue > 0 ? x.value / totalRevenue : 0,
    })),
    insight: buildInsight(profitMargin, totalRevenue, wPct),
  };
}

export { runModel };
export default runModel;

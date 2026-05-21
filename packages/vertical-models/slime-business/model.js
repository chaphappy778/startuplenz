/**
 * StartupLenz — Slime Brand: Formula Engine
 *
 * Small-batch slime brand. Drops-based selling on TikTok Shop and Etsy.
 * Returns the UI-ready ModelOutput shape directly.
 *
 * Slime has a few quirks compared to other handmade:
 *   • TikTok Shop is the dominant channel (often >50% of revenue).
 *   • Temperature-sensitive — extreme heat or cold can ruin slime in transit.
 *     Many brands include heat or ice packs ~30-40% of the year, which we
 *     model as a per-order averaged cost.
 *   • Drops are usually small (~30–80 units) and hyper-engaged followers
 *     drive 70-90%+ sell-through within hours of release.
 *   • Avg order is ~1.8 units — slime buyers commonly buy in pairs/threes.
 */

const round = (n) => Math.round(n);

function buildInsight(margin, monthlyRev, sellThrough, tiktokShare, directShare) {
  if (monthlyRev <= 0) {
    return "No revenue yet — set drops per month, units per drop, and price.";
  }
  if (sellThrough < 50) {
    return `Only ${sellThrough.toFixed(0)}% sell-through means half your slime sits as inventory. Smaller drops with better photos usually fix this faster than discounting.`;
  }
  if (tiktokShare < 30 && monthlyRev > 0) {
    return "TikTok Shop drives most slime discovery right now — under-leaning on it leaves growth on the table. Try a creator gifting test.";
  }
  if (directShare >= 40 && margin >= 0.20) {
    return `Strong margins with ~${directShare.toFixed(0)}% direct sales — own-site is the high-leverage channel. Keep funneling IG/TikTok traffic to your shop.`;
  }
  if (margin >= 0.35) {
    return "Excellent margins. Slime brands at this tier typically reinvest into bigger drops + paid creator collabs to scale.";
  }
  if (margin >= 0.22) {
    return "Healthy. Most indie slime brands live here — focus on bumping avg order size (bundles, mystery boxes) to push higher.";
  }
  if (margin >= 0.10) {
    return "Margins are tight. Material cost per unit is usually the biggest dial — bulk glue + private-label fragrance both move the needle.";
  }
  if (margin >= 0) {
    return "Breaking even. Either raise the price $1–2 or trim charms/mix-ins — buyers often don't notice the difference.";
  }
  return "Losing money per drop. Check labor minutes and temp-pack costs — these are the two often-underestimated lines.";
}

// Direct-sale processor fee (Shopify Payments / Stripe / Big Cartel) — the
// only fee on own-site orders. Hardcoded so we don't add yet-another slider.
const DIRECT_PROCESSING_PCT = 2.9;

function runModel(v, _snap = {}) {
  const drops          = +v.drops_per_month                || 0;
  const unitsPerDrop   = +v.units_per_drop                 || 0;
  const sellPct        = +v.sell_through_rate              || 80;
  const price          = +v.price_per_unit                 || 0;
  const aupo           = Math.max(1, +v.avg_units_per_order || 1);
  const materialCost   = +v.material_cost_per_unit         || 0;
  const containerCost  = +v.container_cost_per_unit        || 0;
  const shipSupplies   = +v.shipping_supplies_per_order    || 0;
  const tempPackCost   = +v.temp_pack_cost_per_order       || 0;
  const laborMin       = +v.labor_minutes_per_unit         || 0;
  const wage           = +v.maker_hourly_rate              || 0;
  const shipCarrier    = +v.avg_shipping_cost_per_order    || 0;
  const tiktokMixPctIn = +v.platform_mix_tiktok_pct        || 0;
  const etsyMixPctIn   = +v.platform_mix_etsy_pct          || 0;
  const directMixPctIn = +v.platform_mix_direct_pct        || 0;
  const tiktokFeePct   = +v.tiktok_fee_pct                 || 0;
  const etsyFeePct     = +v.etsy_fee_pct                   || 0;
  const adSpend        = +v.ad_spend_per_month             || 0;

  // ── Volume ──────────────────────────────────────────────────────────────
  const listedUnits = drops * unitsPerDrop;
  const soldUnits   = listedUnits * (sellPct / 100);
  const orders      = soldUnits / aupo;

  // ── Channel mix (normalize so users don't have to sum to 100) ───────────
  // If all three are zero (legacy data before this slider existed),
  // fall back to "100% Etsy" so the model still produces a number.
  const mixSum = tiktokMixPctIn + etsyMixPctIn + directMixPctIn;
  const tiktokMixPct = mixSum > 0 ? (tiktokMixPctIn / mixSum) * 100 : 0;
  const etsyMixPct   = mixSum > 0 ? (etsyMixPctIn   / mixSum) * 100 : 100;
  const directMixPct = mixSum > 0 ? (directMixPctIn / mixSum) * 100 : 0;

  // ── Revenue (split by channel for fee math) ─────────────────────────────
  const grossRevenue = soldUnits * price;
  const tiktokRev    = grossRevenue * (tiktokMixPct / 100);
  const etsyRev      = grossRevenue * (etsyMixPct   / 100);
  const directRev    = grossRevenue * (directMixPct / 100);

  // ── COGS — materials + container per unit, packaging + shipping per order
  const materialsTotal  = soldUnits * materialCost;
  const containersTotal = soldUnits * containerCost;
  const supplyTotal     = orders * shipSupplies;
  const tempPackTotal   = orders * tempPackCost;
  const cogsTotal       = materialsTotal + containersTotal + supplyTotal + tempPackTotal;

  // ── Labor ───────────────────────────────────────────────────────────────
  const laborTotal = soldUnits * (laborMin / 60) * wage;

  // ── Shipping (carrier) ──────────────────────────────────────────────────
  const shippingTotal = orders * shipCarrier;

  // ── Platform fees (direct = card-processing only) ───────────────────────
  const tiktokFees = tiktokRev * (tiktokFeePct / 100);
  const etsyFees   = etsyRev   * (etsyFeePct   / 100);
  const directFees = directRev * (DIRECT_PROCESSING_PCT / 100);
  const platformFees = tiktokFees + etsyFees + directFees;

  // ── P&L ─────────────────────────────────────────────────────────────────
  const totalCosts = cogsTotal + laborTotal + shippingTotal + platformFees + adSpend;
  const netProfit  = grossRevenue - totalCosts;
  const margin     = grossRevenue > 0 ? netProfit / grossRevenue : 0;

  // ── Growth trajectory: standard 3-phase, ramps drops + sell-through ─────
  const project = (dropsMult, sellMult) => {
    const lU = drops * dropsMult * unitsPerDrop;
    const sU = lU * Math.min(100, sellPct * sellMult) / 100;
    const ords = sU / aupo;
    const rev = sU * price;
    const tRev = rev * (tiktokMixPct / 100);
    const eRev = rev * (etsyMixPct   / 100);
    const dRev = rev * (directMixPct / 100);
    const cogs = sU * (materialCost + containerCost) + ords * (shipSupplies + tempPackCost);
    const lab = sU * (laborMin / 60) * wage;
    const ship = ords * shipCarrier;
    const fees =
      tRev * (tiktokFeePct / 100) +
      eRev * (etsyFeePct   / 100) +
      dRev * (DIRECT_PROCESSING_PCT / 100);
    return round(rev - cogs - lab - ship - fees - adSpend);
  };

  return {
    grossRevenue:        round(grossRevenue),
    costOfGoods:         round(cogsTotal + laborTotal),
    platformAndShipping: round(platformFees + shippingTotal),
    netProfit:           round(netProfit),
    profitMargin:        margin,
    ordersPerMonth:      Math.round(orders),
    growth: {
      launch:   { months: "1–3",  netProfit: project(0.6, 0.85), label: "First drops, audience finding the brand" },
      traction: { months: "4–8",  netProfit: project(1.0, 1.00), label: "Drops sell out faster, repeat buyers grow" },
      scale:    { months: "9–12", netProfit: project(1.4, 1.05), label: "Creator collabs + bigger drops compound" },
    },
    costBreakdown: [
      { label: "Materials",         value: round(materialsTotal)  },
      { label: "Containers",        value: round(containersTotal) },
      { label: "Shipping supplies", value: round(supplyTotal)     },
      { label: "Temp packs",        value: round(tempPackTotal)   },
      { label: "Labor",             value: round(laborTotal)      },
      { label: "Carrier shipping",  value: round(shippingTotal)   },
      { label: "TikTok fees",       value: round(tiktokFees)      },
      { label: "Etsy fees",         value: round(etsyFees)        },
      { label: "Direct card fees",  value: round(directFees)      },
      { label: "Ad / gifting",      value: round(adSpend)         },
    ].filter((x) => x.value > 0.5).map((x) => ({
      ...x,
      pct: grossRevenue > 0 ? x.value / grossRevenue : 0,
    })),
    insight: buildInsight(margin, grossRevenue, sellPct, tiktokMixPct, directMixPct),
  };
}

export { runModel };
export default runModel;

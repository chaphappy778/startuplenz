/**
 * modelClient.ts
 *
 * Bridges the calculator UI to the vertical model package.
 *
 * computeModel() now calls the real `@startuplenz/vertical-models/handmade`
 * engine and adapts its rich output shape to the simpler `ModelOutput` shape
 * the existing UI components consume. Live cost snapshots are not wired in
 * yet — that's Phase 3.5. When they are, `snapshots` should be passed as the
 * second argument to `runModel()` and the live-data badge can be driven off
 * the `liveDataApplied` flags returned by the engine.
 */

import { runModel as runHandmade } from "@startuplenz/vertical-models/handmade";
import { runModel as runFoodTruck } from "@startuplenz/vertical-models/food-truck";
import { runModel as runSubscriptionBox } from "@startuplenz/vertical-models/subscription-box";
import { runModel as runCandleBathBody } from "@startuplenz/vertical-models/candle-bath-body";
import { runModel as runPrintOnDemand } from "@startuplenz/vertical-models/print-on-demand";
import { runModel as runDigitalProducts } from "@startuplenz/vertical-models/digital-products";
import { runModel as runReseller } from "@startuplenz/vertical-models/reseller";
import { runModel as runCleaningService } from "@startuplenz/vertical-models/cleaning-service";
import { runModel as runHouseFlipping } from "@startuplenz/vertical-models/house-flipping";
import { runModel as runSlimeBusiness } from "@startuplenz/vertical-models/slime-business";
import type { CostItem, ModelOutput, SliderValues } from "./types";

// ─── Insight builder (copied from the previous mock — same heuristic) ────────

function buildInsight(margin: number, orders: number): string {
  if (margin >= 0.4)
    return "Excellent margins. You have room to reinvest in marketing or reduce prices to grow faster.";
  if (margin >= 0.25)
    return "Healthy margins for a small brand. Focus on growing order size to push profitability higher.";
  if (margin >= 0.1)
    return "Margins are thin — look at reducing material or shipping costs before scaling volume.";
  if (margin >= 0)
    return "You're breaking even. One price increase or cost cut could flip this to profit quickly.";
  if (orders <= 0)
    return "Volume is at zero — try increasing units per drop, drops per month, or your sell-through rate.";
  return "You're losing money at this volume. Increase prices or reduce costs before launching.";
}

// ─── Adapter: real model output → UI ModelOutput ─────────────────────────────

interface RealMonthly {
  revenue: { gross: number; refundDeduction: number; net: number };
  cogs: { materials: number; packaging: number; labor: number; total: number };
  fees: {
    etsy: Record<string, number>;
    tiktok: Record<string, number>;
    total: number;
  };
  shipping: { total: number };
  advertising: { total: number };
  profit: { gross: number; net: number; marginPct: number };
  volume: { unitsListed: number; unitsSold: number; ordersPerMonth: number };
}

interface RealTrajectoryPoint {
  month: number;
  phase: "launch" | "traction" | "scale";
  sellThroughMultiplier: number;
  dropsMultiplier: number;
  projectedNetProfit: number;
}

interface RealOutput {
  vertical: string;
  generatedAt: string;
  inputs: Record<string, number>;
  monthly: RealMonthly;
  trajectory: RealTrajectoryPoint[];
  annualized: Record<string, number>;
  liveDataApplied: Record<string, boolean>;
}

function avgProfit(traj: RealTrajectoryPoint[], from: number, to: number): number {
  const slice = traj.filter((p) => p.month >= from && p.month <= to);
  if (slice.length === 0) return 0;
  return slice.reduce((s, p) => s + p.projectedNetProfit, 0) / slice.length;
}

function adaptOutput(real: RealOutput): ModelOutput {
  const grossRevenue = real.monthly.revenue.gross;
  const costOfGoods = real.monthly.cogs.total;
  const platformAndShipping =
    real.monthly.fees.total + real.monthly.shipping.total;
  const netProfit = real.monthly.profit.net;
  const profitMargin = grossRevenue > 0 ? netProfit / grossRevenue : 0;
  const ordersPerMonth = real.monthly.volume.ordersPerMonth;

  const launchAvg = avgProfit(real.trajectory, 1, 3);
  const tractionAvg = avgProfit(real.trajectory, 4, 8);
  const scaleAvg = avgProfit(real.trajectory, 9, 12);

  const breakdownItems: Array<Omit<CostItem, "pct">> = [
    { label: "Materials", value: real.monthly.cogs.materials },
    { label: "Packaging", value: real.monthly.cogs.packaging },
    { label: "Labor", value: real.monthly.cogs.labor },
    { label: "Platform fees", value: real.monthly.fees.total },
    { label: "Shipping", value: real.monthly.shipping.total },
    { label: "Advertising", value: real.monthly.advertising.total },
  ];

  const costBreakdown: CostItem[] = breakdownItems
    .filter((item) => item.value > 0.01)
    .map((item) => ({
      label: item.label,
      value: Math.round(item.value),
      pct: grossRevenue > 0 ? item.value / grossRevenue : 0,
    }));

  return {
    grossRevenue: Math.round(grossRevenue),
    costOfGoods: Math.round(costOfGoods),
    platformAndShipping: Math.round(platformAndShipping),
    netProfit: Math.round(netProfit),
    profitMargin,
    ordersPerMonth: Math.round(ordersPerMonth * 10) / 10,
    growth: {
      launch: {
        months: "1–3",
        netProfit: Math.round(launchAvg),
        label: "Small drops, building audience",
      },
      traction: {
        months: "4–8",
        netProfit: Math.round(tractionAvg),
        label: "Social following grows",
      },
      scale: {
        months: "9–12",
        netProfit: Math.round(scaleAvg),
        label: "Full drops, loyal base",
      },
    },
    costBreakdown,
    insight: buildInsight(profitMargin, ordersPerMonth),
  };
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Run the vertical model for the given slider values.
 *
 * @param values   - Current slider state (formulaKey → numeric value)
 * @param vertical - Vertical slug
 *
 * handmade-craft uses the rich RealOutput shape from packages/vertical-models
 * and gets adapted to ModelOutput. The other verticals return ModelOutput
 * directly from their model.js exports.
 */
export function computeModel(values: SliderValues, vertical: string): ModelOutput {
  switch (vertical) {
    case "handmade-craft": {
      const real = runHandmade(values, {}) as unknown as RealOutput;
      return adaptOutput(real);
    }
    case "food-truck":
      return runFoodTruck(values, {}) as unknown as ModelOutput;
    case "subscription-box":
      return runSubscriptionBox(values, {}) as unknown as ModelOutput;
    case "candle-bath-body":
      return runCandleBathBody(values, {}) as unknown as ModelOutput;
    case "print-on-demand":
      return runPrintOnDemand(values, {}) as unknown as ModelOutput;
    case "digital-products":
      return runDigitalProducts(values, {}) as unknown as ModelOutput;
    case "reseller":
      return runReseller(values, {}) as unknown as ModelOutput;
    case "cleaning-service":
      return runCleaningService(values, {}) as unknown as ModelOutput;
    case "house-flipping":
      return runHouseFlipping(values, {}) as unknown as ModelOutput;
    case "slime-business":
      return runSlimeBusiness(values, {}) as unknown as ModelOutput;
    default:
      return emptyOutput();
  }
}

function emptyOutput(): ModelOutput {
  return {
    grossRevenue: 0,
    costOfGoods: 0,
    platformAndShipping: 0,
    netProfit: 0,
    profitMargin: 0,
    ordersPerMonth: 0,
    growth: {
      launch: { months: "1–3", netProfit: 0, label: "Coming soon" },
      traction: { months: "4–8", netProfit: 0, label: "Coming soon" },
      scale: { months: "9–12", netProfit: 0, label: "Coming soon" },
    },
    costBreakdown: [],
    insight: "Model coming soon for this vertical.",
  };
}

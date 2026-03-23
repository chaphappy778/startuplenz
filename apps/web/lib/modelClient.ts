/**
 * modelClient.ts
 *
 * Thin client that bridges the calculator UI to the vertical model package.
 * Today it runs a mock; when the real package lands, swap the import and
 * call signature — the rest of the UI needs no changes.
 *
 * Integration checklist (see README section "Wiring the real model"):
 *  1. Install @startuplenz/vertical-models from packages/vertical-models
 *  2. Replace the MOCK_OUTPUT block with: import { runModel } from '@startuplenz/vertical-models'
 *  3. Map SliderValues → the model's expected input shape (may need key renames)
 *  4. If the model is async (hits Supabase for live cost snapshots), await it and
 *     add loading state in AssumptionsPanel / page component
 *  5. Pass verticalSlug so the model knows which formula set to use
 */

import type { ModelOutput, SliderValues } from "./types";

// ─── Mock implementation ──────────────────────────────────────────────────────
// Scales output linearly with ordersPerMonth so sliders feel live.
// Replace this entire function body when integrating the real model.

function runMockModel(values: SliderValues, _verticalSlug: string): ModelOutput {
  const orders = values["ordersPerMonth"] ?? 10;
  const avgPrice = values["avgOrderValue"] ?? 38;
  const materialCost = values["materialCostPerUnit"] ?? 8;
  const packagingCost = values["packagingCostPerUnit"] ?? 3;
  const platformFeePct = (values["platformFeePct"] ?? 10) / 100;
  const shippingCost = values["shippingCostPerOrder"] ?? 7.6;

  const grossRevenue = orders * avgPrice;
  const cogs = orders * (materialCost + packagingCost);
  const platformFees = grossRevenue * platformFeePct;
  const shippingTotal = orders * shippingCost;
  const platformAndShipping = platformFees + shippingTotal;
  const netProfit = grossRevenue - cogs - platformAndShipping;
  const profitMargin = grossRevenue > 0 ? netProfit / grossRevenue : 0;

  const scale = orders / 10; // relative to baseline

  return {
    grossRevenue: Math.round(grossRevenue),
    costOfGoods: Math.round(cogs),
    platformAndShipping: Math.round(platformAndShipping),
    netProfit: Math.round(netProfit),
    profitMargin,
    ordersPerMonth: orders,
    growth: {
      launch: {
        months: "1–3",
        netProfit: Math.round(netProfit * 0.26),
        label: "Small drops, building audience",
      },
      traction: {
        months: "4–8",
        netProfit: Math.round(netProfit * 0.65),
        label: "Social following grows",
      },
      scale: {
        months: "9–12",
        netProfit: Math.round(netProfit),
        label: "Full drops, loyal base",
      },
    },
    costBreakdown: [
      { label: "Materials", value: Math.round(orders * materialCost), pct: 0 },
      { label: "Packaging", value: Math.round(orders * packagingCost), pct: 0 },
      { label: "Platform fees", value: Math.round(platformFees), pct: 0 },
      { label: "Shipping", value: Math.round(shippingTotal), pct: 0 },
    ].map((item) => ({
      ...item,
      pct: grossRevenue > 0 ? item.value / grossRevenue : 0,
    })),
    insight: buildInsight(profitMargin, orders),
  };
}

function buildInsight(margin: number, orders: number): string {
  if (margin >= 0.4) return "Excellent margins. You have room to reinvest in marketing or reduce prices to grow faster.";
  if (margin >= 0.25) return "Healthy margins for a small brand. Focus on growing order size to push profitability higher.";
  if (margin >= 0.1) return "Margins are thin — look at reducing material or shipping costs before scaling volume.";
  if (margin >= 0) return "You're breaking even. One price increase or cost cut could flip this to profit quickly.";
  return "You're losing money at this volume. Increase prices or reduce costs before launching.";
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Run the vertical model for the given slider values.
 *
 * @param values   - Current slider state (key → numeric value)
 * @param vertical - Vertical slug (e.g. "handmade-craft")
 * @returns        ModelOutput — all numbers needed by the UI
 *
 * When integrating the real model:
 *   - If synchronous: keep the same signature, just swap the body
 *   - If async:       change return type to Promise<ModelOutput> and
 *                     add `await` at every call site (modelClient.ts → page.tsx)
 */
export function computeModel(values: SliderValues, vertical: string): ModelOutput {
  return runMockModel(values, vertical);
}

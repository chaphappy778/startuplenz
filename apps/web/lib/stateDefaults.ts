// apps/web/lib/stateDefaults.ts
//
// Reader for the `state_defaults` table. Used (today) by the house-flipping
// calculator to pre-fill location-sensitive sliders when a user selects
// their state. Vertical-agnostic schema, so future location-aware verticals
// can join the same source.

import { createClient } from "@/lib/supabase/server";

export interface StateDefaultRow {
  state_code: string;
  state_name: string;
  property_tax_rate_pct: number;
  insurance_avg_per_month: number;
  realtor_commission_pct: number;
  median_arv: number;
  typical_holding_months: number;
}

/** All state rows, sorted alphabetically by name. */
export async function getAllStateDefaults(): Promise<StateDefaultRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("state_defaults")
    .select(
      "state_code, state_name, property_tax_rate_pct, insurance_avg_per_month, realtor_commission_pct, median_arv, typical_holding_months",
    )
    .order("state_name", { ascending: true });
  if (error) {
    console.error("[stateDefaults] load failed:", error);
    return [];
  }
  return (data ?? []) as StateDefaultRow[];
}

/**
 * Compute the per-input slider override values for a given state row.
 * Keyed by `vertical_inputs.input_key`. Returns an empty object when no
 * state is selected.
 *
 * Holding cost formula:
 *   monthly tax  = (median_arv × property_tax_rate_pct / 100) / 12
 *   + monthly insurance (from state row)
 *   + ~$150/month utility allowance (water, electric, gas while vacant)
 *
 * This matches how a real flipper computes carry: tax burden on the
 * purchase property + insurance + minimum utility load.
 */
export function houseFlippingOverridesForState(
  row: StateDefaultRow,
): Record<string, number> {
  const monthlyTax = (Number(row.median_arv) * Number(row.property_tax_rate_pct) / 100) / 12;
  const monthlyInsurance = Number(row.insurance_avg_per_month);
  const utilityAllowance = 150;
  const holdingCostsPerMonth = Math.round(monthlyTax + monthlyInsurance + utilityAllowance);

  // Round purchase price to nearest $5K (slider step is 5000).
  const purchasePrice = Math.round(Number(row.median_arv) * 0.65 / 5000) * 5000;
  // ARV ≈ median home value for the state, rounded to slider step.
  const arv = Math.round(Number(row.median_arv) / 5000) * 5000;
  // Holding months from the state row, but kept within the slider's step.
  const holdingMonths =
    Math.round(Number(row.typical_holding_months) * 2) / 2;
  // Commission is already in % units.
  const realtorCommissionPct = Number(row.realtor_commission_pct);

  return {
    purchase_price:          purchasePrice,
    after_repair_value:      arv,
    holding_costs_per_month: holdingCostsPerMonth,
    holding_time_months:     holdingMonths,
    realtor_commission_pct:  realtorCommissionPct,
  };
}

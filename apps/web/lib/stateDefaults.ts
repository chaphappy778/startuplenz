// apps/web/lib/stateDefaults.ts
//
// Reader for the `state_defaults` table. Used (today) by the house-flipping
// calculator to pre-fill location-sensitive sliders when a user selects
// their state. Vertical-agnostic schema, so future location-aware verticals
// can join the same source.
//
// IMPORTANT: this module imports the server-side Supabase client and must
// NOT be imported from "use client" components. Client components should
// import the pure helpers from `./stateDefaultsShared` instead.

import { createClient } from "@/lib/supabase/server";
import type { StateDefaultRow } from "@/lib/stateDefaultsShared";

export type { StateDefaultRow } from "@/lib/stateDefaultsShared";
export { houseFlippingOverridesForState } from "@/lib/stateDefaultsShared";

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

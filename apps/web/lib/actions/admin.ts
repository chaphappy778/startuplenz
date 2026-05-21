"use server";

// apps/web/lib/actions/admin.ts
// Admin-only server actions. Each one verifies admin status server-side
// before bypassing RLS via the service role client.

import { revalidatePath } from "next/cache";

import { isAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export interface SimpleResult {
  ok: boolean;
  error?: string;
}

/**
 * Update a single input row's default_value (and optionally display fields).
 * Service-role write — gated by isAdmin().
 */
export async function updateInputField(input: {
  inputId: string;
  field: "default_value" | "min_value" | "max_value" | "step_size" | "display_label" | "unit_label" | "help_text";
  value: string | number;
}): Promise<SimpleResult> {
  if (!(await isAdmin())) {
    return { ok: false, error: "Admin access required." };
  }

  const supabase = createAdminClient();
  const payload: Record<string, unknown> = {};

  if (input.field === "display_label" || input.field === "unit_label" || input.field === "help_text") {
    payload[input.field] = String(input.value);
  } else {
    const num = typeof input.value === "number" ? input.value : Number(input.value);
    if (!Number.isFinite(num)) {
      return { ok: false, error: `${input.field} must be a number.` };
    }
    payload[input.field] = num;
  }

  const { error } = await supabase
    .from("vertical_inputs")
    .update(payload)
    .eq("id", input.inputId);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/inputs");
  return { ok: true };
}

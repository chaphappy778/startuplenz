"use server";

// apps/web/lib/actions/plans.ts
//
// Server actions for Phase 4, saved plans persistence.
//
// Required preconditions:
//   • User is authenticated (auth_user_id() in RLS returns non-null).
//   • The users row was auto-created by the auth_trigger (migration 12),
//     meaning users.auth_user_id = auth.uid() exists for the current session.
//   • saved_plans / plan_snapshots RLS policies (migration 7) grant the user
//     access to their own rows.

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import type { SliderValues } from "@/lib/types";

export interface SavePlanResult {
  ok: boolean;
  planId?: string;
  error?: string;
}

export interface SimpleResult {
  ok: boolean;
  error?: string;
}

/**
 * Save a new plan for the current user.
 * Writes one row to saved_plans + one to plan_snapshots (version 1).
 *
 * Returns the new plan id on success. RLS does the auth check, we just
 * supply user_id via the auth_user_id() helper that already gates writes.
 */
export async function savePlan(input: {
  verticalSlug: string;
  values: SliderValues;
  computedOutputs?: Record<string, number | string>;
  name?: string;
  description?: string;
}): Promise<SavePlanResult> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return { ok: false, error: "You must be signed in to save a plan." };
  }

  // Resolve the app users.id from auth.uid()
  const { data: appUser, error: appUserError } = await supabase
    .from("users")
    .select("id")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  if (appUserError || !appUser) {
    return {
      ok: false,
      error:
        "Account record is missing. Sign out and back in, then try again.",
    };
  }

  // Resolve vertical id from slug
  const { data: vertical, error: verticalError } = await supabase
    .from("verticals")
    .select("id")
    .eq("slug", input.verticalSlug)
    .eq("is_active", true)
    .maybeSingle();
  if (verticalError || !vertical) {
    return { ok: false, error: `Unknown vertical: ${input.verticalSlug}` };
  }

  // Insert the saved plan
  const { data: plan, error: planError } = await supabase
    .from("saved_plans")
    .insert({
      user_id: appUser.id,
      vertical_id: vertical.id,
      name: (input.name || "Untitled Plan").trim() || "Untitled Plan",
      description: input.description ?? null,
      slider_values: input.values,
    })
    .select("id")
    .single();
  if (planError || !plan) {
    return { ok: false, error: `Couldn't save plan: ${planError?.message}` };
  }

  // Append version 1 to plan_snapshots
  const { error: snapError } = await supabase.from("plan_snapshots").insert({
    saved_plan_id: plan.id,
    version_number: 1,
    slider_values: input.values,
    computed_outputs: input.computedOutputs ?? {},
  });
  if (snapError) {
    // The plan row landed but the snapshot didn't, surface but don't roll back,
    // since the plan itself is recoverable.
    return {
      ok: true,
      planId: plan.id,
      error: `Plan saved but snapshot v1 failed: ${snapError.message}`,
    };
  }

  revalidatePath("/plans");
  return { ok: true, planId: plan.id };
}

/**
 * Update an existing plan in place. Bumps slider_values + name + updated_at
 * on saved_plans, and appends a new plan_snapshots row with the next
 * version_number. RLS scopes both writes to the owner.
 */
export async function updatePlan(input: {
  planId: string;
  values: SliderValues;
  computedOutputs?: Record<string, number | string>;
  name?: string;
}): Promise<SavePlanResult> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return { ok: false, error: "You must be signed in to update a plan." };
  }

  // Update the saved_plans row. RLS confirms ownership.
  const updatePayload: Record<string, unknown> = {
    slider_values: input.values,
    updated_at: new Date().toISOString(),
  };
  if (typeof input.name === "string" && input.name.trim().length > 0) {
    updatePayload.name = input.name.trim();
  }

  const { data: updated, error: updateError } = await supabase
    .from("saved_plans")
    .update(updatePayload)
    .eq("id", input.planId)
    .select("id")
    .maybeSingle();
  if (updateError || !updated) {
    return {
      ok: false,
      error: updateError?.message ?? "Plan not found or not yours.",
    };
  }

  // Figure out the next version number
  const { data: lastVersion } = await supabase
    .from("plan_snapshots")
    .select("version_number")
    .eq("saved_plan_id", input.planId)
    .order("version_number", { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextVersion = (lastVersion?.version_number ?? 0) + 1;

  const { error: snapError } = await supabase.from("plan_snapshots").insert({
    saved_plan_id: input.planId,
    version_number: nextVersion,
    slider_values: input.values,
    computed_outputs: input.computedOutputs ?? {},
  });
  if (snapError) {
    return {
      ok: true,
      planId: input.planId,
      error: `Plan updated but snapshot v${nextVersion} failed: ${snapError.message}`,
    };
  }

  revalidatePath(`/plans/${input.planId}`);
  revalidatePath("/plans");
  return { ok: true, planId: input.planId };
}

/**
 * Permanently delete a plan and its snapshots (cascade via FK).
 */
export async function deletePlan(planId: string): Promise<SimpleResult> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return { ok: false, error: "You must be signed in to delete a plan." };
  }

  const { error: deleteError } = await supabase
    .from("saved_plans")
    .delete()
    .eq("id", planId);
  if (deleteError) {
    return { ok: false, error: deleteError.message };
  }

  revalidatePath("/plans");
  return { ok: true };
}

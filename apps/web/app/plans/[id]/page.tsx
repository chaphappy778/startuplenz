// apps/web/app/plans/[id]/page.tsx
//
// Load a saved plan and render the calculator pre-populated with its values.
// Auth-gated: only the plan owner can view (enforced by RLS — non-owners
// receive zero rows and get a 404).

import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth";
import CalculatorClient from "@/components/CalculatorClient";
import type { SliderDef, SliderValues } from "@/lib/types";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function SavedPlanPage({ params }: PageProps) {
  const { id } = await params;

  // Must be logged in
  const user = await getUser();
  if (!user) {
    redirect(`/login?next=/plans/${id}`);
  }

  const supabase = await createClient();

  // RLS scopes this read to the owner. Non-owners get 0 rows, which becomes 404.
  const { data: plan, error: planError } = await supabase
    .from("saved_plans")
    .select(
      "id, name, description, slider_values, vertical_id, created_at, updated_at, verticals(slug, display_name, is_active)",
    )
    .eq("id", id)
    .maybeSingle();

  if (planError || !plan) notFound();

  // Type-narrow the joined vertical
  const vertical = Array.isArray(plan.verticals) ? plan.verticals[0] : plan.verticals;
  if (!vertical || !vertical.is_active) notFound();

  // Pull the slider defs for this vertical from vertical_inputs
  const { data: inputRows } = await supabase
    .from("vertical_inputs")
    .select(
      "input_key, display_label, unit_label, default_value, min_value, max_value, step_size, formula_key, is_live_data, sort_order, help_text",
    )
    .eq("vertical_id", plan.vertical_id)
    .order("sort_order", { ascending: true });

  if (!inputRows || inputRows.length === 0) {
    return (
      <main className="model-page">
        <header className="model-page-header">
          <h1 className="model-page-title">{plan.name}</h1>
        </header>
        <p className="model-page-empty">
          This plan&rsquo;s vertical has no inputs configured anymore. Open a
          fresh model and re-save.
        </p>
      </main>
    );
  }

  const sliders: SliderDef[] = inputRows.map((row) => ({
    key: row.input_key,
    label: row.display_label,
    min: Number(row.min_value),
    max: Number(row.max_value),
    step: Number(row.step_size),
    defaultValue: Number(row.default_value),
    unit: row.unit_label ?? "",
    formulaKey: row.formula_key ?? row.input_key,
    isLiveData: row.is_live_data ?? false,
    sortOrder: row.sort_order ?? 0,
    helpText: row.help_text ?? undefined,
  }));

  const initialValues: SliderValues = (plan.slider_values ?? {}) as SliderValues;

  return (
    <main className="model-page">
      <div className="model-page-back">
        <Link href="/plans" className="page-back-link">My plans</Link>
      </div>
      <CalculatorClient
        verticalSlug={vertical.slug}
        verticalDisplayName={plan.name}
        verticalTagline={`${vertical.display_name} · saved plan`}
        sliders={sliders}
        initialValues={initialValues}
        signedIn={true}
        savedPlan={{
          id: plan.id,
          name: plan.name,
        }}
      />
    </main>
  );
}

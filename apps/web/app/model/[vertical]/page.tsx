// apps/web/app/model/[vertical]/page.tsx

import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { canAccessVertical, getUser } from "@/lib/auth";
import CalculatorClient from "@/components/CalculatorClient";
import VerticalExplainer from "@/components/VerticalExplainer";
import { getVerticalContent } from "@/lib/verticalContent";
import { verticalMetadata } from "@/lib/seo";
import type { SliderDef } from "@/lib/types";

interface PageProps {
  params: Promise<{ vertical: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { vertical } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("verticals")
    .select("slug, display_name")
    .eq("slug", vertical)
    .maybeSingle();
  const displayName = data?.display_name ?? "Startup cost model";
  return verticalMetadata(vertical, displayName);
}

export default async function VerticalModelPage({ params }: PageProps) {
  const { vertical } = await params;
  const supabase = await createClient();

  const { data: verticalData } = await supabase
    .from("verticals")
    .select("id, slug, display_name, is_active")
    .eq("slug", vertical)
    .eq("is_active", true)
    .maybeSingle();

  if (!verticalData) notFound();

  const accessible = await canAccessVertical(verticalData.id);
  const user = await getUser();

  if (!accessible) {
    redirect(user ? "/pricing" : `/signup?next=/model/${vertical}`);
  }

  const content = getVerticalContent(verticalData.slug);

  const { data: inputRows, error: inputsError } = await supabase
    .from("vertical_inputs")
    .select(
      "input_key, display_label, unit_label, default_value, min_value, max_value, step_size, formula_key, is_live_data, sort_order, help_text",
    )
    .eq("vertical_id", verticalData.id)
    .order("sort_order", { ascending: true });

  if (inputsError || !inputRows || inputRows.length === 0) {
    return (
      <main className="model-page">
        <header className="model-page-header">
          <h1 className="model-page-title">
            {verticalData.display_name} Cost Model
          </h1>
        </header>
        <p className="model-page-empty">
          No inputs are configured yet for this vertical. Check back soon.
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

  return (
    <main className="model-page">
      <div className="model-page-back">
        <Link href="/verticals" className="page-back-link">All verticals</Link>
      </div>

      <CalculatorClient
        verticalSlug={verticalData.slug}
        verticalDisplayName={verticalData.display_name}
        verticalTagline={content.heroParagraph}
        sliders={sliders}
        signedIn={!!user}
      />

      <VerticalExplainer
        displayName={verticalData.display_name}
        content={content}
      />
    </main>
  );
}

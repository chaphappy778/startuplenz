// apps/web/app/goal/[vertical]/page.tsx
//
// "How to make $X/mo with [vertical]" SEO landing page. Same calculator as
// /model/[vertical] but pre-framed around a profit target. The target comes
// from ?net= (default $5,000/mo).

import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { canAccessVertical, getUser } from "@/lib/auth";
import CalculatorClient from "@/components/CalculatorClient";
import VerticalExplainer from "@/components/VerticalExplainer";
import { getVerticalContent } from "@/lib/verticalContent";
import { SITE_URL } from "@/lib/seo";
import type { SliderDef } from "@/lib/types";

interface PageProps {
  params: Promise<{ vertical: string }>;
  searchParams: Promise<{ net?: string }>;
}

// Common target presets used in sitemap + canonical URL math
const COMMON_TARGETS = [1000, 2500, 5000, 10000, 25000];

function parseTarget(raw: string | undefined): number {
  if (!raw) return 5000;
  const n = parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 0) return 5000;
  return Math.min(n, 1_000_000);
}

function formatTargetForTitle(n: number): string {
  if (n >= 1000 && n % 1000 === 0) return `$${n / 1000}k`;
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}k`;
  return `$${n.toLocaleString()}`;
}

export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
  const { vertical } = await params;
  const { net } = await searchParams;
  const target = parseTarget(net);
  const targetLabel = formatTargetForTitle(target);

  const supabase = await createClient();
  const { data } = await supabase
    .from("verticals")
    .select("slug, display_name")
    .eq("slug", vertical)
    .maybeSingle();
  const displayName = data?.display_name ?? "startup";

  const title = `How to make ${targetLabel}/mo with a ${displayName}`;
  const description = `Free calculator showing exactly how many orders, what price, and which costs you need to hit ${targetLabel}/mo net profit in a ${displayName} business.`;
  const url = `${SITE_URL}/goal/${vertical}?net=${target}`;
  const og = `${SITE_URL}/opengraph-image?vertical=${encodeURIComponent(vertical)}`;

  return {
    title,
    description,
    keywords: [
      `how to make ${targetLabel} with ${displayName.toLowerCase()}`,
      `${displayName.toLowerCase()} ${targetLabel} per month`,
      `${displayName.toLowerCase()} startup income`,
      `make money with ${displayName.toLowerCase()}`,
    ],
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      url,
      siteName: "StartupLenz",
      title,
      description,
      images: [{ url: og, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [og],
    },
  };
}

export default async function GoalPage({ params, searchParams }: PageProps) {
  const { vertical } = await params;
  const { net } = await searchParams;
  const target = parseTarget(net);
  const targetLabel = formatTargetForTitle(target);

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
    redirect(user ? "/pricing" : `/signup?next=/goal/${vertical}?net=${target}`);
  }

  const content = getVerticalContent(verticalData.slug);

  const { data: inputRows } = await supabase
    .from("vertical_inputs")
    .select("input_key, display_label, unit_label, default_value, min_value, max_value, step_size, formula_key, is_live_data, sort_order, help_text")
    .eq("vertical_id", verticalData.id)
    .order("sort_order", { ascending: true });

  if (!inputRows || inputRows.length === 0) {
    return (
      <main className="model-page">
        <header className="model-page-header">
          <Link href="/" className="page-back-link">All verticals</Link>
          <h1 className="model-page-title">{verticalData.display_name} — coming soon</h1>
        </header>
        <p className="model-page-empty">
          No inputs configured yet for this vertical.
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
      <header className="model-page-header">
        <Link href={`/model/${verticalData.slug}`} className="page-back-link">
          {verticalData.display_name} calculator
        </Link>
        <h1 className="model-page-title">
          How to make {targetLabel}/mo with a {verticalData.display_name}
        </h1>
        <p className="vertical-hero-paragraph">
          The Goal Seek panel below is pre-filled with your target. Pick which
          lever to move and we&rsquo;ll show exactly what needs to change. The
          full calculator is right below it — adjust anything, watch the
          numbers update in real time.
        </p>

        <div className="goal-target-presets">
          <span className="goal-target-presets-label">Try another target:</span>
          {COMMON_TARGETS.filter((t) => t !== target).map((t) => (
            <Link
              key={t}
              href={`/goal/${verticalData.slug}?net=${t}`}
              className="goal-target-preset"
            >
              {formatTargetForTitle(t)}/mo
            </Link>
          ))}
        </div>
      </header>

      <CalculatorClient
        verticalSlug={verticalData.slug}
        verticalDisplayName={verticalData.display_name}
        verticalTagline={`Target: ${targetLabel}/month net profit`}
        sliders={sliders}
        signedIn={!!user}
        initialGoalTarget={target}
      />

      <VerticalExplainer
        displayName={verticalData.display_name}
        content={content}
      />
    </main>
  );
}

// apps/web/app/compare/page.tsx
//
// Side-by-side cost-model comparison of two verticals. SEO play for "X vs Y"
// long-tail queries. Each unordered pair becomes one indexable page.

import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { computeModel } from "@/lib/modelClient";
import { SITE_URL, baseMetadata } from "@/lib/seo";
import type { ModelOutput, SliderValues } from "@/lib/types";

interface SearchParams { a?: string; b?: string }
interface PageProps { searchParams: Promise<SearchParams> }

interface VerticalRow {
  id: string;
  slug: string;
  display_name: string;
  description: string | null;
}

// ─── Metadata ────────────────────────────────────────────────────────────────

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const { a, b } = await searchParams;
  if (!a || !b) {
    return baseMetadata({
      title: "Compare verticals, StartupLenz",
      description: "Side-by-side cost comparison between any two startup verticals, free, no signup.",
    });
  }
  const supabase = await createClient();
  const { data } = await supabase
    .from("verticals")
    .select("slug, display_name")
    .in("slug", [a, b]);
  const aRow = data?.find((d) => d.slug === a);
  const bRow = data?.find((d) => d.slug === b);
  if (!aRow || !bRow) {
    return baseMetadata({
      title: "Compare verticals, StartupLenz",
      description: "Side-by-side cost comparison between any two startup verticals.",
    });
  }
  // Canonical order: alphabetical, so /compare?a=X&b=Y and ?a=Y&b=X
  // both point at the same canonical page.
  const [first, second] = [a, b].sort();
  const url = `${SITE_URL}/compare?a=${first}&b=${second}`;
  const ogImage = `${SITE_URL}/opengraph-image?vertical=${first}`;
  const title = `${aRow.display_name} vs ${bRow.display_name}, startup cost comparison`;
  const description = `Side-by-side cost model for ${aRow.display_name} and ${bRow.display_name}. See which has the better margin at typical assumptions.`;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      url,
      siteName: "StartupLenz",
      title,
      description,
      images: [{ url: ogImage, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage],
    },
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtMoney(n: number): string {
  return "$" + Math.round(n).toLocaleString();
}
function fmtPct(n: number): string {
  return (n * 100).toFixed(1) + "%";
}

async function loadComparison(slug: string): Promise<{
  vertical: VerticalRow;
  output: ModelOutput;
} | null> {
  const supabase = await createClient();
  const { data: vertical } = await supabase
    .from("verticals")
    .select("id, slug, display_name, description")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();
  if (!vertical) return null;

  const { data: inputRows } = await supabase
    .from("vertical_inputs")
    .select("input_key, default_value")
    .eq("vertical_id", vertical.id);
  if (!inputRows || inputRows.length === 0) return null;

  const defaults: SliderValues = {};
  for (const row of inputRows) defaults[row.input_key as string] = Number(row.default_value);

  const output = computeModel(defaults, vertical.slug);
  return { vertical: vertical as VerticalRow, output };
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default async function ComparePage({ searchParams }: PageProps) {
  const { a, b } = await searchParams;

  // No params → render a picker
  if (!a || !b) {
    const supabase = await createClient();
    const { data: verticals } = await supabase
      .from("verticals")
      .select("slug, display_name, description")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });
    return (
      <main className="compare-page">
        <header className="model-page-header">
          <Link href="/" className="page-back-link">All verticals</Link>
          <h1 className="model-page-title">Compare verticals</h1>
          <p className="vertical-hero-paragraph">
            Pick any two verticals and we&rsquo;ll show their cost models side
            by side at typical assumptions.
          </p>
        </header>
        <section className="compare-picker">
          <p className="compare-picker-instruction">
            Click two verticals, first becomes the left column, second becomes the right.
          </p>
          <div className="compare-picker-grid">
            {(verticals ?? []).map((v) => (
              <Link
                key={v.slug}
                href={`/compare?a=${v.slug}&b=`}
                className="compare-picker-tile"
              >
                <span className="compare-picker-name">{v.display_name}</span>
                {v.description && (
                  <span className="compare-picker-desc">{v.description}</span>
                )}
              </Link>
            ))}
          </div>
        </section>
      </main>
    );
  }

  // If we have a but no b → render a picker for the second
  if (a && !b) {
    const supabase = await createClient();
    const { data: aRow } = await supabase
      .from("verticals")
      .select("display_name")
      .eq("slug", a)
      .maybeSingle();
    const { data: verticals } = await supabase
      .from("verticals")
      .select("slug, display_name, description")
      .eq("is_active", true)
      .neq("slug", a)
      .order("sort_order", { ascending: true });
    return (
      <main className="compare-page">
        <header className="model-page-header">
          <Link href="/compare" className="page-back-link">Start over</Link>
          <h1 className="model-page-title">{aRow?.display_name ?? a} vs …</h1>
          <p className="vertical-hero-paragraph">
            Pick the second vertical to compare against.
          </p>
        </header>
        <section className="compare-picker">
          <div className="compare-picker-grid">
            {(verticals ?? []).map((v) => (
              <Link
                key={v.slug}
                href={`/compare?a=${a}&b=${v.slug}`}
                className="compare-picker-tile"
              >
                <span className="compare-picker-name">{v.display_name}</span>
                {v.description && (
                  <span className="compare-picker-desc">{v.description}</span>
                )}
              </Link>
            ))}
          </div>
        </section>
      </main>
    );
  }

  // Both slugs present → render side-by-side comparison
  const [aResult, bResult] = await Promise.all([
    loadComparison(a),
    loadComparison(b!),
  ]);

  if (!aResult || !bResult) {
    return (
      <main className="compare-page">
        <header className="model-page-header">
          <Link href="/compare" className="page-back-link">Start over</Link>
          <h1 className="model-page-title">Couldn&rsquo;t load that comparison</h1>
          <p className="model-page-empty">
            One of those slugs doesn&rsquo;t exist or has no inputs configured yet. Try a different pair.
          </p>
        </header>
      </main>
    );
  }

  const winner =
    aResult.output.netProfit === bResult.output.netProfit
      ? null
      : aResult.output.netProfit > bResult.output.netProfit
        ? aResult
        : bResult;
  const diff = Math.abs(aResult.output.netProfit - bResult.output.netProfit);

  const takeaway = winner
    ? `At default assumptions, ${winner.vertical.display_name} nets ${fmtMoney(diff)}/mo more than ${winner === aResult ? bResult.vertical.display_name : aResult.vertical.display_name}.`
    : "At default assumptions, both verticals produce the same monthly net profit. Margin and capital requirements differ, see the columns below.";

  return (
    <main className="compare-page">
      <header className="model-page-header">
        <Link href="/" className="page-back-link">All verticals</Link>
        <h1 className="model-page-title">
          {aResult.vertical.display_name} <span className="compare-vs">vs</span> {bResult.vertical.display_name}
        </h1>
        <p className="vertical-hero-paragraph">{takeaway}</p>
      </header>

      <section className="compare-columns">
        {[aResult, bResult].map((r) => (
          <article key={r.vertical.slug} className={`compare-column ${winner === r ? "winner" : ""}`}>
            <div className="compare-column-header">
              <h2 className="compare-column-title">{r.vertical.display_name}</h2>
              {winner === r && <span className="compare-winner-badge">Higher net</span>}
            </div>
            {r.vertical.description && (
              <p className="compare-column-desc">{r.vertical.description}</p>
            )}

            <div className="compare-snapshot-grid">
              <div className="compare-stat">
                <span className="compare-stat-label">Gross</span>
                <span className="compare-stat-value">{fmtMoney(r.output.grossRevenue)}</span>
              </div>
              <div className="compare-stat">
                <span className="compare-stat-label">Net profit</span>
                <span className={`compare-stat-value ${r.output.netProfit >= 0 ? "pos" : "neg"}`}>{fmtMoney(r.output.netProfit)}</span>
              </div>
              <div className="compare-stat">
                <span className="compare-stat-label">Margin</span>
                <span className={`compare-stat-value ${r.output.profitMargin >= 0 ? "pos" : "neg"}`}>{fmtPct(r.output.profitMargin)}</span>
              </div>
              <div className="compare-stat">
                <span className="compare-stat-label">Orders/mo</span>
                <span className="compare-stat-value">{r.output.ordersPerMonth.toLocaleString()}</span>
              </div>
            </div>

            <h3 className="compare-section-title">Cost breakdown</h3>
            <div className="compare-breakdown">
              {r.output.costBreakdown.map((item) => (
                <div key={item.label} className="compare-breakdown-row">
                  <span>{item.label}</span>
                  <span>{fmtMoney(item.value)} <span className="compare-breakdown-pct">{(item.pct * 100).toFixed(0)}%</span></span>
                </div>
              ))}
            </div>

            <h3 className="compare-section-title">Growth trajectory</h3>
            <div className="compare-growth">
              {(["launch", "traction", "scale"] as const).map((k) => {
                const phase = r.output.growth[k];
                return (
                  <div key={k} className="compare-growth-row">
                    <span className="compare-growth-phase">{k} · {phase.months}</span>
                    <span className={`compare-growth-value ${phase.netProfit >= 0 ? "pos" : "neg"}`}>{fmtMoney(phase.netProfit)}</span>
                  </div>
                );
              })}
            </div>

            <p className="compare-insight">{r.output.insight}</p>

            <Link href={`/model/${r.vertical.slug}`} className="compare-open-btn">
              Open {r.vertical.display_name} calculator
            </Link>
          </article>
        ))}
      </section>

      <section className="compare-footer-note">
        <p>
          Comparison uses default assumptions for both verticals. Open either
          calculator above to plug in your own numbers.
        </p>
      </section>
    </main>
  );
}

// apps/web/app/verticals/page.tsx
//
// Standalone listing of every active vertical. Linked from the global
// SiteHeader "Verticals" nav link and the home-page "Browse verticals" CTA.
// Each tile links into the calculator for that vertical.
//
// Tiles where the vertical has no `vertical_inputs` rows yet are rendered
// as inert "Soon" cards so they don't 404 when clicked.

import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import VerticalIcon from "@/components/VerticalIcon";
import { baseMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";

interface VerticalRow {
  id: string;
  slug: string;
  display_name: string;
  description: string | null;
  icon_key: string | null;
  is_active: boolean;
  sort_order: number;
}

export const metadata: Metadata = baseMetadata({
  title: "All verticals, StartupLenz",
  description:
    "Browse every startup vertical we model. Pick one to see real margin, break-even, and cost breakdown for that specific business.",
});

export default async function VerticalsPage() {
  const supabase = await createClient();

  const { data: verticals } = await supabase
    .from("verticals")
    .select("id, slug, display_name, description, icon_key, is_active, sort_order")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  const rows: VerticalRow[] = (verticals ?? []) as VerticalRow[];

  // Check inputs configured for each vertical, "Soon" tiles for empty ones.
  const inputCounts: Record<string, number> = {};
  await Promise.all(
    rows.map(async (v) => {
      const { count } = await supabase
        .from("vertical_inputs")
        .select("id", { count: "exact", head: true })
        .eq("vertical_id", v.id);
      inputCounts[v.id] = count ?? 0;
    }),
  );

  const readyCount = rows.filter((v) => (inputCounts[v.id] ?? 0) > 0).length;

  return (
    <main className="verticals-page">
      <header className="verticals-page-header">
        <span className="home-section-eyebrow">All verticals</span>
        <h1 className="verticals-page-title">
          {readyCount} verticals modeled, more on the way
        </h1>
        <p className="verticals-page-sub">
          Each calculator is hand-tuned with real-world inputs for that
          specific business, marketplace fees, materials cost, labor rates,
          channel mix. Pick one to start.
        </p>
      </header>

      <div className="verticals-page-grid">
        {rows.map((v) => {
          const isReady = (inputCounts[v.id] ?? 0) > 0;
          const inner = (
            <>
              <span className="vertical-icon-wrap">
                <VerticalIcon iconKey={v.icon_key} className="vertical-icon-svg" />
              </span>
              <div className="verticals-page-card-body">
                <span className="vertical-name">{v.display_name}</span>
                {v.description && (
                  <span className="vertical-desc">{v.description}</span>
                )}
              </div>
              {!isReady && <span className="soon-badge">Soon</span>}
            </>
          );
          const className = `vertical-card verticals-page-card ${isReady ? "" : "soon"}`.trim();
          return isReady ? (
            <Link key={v.id} href={`/model/${v.slug}`} className={className}>
              {inner}
            </Link>
          ) : (
            <div key={v.id} className={className} role="link" aria-disabled="true">
              {inner}
            </div>
          );
        })}
      </div>
    </main>
  );
}

// apps/web/components/VerticalSelector.tsx
//
// Server component — reads active verticals from Supabase and renders a tile
// per row. Tiles where the vertical has no `vertical_inputs` rows yet are
// marked "Soon" so they don't 404 when clicked.
//
// To add a new tile: insert into the verticals table + seed its
// vertical_inputs. The home page picks it up automatically on next load.

import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import VerticalIcon from "@/components/VerticalIcon";

interface VerticalRow {
  id: string;
  slug: string;
  display_name: string;
  description: string | null;
  icon_key: string | null;
  is_active: boolean;
  sort_order: number;
}

interface Props {
  activeSlug?: string;
}

export default async function VerticalSelector({ activeSlug }: Props) {
  const supabase = await createClient();

  const { data: verticals } = await supabase
    .from("verticals")
    .select("id, slug, display_name, description, icon_key, is_active, sort_order")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  const rows: VerticalRow[] = (verticals ?? []) as VerticalRow[];

  // For each vertical, check whether it has any inputs (otherwise it'll
  // soft-fail to "No inputs configured yet" when clicked).
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

  return (
    <div className="vertical-selector">
      <p className="selector-label">Choose your business type</p>
      <div className="vertical-grid">
        {rows.map((v) => {
          const isActive = v.slug === activeSlug;
          const isReady = (inputCounts[v.id] ?? 0) > 0;
          const cardChildren = (
            <>
              <span className="vertical-icon-wrap">
                <VerticalIcon iconKey={v.icon_key} className="vertical-icon-svg" />
              </span>
              <span className="vertical-name">{v.display_name}</span>
              {v.description && (
                <span className="vertical-desc">{v.description}</span>
              )}
              {!isReady && <span className="soon-badge">Soon</span>}
            </>
          );
          const className = `vertical-card ${isActive ? "active" : ""} ${isReady ? "" : "soon"}`.trim();

          // Ready tiles render as real <Link> elements; soon-tiles render as
          // inert <div>s so we don't need a client-side onClick to suppress
          // navigation (server components can't ship event handlers).
          return isReady ? (
            <Link key={v.id} href={`/model/${v.slug}`} className={className}>
              {cardChildren}
            </Link>
          ) : (
            <div
              key={v.id}
              className={className}
              role="link"
              aria-disabled="true"
            >
              {cardChildren}
            </div>
          );
        })}
      </div>
    </div>
  );
}

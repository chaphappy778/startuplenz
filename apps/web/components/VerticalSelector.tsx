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

// Map icon_key strings from the DB to display icons. Falling back to a
// neutral square so a missing icon_key never crashes the page.
const ICON: Record<string, string> = {
  "icon-scissors":  "✂️",
  "icon-truck":     "🚚",
  "icon-box":       "📦",
  "icon-flame":     "🕯️",
  "icon-shirt":     "👕",
  "icon-laptop":    "💻",
  "icon-tag":       "🏷️",
  "icon-broom":     "🧹",
  "icon-camera":    "📷",
  "icon-paw":       "🐾",
  "icon-house":     "🏠",
  "icon-slime":     "🫧",
  "handmade":       "🕯️",
};
function iconFor(key: string | null): string {
  if (!key) return "🗂️";
  return ICON[key] ?? "🗂️";
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
              <span className="vertical-icon">{iconFor(v.icon_key)}</span>
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

// apps/web/components/home/VerticalMarquee.tsx
//
// Home-page-only display of the verticals: two full-width rows scrolling in
// opposite directions. Hovering anywhere on the marquee pauses both rows so
// the user can click a card without it sliding out from under them.
//
// To keep the loop visually seamless, each row renders the source list TWICE
// and animates from 0 → -50% of the row's width. When the animation wraps to
// its start, the duplicated half is in the exact position the first half was,
// so the eye doesn't see a jump.
//
// Server component, pure markup, no client JS. Pause-on-hover is pure CSS.

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
  // Supabase returns related-table aggregates as a nested array
  vertical_inputs: { count: number }[] | null;
}

export default async function VerticalMarquee() {
  const supabase = await createClient();

  // Single round-trip: fetch all active verticals AND their input counts
  // via Supabase's PostgREST nested-aggregate syntax. The previous version
  // ran one query for verticals plus N more (one per vertical) for input
  // counts, which was 11 sequential calls for the current 10-vertical set.
  // This folds it to 1.
  const { data: verticals } = await supabase
    .from("verticals")
    .select(
      "id, slug, display_name, description, icon_key, is_active, sort_order, vertical_inputs(count)",
    )
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  const rows: VerticalRow[] = (verticals ?? []) as VerticalRow[];

  // Build the same input-count map the rest of this component expects,
  // sourced from the joined data rather than per-vertical lookups.
  const inputCounts: Record<string, number> = {};
  for (const v of rows) {
    inputCounts[v.id] = v.vertical_inputs?.[0]?.count ?? 0;
  }

  if (rows.length === 0) {
    return (
      <div className="marquee-empty">
        No verticals available yet.
      </div>
    );
  }

  // Split into two rows that scroll in opposite directions. Splitting the
  // source list (instead of using the same list twice) gives the user more
  // variety on screen at once.
  const half = Math.ceil(rows.length / 2);
  const topRow = rows.slice(0, half);
  const bottomRow = rows.slice(half).length > 0 ? rows.slice(half) : rows;

  return (
    <div className="vertical-marquee">
      <div className="vertical-marquee-row vertical-marquee-row-left">
        {[...topRow, ...topRow].map((v, i) => (
          <MarqueeCard
            key={`${v.id}-${i}`}
            vertical={v}
            isReady={(inputCounts[v.id] ?? 0) > 0}
          />
        ))}
      </div>
      <div className="vertical-marquee-row vertical-marquee-row-right">
        {[...bottomRow, ...bottomRow].map((v, i) => (
          <MarqueeCard
            key={`${v.id}-${i}`}
            vertical={v}
            isReady={(inputCounts[v.id] ?? 0) > 0}
          />
        ))}
      </div>
    </div>
  );
}

function MarqueeCard({
  vertical,
  isReady,
}: {
  vertical: VerticalRow;
  isReady: boolean;
}) {
  const inner = (
    <>
      <span className="vertical-icon-wrap">
        <VerticalIcon iconKey={vertical.icon_key} className="vertical-icon-svg" />
      </span>
      <span className="vertical-name">{vertical.display_name}</span>
      {vertical.description && (
        <span className="vertical-desc">{vertical.description}</span>
      )}
      {!isReady && <span className="soon-badge">Soon</span>}
    </>
  );
  const className = `vertical-card marquee-card ${isReady ? "" : "soon"}`.trim();

  return isReady ? (
    <Link href={`/model/${vertical.slug}`} className={className}>
      {inner}
    </Link>
  ) : (
    <div className={className} role="link" aria-disabled="true">
      {inner}
    </div>
  );
}

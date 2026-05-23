// apps/web/app/admin/inputs/page.tsx
// List of all verticals with input counts. Click in to edit defaults.

import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

interface VerticalRow {
  id: string;
  slug: string;
  display_name: string;
  is_active: boolean;
}

export default async function AdminInputsIndexPage() {
  const supabase = await createClient();

  const { data: verticals } = await supabase
    .from("verticals")
    .select("id, slug, display_name, is_active")
    .order("sort_order", { ascending: true });

  const rows: VerticalRow[] = (verticals ?? []) as VerticalRow[];

  // Count inputs per vertical
  const counts: Record<string, number> = {};
  await Promise.all(
    rows.map(async (v) => {
      const { count } = await supabase
        .from("vertical_inputs")
        .select("id", { count: "exact", head: true })
        .eq("vertical_id", v.id);
      counts[v.id] = count ?? 0;
    }),
  );

  return (
    <div>
      <header className="admin-header">
        <h1>Vertical inputs</h1>
        <p className="admin-sub">
          Pick a vertical to edit its slider defaults. Changes save to
          <code> vertical_inputs.default_value</code> and take effect immediately
         , no deploy required.
        </p>
      </header>

      <ul className="admin-list">
        {rows.map((v) => (
          <li key={v.id} className="admin-list-row">
            <Link href={`/admin/inputs/${v.slug}`} className="admin-list-link">
              <div>
                <div className="admin-list-name">{v.display_name}</div>
                <div className="admin-list-meta">
                  <code>{v.slug}</code> · {counts[v.id]} inputs
                </div>
              </div>
              <span className="admin-list-arrow">→</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

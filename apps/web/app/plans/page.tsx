// apps/web/app/plans/page.tsx
//
// "My plans", list view of the signed-in user's saved plans, newest first.

import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth";

interface PlanRow {
  id: string;
  name: string;
  updated_at: string;
  created_at: string;
  verticals: { slug: string; display_name: string } | { slug: string; display_name: string }[] | null;
}

function formatRelative(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const diffMs = Date.now() - d.getTime();
  const mins = Math.round(diffMs / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export default async function PlansIndexPage() {
  const user = await getUser();
  if (!user) {
    redirect("/login?next=/plans");
  }

  const supabase = await createClient();
  const { data: plans, error } = await supabase
    .from("saved_plans")
    .select("id, name, updated_at, created_at, verticals(slug, display_name)")
    .eq("is_archived", false)
    .order("updated_at", { ascending: false });

  const rows: PlanRow[] = (plans ?? []) as PlanRow[];

  return (
    <main className="model-page">
      <header className="model-page-header plans-index-header">
        <div>
          <h1 className="model-page-title">My plans</h1>
          <p className="model-page-subtitle">
            {rows.length === 0
              ? "No saved plans yet"
              : `${rows.length} ${rows.length === 1 ? "plan" : "plans"}`}
          </p>
        </div>
        <Link href="/" className="calc-toolbar-btn primary plans-index-new">
          + New plan
        </Link>
      </header>

      {error && (
        <p className="model-page-empty" style={{ color: "var(--red)" }}>
          Couldn&rsquo;t load your plans: {error.message}
        </p>
      )}

      {!error && rows.length === 0 && (
        <p className="model-page-empty">
          You haven&rsquo;t saved any plans yet. Open a vertical, set your
          assumptions, then click <strong>Save plan</strong>.
        </p>
      )}

      {rows.length > 0 && (
        <ul className="plans-list">
          {rows.map((p) => {
            const v = Array.isArray(p.verticals) ? p.verticals[0] : p.verticals;
            return (
              <li key={p.id} className="plans-row">
                <Link href={`/plans/${p.id}`} className="plans-row-main">
                  <span className="plans-row-name">{p.name}</span>
                  <span className="plans-row-meta">
                    {v?.display_name ?? "-"} · updated {formatRelative(p.updated_at)}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}

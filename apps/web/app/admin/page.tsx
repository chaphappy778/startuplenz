// apps/web/app/admin/page.tsx
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function AdminHomePage() {
  const supabase = await createClient();

  const [verticalCount, inputCount, planCount, userCount] = await Promise.all([
    supabase.from("verticals").select("id", { count: "exact", head: true }),
    supabase.from("vertical_inputs").select("id", { count: "exact", head: true }),
    supabase.from("saved_plans").select("id", { count: "exact", head: true }),
    supabase.from("users").select("id", { count: "exact", head: true }),
  ]);

  const cards = [
    { label: "Verticals",       count: verticalCount.count ?? 0, href: "/admin/inputs" },
    { label: "Inputs (rows)",   count: inputCount.count ?? 0,    href: "/admin/inputs" },
    { label: "Saved plans",     count: planCount.count ?? 0,     href: "/admin"        },
    { label: "Accounts",        count: userCount.count ?? 0,     href: "/admin"        },
  ];

  return (
    <div>
      <header className="admin-header">
        <h1>Overview</h1>
        <p className="admin-sub">Operator dashboard. Manual edits only — auto-update will layer in later.</p>
      </header>
      <div className="admin-stats">
        {cards.map((c) => (
          <Link key={c.label} href={c.href} className="admin-stat-card">
            <span className="admin-stat-num">{c.count.toLocaleString()}</span>
            <span className="admin-stat-label">{c.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

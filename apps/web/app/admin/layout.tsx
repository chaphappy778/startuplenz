// apps/web/app/admin/layout.tsx
// Gates every page under /admin behind the isAdmin() check.

import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Internal tool, never index. The robots.txt disallow is the primary line
// of defense; this meta tag is belt-and-suspenders so that any /admin/*
// URL that Google manages to reach despite robots is still tagged noindex.
export const metadata: Metadata = {
  title: "Admin, StartupLenz",
  robots: { index: false, follow: false },
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdmin();

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <div className="admin-brand">StartupLenz Admin</div>
        <nav>
          <ul>
            <li><Link href="/admin">Overview</Link></li>
            <li><Link href="/admin/inputs">Vertical inputs</Link></li>
            <li><Link href="/">← Back to site</Link></li>
          </ul>
        </nav>
      </aside>
      <main className="admin-content">{children}</main>
    </div>
  );
}

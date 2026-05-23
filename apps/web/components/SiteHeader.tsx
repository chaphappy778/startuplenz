// apps/web/components/SiteHeader.tsx
//
// Global top navigation. Server component, fetches the current user once
// per request and shows the right CTA (sign in vs my plans / sign out).

import Link from "next/link";
import { getUser, isAdminEmail } from "@/lib/auth";

export default async function SiteHeader() {
  const user = await getUser();
  const isAdmin = isAdminEmail(user?.email);

  return (
    <header className="site-header">
      <div className="site-header-inner">
        <Link href="/" className="site-brand" aria-label="StartupLenz home">
          <span className="site-brand-mark">SL</span>
          <span className="site-brand-name">StartupLenz</span>
        </Link>

        <nav className="site-nav">
          <Link href="/verticals" className="site-nav-link">Verticals</Link>
          <Link href="/compare" className="site-nav-link">Compare</Link>
          {user && (
            <>
              <Link href="/plans" className="site-nav-link">My plans</Link>
              <Link href="/account" className="site-nav-link">Account</Link>
            </>
          )}
          {isAdmin && (
            <Link href="/admin" className="site-nav-link site-nav-admin">Admin</Link>
          )}
          {user ? (
            <>
              <span className="site-nav-user" title={user.email ?? undefined}>
                {(user.email ?? "Account").split("@")[0]}
              </span>
              <form action="/auth/signout" method="post" className="site-nav-signout-form">
                <button type="submit" className="site-nav-signout">Sign out</button>
              </form>
            </>
          ) : (
            <Link href="/login" className="site-nav-cta">Sign in</Link>
          )}
        </nav>
      </div>
    </header>
  );
}

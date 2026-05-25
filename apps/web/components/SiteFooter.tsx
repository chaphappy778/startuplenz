// apps/web/components/SiteFooter.tsx
//
// Global footer. Static, no per-request data, so this stays a plain
// server component with no IO.

import Link from "next/link";

export default function SiteFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <div className="site-footer-brand">
          <span className="site-footer-mark">SL</span>
          <div className="site-footer-brand-text">
            <span className="site-footer-name">StartupLenz</span>
            <span className="site-footer-tagline">
              Live-data cost modeling for new businesses
            </span>
          </div>
        </div>

        <nav className="site-footer-nav" aria-label="Footer">
          <div className="site-footer-col">
            <span className="site-footer-col-title">Explore</span>
            <Link href="/verticals" className="site-footer-link">Verticals</Link>
            <Link href="/compare" className="site-footer-link">Compare</Link>
            <Link href="/blog" className="site-footer-link">Blog</Link>
          </div>
          <div className="site-footer-col">
            <span className="site-footer-col-title">Account</span>
            <Link href="/login" className="site-footer-link">Sign in</Link>
            <Link href="/signup" className="site-footer-link">Create account</Link>
            <Link href="/plans" className="site-footer-link">My plans</Link>
            <Link href="/account" className="site-footer-link">Settings</Link>
          </div>
          <div className="site-footer-col">
            <span className="site-footer-col-title">About</span>
            <Link href="/about" className="site-footer-link">The story</Link>
            <Link href="/how-it-works" className="site-footer-link">How it works</Link>
            <a
              href="https://chaphaus.com"
              className="site-footer-link"
              target="_blank"
              rel="noreferrer noopener"
            >
              ChapHaus
            </a>
          </div>
        </nav>
      </div>

      <div className="site-footer-bottom">
        <span>© {year} ChapHaus LLC. All rights reserved.</span>
        <span className="site-footer-bottom-note">
          Numbers are estimates, verify with your own accounting before making
          financial decisions.
        </span>
      </div>
    </footer>
  );
}

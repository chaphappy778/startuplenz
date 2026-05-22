import type { Metadata } from "next";
import "./globals.css";
import { baseMetadata } from "@/lib/seo";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";

export const metadata: Metadata = baseMetadata();

// SiteHeader reads the auth cookie to show "Sign in" vs the user pill, so the
// root layout must render fresh on every request. Without this, Next prerenders
// the layout at build time (when there's no cookie) and serves the cached
// "signed out" version even after a user logs in.
export const dynamic = "force-dynamic";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="site-shell">
          <SiteHeader />
          <div className="site-main">{children}</div>
          <SiteFooter />
        </div>
      </body>
    </html>
  );
}

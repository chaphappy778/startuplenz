import type { Metadata } from "next";
import { Inter, DM_Mono } from "next/font/google";
import "./globals.css";
import { baseMetadata, SITE_URL } from "@/lib/seo";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";

// Self-host fonts via Next's font pipeline. This eliminates the render-blocking
// @import to fonts.googleapis.com that was previously in globals.css and was
// directly responsible for the homepage's ~3.4s FCP. next/font also preloads
// the woff2 files, generates a matching metric-compatible fallback so there's
// no text-shifting layout jump, and inlines the @font-face declarations so
// text is paintable on first frame.
const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  variable: "--font-display",
  display: "swap",
});

const dmMono = DM_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
  display: "swap",
});

// Homepage canonical. Pages further down the tree set their own
// alternates.canonical to override.
export const metadata: Metadata = baseMetadata({
  alternates: { canonical: SITE_URL },
});

// SiteHeader reads the auth cookie to show "Sign in" vs the user pill, so the
// root layout must render fresh on every request. Without this, Next prerenders
// the layout at build time (when there's no cookie) and serves the cached
// "signed out" version even after a user logs in.
export const dynamic = "force-dynamic";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${dmMono.variable}`}>
      <body>
        <div className="site-shell">
          <SiteHeader />
          <div className="site-main">{children}</div>
          <SiteFooter />
        </div>
        {/* Vercel Web Analytics + Speed Insights. Free tier covers initial
            traffic comfortably. Privacy-friendly (no cookies, no PII).
            View dashboards under the project on vercel.com → Analytics tab. */}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}

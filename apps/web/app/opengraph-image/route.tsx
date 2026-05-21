// apps/web/app/opengraph-image/route.tsx
//
// Dynamic OG image generator. Accepts ?vertical=<slug> to customize the
// secondary text. Returns a 1200×630 PNG suitable for Twitter/LinkedIn/
// Facebook/iMessage previews.
//
// Note: this lives at /opengraph-image (a regular route) rather than as
// the file-based opengraph-image.tsx so it can be shared across pages
// via the SITE_URL/opengraph-image?vertical=X pattern.

import { ImageResponse } from "next/og";
import { getVerticalContent } from "@/lib/verticalContent";

export const runtime = "edge";
export const contentType = "image/png";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const verticalSlug = searchParams.get("vertical");
  const content = verticalSlug ? getVerticalContent(verticalSlug) : null;

  const title = content?.seoTitle ?? "StartupLenz";
  const subtitle =
    content?.seoDescription ??
    "Free, vertical-specific startup cost calculators for indie founders.";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 80px",
          background:
            "linear-gradient(135deg, #0f1422 0%, #182037 60%, #1f2942 100%)",
          color: "#f0f4ff",
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 12,
              background: "linear-gradient(135deg, #6366f1, #a78bfa)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              fontSize: 26,
              fontWeight: 800,
            }}
          >
            ◆
          </div>
          <span style={{ fontSize: 26, fontWeight: 600, color: "#95a4c8" }}>
            StartupLenz
          </span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
          <h1
            style={{
              fontSize: 64,
              lineHeight: 1.05,
              fontWeight: 700,
              letterSpacing: "-0.02em",
              margin: 0,
              maxWidth: 980,
            }}
          >
            {title}
          </h1>
          <p
            style={{
              fontSize: 28,
              color: "#95a4c8",
              lineHeight: 1.35,
              margin: 0,
              maxWidth: 980,
            }}
          >
            {subtitle}
          </p>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            color: "#5a6a8d",
            fontSize: 22,
          }}
        >
          <span>startuplenz.com</span>
          <span style={{ color: "#a78bfa" }}>● Live cost modeling</span>
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}

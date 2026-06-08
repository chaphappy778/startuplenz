// apps/web/app/opengraph-image/route.tsx
//
// Dynamic OG image generator. Accepts ?vertical=<slug> to customize the
// secondary text. Returns a 1200×630 PNG suitable for Twitter/LinkedIn/
// Facebook/iMessage previews.
//
// Note: this lives at /opengraph-image (a regular route) rather than as
// the file-based opengraph-image.tsx so it can be shared across pages
// via the SITE_URL/opengraph-image?vertical=X pattern.
//
// The brand lockup (StartupLenz wordmark with the colored UP badge) is
// inlined below as a base64 data URI. Satori running on the edge has no
// network access guarantees, and reaching back to our own /brand/ folder
// over HTTPS during image render is a flaky dependency we don't need.
// Inlining keeps the route self-contained, removes the round-trip, and
// makes the previous brand-asset rename (when files were moved/removed)
// incapable of silently breaking the social card again.

import { ImageResponse } from "next/og";
import { getVerticalContent } from "@/lib/verticalContent";
import { LOCKUP_INDIGO_PNG_B64 } from "./lockup";

export const runtime = "edge";
export const contentType = "image/png";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const verticalSlug = searchParams.get("vertical");
  const content = verticalSlug ? getVerticalContent(verticalSlug) : null;

  const title = content?.seoTitle ?? "Know what your business will actually cost.";
  const subtitle =
    content?.seoDescription ??
    "Free cost calculators for indie DIY founders. Pick your vertical, move the sliders, see the truth.";

  // Inline data URI — Satori reads the bytes directly, no edge → origin fetch.
  const lockupSrc = `data:image/png;base64,${LOCKUP_INDIGO_PNG_B64}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          position: "relative",
          // Layered background: dark navy base + soft violet/indigo glows in
          // opposite corners give depth without competing with content.
          background:
            "radial-gradient(circle at 85% 18%, rgba(167,139,250,0.20) 0%, rgba(167,139,250,0) 48%), radial-gradient(circle at 12% 88%, rgba(99,102,241,0.22) 0%, rgba(99,102,241,0) 50%), linear-gradient(135deg, #0a0f1f 0%, #141a2e 60%, #1a2138 100%)",
          color: "#f0f4ff",
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
      >
        {/* Top brand bar — full StartupLenz lockup. The lockup PNG already
            contains the wordmark plus the green/red UP badge in the middle,
            so we no longer render a separate "StartupLenz" text label. The
            source PNG is 200×200 with the wordmark centered roughly 80%
            wide and 35% tall, so rendering at 260 wide is enough to make
            the wordmark read at preview size without dominating the card. */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            padding: "16px 60px 0",
          }}
        >
          <img src={lockupSrc} width="260" height="260" />
        </div>

        {/* Middle — headline + subtitle */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            padding: "0 80px",
            gap: 22,
          }}
        >
          <h1
            style={{
              fontSize: 68,
              lineHeight: 1.05,
              fontWeight: 800,
              letterSpacing: "-0.025em",
              margin: 0,
              maxWidth: 1000,
              // Gradient text using webkit clipping — works in Satori
              backgroundImage:
                "linear-gradient(135deg, #ffffff 0%, #e9d5ff 60%, #a78bfa 100%)",
              backgroundClip: "text",
              color: "transparent",
            }}
          >
            {title}
          </h1>
          <p
            style={{
              fontSize: 28,
              color: "#8c9bbf",
              lineHeight: 1.4,
              margin: 0,
              maxWidth: 1000,
              fontWeight: 400,
            }}
          >
            {subtitle}
          </p>

          {/* Feature pills — only shown on the default (non-vertical) image */}
          {!content && (
            <div
              style={{
                display: "flex",
                gap: 12,
                marginTop: 20,
                flexWrap: "wrap",
              }}
            >
              {["10 verticals", "Channel-aware math", "Free forever"].map((label) => (
                <span
                  key={label}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    padding: "10px 18px",
                    fontSize: 19,
                    fontWeight: 600,
                    color: "#c7d0e8",
                    background: "rgba(99,102,241,0.14)",
                    border: "1px solid rgba(167,139,250,0.32)",
                    borderRadius: 999,
                  }}
                >
                  {label}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Bottom — url + live-data accent */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 80px 56px",
            fontSize: 22,
            color: "#5a6a8d",
          }}
        >
          <span style={{ fontWeight: 500 }}>startuplenz.com</span>
          <span
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              color: "#a78bfa",
              fontWeight: 600,
            }}
          >
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                background: "#4ade80",
                boxShadow: "0 0 10px rgba(74,222,128,0.8)",
              }}
            />
            Live cost modeling
          </span>
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}

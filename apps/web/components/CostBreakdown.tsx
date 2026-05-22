"use client";

// apps/web/components/CostBreakdown.tsx
//
// Donut chart visualization of the cost line items. Donut on the left,
// legend on the right — same pattern as the home-page dashboard preview
// but driven by real computed model output.
//
// The donut is built from SVG strokes (no Recharts dependency) so it stays
// tiny and reactive to slider changes without a render cycle penalty.

import type { CostItem } from "@/lib/types";

// Themed palette — chosen so adjacent slices have enough hue contrast that
// they don't blend into each other on the donut.
const COLORS = [
  "#a78bfa", // violet
  "#fb923c", // orange
  "#4ade80", // green
  "#60a5fa", // blue
  "#facc15", // yellow
  "#f43f5e", // rose
  "#34d399", // teal
  "#f97316", // amber
  "#818cf8", // indigo
  "#fbbf24", // gold
];

function fmt(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

interface Props {
  items: CostItem[];
}

export default function CostBreakdown({ items }: Props) {
  const total = items.reduce((s, i) => s + i.value, 0);

  // Convert each slice's percentage of total into a dasharray length over a
  // circumference of 2πr (r=42, stroke=22 — same as the design). Offsets are
  // cumulative so segments stack clockwise from the 12 o'clock position.
  const r = 42;
  const circumference = 2 * Math.PI * r; // ≈ 263.89
  let cumulative = 0;
  const segments = items.map((item, i) => {
    const pct = total > 0 ? item.value / total : 0;
    const length = pct * circumference;
    const offset = -cumulative;
    cumulative += length;
    return {
      ...item,
      color: COLORS[i % COLORS.length],
      dasharray: `${length} ${circumference}`,
      dashoffset: offset,
      // Re-derive pct from total (CostItem.pct from the engine is share of
      // gross revenue, but here we want share of total costs for the donut).
      pct,
    };
  });

  return (
    <section className="cost-breakdown-panel">
      <header className="panel-header">
        <span className="panel-eyebrow">Cost breakdown</span>
        <h2 className="panel-title">Where your money goes</h2>
      </header>

      {total > 0 ? (
        <div className="donut-and-legend">
          <div className="donut-wrap" aria-hidden="true">
            <svg viewBox="0 0 120 120" className="donut-svg">
              <defs>
                <filter id="donut-glow" x="-10%" y="-10%" width="120%" height="120%">
                  <feGaussianBlur stdDeviation="1.5" />
                </filter>
              </defs>
              {/* Background ring */}
              <circle cx="60" cy="60" r={r} fill="none" stroke="#2a3a5c" strokeWidth="18" />
              {segments.map((seg, i) => (
                <circle
                  key={i}
                  cx="60"
                  cy="60"
                  r={r}
                  fill="none"
                  stroke={seg.color}
                  strokeWidth="18"
                  strokeDasharray={seg.dasharray}
                  strokeDashoffset={seg.dashoffset}
                  transform="rotate(-90 60 60)"
                />
              ))}
            </svg>
            <div className="donut-center">
              <span className="donut-center-label">Total costs</span>
              <span className="donut-center-value">{fmt(total)}</span>
            </div>
          </div>

          <ul className="donut-legend">
            {segments.map((seg) => (
              <li key={seg.label} className="donut-legend-row">
                <span className="legend-dot" style={{ background: seg.color }} />
                <span className="legend-label">{seg.label}</span>
                <span className="legend-pct">{(seg.pct * 100).toFixed(0)}%</span>
                <span className="legend-value">{fmt(seg.value)}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="donut-empty">
          Costs will appear here once your sliders produce non-zero values.
        </div>
      )}
    </section>
  );
}

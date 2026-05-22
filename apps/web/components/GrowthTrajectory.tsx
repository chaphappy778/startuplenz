"use client";

// apps/web/components/GrowthTrajectory.tsx
//
// Visualizes the launch → traction → scale profit curve from the model.
//
// Two render modes:
//   • Compact (default, inline) — small unlabeled area chart sitting above
//     the three phase cards. Visually matches the cost donut card.
//   • Detailed (modal) — same data with full annotations: value badges
//     above every dot, axis label, phase + month markers, labeled
//     break-even line. Triggered by the "Expand" button in the panel head.

import { useState } from "react";
import type { ModelOutput } from "@/lib/types";

function fmt(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

/** Compact label for chart annotations — $12,840 → "$12.8K". */
function fmtShort(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1000) {
    const rounded = (abs / 1000).toFixed(1).replace(/\.0$/, "");
    return `${n < 0 ? "−" : ""}$${rounded}K`;
  }
  return `${n < 0 ? "−" : ""}$${Math.round(abs)}`;
}

const PHASE_META = [
  { key: "launch",   badge: "Launch",   color: "phase-launch"   },
  { key: "traction", badge: "Traction", color: "phase-traction" },
  { key: "scale",    badge: "Scale",    color: "phase-scale"    },
] as const;

interface Props {
  growth: ModelOutput["growth"];
}

export default function GrowthTrajectory({ growth }: Props) {
  const [expanded, setExpanded] = useState(false);

  return (
    <section className="growth-trajectory-panel">
      <header className="panel-header growth-panel-header">
        <div>
          <span className="panel-eyebrow">Growth trajectory</span>
          <h2 className="panel-title">Profit over the first year</h2>
        </div>
        <button
          type="button"
          className="growth-expand-btn"
          onClick={() => setExpanded(true)}
          aria-label="Expand growth chart"
        >
          <ExpandIcon />
          <span>Expand</span>
        </button>
      </header>

      <div className="growth-chart" aria-hidden="true">
        <GrowthChartSvg growth={growth} detail={false} />
      </div>

      <div className="growth-phase-grid">
        {PHASE_META.map(({ key, badge, color }) => {
          const phase = growth[key];
          const isPositive = phase.netProfit >= 0;
          return (
            <div key={key} className={`growth-phase ${color}`}>
              <div className="growth-phase-head">
                <span className="growth-phase-badge">{badge}</span>
                <span className="growth-phase-months">Mo. {phase.months}</span>
              </div>
              <span className={`growth-phase-profit ${isPositive ? "pos" : "neg"}`}>
                {fmt(phase.netProfit)}
              </span>
              <p className="growth-phase-label">{phase.label}</p>
            </div>
          );
        })}
      </div>

      {expanded && (
        <GrowthDetailOverlay growth={growth} onClose={() => setExpanded(false)} />
      )}
    </section>
  );
}

// ─── Chart SVG (used in both compact and detail modes) ──────────────────────

function GrowthChartSvg({
  growth,
  detail,
}: {
  growth: ModelOutput["growth"];
  detail: boolean;
}) {
  const phases = PHASE_META.map(({ key, badge }) => ({
    badge,
    months: growth[key].months,
    profit: growth[key].netProfit,
  }));

  const values = phases.map((p) => p.profit);
  // Always include 0 in the range so the break-even line is reachable.
  const max = Math.max(...values, 0);
  const min = Math.min(...values, 0);
  const range = max - min || 1;

  // Geometry — detail mode reserves padding for headroom + axis labels.
  const W = 320;
  const H = detail ? 260 : 90;
  const padL = 12;
  const padR = 12;
  const padT = detail ? 28 : 8;
  const padB = detail ? 48 : 8;
  const chartW = W - padL - padR;
  const chartH = H - padT - padB;

  const points = phases.map((p, i) => {
    const x = padL + (i / (phases.length - 1)) * chartW;
    const y = padT + (1 - (p.profit - min) / range) * chartH;
    return { x, y, ...p };
  });

  const linePath = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(" ");
  const areaPath = `${linePath} L ${points[points.length - 1].x.toFixed(1)} ${(padT + chartH).toFixed(1)} L ${padL} ${(padT + chartH).toFixed(1)} Z`;

  const zeroVisible = min < 0 && max > 0;
  const zeroY = zeroVisible
    ? padT + (1 - (0 - min) / range) * chartH
    : null;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="growth-chart-svg"
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <linearGradient id={`growth-area-${detail ? "d" : "c"}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"  stopColor="#6366f1" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
        </linearGradient>
        <linearGradient id={`growth-line-${detail ? "d" : "c"}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#6366f1" />
          <stop offset="100%" stopColor="#a78bfa" />
        </linearGradient>
      </defs>

      {detail && (
        <text
          x={padL}
          y={padT - 12}
          fontFamily="Inter, sans-serif"
          fontSize="10"
          fill="#4a5d80"
          letterSpacing="0.08em"
        >
          NET PROFIT / MO
        </text>
      )}

      {/* Quartile grid lines (subtle) */}
      {[0.25, 0.5, 0.75].map((p) => (
        <line
          key={p}
          x1={padL}
          x2={W - padR}
          y1={padT + p * chartH}
          y2={padT + p * chartH}
          stroke="#2a3a5c"
          strokeWidth="0.5"
          opacity="0.5"
        />
      ))}

      {/* Zero baseline */}
      {zeroVisible && zeroY !== null && (
        <g>
          <line
            x1={padL}
            x2={W - padR}
            y1={zeroY}
            y2={zeroY}
            stroke="#f43f5e"
            strokeWidth="0.75"
            strokeDasharray="4 3"
            opacity="0.7"
          />
          {detail && (
            <text
              x={W - padR}
              y={zeroY - 4}
              textAnchor="end"
              fontFamily="Inter, sans-serif"
              fontSize="9"
              fontWeight="600"
              fill="#f43f5e"
              letterSpacing="0.04em"
            >
              BREAK-EVEN
            </text>
          )}
        </g>
      )}

      <path d={areaPath} fill={`url(#growth-area-${detail ? "d" : "c"})`} />
      <path
        d={linePath}
        fill="none"
        stroke={`url(#growth-line-${detail ? "d" : "c"})`}
        strokeWidth={detail ? 2.5 : 2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {points.map((p, i) => {
        if (!detail) {
          // Compact: just the dot, no labels.
          return (
            <g key={i}>
              <circle cx={p.x} cy={p.y} r="6" fill="#a78bfa" opacity="0.18" />
              <circle cx={p.x} cy={p.y} r="3" fill="#a78bfa" stroke="#1a2235" strokeWidth="1.2" />
            </g>
          );
        }

        // Detail mode: full annotations. ALL edge-text uses start/end anchoring
        // so labels don't overhang the chart area (the "aunch" cut-off bug).
        const isNeg = p.profit < 0;
        const anchor: "start" | "middle" | "end" =
          i === 0 ? "start"
            : i === points.length - 1 ? "end"
              : "middle";
        return (
          <g key={i}>
            <line
              x1={p.x}
              x2={p.x}
              y1={p.y + 5}
              y2={padT + chartH + 4}
              stroke="#2a3a5c"
              strokeWidth="0.5"
              strokeDasharray="2 3"
              opacity="0.55"
            />
            <text
              x={p.x}
              y={Math.max(p.y - 14, padT - 2)}
              textAnchor={anchor}
              fontFamily="Inter, sans-serif"
              fontSize="13"
              fontWeight="700"
              fill={isNeg ? "#f43f5e" : "#f0f4ff"}
            >
              {fmtShort(p.profit)}
            </text>
            <circle cx={p.x} cy={p.y} r="9" fill="#a78bfa" opacity="0.18" />
            <circle cx={p.x} cy={p.y} r="4.5" fill="#a78bfa" stroke="#1a2235" strokeWidth="1.5" />
            <text
              x={p.x}
              y={padT + chartH + 20}
              textAnchor={anchor}
              fontFamily="Inter, sans-serif"
              fontSize="11"
              fontWeight="600"
              fill="#f0f4ff"
            >
              {p.badge}
            </text>
            <text
              x={p.x}
              y={padT + chartH + 34}
              textAnchor={anchor}
              fontFamily="Inter, sans-serif"
              fontSize="10"
              fill="#8898b8"
              letterSpacing="0.04em"
            >
              Mo. {p.months}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ─── Detail overlay (modal) ─────────────────────────────────────────────────

function GrowthDetailOverlay({
  growth,
  onClose,
}: {
  growth: ModelOutput["growth"];
  onClose: () => void;
}) {
  // Hitting ESC dismisses, plus click-outside on the backdrop dismisses.
  if (typeof window !== "undefined") {
    // useEffect would be cleaner but this runs only when the overlay
    // is actually rendered, which is rare enough.
  }

  return (
    <div
      className="growth-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Growth trajectory detail"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
      }}
      tabIndex={-1}
    >
      <div className="growth-overlay-card">
        <header className="growth-overlay-head">
          <div>
            <span className="panel-eyebrow">Growth trajectory</span>
            <h2 className="panel-title">Profit over the first year</h2>
            <p className="growth-overlay-sub">
              Projected net profit at the end of each phase. The dashed red
              line marks break-even when it&rsquo;s inside the range.
            </p>
          </div>
          <button
            type="button"
            className="growth-overlay-close"
            onClick={onClose}
            aria-label="Close growth chart"
          >
            <CloseIcon />
          </button>
        </header>

        <div className="growth-overlay-chart">
          <GrowthChartSvg growth={growth} detail />
        </div>

        <div className="growth-overlay-phases">
          {PHASE_META.map(({ key, badge, color }) => {
            const phase = growth[key];
            const isPositive = phase.netProfit >= 0;
            return (
              <div key={key} className={`growth-phase ${color}`}>
                <div className="growth-phase-head">
                  <span className="growth-phase-badge">{badge}</span>
                  <span className="growth-phase-months">Mo. {phase.months}</span>
                </div>
                <span className={`growth-phase-profit ${isPositive ? "pos" : "neg"}`}>
                  {fmt(phase.netProfit)}
                </span>
                <p className="growth-phase-label">{phase.label}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Icons ──────────────────────────────────────────────────────────────────

function ExpandIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="15 3 21 3 21 9" />
      <polyline points="9 21 3 21 3 15" />
      <line x1="21" y1="3" x2="14" y2="10" />
      <line x1="3" y1="21" x2="10" y2="14" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

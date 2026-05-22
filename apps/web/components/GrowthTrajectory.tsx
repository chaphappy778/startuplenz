"use client";

// apps/web/components/GrowthTrajectory.tsx
//
// Visualizes the launch → traction → scale profit curve from the model.
//
// Layout:
//   • Top: labeled area chart — value badges above each dot, phase + months
//     below each dot, zero-baseline labeled when visible, "Net profit / mo"
//     hint in the top-left corner.
//   • Bottom: three compact phase cards with the qualitative label from
//     the model ("First drops…", "Drops sell out…", "Creator collabs…").

import type { ModelOutput } from "@/lib/types";

function fmt(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

/** Compact label for chart annotations — $12,840 → "$12.8K", $-1,200 → "−$1.2K". */
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
  const phases = PHASE_META.map(({ key, badge }) => ({
    badge,
    months: growth[key].months,
    profit: growth[key].netProfit,
  }));

  const values = phases.map((p) => p.profit);
  // Always include 0 in the range so the break-even line lands inside the
  // chart even when all three phases are positive.
  const max = Math.max(...values, 0);
  const min = Math.min(...values, 0);
  const range = max - min || 1;

  // SVG sizing. Padding is asymmetric: enough headroom for value badges,
  // enough footroom for phase + month x-axis labels.
  const W = 320;
  const H = 200;
  const padL = 12;
  const padR = 12;
  const padT = 26; // value labels above dots
  const padB = 44; // phase + months labels below
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

  // Zero baseline only renders if 0 is actually inside the value range.
  const zeroVisible = min < 0 && max > 0;
  const zeroY = zeroVisible
    ? padT + (1 - (0 - min) / range) * chartH
    : null;

  return (
    <section className="growth-trajectory-panel">
      <header className="panel-header">
        <span className="panel-eyebrow">Growth trajectory</span>
        <h2 className="panel-title">Profit over the first year</h2>
      </header>

      <div className="growth-chart" aria-label="Monthly net profit across launch, traction, and scale phases">
        <svg viewBox={`0 0 ${W} ${H}`} className="growth-chart-svg" preserveAspectRatio="xMidYMid meet">
          <defs>
            <linearGradient id="growth-area" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"  stopColor="#6366f1" stopOpacity="0.45" />
              <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="growth-line" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#6366f1" />
              <stop offset="100%" stopColor="#a78bfa" />
            </linearGradient>
          </defs>

          {/* "Net profit / mo" axis hint */}
          <text
            x={padL}
            y={padT - 12}
            fontFamily="Inter, sans-serif"
            fontSize="9"
            fill="#4a5d80"
            letterSpacing="0.08em"
          >
            NET PROFIT / MO
          </text>

          {/* Faint grid lines (quartiles of the chart area) */}
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

          {/* Zero / break-even baseline (only when 0 sits inside the y-range) */}
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
            </g>
          )}

          {/* Area + line */}
          <path d={areaPath} fill="url(#growth-area)" />
          <path
            d={linePath}
            fill="none"
            stroke="url(#growth-line)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Per-point dots, value labels (above), and phase + months (below) */}
          {points.map((p, i) => {
            const isNeg = p.profit < 0;
            const valueY = Math.max(p.y - 12, padT - 2);
            // For the leftmost / rightmost dot, nudge the label toward center
            // so it doesn't fall off the edge of the chart.
            const valueAnchor: "start" | "middle" | "end" =
              i === 0 ? "start"
                : i === points.length - 1 ? "end"
                  : "middle";
            return (
              <g key={i}>
                {/* Subtle vertical guide from dot to x-axis label */}
                <line
                  x1={p.x}
                  x2={p.x}
                  y1={p.y + 4}
                  y2={padT + chartH + 4}
                  stroke="#2a3a5c"
                  strokeWidth="0.5"
                  strokeDasharray="2 3"
                  opacity="0.55"
                />
                {/* Value label above dot */}
                <text
                  x={p.x}
                  y={valueY}
                  textAnchor={valueAnchor}
                  fontFamily="Inter, sans-serif"
                  fontSize="11"
                  fontWeight="700"
                  fill={isNeg ? "#f43f5e" : "#f0f4ff"}
                >
                  {fmtShort(p.profit)}
                </text>
                {/* Dot */}
                <circle cx={p.x} cy={p.y} r="7" fill="#a78bfa" opacity="0.18" />
                <circle cx={p.x} cy={p.y} r="3.8" fill="#a78bfa" stroke="#1a2235" strokeWidth="1.5" />

                {/* Phase + months below */}
                <text
                  x={p.x}
                  y={padT + chartH + 18}
                  textAnchor="middle"
                  fontFamily="Inter, sans-serif"
                  fontSize="10"
                  fontWeight="600"
                  fill="#f0f4ff"
                >
                  {p.badge}
                </text>
                <text
                  x={p.x}
                  y={padT + chartH + 32}
                  textAnchor="middle"
                  fontFamily="Inter, sans-serif"
                  fontSize="9"
                  fill="#8898b8"
                  letterSpacing="0.04em"
                >
                  Mo. {p.months}
                </text>
              </g>
            );
          })}
        </svg>
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
    </section>
  );
}

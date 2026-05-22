"use client";

// apps/web/components/GrowthTrajectory.tsx
//
// Visualizes the launch → traction → scale profit curve from the model.
// Top: a small SVG area chart connecting the three phase profit values.
// Bottom: three phase cards with the dollar number, months, and label.

import type { ModelOutput } from "@/lib/types";

function fmt(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
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
  // Build the area chart polygon. Y-axis is computed from the actual three
  // values so the chart auto-scales; negative profits hug the baseline so
  // we don't end up with the curve below the chart area.
  const values = [growth.launch.netProfit, growth.traction.netProfit, growth.scale.netProfit];
  const max = Math.max(...values, 0);
  const min = Math.min(...values, 0);
  const range = max - min || 1;

  const W = 280;
  const H = 90;
  const pad = 8;

  const points = values.map((v, i) => {
    const x = pad + (i / (values.length - 1)) * (W - pad * 2);
    const y = pad + (1 - (v - min) / range) * (H - pad * 2);
    return { x, y, v };
  });

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${H - pad} L ${pad} ${H - pad} Z`;

  return (
    <section className="growth-trajectory-panel">
      <header className="panel-header">
        <span className="panel-eyebrow">Growth trajectory</span>
        <h2 className="panel-title">Profit over the first year</h2>
      </header>

      <div className="growth-chart" aria-hidden="true">
        <svg viewBox={`0 0 ${W} ${H}`} className="growth-chart-svg" preserveAspectRatio="none">
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
          {/* Faint grid lines */}
          {[0.25, 0.5, 0.75].map((p) => (
            <line key={p} x1={pad} x2={W - pad} y1={pad + p * (H - pad * 2)} y2={pad + p * (H - pad * 2)}
              stroke="#2a3a5c" strokeWidth="0.5" />
          ))}
          {/* Zero baseline (only if 0 is inside the range) */}
          {min < 0 && max > 0 && (
            <line
              x1={pad}
              x2={W - pad}
              y1={pad + (1 - (0 - min) / range) * (H - pad * 2)}
              y2={pad + (1 - (0 - min) / range) * (H - pad * 2)}
              stroke="#f43f5e"
              strokeWidth="0.5"
              strokeDasharray="3 3"
              opacity="0.5"
            />
          )}
          <path d={areaPath} fill="url(#growth-area)" />
          <path d={linePath} fill="none" stroke="url(#growth-line)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          {points.map((p, i) => (
            <g key={i}>
              <circle cx={p.x} cy={p.y} r="6" fill="#a78bfa" opacity="0.15" />
              <circle cx={p.x} cy={p.y} r="3.5" fill="#a78bfa" stroke="#1a2235" strokeWidth="1.5" />
            </g>
          ))}
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

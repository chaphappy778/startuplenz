"use client";

import type { ModelOutput } from "@/lib/types";

function fmt(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

const PHASE_META = [
  { key: "launch",   badge: "Launch",   color: "phase-launch" },
  { key: "traction", badge: "Traction", color: "phase-traction" },
  { key: "scale",    badge: "Scale",    color: "phase-scale" },
] as const;

interface Props {
  growth: ModelOutput["growth"];
}

export default function GrowthTrajectory({ growth }: Props) {
  return (
    <section className="growth-trajectory">
      <h2 className="section-title">Growth Trajectory</h2>
      <div className="growth-grid">
        {PHASE_META.map(({ key, badge, color }) => {
          const phase = growth[key];
          const isPositive = phase.netProfit >= 0;
          return (
            <div key={key} className={`growth-card ${color}`}>
              <div className="growth-header">
                <span className="growth-badge">{badge}</span>
                <span className="growth-months">Months {phase.months}</span>
              </div>
              <span className={`growth-profit ${isPositive ? "pos" : "neg"}`}>
                {fmt(phase.netProfit)}
              </span>
              <p className="growth-label">{phase.label}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

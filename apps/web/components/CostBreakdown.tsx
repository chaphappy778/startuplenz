"use client";

import type { CostItem } from "@/lib/types";

const BAR_COLORS = ["#4ade80", "#facc15", "#f97316", "#f43f5e"];

function fmt(n: number) {
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

  return (
    <section className="cost-breakdown card">
      <h2 className="panel-title">Cost Breakdown</h2>

      {/* Stacked bar */}
      <div className="stacked-bar">
        {items.map((item, idx) => (
          <div
            key={item.label}
            className="bar-segment"
            style={{
              width: `${(item.value / (total || 1)) * 100}%`,
              background: BAR_COLORS[idx % BAR_COLORS.length],
            }}
            title={`${item.label}: ${fmt(item.value)}`}
          />
        ))}
      </div>

      {/* Legend rows */}
      <div className="breakdown-list">
        {items.map((item, idx) => (
          <div key={item.label} className="breakdown-row">
            <div className="breakdown-left">
              <span
                className="dot"
                style={{ background: BAR_COLORS[idx % BAR_COLORS.length] }}
              />
              <span className="breakdown-label">{item.label}</span>
            </div>
            <div className="breakdown-right">
              <span className="breakdown-value">{fmt(item.value)}</span>
              <span className="breakdown-pct">{(item.pct * 100).toFixed(0)}%</span>
            </div>
          </div>
        ))}
        <div className="breakdown-row total-row">
          <span className="breakdown-label">Total costs</span>
          <span className="breakdown-value">{fmt(total)}</span>
        </div>
      </div>
    </section>
  );
}

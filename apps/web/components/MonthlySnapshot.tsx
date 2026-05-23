"use client";

// apps/web/components/MonthlySnapshot.tsx
//
// Hero KPI strip at the top of the calculator dashboard. Four tiles:
//   Monthly Revenue · Net Profit · Profit Margin · Orders / month
//
// Each tile uses display-font numerals (Syne) and a small trend label
// (compared to the model's "launch" phase projection) so the user can
// immediately read whether the number trends up or down as they slide.

import type { ModelOutput } from "@/lib/types";

function fmtUsd(n: number, opts: { decimals?: number } = {}): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: opts.decimals ?? 0,
  }).format(n);
}

function fmtPct(n: number): string {
  return `${(n * 100).toFixed(1)}%`;
}

function fmtNumber(n: number): string {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(n);
}

/**
 * Compares current profit to the model's launch projection. If sliders push
 * past the launch baseline, we show a "+/-XX% vs launch" trend pill, gives
 * the KPI tiles a sense of motion that abstract numbers alone can't.
 */
function trendVsLaunch(current: number, launch: number): {
  pct: number;
  positive: boolean;
} | null {
  if (!Number.isFinite(launch) || launch === 0) return null;
  const pct = (current - launch) / Math.abs(launch);
  if (!Number.isFinite(pct) || Math.abs(pct) < 0.005) return null;
  return { pct, positive: pct >= 0 };
}

interface Props {
  output: ModelOutput;
}

export default function MonthlySnapshot({ output }: Props) {
  const launchProfit = output.growth?.launch?.netProfit ?? 0;
  const profitTrend = trendVsLaunch(output.netProfit, launchProfit);

  const tiles = [
    {
      key: "revenue",
      label: "Monthly Revenue",
      value: fmtUsd(output.grossRevenue),
      sub: `${fmtNumber(output.ordersPerMonth)} orders`,
      tone: "neutral" as const,
    },
    {
      key: "profit",
      label: "Net Profit",
      value: fmtUsd(output.netProfit),
      sub: profitTrend
        ? `${profitTrend.positive ? "+" : ""}${(profitTrend.pct * 100).toFixed(0)}% vs launch`
        : "vs launch projection",
      tone:
        output.netProfit > 0
          ? "positive"
          : output.netProfit < 0
            ? "negative"
            : ("neutral" as const),
    },
    {
      key: "margin",
      label: "Profit Margin",
      value: fmtPct(output.profitMargin),
      sub: marginContext(output.profitMargin),
      tone:
        output.profitMargin >= 0.2
          ? "positive"
          : output.profitMargin < 0.05
            ? "negative"
            : ("neutral" as const),
    },
    {
      key: "orders",
      label: "Orders / Month",
      value: fmtNumber(output.ordersPerMonth),
      sub:
        output.ordersPerMonth > 0 && output.grossRevenue > 0
          ? `${fmtUsd(output.grossRevenue / output.ordersPerMonth, { decimals: 2 })} avg`
          : "set sliders to start",
      tone: "neutral" as const,
    },
  ];

  return (
    <section className="kpi-snapshot" aria-label="Monthly snapshot">
      <div className="kpi-snapshot-grid">
        {tiles.map((t) => (
          <div key={t.key} className={`kpi-tile kpi-tile-${t.tone}`}>
            <span className="kpi-label">{t.label}</span>
            <span className="kpi-value">{t.value}</span>
            <span className="kpi-sub">{t.sub}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function marginContext(margin: number): string {
  if (margin >= 0.35) return "Excellent, top quartile";
  if (margin >= 0.2) return "Healthy range";
  if (margin >= 0.1) return "Tight but workable";
  if (margin >= 0) return "Barely breaking even";
  return "Losing money";
}

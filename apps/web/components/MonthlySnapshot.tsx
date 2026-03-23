"use client";

import type { ModelOutput } from "@/lib/types";

function fmt(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

function fmtPct(n: number) {
  return `${(n * 100).toFixed(1)}%`;
}

interface Props {
  output: ModelOutput;
}

export default function MonthlySnapshot({ output }: Props) {
  const cards = [
    {
      label: "Gross Revenue",
      value: fmt(output.grossRevenue),
      sub: `${output.ordersPerMonth} orders`,
      tone: "neutral",
    },
    {
      label: "Cost of Goods",
      value: fmt(output.costOfGoods),
      sub: `${fmtPct(output.costOfGoods / (output.grossRevenue || 1))} of revenue`,
      tone: "negative",
    },
    {
      label: "Platform + Shipping",
      value: fmt(output.platformAndShipping),
      sub: `${fmtPct(output.platformAndShipping / (output.grossRevenue || 1))} of revenue`,
      tone: "negative",
    },
    {
      label: "Net Profit",
      value: fmt(output.netProfit),
      sub: `${fmtPct(output.profitMargin)} margin`,
      tone: output.netProfit >= 0 ? "positive" : "negative",
    },
  ];

  return (
    <section className="monthly-snapshot">
      <h2 className="section-title">Monthly Snapshot</h2>
      <div className="snapshot-grid">
        {cards.map((c) => (
          <div key={c.label} className={`snapshot-card tone-${c.tone}`}>
            <span className="card-label">{c.label}</span>
            <span className="card-value">{c.value}</span>
            <span className="card-sub">{c.sub}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

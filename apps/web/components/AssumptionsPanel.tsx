"use client";

import type { SliderDef, SliderValues } from "@/lib/types";

// Default sliders for the Handmade/Craft vertical.
// When the real vertical module ships, import its SliderDef[] instead.
export const HANDMADE_SLIDERS: SliderDef[] = [
  {
    key: "ordersPerMonth",
    label: "Orders per month",
    min: 1,
    max: 100,
    step: 1,
    defaultValue: 10,
    unit: "",
    formulaKey: "ordersPerMonth",
  },
  {
    key: "avgOrderValue",
    label: "Avg order value",
    min: 5,
    max: 200,
    step: 1,
    defaultValue: 38,
    unit: "$",
    formulaKey: "avgOrderValue",
  },
  {
    key: "materialCostPerUnit",
    label: "Material cost / unit",
    min: 1,
    max: 50,
    step: 0.5,
    defaultValue: 8,
    unit: "$",
    formulaKey: "materialCostPerUnit",
  },
  {
    key: "packagingCostPerUnit",
    label: "Packaging cost / unit",
    min: 0.5,
    max: 20,
    step: 0.5,
    defaultValue: 3,
    unit: "$",
    formulaKey: "packagingCostPerUnit",
  },
  {
    key: "platformFeePct",
    label: "Platform fee",
    min: 0,
    max: 30,
    step: 0.5,
    defaultValue: 10,
    unit: "%",
    formulaKey: "platformFeePct",
  },
  {
    key: "shippingCostPerOrder",
    label: "Shipping / order",
    min: 0,
    max: 30,
    step: 0.5,
    defaultValue: 7.6,
    unit: "$",
    formulaKey: "shippingCostPerOrder",
  },
];

interface Props {
  sliders: SliderDef[];
  values: SliderValues;
  onChange: (key: string, value: number) => void;
}

export default function AssumptionsPanel({ sliders, values, onChange }: Props) {
  return (
    <section className="assumptions-panel card">
      <h2 className="panel-title">Assumptions</h2>
      <div className="sliders-list">
        {sliders.map((s) => {
          const val = values[s.key] ?? s.defaultValue;
          const pct = ((val - s.min) / (s.max - s.min)) * 100;
          const display =
            s.unit === "$"
              ? `$${val % 1 === 0 ? val : val.toFixed(2)}`
              : s.unit === "%"
              ? `${val}%`
              : `${val}`;

          return (
            <div key={s.key} className="slider-row">
              <div className="slider-header">
                <label className="slider-label" htmlFor={s.key}>
                  {s.label}
                </label>
                <span className="slider-value">{display}</span>
              </div>
              <div className="slider-track-wrap">
                <input
                  id={s.key}
                  type="range"
                  min={s.min}
                  max={s.max}
                  step={s.step}
                  value={val}
                  onChange={(e) => onChange(s.key, parseFloat(e.target.value))}
                  className="slider-input"
                  style={{ "--fill-pct": `${pct}%` } as React.CSSProperties}
                />
              </div>
              <div className="slider-bounds">
                <span>
                  {s.unit === "$" ? `$${s.min}` : s.unit === "%" ? `${s.min}%` : s.min}
                </span>
                <span>
                  {s.unit === "$" ? `$${s.max}` : s.unit === "%" ? `${s.max}%` : s.max}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

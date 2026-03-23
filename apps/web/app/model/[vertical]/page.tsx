"use client";

import { useState, useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

import AssumptionsPanel, { HANDMADE_SLIDERS } from "@/components/AssumptionsPanel";
import MonthlySnapshot from "@/components/MonthlySnapshot";
import InsightCallout from "@/components/InsightCallout";
import GrowthTrajectory from "@/components/GrowthTrajectory";
import CostBreakdown from "@/components/CostBreakdown";
import VerticalSelector from "@/components/VerticalSelector";

import { computeModel } from "@/lib/modelClient";
import type { SliderValues } from "@/lib/types";

// Build default slider values from the slider definitions.
// When the real vertical module ships, swap HANDMADE_SLIDERS for the
// appropriate SliderDef[] based on the vertical slug.
function defaultValues(): SliderValues {
  return Object.fromEntries(
    HANDMADE_SLIDERS.map((s) => [s.key, s.defaultValue])
  );
}

export default function CalculatorPage() {
  const params = useParams();
  const verticalSlug = (params?.vertical as string) ?? "handmade-craft";

  const [values, setValues] = useState<SliderValues>(defaultValues);

  const output = useMemo(
    () => computeModel(values, verticalSlug),
    [values, verticalSlug]
  );

  function handleSliderChange(key: string, value: number) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <div className="calculator-root">
      {/* ── Sidebar ─────────────────────────────────── */}
      <aside className="sidebar">
        <Link href="/" className="wordmark">
          <span className="logo-mark-sm">SL</span>
          StartupLenz
        </Link>

        <VerticalSelector activeSlug={verticalSlug} />

        <AssumptionsPanel
          sliders={HANDMADE_SLIDERS}
          values={values}
          onChange={handleSliderChange}
        />
      </aside>

      {/* ── Main content ────────────────────────────── */}
      <main className="calc-main">
        <div className="calc-header">
          <div>
            <h1 className="calc-title">Handmade / Craft</h1>
            <p className="calc-subtitle">Monthly cost model · Live data</p>
          </div>
          <div className="live-badge">
            <span className="live-dot" />
            Live costs
          </div>
        </div>

        <MonthlySnapshot output={output} />
        <InsightCallout text={output.insight} />

        <div className="lower-grid">
          <GrowthTrajectory growth={output.growth} />
          <CostBreakdown items={output.costBreakdown} />
        </div>
      </main>
    </div>
  );
}

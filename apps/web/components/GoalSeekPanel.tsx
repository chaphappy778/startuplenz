"use client";

// apps/web/components/GoalSeekPanel.tsx
//
// "I want to make $X — what do I need to change?"
// Lives at the top of the calculator. User picks a target ($/mo net profit,
// for now), picks which slider to vary, hits Solve. We snap the slider to
// the value that achieves the target and tell them what changed and by how much.

import { useMemo, useState } from "react";
import { describeSolution, goalSeek, type GoalSeekResult } from "@/lib/goalSeek";
import type { SliderDef, SliderValues } from "@/lib/types";

interface Props {
  verticalSlug: string;
  sliders: SliderDef[];
  values: SliderValues;
  /** Called when the user accepts the solution — applies the slider change. */
  onApply: (key: string, value: number) => void;
  /** Optional preset target value (used by /goal/[vertical] landing pages). */
  initialTarget?: number;
}

// Which sliders are reasonable solve targets — anything numeric and not a
// boolean. We exclude `bool` units explicitly. Empty unit = unitless count.
function isSolvable(s: SliderDef): boolean {
  if (s.unit === "bool") return false;
  if (s.max - s.min < 0.01) return false;
  return true;
}

// Order sliders by likely impact: revenue-side first, then cost-side.
// Heuristic — anything containing "price", "orders", "covers", "sub", "rate"
// floats to top.
function suggestionRank(s: SliderDef): number {
  const k = s.key.toLowerCase();
  if (k.includes("price"))                                            return 0;
  if (k.includes("orders") || k.includes("covers") || k.includes("subscribers")) return 1;
  if (k.includes("ticket") || k.includes("aov") || k.includes("avg")) return 2;
  if (k.includes("rate") || k.includes("pct"))                        return 3;
  if (k.includes("cost") || k.includes("budget"))                     return 4;
  return 5;
}

export default function GoalSeekPanel({
  verticalSlug,
  sliders,
  values,
  onApply,
  initialTarget,
}: Props) {
  const solvable = useMemo(
    () => sliders.filter(isSolvable).sort((a, b) => suggestionRank(a) - suggestionRank(b)),
    [sliders],
  );
  const [target, setTarget] = useState<string>(
    (initialTarget ?? 5000).toString(),
  );
  const [sliderKey, setSliderKey] = useState<string>(solvable[0]?.key ?? "");
  const [result, setResult] = useState<GoalSeekResult | null>(null);

  const sliderDef = solvable.find((s) => s.key === sliderKey);

  const handleSolve = () => {
    const targetNum = Number(target);
    if (!Number.isFinite(targetNum)) {
      setResult({
        ok: false,
        reason: "no_signal",
        message: "Enter a valid number for your target.",
      });
      return;
    }
    const next = goalSeek({
      verticalSlug,
      sliders,
      values,
      metric: "netProfit",
      target: targetNum,
      varySliderKey: sliderKey,
    });
    setResult(next);
  };

  const handleApply = () => {
    if (!result?.ok || !sliderDef) return;
    onApply(sliderDef.key, result.snappedValue);
  };

  if (solvable.length === 0) return null;

  return (
    <section className="goal-seek-panel">
      <div className="goal-seek-header">
        <span className="goal-seek-eyebrow">Goal seek</span>
        <span className="goal-seek-title">How much do I need to change to hit a target?</span>
      </div>

      <div className="goal-seek-form">
        <label className="goal-seek-field">
          <span className="goal-seek-label">Target monthly net profit</span>
          <div className="goal-seek-input-wrap">
            <span className="goal-seek-prefix">$</span>
            <input
              type="number"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              className="goal-seek-input"
              min={0}
              step={100}
            />
            <span className="goal-seek-suffix">/mo</span>
          </div>
        </label>

        <label className="goal-seek-field">
          <span className="goal-seek-label">Which lever to move?</span>
          <select
            className="goal-seek-select"
            value={sliderKey}
            onChange={(e) => setSliderKey(e.target.value)}
          >
            {solvable.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </select>
        </label>

        <button
          type="button"
          className="goal-seek-btn"
          onClick={handleSolve}
        >
          Solve
        </button>
      </div>

      {result && (
        <div className={`goal-seek-result ${result.ok ? "ok" : "warn"}`}>
          {result.ok && sliderDef ? (
            <>
              <p className="goal-seek-result-text">
                {describeSolution(result, sliderDef, Number(target), "netProfit")}
              </p>
              <button
                type="button"
                className="goal-seek-apply-btn"
                onClick={handleApply}
              >
                Apply to the calculator
              </button>
            </>
          ) : (
            <p className="goal-seek-result-text">{result.ok ? "" : result.message}</p>
          )}
        </div>
      )}
    </section>
  );
}

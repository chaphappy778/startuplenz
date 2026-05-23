// apps/web/lib/goalSeek.ts
//
// Given a vertical, current slider values, a target metric, and which
// slider to vary, find the slider value that hits the target. Or report
// that the target is unreachable within the slider's bounds.
//
// Uses a numerical sweep + interpolation rather than analytic solving
// because each vertical's model is a JS function with conditionals and
// channel splits, too brittle to differentiate symbolically. The sweep
// runs in ~ms even with 200 steps because each model evaluation is pure
// arithmetic.

import { computeModel } from "@/lib/modelClient";
import type { ModelOutput, SliderDef, SliderValues } from "@/lib/types";

export type GoalMetric = "netProfit" | "grossRevenue" | "profitMargin";

export interface GoalSeekRequest {
  verticalSlug: string;
  sliders: SliderDef[];
  values: SliderValues;
  metric: GoalMetric;
  target: number;
  /** The input_key (matches SliderDef.key) of the slider we'll vary. */
  varySliderKey: string;
}

export interface GoalSeekSuccess {
  ok: true;
  /** The slider value that hits (or comes closest to) the target. */
  solvedValue: number;
  /** Snapped to step_size so the slider can land exactly there. */
  snappedValue: number;
  /** The original (default or user-set) value before solving. */
  originalValue: number;
  /** Computed model at the snapped value. */
  resultingOutput: ModelOutput;
  /** Actual metric value at the snapped slider position. */
  achievedMetric: number;
  /** % change from original to snapped. */
  pctChange: number;
}

export interface GoalSeekFailure {
  ok: false;
  /** Why we couldn't solve. */
  reason:
    | "slider_not_found"
    | "metric_not_monotonic"
    | "target_below_minimum"
    | "target_above_maximum"
    | "no_signal";
  /** Best-effort message for the UI. */
  message: string;
  /** Bounds of what's achievable within slider min/max, so UI can show "the most you can get is $X". */
  bounds?: { minMetric: number; maxMetric: number };
}

export type GoalSeekResult = GoalSeekSuccess | GoalSeekFailure;

const SWEEP_STEPS = 200;

function extractMetric(output: ModelOutput, metric: GoalMetric): number {
  switch (metric) {
    case "netProfit":    return output.netProfit;
    case "grossRevenue": return output.grossRevenue;
    case "profitMargin": return output.profitMargin;
  }
}

function snapToStep(value: number, slider: SliderDef): number {
  if (!slider.step || slider.step <= 0) return value;
  const steps = Math.round((value - slider.min) / slider.step);
  const snapped = slider.min + steps * slider.step;
  // Clamp to [min, max]
  return Math.max(slider.min, Math.min(slider.max, snapped));
}

export function goalSeek(req: GoalSeekRequest): GoalSeekResult {
  const slider = req.sliders.find((s) => s.key === req.varySliderKey);
  if (!slider) {
    return {
      ok: false,
      reason: "slider_not_found",
      message: `No slider with key "${req.varySliderKey}" in this vertical.`,
    };
  }

  const span = slider.max - slider.min;
  if (span <= 0) {
    return {
      ok: false,
      reason: "no_signal",
      message: `${slider.label} has no adjustable range to solve over.`,
    };
  }

  // Sweep the slider; capture (value, metric) pairs
  const samples: Array<{ value: number; metric: number }> = [];
  for (let i = 0; i <= SWEEP_STEPS; i++) {
    const value = slider.min + (span * i) / SWEEP_STEPS;
    const probeValues: SliderValues = { ...req.values, [slider.key]: value };
    const output = computeModel(probeValues, req.verticalSlug);
    samples.push({ value, metric: extractMetric(output, req.metric) });
  }

  const metricMin = Math.min(...samples.map((s) => s.metric));
  const metricMax = Math.max(...samples.map((s) => s.metric));

  // Is the target reachable at all?
  if (req.target < metricMin && Math.abs(req.target - metricMin) > 1e-2) {
    return {
      ok: false,
      reason: "target_below_minimum",
      message: `The lowest ${humanMetric(req.metric)} you can hit by varying ${slider.label} alone is ${formatMetric(metricMin, req.metric)}. Your target is below that, try a different lever.`,
      bounds: { minMetric: metricMin, maxMetric: metricMax },
    };
  }
  if (req.target > metricMax) {
    return {
      ok: false,
      reason: "target_above_maximum",
      message: `Even at the max ${slider.label} (${slider.max}${slider.unit ?? ""}), you only hit ${formatMetric(metricMax, req.metric)}. Your target of ${formatMetric(req.target, req.metric)} requires changing more than one lever.`,
      bounds: { minMetric: metricMin, maxMetric: metricMax },
    };
  }

  // Find the sample closest to target where the metric crosses target
  // (handles monotonic functions; for non-monotonic, returns the first
  // crossing which is usually the most useful answer).
  let bestIdx = 0;
  let bestDist = Math.abs(samples[0].metric - req.target);
  for (let i = 1; i < samples.length; i++) {
    const dist = Math.abs(samples[i].metric - req.target);
    if (dist < bestDist) {
      bestDist = dist;
      bestIdx = i;
    }
  }

  // Linear interpolate between the closest neighbours for a tighter fit
  const closest = samples[bestIdx];
  let solvedValue = closest.value;
  if (bestIdx > 0 && bestIdx < samples.length - 1) {
    const left = samples[bestIdx - 1];
    const right = samples[bestIdx + 1];
    const neighbour =
      Math.abs(left.metric - req.target) < Math.abs(right.metric - req.target)
        ? left
        : right;
    const denom = neighbour.metric - closest.metric;
    if (denom !== 0) {
      const t = (req.target - closest.metric) / denom;
      const interpolated = closest.value + t * (neighbour.value - closest.value);
      if (
        interpolated >= slider.min &&
        interpolated <= slider.max &&
        Number.isFinite(interpolated)
      ) {
        solvedValue = interpolated;
      }
    }
  }

  const snappedValue = snapToStep(solvedValue, slider);
  const finalValues: SliderValues = { ...req.values, [slider.key]: snappedValue };
  const resultingOutput = computeModel(finalValues, req.verticalSlug);
  const achievedMetric = extractMetric(resultingOutput, req.metric);
  const originalValue = Number(req.values[slider.key] ?? slider.defaultValue);
  const pctChange =
    originalValue !== 0
      ? ((snappedValue - originalValue) / originalValue) * 100
      : snappedValue === 0
        ? 0
        : Infinity;

  return {
    ok: true,
    solvedValue,
    snappedValue,
    originalValue,
    resultingOutput,
    achievedMetric,
    pctChange,
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function humanMetric(metric: GoalMetric): string {
  switch (metric) {
    case "netProfit":    return "net profit";
    case "grossRevenue": return "gross revenue";
    case "profitMargin": return "profit margin";
  }
}

function formatMetric(value: number, metric: GoalMetric): string {
  if (metric === "profitMargin") return (value * 100).toFixed(1) + "%";
  return "$" + Math.round(value).toLocaleString();
}

export function describeSolution(result: GoalSeekSuccess, slider: SliderDef, target: number, metric: GoalMetric): string {
  const direction = result.snappedValue > result.originalValue ? "increase" : result.snappedValue < result.originalValue ? "decrease" : "keep";
  const absPct = Math.abs(result.pctChange);
  const targetStr = formatMetric(target, metric);
  const fromStr = formatSliderValue(result.originalValue, slider);
  const toStr = formatSliderValue(result.snappedValue, slider);

  if (direction === "keep") {
    return `Already there, at ${slider.label} = ${toStr}, you're hitting your ${humanMetric(metric)} target of ${targetStr}.`;
  }

  if (!Number.isFinite(result.pctChange)) {
    return `To hit ${targetStr}, set ${slider.label} to ${toStr}.`;
  }

  return `To hit ${targetStr} in monthly ${humanMetric(metric)}, ${direction} ${slider.label} from ${fromStr} to ${toStr} (${absPct >= 100 ? Math.round(absPct) : absPct.toFixed(0)}% ${direction === "increase" ? "higher" : "lower"}).`;
}

function formatSliderValue(value: number, slider: SliderDef): string {
  const u = slider.unit ?? "";
  const v = Number.isInteger(value) ? value : Number(value.toFixed(2));
  if (u === "$" || u === "USD") return "$" + v.toLocaleString();
  if (u === "%")                return v + "%";
  if (u === "USD/hr")           return "$" + v + "/hr";
  if (u === "mins")             return v + " min";
  if (u === "hrs")              return v + " hr";
  if (u)                        return v + " " + u;
  return String(v);
}

// ════════════════════════════════════════════════════════════════════════════
// Multi-lever solver, sequential greedy
// ════════════════════════════════════════════════════════════════════════════
//
// Why sequential rather than constrained-optimization: the model engines are
// pure JS with conditionals and channel splits. Symbolic gradients are
// brittle. A greedy walk through user-prioritized levers is also more
// explainable to the user, "we tried price first; it wasn't enough, so we
// also bumped sell-through" maps directly to how a founder thinks about it.

export interface GoalSeekChange {
  sliderKey: string;
  originalValue: number;
  snappedValue: number;
  pctChange: number;
}

export interface GoalSeekMultiSuccess {
  ok: true;
  changes: GoalSeekChange[];
  achievedMetric: number;
  resultingOutput: ModelOutput;
}

export interface GoalSeekMultiFailure {
  ok: false;
  reason: GoalSeekFailure["reason"] | "unreachable_with_levers";
  message: string;
  /** Changes we DID apply on the way to giving up, surfaces "we tried X" UI. */
  changesAttempted?: GoalSeekChange[];
  bestAchievable?: number;
}

export type GoalSeekMultiResult = GoalSeekMultiSuccess | GoalSeekMultiFailure;

export interface GoalSeekMultiRequest {
  verticalSlug: string;
  sliders: SliderDef[];
  values: SliderValues;
  metric: GoalMetric;
  target: number;
  /** Priority-ordered list of slider keys to vary, 1+. */
  varySliderKeys: string[];
}

/** Probe which extreme of a slider moves the metric closer to the target. */
function pickTargetFavorableExtreme(
  req: Omit<GoalSeekMultiRequest, "varySliderKeys">,
  sliderKey: string,
): number {
  const slider = req.sliders.find((s) => s.key === sliderKey);
  if (!slider) return 0;
  const atMin = computeModel({ ...req.values, [sliderKey]: slider.min }, req.verticalSlug);
  const atMax = computeModel({ ...req.values, [sliderKey]: slider.max }, req.verticalSlug);
  const minMetric = extractMetric(atMin, req.metric);
  const maxMetric = extractMetric(atMax, req.metric);
  return Math.abs(req.target - maxMetric) < Math.abs(req.target - minMetric)
    ? slider.max
    : slider.min;
}

function pctChangeOf(from: number, to: number): number {
  if (from === 0) return to === 0 ? 0 : Number.POSITIVE_INFINITY;
  return ((to - from) / from) * 100;
}

export function goalSeekMulti(req: GoalSeekMultiRequest): GoalSeekMultiResult {
  if (req.varySliderKeys.length === 0) {
    return {
      ok: false,
      reason: "no_signal",
      message: "Pick at least one lever to adjust.",
    };
  }

  // Single-lever shortcut, defer to the original solver.
  if (req.varySliderKeys.length === 1) {
    const single = goalSeek({
      verticalSlug: req.verticalSlug,
      sliders: req.sliders,
      values: req.values,
      metric: req.metric,
      target: req.target,
      varySliderKey: req.varySliderKeys[0],
    });
    if (!single.ok) {
      return {
        ok: false,
        reason: single.reason,
        message: single.message,
      };
    }
    const slider = req.sliders.find((s) => s.key === req.varySliderKeys[0])!;
    const originalValue = Number(req.values[slider.key] ?? slider.defaultValue);
    return {
      ok: true,
      changes: [
        {
          sliderKey: slider.key,
          originalValue,
          snappedValue: single.snappedValue,
          pctChange: single.pctChange,
        },
      ],
      achievedMetric: single.achievedMetric,
      resultingOutput: single.resultingOutput,
    };
  }

  // Multi-lever: walk through the keys greedily. For each, try to land the
  // target with all prior levers' changes baked in. If a lever can finish,
  // we're done. If not, lock it at its target-favorable extreme and move on.
  const workingValues: SliderValues = { ...req.values };
  const changes: GoalSeekChange[] = [];

  for (let i = 0; i < req.varySliderKeys.length; i++) {
    const key = req.varySliderKeys[i];
    const slider = req.sliders.find((s) => s.key === key);
    if (!slider) continue;

    const isLast = i === req.varySliderKeys.length - 1;
    const originalValue = Number(req.values[key] ?? slider.defaultValue);

    const single = goalSeek({
      verticalSlug: req.verticalSlug,
      sliders: req.sliders,
      values: workingValues,
      metric: req.metric,
      target: req.target,
      varySliderKey: key,
    });

    if (single.ok) {
      changes.push({
        sliderKey: key,
        originalValue,
        snappedValue: single.snappedValue,
        pctChange: pctChangeOf(originalValue, single.snappedValue),
      });
      return {
        ok: true,
        changes,
        achievedMetric: single.achievedMetric,
        resultingOutput: single.resultingOutput,
      };
    }

    // Can't solve with this lever alone.
    if (
      single.reason === "target_above_maximum" ||
      single.reason === "target_below_minimum"
    ) {
      const extreme = pickTargetFavorableExtreme(
        {
          verticalSlug: req.verticalSlug,
          sliders: req.sliders,
          values: workingValues,
          metric: req.metric,
          target: req.target,
        },
        key,
      );

      // Already at the helpful extreme? Don't waste a "lever slot", let the
      // next iteration take a shot.
      if (extreme === workingValues[key]) {
        if (isLast) {
          const finalOutput = computeModel(workingValues, req.verticalSlug);
          const achieved = extractMetric(finalOutput, req.metric);
          return {
            ok: false,
            reason: "unreachable_with_levers",
            message: `Even with the selected levers pushed to their extremes, the best ${humanMetric(req.metric)} is ${formatMetric(achieved, req.metric)} (target ${formatMetric(req.target, req.metric)}). Add another lever or relax the target.`,
            changesAttempted: changes,
            bestAchievable: achieved,
          };
        }
        continue;
      }

      changes.push({
        sliderKey: key,
        originalValue,
        snappedValue: extreme,
        pctChange: pctChangeOf(originalValue, extreme),
      });
      workingValues[key] = extreme;

      if (isLast) {
        const finalOutput = computeModel(workingValues, req.verticalSlug);
        const achieved = extractMetric(finalOutput, req.metric);
        if (Math.abs(achieved - req.target) < 1) {
          return {
            ok: true,
            changes,
            achievedMetric: achieved,
            resultingOutput: finalOutput,
          };
        }
        return {
          ok: false,
          reason: "unreachable_with_levers",
          message: `Even with all selected levers pushed to their extremes, the best ${humanMetric(req.metric)} is ${formatMetric(achieved, req.metric)} (target ${formatMetric(req.target, req.metric)}). Add another lever or relax the target.`,
          changesAttempted: changes,
          bestAchievable: achieved,
        };
      }
    } else {
      // Slider not found / no signal, bubble up and stop.
      return {
        ok: false,
        reason: single.reason,
        message: single.message,
        changesAttempted: changes,
      };
    }
  }

  // Fallthrough, shouldn't really hit this branch given the loop above, but
  // keep a safe default so the function always returns.
  const finalOutput = computeModel(workingValues, req.verticalSlug);
  return {
    ok: true,
    changes,
    achievedMetric: extractMetric(finalOutput, req.metric),
    resultingOutput: finalOutput,
  };
}

/** Build a human-readable summary of a multi-lever solution. */
export function describeMultiSolution(
  changes: GoalSeekChange[],
  sliders: SliderDef[],
  target: number,
  metric: GoalMetric,
): string {
  if (changes.length === 0) return "No changes needed, you're already on target.";

  const parts = changes.map((c) => {
    const slider = sliders.find((s) => s.key === c.sliderKey);
    if (!slider) return "";
    const direction =
      c.snappedValue > c.originalValue
        ? "raise"
        : c.snappedValue < c.originalValue
          ? "drop"
          : "keep";
    if (direction === "keep") {
      return `keep ${slider.label} at ${formatSliderValue(c.snappedValue, slider)}`;
    }
    const absPct = Math.abs(c.pctChange);
    const pctText = Number.isFinite(absPct)
      ? `${absPct >= 100 ? Math.round(absPct) : absPct.toFixed(0)}%`
      : "";
    return `${direction} ${slider.label} from ${formatSliderValue(c.originalValue, slider)} to ${formatSliderValue(c.snappedValue, slider)}${pctText ? ` (${pctText})` : ""}`;
  }).filter(Boolean);

  if (parts.length === 1) {
    return `To hit ${formatMetric(target, metric)} in monthly ${humanMetric(metric)}, ${parts[0]}.`;
  }
  if (parts.length === 2) {
    return `To hit ${formatMetric(target, metric)}, ${parts[0]} AND ${parts[1]}.`;
  }
  const last = parts[parts.length - 1];
  const head = parts.slice(0, -1).join(", ");
  return `To hit ${formatMetric(target, metric)}, ${head}, AND ${last}.`;
}

"use client";

// apps/web/components/GoalSeekPanel.tsx
//
// "I want to make $X — what do I need to change?" Goal Seek with multi-lever
// support. The user picks a target net profit, then picks a primary lever
// AND optionally up to two additional levers. Solver tries each in priority
// order; if a lever alone can't hit the target, it locks at that lever's
// target-favorable extreme and tries the next one.
//
// The "Apply all" button writes every change back to the parent at once
// so the calculator sliders snap to the solved values in one go.

import { useMemo, useState } from "react";
import {
  describeMultiSolution,
  goalSeekMulti,
  type GoalSeekChange,
  type GoalSeekMultiResult,
} from "@/lib/goalSeek";
import type { SliderDef, SliderValues } from "@/lib/types";

const MAX_LEVERS = 3;

interface Props {
  verticalSlug: string;
  sliders: SliderDef[];
  values: SliderValues;
  onApply: (key: string, value: number) => void;
  initialTarget?: number;
}

function isSolvable(s: SliderDef): boolean {
  if (s.unit === "bool") return false;
  if (s.max - s.min < 0.01) return false;
  return true;
}

function suggestionRank(s: SliderDef): number {
  const k = s.key.toLowerCase();
  if (k.includes("price")) return 0;
  if (k.includes("orders") || k.includes("covers") || k.includes("subscribers")) return 1;
  if (k.includes("ticket") || k.includes("aov") || k.includes("avg")) return 2;
  if (k.includes("rate") || k.includes("pct")) return 3;
  if (k.includes("cost") || k.includes("budget")) return 4;
  return 5;
}

function formatSliderValue(value: number, slider: SliderDef): string {
  const u = slider.unit ?? "";
  const v = Number.isInteger(value) ? value : Number(value.toFixed(2));
  if (u === "$" || u === "USD") return "$" + v.toLocaleString();
  if (u === "%") return v + "%";
  if (u === "USD/hr") return "$" + v + "/hr";
  if (u === "mins") return v + " min";
  if (u === "hrs") return v + " hr";
  if (u) return v + " " + u;
  return String(v);
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
  const [primaryKey, setPrimaryKey] = useState<string>(solvable[0]?.key ?? "");
  const [secondaryKeys, setSecondaryKeys] = useState<string[]>([]);
  const [result, setResult] = useState<GoalSeekMultiResult | null>(null);

  const toggleSecondary = (key: string) => {
    setSecondaryKeys((prev) => {
      if (prev.includes(key)) return prev.filter((k) => k !== key);
      // -1 because primary is already counted toward MAX_LEVERS
      if (prev.length >= MAX_LEVERS - 1) return prev;
      return [...prev, key];
    });
    setResult(null);
  };

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
    // Strip duplicates and any secondary that matches primary, keep order.
    const allKeys = [primaryKey, ...secondaryKeys.filter((k) => k !== primaryKey)];

    setResult(
      goalSeekMulti({
        verticalSlug,
        sliders,
        values,
        metric: "netProfit",
        target: targetNum,
        varySliderKeys: allKeys,
      }),
    );
  };

  const handleApplyAll = () => {
    if (!result?.ok) return;
    for (const change of result.changes) {
      onApply(change.sliderKey, change.snappedValue);
    }
  };

  if (solvable.length === 0) return null;

  // Secondary candidates = all solvable except the current primary.
  const secondaryCandidates = solvable.filter((s) => s.key !== primaryKey);
  const targetNum = Number(target);
  const targetForDescription = Number.isFinite(targetNum) ? targetNum : 0;

  return (
    <section className="goal-seek-panel goal-seek-panel-v2">
      <header className="goal-seek-header-v2">
        <span className="panel-eyebrow">Goal seek</span>
        <h2 className="panel-title">What would it take?</h2>
        <p className="goal-seek-sub">
          Set a target and pick which levers you&rsquo;re willing to move.
          We&rsquo;ll work out what each one needs to be.
        </p>
      </header>

      <div className="goal-seek-grid">
        <label className="goal-seek-field">
          <span className="goal-seek-label">Target monthly net profit</span>
          <div className="goal-seek-input-wrap">
            <span className="goal-seek-prefix">$</span>
            <input
              type="number"
              value={target}
              onChange={(e) => {
                setTarget(e.target.value);
                setResult(null);
              }}
              className="goal-seek-input"
              min={0}
              step={100}
            />
            <span className="goal-seek-suffix">/mo</span>
          </div>
        </label>

        <label className="goal-seek-field">
          <span className="goal-seek-label">Primary lever</span>
          <select
            className="goal-seek-select"
            value={primaryKey}
            onChange={(e) => {
              setPrimaryKey(e.target.value);
              // If user picks a primary that was also in secondaries, drop it from there.
              setSecondaryKeys((prev) => prev.filter((k) => k !== e.target.value));
              setResult(null);
            }}
          >
            {solvable.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </select>
        </label>

        <button type="button" className="goal-seek-btn" onClick={handleSolve}>
          Solve
        </button>
      </div>

      <div className="goal-seek-secondaries">
        <div className="goal-seek-secondaries-head">
          <span className="goal-seek-secondaries-label">
            Also willing to adjust
          </span>
          <span className="goal-seek-secondaries-count">
            {secondaryKeys.length} / {MAX_LEVERS - 1} selected
          </span>
        </div>
        <div className="goal-seek-chip-grid">
          {secondaryCandidates.map((s) => {
            const active = secondaryKeys.includes(s.key);
            const disabled =
              !active && secondaryKeys.length >= MAX_LEVERS - 1;
            return (
              <button
                key={s.key}
                type="button"
                onClick={() => toggleSecondary(s.key)}
                className={`goal-chip ${active ? "active" : ""} ${disabled ? "disabled" : ""}`}
                disabled={disabled}
                aria-pressed={active}
              >
                {active && <span className="goal-chip-check">✓</span>}
                {s.label}
              </button>
            );
          })}
        </div>
      </div>

      {result && <GoalSeekResultPanel
        result={result}
        sliders={sliders}
        target={targetForDescription}
        onApplyAll={handleApplyAll}
      />}
    </section>
  );
}

// ─── Result panel ───────────────────────────────────────────────────────────

function GoalSeekResultPanel({
  result,
  sliders,
  target,
  onApplyAll,
}: {
  result: GoalSeekMultiResult;
  sliders: SliderDef[];
  target: number;
  onApplyAll: () => void;
}) {
  if (!result.ok) {
    const attempted = result.changesAttempted ?? [];
    return (
      <div className="goal-seek-result warn">
        <p className="goal-seek-result-text">{result.message}</p>
        {attempted.length > 0 && (
          <ChangesList sliders={sliders} changes={attempted} />
        )}
      </div>
    );
  }

  const summary = describeMultiSolution(result.changes, sliders, target, "netProfit");

  return (
    <div className="goal-seek-result ok">
      <p className="goal-seek-result-text">{summary}</p>
      <ChangesList sliders={sliders} changes={result.changes} />
      <button
        type="button"
        className="goal-seek-apply-btn"
        onClick={onApplyAll}
      >
        {result.changes.length > 1
          ? `Apply all ${result.changes.length} changes`
          : "Apply to the calculator"}
      </button>
    </div>
  );
}

function ChangesList({
  sliders,
  changes,
}: {
  sliders: SliderDef[];
  changes: GoalSeekChange[];
}) {
  return (
    <ul className="goal-seek-changes">
      {changes.map((c) => {
        const slider = sliders.find((s) => s.key === c.sliderKey);
        if (!slider) return null;
        const dir =
          c.snappedValue > c.originalValue
            ? "up"
            : c.snappedValue < c.originalValue
              ? "down"
              : "flat";
        return (
          <li key={c.sliderKey} className="goal-seek-change">
            <span className="goal-seek-change-label">{slider.label}</span>
            <span className="goal-seek-change-values">
              <span className="goal-seek-change-from">
                {formatSliderValue(c.originalValue, slider)}
              </span>
              <span className={`goal-seek-change-arrow ${dir}`}>→</span>
              <span className="goal-seek-change-to">
                {formatSliderValue(c.snappedValue, slider)}
              </span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}

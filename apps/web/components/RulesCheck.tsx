"use client";

// apps/web/components/RulesCheck.tsx
//
// Renders the rules-of-thumb checklist returned by a vertical's model.
// Currently populated only by the house-flipping model; other verticals
// pass nothing and this component returns null. Pass / warn / fail are
// rendered with on-brand color cues, matching the calculator's existing
// donut and growth panels.
//
// The detail string on each rule is surfaced via a native <abbr title> tooltip
// for hover context. Reads as quiet — the row itself is the primary signal.

import type { RuleCheckItem } from "@/lib/types";

interface Props {
  items: RuleCheckItem[] | undefined;
}

const STATUS_LABEL: Record<RuleCheckItem["status"], string> = {
  pass: "Pass",
  warn: "Watch",
  fail: "Fail",
};

const STATUS_ICON: Record<RuleCheckItem["status"], string> = {
  pass: "✓",
  warn: "!",
  fail: "✗",
};

export default function RulesCheck({ items }: Props) {
  if (!items || items.length === 0) return null;

  return (
    <aside className="rules-check-card" aria-label="Rules of thumb">
      <header className="rules-check-header">
        <span className="rules-check-eyebrow">Rules of thumb</span>
        <h3 className="rules-check-title">How this deal scores</h3>
      </header>
      <ul className="rules-check-list">
        {items.map((r) => (
          <li
            key={r.rule}
            className={`rules-check-item rules-check-item--${r.status}`}
            data-status={r.status}
          >
            <span
              className={`rules-check-status rules-check-status--${r.status}`}
              aria-label={STATUS_LABEL[r.status]}
            >
              {STATUS_ICON[r.status]}
            </span>
            <div className="rules-check-body">
              <div className="rules-check-rule">
                {r.detail ? (
                  <abbr title={r.detail}>{r.rule}</abbr>
                ) : (
                  r.rule
                )}
              </div>
              <div className="rules-check-message">{r.message}</div>
            </div>
          </li>
        ))}
      </ul>
    </aside>
  );
}

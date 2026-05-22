"use client";

// apps/web/components/InsightCallout.tsx
//
// "What to do next" written take from the model engine. This is the highest-
// value element on the dashboard — surface it with weight: an accent left
// rail, an INSIGHT eyebrow tag, and a soft outer glow.

interface Props {
  text: string;
}

export default function InsightCallout({ text }: Props) {
  return (
    <aside className="insight-callout-card" role="note">
      <span className="insight-callout-rail" aria-hidden="true" />
      <div className="insight-callout-body">
        <span className="insight-callout-eyebrow">Insight</span>
        <p className="insight-callout-text">{text}</p>
      </div>
    </aside>
  );
}

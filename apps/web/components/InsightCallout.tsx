"use client";

interface Props {
  text: string;
}

export default function InsightCallout({ text }: Props) {
  return (
    <div className="insight-callout">
      <span className="insight-icon">💡</span>
      <p className="insight-text">{text}</p>
    </div>
  );
}

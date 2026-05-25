// apps/web/components/home/PulseTeaser.tsx
//
// Compact "Live data" widget shown on the home page. Pulls the 3 most-recent
// changelog entries from content/pulse/changelog.json and links out to the
// full /pulse page for the complete timeline.
//
// The pulsing dot is pure CSS and is the visual hook that signals "this data
// is alive." Aria-hidden so it doesn't interrupt screen readers.

import Link from "next/link";
import { getRecentPulseEntries, pulseKindLabel } from "@/lib/pulse";

export default function PulseTeaser() {
  const entries = getRecentPulseEntries(3);
  if (entries.length === 0) return null;

  return (
    <section className="home-pulse-teaser">
      <div className="home-pulse-head">
        <div className="pulse-status">
          <span className="pulse-status-dot" aria-hidden="true" />
          <span className="pulse-status-label">LIVE DATA</span>
        </div>
        <h2 className="home-pulse-title">
          The calculator updates as the markets do
        </h2>
        <p className="home-pulse-sub">
          A few of the most recent updates. The full trail is on the pulse page.
        </p>
      </div>

      <ol className="home-pulse-list">
        {entries.map((e, i) => (
          <li key={`${e.iso}-${i}`} className="home-pulse-item">
            <span className="home-pulse-date">{e.dateDisplay}</span>
            <div className="home-pulse-body">
              <span className={`pulse-kind-pill pulse-kind-${e.kind}`}>
                {pulseKindLabel(e.kind)}
              </span>
              <span className="home-pulse-entry-title">{e.title}</span>
            </div>
          </li>
        ))}
      </ol>

      <Link href="/pulse" className="home-pulse-link">
        See the full changelog →
      </Link>
    </section>
  );
}

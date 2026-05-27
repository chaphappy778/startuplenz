"use client";

// apps/web/components/PulseCounter.tsx
//
// Animated "time since last update" counter for the /pulse page header.
// Counts up from zero on page load to the real elapsed time since the
// most recent changelog entry, then keeps the displayed minutes fresh
// with a quiet 30-second tick. The data-center-uptime-board vibe is the
// point: it shows the calculator is alive without needing extra copy.

import { useEffect, useState } from "react";

interface PulseCounterProps {
  /** ISO timestamp of the most recent changelog entry. Null = no updates yet. */
  lastUpdatedIso: string | null;
  /** Human-readable date of the last update, e.g. "May 24, 2026". */
  lastUpdatedDisplay: string | null;
}

interface Elapsed {
  days: number;
  hours: number;
  minutes: number;
}

function elapsedFrom(iso: string): Elapsed {
  const ms = Math.max(0, Date.now() - new Date(iso).getTime());
  const totalMinutes = Math.floor(ms / 60_000);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;
  return { days, hours, minutes };
}

export default function PulseCounter({
  lastUpdatedIso,
  lastUpdatedDisplay,
}: PulseCounterProps) {
  // The "target" elapsed time. Recomputed on a slow interval so the
  // displayed minutes stay live while the user reads.
  const [target, setTarget] = useState<Elapsed>(() =>
    lastUpdatedIso ? elapsedFrom(lastUpdatedIso) : { days: 0, hours: 0, minutes: 0 },
  );

  // The "displayed" elapsed time. Starts at zero and eases up to target
  // over ~1.4s on page load, so the counter visibly ticks up.
  const [display, setDisplay] = useState<Elapsed>({ days: 0, hours: 0, minutes: 0 });

  // Keep the target fresh — re-compute from the source ISO every 30s.
  useEffect(() => {
    if (!lastUpdatedIso) return;
    const tick = () => setTarget(elapsedFrom(lastUpdatedIso));
    tick();
    const id = window.setInterval(tick, 30_000);
    return () => window.clearInterval(id);
  }, [lastUpdatedIso]);

  // One-shot count-up animation from zero to target on first paint.
  useEffect(() => {
    if (!lastUpdatedIso) return;

    const start = performance.now();
    const duration = 1400;
    const initialTarget = elapsedFrom(lastUpdatedIso);
    let raf = 0;

    const step = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      // easeOutCubic — quick at first, decelerates into the final number.
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay({
        days: Math.round(initialTarget.days * eased),
        hours: Math.round(initialTarget.hours * eased),
        minutes: Math.round(initialTarget.minutes * eased),
      });
      if (t < 1) {
        raf = window.requestAnimationFrame(step);
      } else {
        setDisplay(initialTarget);
      }
    };

    raf = window.requestAnimationFrame(step);
    return () => window.cancelAnimationFrame(raf);
    // Only re-run the easing if the source timestamp itself changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastUpdatedIso]);

  // After the easing finishes, follow the slow target updates verbatim.
  // We detect "easing done" by display already matching target on first
  // pass after animation. Simpler approach: snap display to target on
  // every target change *if* the display is already close enough.
  useEffect(() => {
    setDisplay((prev) => {
      const close =
        Math.abs(prev.days - target.days) <= 0 &&
        Math.abs(prev.hours - target.hours) <= 1;
      return close ? target : prev;
    });
  }, [target]);

  if (!lastUpdatedIso) {
    return (
      <div className="pulse-counter pulse-counter-empty">
        <span className="pulse-counter-empty-text">No updates logged yet</span>
      </div>
    );
  }

  return (
    <div className="pulse-counter" aria-label="Time since last update">
      <div className="pulse-counter-segments">
        <Segment value={display.days} label={display.days === 1 ? "day" : "days"} />
        <span className="pulse-counter-divider" aria-hidden="true">:</span>
        <Segment value={display.hours} label={display.hours === 1 ? "hour" : "hours"} />
        <span className="pulse-counter-divider" aria-hidden="true">:</span>
        <Segment value={display.minutes} label={display.minutes === 1 ? "minute" : "minutes"} />
      </div>
      {lastUpdatedDisplay && (
        <p className="pulse-counter-sub">
          Since last update on {lastUpdatedDisplay}
        </p>
      )}
    </div>
  );
}

function Segment({ value, label }: { value: number; label: string }) {
  // Always show at least 2 digits so the layout doesn't jump when a value
  // crosses 9 → 10. 3 digits once we're in the 100s.
  const padded = value < 10 ? `0${value}` : `${value}`;
  return (
    <span className="pulse-counter-segment">
      <span className="pulse-counter-value">{padded}</span>
      <span className="pulse-counter-unit">{label}</span>
    </span>
  );
}

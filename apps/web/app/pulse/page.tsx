// apps/web/app/pulse/page.tsx
//
// "Data Pulse" — the visible proof that the calculator is alive. Shows live
// counts from Supabase, days-since-last-update, and a chronological timeline
// of meaningful changes pulled from content/pulse/changelog.json.
//
// This page is the concrete answer to "what does 'living calculator' actually
// mean?" — visitors can see what changed when, instead of having to take our
// word for it.

import type { Metadata } from "next";
import Link from "next/link";
import { baseMetadata } from "@/lib/seo";
import {
  getAllPulseEntries,
  getPulseStats,
  pulseKindLabel,
} from "@/lib/pulse";
import PulseCounter from "@/components/PulseCounter";

export const dynamic = "force-dynamic";

export const metadata: Metadata = baseMetadata({
  title: "Data Pulse — StartupLenz",
  description:
    "What changed and when. StartupLenz is a living calculator: defaults update as marketplaces, materials, and channel economics shift. This page shows the trail.",
});

export default async function PulsePage() {
  const stats = await getPulseStats();
  const entries = getAllPulseEntries();

  return (
    <main className="pulse-page">
      <header className="pulse-page-header">
        <div className="pulse-status">
          <span className="pulse-status-dot" aria-hidden="true" />
          <span className="pulse-status-label">LIVE DATA &middot; TIME SINCE LAST UPDATE</span>
        </div>
        <PulseCounter
          lastUpdatedIso={stats.lastUpdatedIso}
          lastUpdatedDisplay={stats.lastUpdatedDisplay}
        />
        <p className="pulse-page-lede">
          StartupLenz is a living calculator. The defaults under every model,
          marketplace fees, materials costs, channel mix percentages, evolve
          as the markets do. Here&rsquo;s the trail.
        </p>
      </header>

      <section className="pulse-stats" aria-label="Pulse stats">
        <div className="pulse-stat">
          <span className="pulse-stat-number">{stats.activeVerticals}</span>
          <span className="pulse-stat-label">Active verticals</span>
        </div>
        <div className="pulse-stat">
          <span className="pulse-stat-number">{stats.totalInputs}</span>
          <span className="pulse-stat-label">Data points tracked</span>
        </div>
        <div className="pulse-stat">
          <span className="pulse-stat-number">{stats.changelogEntriesThisMonth}</span>
          <span className="pulse-stat-label">Updates this month</span>
        </div>
        <div className="pulse-stat">
          <span className="pulse-stat-number">{stats.changelogEntriesAll}</span>
          <span className="pulse-stat-label">Total updates logged</span>
        </div>
      </section>

      <section className="pulse-timeline" aria-label="Update timeline">
        <header className="pulse-timeline-head">
          <span className="home-section-eyebrow">Changelog</span>
          <h2 className="pulse-timeline-title">Every meaningful change, in order</h2>
        </header>

        {entries.length === 0 ? (
          <p className="prose-page-empty">No changelog entries yet.</p>
        ) : (
          <ol className="pulse-timeline-list">
            {entries.map((e, i) => (
              <li key={`${e.iso}-${i}`} className="pulse-timeline-item">
                <div className="pulse-timeline-rail">
                  <span className={`pulse-timeline-marker pulse-marker-${e.kind}`} />
                </div>
                <div className="pulse-timeline-body">
                  <div className="pulse-timeline-meta">
                    <span className="pulse-timeline-date">{e.dateDisplay}</span>
                    <span className={`pulse-kind-pill pulse-kind-${e.kind}`}>
                      {pulseKindLabel(e.kind)}
                    </span>
                    {e.verticalSlug && (
                      <Link
                        href={`/model/${e.verticalSlug}`}
                        className="pulse-vertical-link"
                      >
                        /model/{e.verticalSlug}
                      </Link>
                    )}
                  </div>
                  <h3 className="pulse-timeline-entry-title">{e.title}</h3>
                  <p className="pulse-timeline-desc">{e.description}</p>
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>

      <section className="pulse-cta">
        <h2 className="pulse-cta-title">Curious how we keep it current?</h2>
        <p className="pulse-cta-body">
          The full methodology &mdash; how each vertical&rsquo;s model is
          built, where the data comes from, and what we deliberately don&rsquo;t
          model &mdash; is on the how-it-works page.
        </p>
        <div className="pulse-cta-buttons">
          <Link href="/how-it-works" className="hero-cta hero-cta-primary">
            How it works
          </Link>
          <Link href="/verticals" className="hero-cta hero-cta-ghost">
            Browse verticals
          </Link>
        </div>
      </section>
    </main>
  );
}

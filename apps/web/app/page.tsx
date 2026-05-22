// apps/web/app/page.tsx
//
// Home page. Composed of:
//   • Hero with eyebrow pill + gradient headline + dashboard preview
//   • Stats row (4 numbers — what makes the tool substantial)
//   • "How it works" — 3 numbered steps
//   • VerticalSelector — the actual entry point into the calculator
//   • Feature highlights — 4 cards detailing what you get
//   • Lightweight FAQ — common questions about the tool
//
// All sections are server-rendered and accessible without auth. Stat numbers
// are static here for now; we'll wire them to Supabase counts when the data
// stabilizes.

import Link from "next/link";
import { softwareApplicationJsonLd } from "@/lib/seo";
import DashboardPreview from "@/components/home/DashboardPreview";
import VerticalMarquee from "@/components/home/VerticalMarquee";

export default function HomePage() {
  return (
    <main className="home-page">
      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <section className="home-hero">
        <span className="home-eyebrow">Free cost calculator for indie founders</span>
        <h1 className="hero-title">
          Know what your business will <span className="hero-title-accent">actually cost</span> before you start.
        </h1>
        <p className="hero-sub">
          Pick your vertical. Move the sliders. See real margin, real
          break-even, and exactly where every dollar goes — no spreadsheets,
          no signup.
        </p>
        <div className="hero-ctas">
          <Link href="#verticals" className="hero-cta hero-cta-primary">
            Browse verticals
          </Link>
          <Link href="#how-it-works" className="hero-cta hero-cta-ghost">
            How it works
          </Link>
        </div>

        <div className="hero-dashboard-wrap" aria-hidden="true">
          <div className="hero-dashboard-glow" />
          <DashboardPreview />
        </div>
      </section>

      {/* ── STATS ────────────────────────────────────────────────────────── */}
      <section className="home-stats" aria-label="Tool stats">
        <Stat number="10" label="Verticals modeled" />
        <Stat number="160+" label="Real-world inputs" />
        <Stat number="$0" label="Forever, no signup" />
        <Stat number="130+" label="SEO-indexed pages" />
      </section>

      {/* ── HOW IT WORKS ─────────────────────────────────────────────────── */}
      <section className="home-how" id="how-it-works">
        <div className="home-section-head">
          <span className="home-section-eyebrow">How it works</span>
          <h2 className="home-section-title">Three steps to real numbers</h2>
          <p className="home-section-sub">
            We did the research on margins, fees, materials, and labor for
            every vertical. You bring your own assumptions and we do the math.
          </p>
        </div>
        <ol className="home-how-grid">
          <Step
            num="1"
            title="Pick your vertical"
            body="Slime brand. Food truck. Cleaning service. Each one has its own quirks built into the model."
          />
          <Step
            num="2"
            title="Move the sliders"
            body="Drop in your real numbers — units sold, materials cost, hourly rate. Every input has a tooltip with industry context."
          />
          <Step
            num="3"
            title="See the truth"
            body="Net profit, margin, cost breakdown, growth trajectory, and a written insight on what to fix first."
          />
        </ol>
      </section>

      {/* ── VERTICAL MARQUEE ─────────────────────────────────────────────── */}
      <section className="home-verticals" id="verticals">
        <div className="home-section-head home-verticals-head">
          <span className="home-section-eyebrow">Choose your business</span>
          <h2 className="home-section-title">Ten verticals, with more on the way</h2>
          <p className="home-section-sub">
            Hover to pause. Click any tile to start modeling that business.
          </p>
        </div>
        <VerticalMarquee />
      </section>

      {/* ── FEATURES ─────────────────────────────────────────────────────── */}
      <section className="home-features">
        <div className="home-section-head">
          <span className="home-section-eyebrow">What you get</span>
          <h2 className="home-section-title">Built for indie reality, not VC pitch decks</h2>
        </div>
        <div className="home-features-grid">
          <Feature
            title="Channel-aware revenue"
            body="Etsy, TikTok Shop, your own site — each one has different fees and conversion. We model the split."
          />
          <Feature
            title="Cost breakdown that adds up"
            body="Materials, packaging, labor, platform fees, ads — every line item with its dollar amount and percent of revenue."
          />
          <Feature
            title="Growth trajectory, not vibes"
            body="Launch, traction, scale phases — each with projected profit so you know if it's worth the grind."
          />
          <Feature
            title="A written take, not just charts"
            body="One paragraph telling you what's wrong, what's working, and what to do next. The opinion you'd get from a friend who's done it."
          />
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────────────────── */}
      <section className="home-faq">
        <div className="home-section-head">
          <span className="home-section-eyebrow">FAQ</span>
          <h2 className="home-section-title">Common questions</h2>
        </div>
        <div className="home-faq-list">
          <FaqItem
            q="Is it really free?"
            a="Yes. No credit card, no trial. We're building this as a tool for the indie community, not a SaaS subscription. Sign in if you want to save plans across devices, but it's optional."
          />
          <FaqItem
            q="Where do the numbers come from?"
            a="Each vertical's model is hand-tuned from real founder interviews, public marketplace data (Etsy, TikTok Shop fee structures), and industry reports. We update assumptions as the landscape shifts."
          />
          <FaqItem
            q="Can I save my plans?"
            a="Yes — sign in with Google or email and your plans persist across devices. Free accounts can save up to 3 plans across 3 verticals; that limit goes up over time."
          />
          <FaqItem
            q="What if my vertical isn't here?"
            a="We're adding verticals every couple weeks. Email us with what you'd want modeled and we'll prioritize the most-requested."
          />
        </div>
      </section>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(softwareApplicationJsonLd()),
        }}
      />
    </main>
  );
}

// ─── Small composable bits ──────────────────────────────────────────────────

function Stat({ number, label }: { number: string; label: string }) {
  return (
    <div className="home-stat">
      <span className="home-stat-number">{number}</span>
      <span className="home-stat-label">{label}</span>
    </div>
  );
}

function Step({ num, title, body }: { num: string; title: string; body: string }) {
  return (
    <li className="home-step">
      <span className="home-step-num">{num}</span>
      <h3 className="home-step-title">{title}</h3>
      <p className="home-step-body">{body}</p>
    </li>
  );
}

function Feature({ title, body }: { title: string; body: string }) {
  return (
    <div className="home-feature">
      <h3 className="home-feature-title">{title}</h3>
      <p className="home-feature-body">{body}</p>
    </div>
  );
}

function FaqItem({ q, a }: { q: string; a: string }) {
  return (
    <details className="home-faq-item">
      <summary className="home-faq-q">{q}</summary>
      <p className="home-faq-a">{a}</p>
    </details>
  );
}

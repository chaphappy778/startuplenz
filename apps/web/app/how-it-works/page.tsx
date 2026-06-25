// apps/web/app/how-it-works/page.tsx
//
// Methodology deep-dive. Explains how each vertical's model is built, where
// the numbers come from, how the insight engine generates its written take,
// what the tool deliberately doesn't capture, and (the spine of the whole
// thing) how the data stays current.

import type { Metadata } from "next";
import Link from "next/link";
import { baseMetadata, SITE_URL } from "@/lib/seo";

export const metadata: Metadata = baseMetadata({
  title: "How StartupLenz works: a living calculator, not a frozen spreadsheet",
  description:
    "How each vertical's cost model is built, where the data comes from, how we keep it current as markets and fees evolve, and what we deliberately don't model. The honest version.",
  alternates: { canonical: `${SITE_URL}/how-it-works` },
});

const articleJsonLd = {
  "@context": "https://schema.org",
  "@type": "Article",
  headline: "How StartupLenz works: a living calculator, not a frozen spreadsheet",
  description:
    "Methodology behind the StartupLenz cost calculators. How the per-vertical models are built, what real-world data they pull from, how the underlying data stays current, and what they don't capture.",
  author: { "@type": "Organization", name: "ChapHaus LLC" },
  publisher: { "@type": "Organization", name: "StartupLenz" },
  mainEntityOfPage: { "@type": "WebPage", "@id": `${SITE_URL}/how-it-works` },
  url: `${SITE_URL}/how-it-works`,
};

export default function HowItWorksPage() {
  return (
    <main className="prose-page">
      <header className="prose-page-header">
        <span className="home-section-eyebrow">How it works</span>
        <h1 className="prose-page-title">
          A living calculator, not a frozen spreadsheet.
        </h1>
        <p className="prose-page-lede">
          Most startup cost calculators were built once, published, and then
          ignored while marketplace fees, materials, and channel economics
          drifted out from under them. StartupLenz works differently. The
          data behind every model lives in a database, evolves as the
          markets do, and powers calculators that stay accurate to what
          indie founders are actually navigating right now.
        </p>
      </header>

      <article className="prose">
        <section>
          <h2>The backbone: it&rsquo;s alive</h2>
          <p>
            The single thing that makes StartupLenz different from every
            other cost calculator on the web is that the math under the
            hood isn&rsquo;t frozen.
          </p>
          <p>
            Every vertical&rsquo;s default values (platform fees,
            average shipping cost per order, channel mix percentages,
            industry margin benchmarks, materials cost ranges) live
            in our database, not hardcoded into a static spreadsheet. When
            Etsy bumps its transaction fee, we update the default and every
            user opening the handmade-craft calculator from then on sees
            the new number. When the average sell-through on TikTok Shop
            shifts for a category, the slime model&rsquo;s default reflects
            it. When a major shipping carrier raises its rates, every
            shipping-cost field across affected verticals updates.
          </p>
          <p>
            We built the living pathways: the database schema, the
            content management tools, the publishing pipeline. The
            calculators can keep up with the markets they describe.
            Every model engine is versioned in source control too, so
            you can trace exactly when a default changed and why. If
            you&rsquo;ve saved a plan from an older version, your saved
            sliders still produce the right numbers; only the underlying
            defaults move.
          </p>
        </section>

        <section>
          <h2>Where the numbers come from</h2>
          <p>
            Three sources, in roughly this order of weight.
          </p>
          <p>
            <strong>Public marketplace data.</strong>{" "}
            Platform fees, payment-processor rates, marketplace conversion
            benchmarks, average shipping costs by region. These are
            observable from official fee schedules (Etsy, TikTok Shop,
            Shopify, Stripe) and from public commerce reports. This is the
            most precise kind of input. When a fee changes, the update is
            mechanical.
          </p>
          <p>
            <strong>Public operator content.</strong>{" "}
            Indie founders share an enormous amount in public: podcast
            appearances, YouTube channels, founder threads on X and Reddit,
            AMAs, blog posts. We synthesize from those when we&rsquo;re
            building or updating a vertical. When five different slime
            founders independently mention heat-pack costs as a real
            summer line item, that&rsquo;s a signal that the field belongs
            in the model. We don&rsquo;t run private interviews. We work
            from what operators have already put into the world in their
            own words.
          </p>
          <p>
            <strong>Industry reports and trade publications.</strong>{" "}
            For inputs that aren&rsquo;t directly observable, like labor
            minutes per unit for a handmade candle or customer churn for a
            subscription box at the indie tier, we triangulate from
            industry surveys, trade reports, and operator-published
            numbers. We err toward conservative defaults so a founder
            isn&rsquo;t flattered into starting a business that loses
            money.
          </p>
        </section>

        <section>
          <h2>What each vertical&rsquo;s model captures</h2>
          <p>
            A single calculator has 15&ndash;25 input fields. Every input
            corresponds to a real lever a founder can move. We model:
          </p>
          <ul>
            <li>
              <strong>Channel-aware revenue.</strong>{" "}
              If you sell on Etsy, TikTok Shop, and your own site, each
              channel has different fees, different average order value,
              and different conversion. We model the split as a percentage
              allocation across channels rather than averaging them out.
              The own-site channel uses standard card-processing (~2.9% +
              $0.30), built-in, not a slider, so you can&rsquo;t forget it.
            </li>
            <li>
              <strong>Variable costs that scale with volume.</strong>{" "}
              Materials, packaging, shipping supplies per order, temperature-
              sensitive add-ons (slime), commissary food cost (food truck).
              Per-unit or per-order, not a flat monthly figure.
            </li>
            <li>
              <strong>Labor.</strong>{" "}
              Labor minutes per unit times an hourly rate, including your
              own time. Most calculators skip this and the founder ends up
              working for $4/hr without realizing it.
            </li>
            <li>
              <strong>Marketing &amp; gifting.</strong>{" "}
              Where applicable, a monthly ad / influencer-gifting budget
              gets subtracted from net profit. Not a separate CAC metric,
              just a real cost-of-business line.
            </li>
            <li>
              <strong>Subscription dynamics (where relevant).</strong>{" "}
              For subscription-box and recurring-revenue verticals, monthly
              churn is a first-class input. Steady-state subscriber counts
              are computed from churn + signups rather than letting you
              pretend the box just grows forever.
            </li>
          </ul>
          <p>
            What you bring is your own numbers for those levers. What we
            handle is the math, the fees, and the channel allocation, with
            defaults that stay current to the market.
          </p>
        </section>

        <section>
          <h2>The growth trajectory</h2>
          <p>
            The launch, traction, and scale chart projects net
            profit at three time horizons under a standard ramp: drops per
            month + sell-through both grow over the year, with phase-
            specific multipliers chosen from observed cohort patterns.
            It&rsquo;s not a regression from your sliders. It&rsquo;s
            a projection that says &ldquo;if your assumptions hold and you
            operate normally, here&rsquo;s what these phases look
            like.&rdquo;
          </p>
          <p>
            The dashed red &ldquo;break-even&rdquo; line draws automatically
            when zero is inside the value range. If your launch phase is
            below it and scale is above it, that&rsquo;s the visual signal
            that the business pencils out. You just have to survive the
            early phases. If scale is still below break-even, the math
            says no amount of grit will save it.
          </p>
        </section>

        <section>
          <h2>The Insight engine</h2>
          <p>
            The written paragraph below the KPI tiles is generated by each
            vertical&rsquo;s model engine, not by a generic template. It
            reads your computed margin, channel mix, sell-through, and a
            handful of other derived metrics, then picks the most relevant
            piece of advice from a curated library of operator-tested tips.
          </p>
          <p>
            For example, if you&rsquo;re running a slime brand at 22%
            margin with under 30% of sales coming from TikTok Shop, the
            insight will specifically nudge you toward TikTok-creator
            gifting. If your margin is healthy but sell-through is sub-
            50%, it&rsquo;ll tell you to shrink your drops instead of
            discounting. The library is hand-curated. The model
            knows which advice applies when, because we wrote the
            conditions.
          </p>
        </section>

        <section>
          <h2>The Goal Seek tool</h2>
          <p>
            Goal Seek answers the inverse question: <em>how do I get to
            $X?</em>
          </p>
          <p>
            Under the hood it runs a numerical sweep, not a symbolic
            solver. For each candidate lever, we evaluate the model at
            200 evenly-spaced values across that slider&rsquo;s range,
            find where your target lands, and interpolate between the
            closest two samples for a tight fit. If the target is
            unreachable within that slider&rsquo;s range, the solver
            reports the achievable max so you know what would actually
            work.
          </p>
          <p>
            The multi-lever mode handles the common case where a single
            lever can&rsquo;t get you there. You select a primary lever
            plus up to two secondaries; the solver tries the primary
            first, locks it at its target-favorable extreme if it
            can&rsquo;t solve alone, then tries the next lever. The result
            tells you exactly what each lever needs to change to. Not just
            a vague &ldquo;raise price and reduce cost.&rdquo;
          </p>
        </section>

        <section>
          <h2>What we don&rsquo;t model (deliberately)</h2>
          <p>
            Honest tools have honest limits. StartupLenz doesn&rsquo;t
            model:
          </p>
          <ul>
            <li>
              <strong>Taxes.</strong>{" "}
              Self-employment tax, sales tax nexus, quarterly estimates.
              Talk to an accountant for these.
            </li>
            <li>
              <strong>Returns and refunds.</strong>{" "}
              We compute net profit before returns. Build in a returns-
              reserve assumption if your category has high return rates
              (apparel).
            </li>
            <li>
              <strong>Brand-building time horizon.</strong>{" "}
              The first 6 months of a business are usually loss-making
              while you build the audience. Our model doesn&rsquo;t
              pretend otherwise. The launch phase is intentionally lower
              than scale, but we don&rsquo;t model the morale tax of
              working for free.
            </li>
            <li>
              <strong>Working capital.</strong>{" "}
              If you need $5k of materials on hand to fulfill orders, the
              cash-flow timing of that isn&rsquo;t modeled. P&amp;L
              profitability and cash-positive are different things.
            </li>
            <li>
              <strong>Personal expenses.</strong>{" "}
              The calculator tells you what the business produces, not
              whether that&rsquo;s enough for you to live on. Multiply your
              tax-adjusted net profit by 0.7 to 0.8 to get a rough take-
              home.
            </li>
          </ul>
        </section>

        <section className="prose-cta">
          <h2>Start modeling</h2>
          <p>
            Pick a vertical from{" "}
            <Link href="/verticals" className="prose-link">
              the full list
            </Link>{" "}
            and start moving sliders. Or read the{" "}
            <Link href="/about" className="prose-link">
              why behind this project
            </Link>{" "}
            if you&rsquo;re curious where this came from.
          </p>
          <div className="prose-cta-buttons">
            <Link href="/verticals" className="hero-cta hero-cta-primary">
              Browse verticals
            </Link>
            <Link href="/about" className="hero-cta hero-cta-ghost">
              Read the story
            </Link>
          </div>
        </section>
      </article>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />
    </main>
  );
}

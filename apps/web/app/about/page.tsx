// apps/web/app/about/page.tsx
//
// The "why this exists" story. Founder background, the problem that motivated
// the project, and what's different about this calculator vs. spreadsheets
// or generic business planners.

import type { Metadata } from "next";
import Link from "next/link";
import { baseMetadata, SITE_URL } from "@/lib/seo";

export const metadata: Metadata = baseMetadata({
  title: "About StartupLenz: why this exists",
  description:
    "StartupLenz is a free, living cost calculator for DIY entrepreneurs, built by ChapHaus LLC. Here is the story. It started as a slime-brand spreadsheet at our kitchen table and grew into ten verticals.",
  alternates: { canonical: `${SITE_URL}/about` },
});

const articleJsonLd = {
  "@context": "https://schema.org",
  "@type": "AboutPage",
  name: "About StartupLenz",
  description:
    "The story behind StartupLenz, a free, living cost calculator for DIY entrepreneurs.",
  url: `${SITE_URL}/about`,
  publisher: { "@type": "Organization", name: "ChapHaus LLC" },
};

export default function AboutPage() {
  return (
    <main className="prose-page">
      <header className="prose-page-header">
        <span className="home-section-eyebrow">About</span>
        <h1 className="prose-page-title">
          Started as a slime-brand spreadsheet at our kitchen table.
        </h1>
        <p className="prose-page-lede">
          StartupLenz is a free, living cost calculator for DIY entrepreneurs.
          The math under the hood evolves as marketplaces, materials, and
          fees do, so you&rsquo;re modeling what your business actually
          costs <em>now</em>, not what it cost in some industry report from
          two years ago.
        </p>
      </header>

      <article className="prose">
        <section>
          <h2>How this started</h2>
          <p>
            My wife was getting into slimes. Small-batch, hand-mixed,
            looking at starting her own slime brand. We&rsquo;re both the
            kind of people who are always running the numbers on whatever
            we&rsquo;re thinking about next, so before she invested time and
            money into it she built a spreadsheet to figure out whether it
            would actually pencil out. Materials, packaging, TikTok Shop fees,
            heat-pack costs for the summer months. The works.
          </p>
          <p>
            I looked at what she&rsquo;d built and thought it was a kind of
            cool. The more I thought about it, the more I realized: <em>this
            same pattern would work for any DIY business someone was
            seriously considering.</em>{" "}
            Could we model a food truck the same
            way? A cleaning service? A subscription box? A handmade candle
            brand? Turns out yes. Once you commit to building one model
            per vertical instead of pretending they&rsquo;re all the same
            kind of business, it&rsquo;s very doable.
          </p>
          <p>
            That&rsquo;s how StartupLenz started: one couple&rsquo;s slime-
            brand spreadsheet, expanded into ten verticals (and counting) so
            other would-be DIY founders can see what their idea actually
            costs to start, before they jump.
          </p>
        </section>

        <section>
          <h2>First product</h2>
          <p>
            This is the first product I&rsquo;ve ever shipped to real users.
          </p>
          <p>
            I&rsquo;m not a serial founder with a backlog of SaaS ideas
            waiting for the right moment. I had a problem at my kitchen
            table &mdash; a partner who wanted to know if a real business
            would pencil out &mdash; and a spreadsheet she&rsquo;d built
            that I thought was useful enough to expand. So I expanded it.
          </p>
          <p>
            I&rsquo;m saying it out loud because I think it matters. Most
            cost-calculator tools you&rsquo;ll find on the web are built
            either by big SaaS shops trying to fill an SEO niche, or by
            no-name affiliate operations trying to capture a download for
            an email list. The math in them is often whatever the
            contractor pulled from a 2019 blog post.
          </p>
          <p>
            StartupLenz isn&rsquo;t that. It&rsquo;s a real person, living
            with a partner who actually runs the kinds of businesses we
            model, building the tool we both wished existed when she sat
            down to do the slime math. If it gets to ten thousand users,
            it&rsquo;ll still be that. If it gets to ten, it&rsquo;ll
            still be that.
          </p>
        </section>

        <section>
          <h2>The problem we&rsquo;re solving</h2>
          <p>
            Every business-cost calculator I&rsquo;d ever opened was either
            (a) a generic spreadsheet template that treated a candle brand
            and a food truck like the same business, or (b) a polished SaaS
            tool built for VC-backed startups, where you&rsquo;re modeling
            $50M ARR and 200 employees by year three.
          </p>
          <p>
            Neither was useful when the actual question was:
            <em> &ldquo;If I sell slime on TikTok Shop, with my own packaging
            and a heat-pack budget for July, do I make money or do I burn
            out?&rdquo;</em>
          </p>
          <p>
            That question has a specific, knowable answer. Marketplace fees
            are public. Material costs are knowable. Labor minutes are
            measurable. The only thing missing was a tool that put those
            specific dials in your hand for your specific business and told
            you the truth in plain language.
          </p>
        </section>

        <section>
          <h2>The thing that makes this different: it&rsquo;s alive</h2>
          <p>
            Most cost calculators, including the ones in business
            books and YouTube tutorials, are dead. They were built
            once with whatever data was current that year, published, and
            then they sat there. By the time you opened them, the platform
            fees had changed, materials had inflated, channel economics had
            shifted.
          </p>
          <p>
            StartupLenz is built differently. The data under every vertical
            (default fee rates, average shipping costs, industry
            margin benchmarks, channel-mix splits) lives in our
            database, not hardcoded in a static spreadsheet. When Etsy bumps
            its fee, we update the default. When a major shipping carrier
            changes its rates, we update the default. When the average
            slime sell-through on TikTok Shop shifts, we update the default.
            Every vertical&rsquo;s model engine is versioned in source
            control so changes are traceable, and the calculators stay
            accurate to what indie operators are actually navigating right
            now.
          </p>
          <p>
            We built the living pathways: the database schema, the
            content management tools, the publishing pipeline. The
            calculators can keep up with the markets they describe. That&rsquo;s
            the backbone. The user-facing sliders are just the surface.
          </p>
        </section>

        <section>
          <h2>What else makes StartupLenz different</h2>
          <p>
            <strong>Channel-aware modeling.</strong> Most calculators average
            your platform fees into a single percentage. StartupLenz splits
            revenue across the platforms you actually sell on (Etsy /
            TikTok Shop / your own site, depending on the vertical), applies
            the right fee structure to each slice, and shows you which
            channel actually pays you the most.
          </p>
          <p>
            <strong>Vertical-specific inputs.</strong>{" "}
            Every input field exists because the data we&rsquo;ve gathered
            shows it matters. We don&rsquo;t include &ldquo;office
            rent&rdquo; if the business is normally run from a kitchen. We
            don&rsquo;t include &ldquo;website hosting&rdquo; as a $50/month
            line item when Shopify already takes a cut elsewhere. The
            shape of the inputs matches how the business actually runs.
          </p>
          <p>
            <strong>Written-take insights.</strong>{" "}
            The paragraph below your numbers is the most important thing on
            the page. It&rsquo;s not a stock template, it&rsquo;s an
            opinionated read of your specific numbers, generated by the
            vertical&rsquo;s model engine. &ldquo;Healthy 24.9% margin.
            Most slime brands at this tier reinvest into bigger drops + paid
            creator collabs to scale.&rdquo; The kind of thing a friend
            who&rsquo;d already done it would tell you.
          </p>
          <p>
            <strong>Free forever, for real.</strong>{" "}
            The core calculators are free. No trial, no &ldquo;upgrade to
            see your full report,&rdquo; no email gate before you see the
            numbers. Sign in if you want to save plans across devices, but
            you never have to. We&rsquo;ll add paid features eventually
            (alerts when a fee that affects your saved plan changes,
            multi-user access, sector benchmarks) but the core math will
            stay free.
          </p>
        </section>

        <section>
          <h2>What we won&rsquo;t do</h2>
          <ul>
            <li>
              <strong>We won&rsquo;t sell your individual data.</strong>{" "}
              Aggregated anonymized benchmarks for future product features,
              maybe. Your specific plan, attached to your email, sold to a
              third party? No.
            </li>
            <li>
              <strong>We won&rsquo;t fabricate testimonials.</strong>{" "}
              Every indie tool launches with three made-up Sarahs from
              imagined companies. You&rsquo;ll see real testimonials here
              only when we have real ones.
            </li>
            <li>
              <strong>We won&rsquo;t add features that aren&rsquo;t
              decision-useful.</strong>{" "}
              Pretty charts that don&rsquo;t change what a founder does
              next are noise. If we add it, it&rsquo;s because someone we
              trust said it would have changed how they built their business.
            </li>
            <li>
              <strong>We won&rsquo;t pretend to be a financial advisor.</strong>{" "}
              This is a planning tool. We&rsquo;ll never have an affiliate
              relationship with a payment processor or platform we model, and
              we&rsquo;ll never recommend specific brokerage products.
            </li>
          </ul>
        </section>

        <section>
          <h2>Where this is going</h2>
          <p>
            We&rsquo;re always looking for the next category that makes
            sense to model. Service businesses are coming next: cleaning,
            lawncare, mobile auto-detail, beauty. After that,
            probably food &amp; beverage outside the food-truck format
            (ghost kitchens, baked goods, micro-roasters). If you&rsquo;re
            running a vertical we haven&rsquo;t modeled yet and you&rsquo;d
            be willing to share what actually drives your P&amp;L, email us
            and we&rsquo;ll prioritize yours.
          </p>
        </section>

        <section>
          <h2>How to reach us</h2>
          <p>
            Email <a className="prose-link" href="mailto:hello@startuplenz.com">hello@startuplenz.com</a>.
            We read every message. Whether it&rsquo;s &ldquo;your math is
            off on the candle vertical here&rsquo;s why,&rdquo; or &ldquo;you
            should model X next,&rdquo; or just &ldquo;this helped me decide
            not to start a business that would&rsquo;ve lost money for two
            years,&rdquo; we want to hear it.
          </p>
        </section>

        <section className="prose-cta">
          <h2>Start with one of the calculators</h2>
          <p>
            Pick the vertical that&rsquo;s closest to what you&rsquo;re
            modeling and start moving sliders. The math is honest, and
            it&rsquo;s current.
          </p>
          <div className="prose-cta-buttons">
            <Link href="/verticals" className="hero-cta hero-cta-primary">
              Browse verticals
            </Link>
            <Link href="/how-it-works" className="hero-cta hero-cta-ghost">
              How it works
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

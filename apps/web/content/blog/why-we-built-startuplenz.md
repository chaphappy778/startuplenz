---
title: "Why we built StartupLenz"
slug: "why-we-built-startuplenz"
date: 2026-05-24
description: "StartupLenz started as a slime-brand spreadsheet at our kitchen table. Here's the longer version of why it grew into ten verticals, and what makes a 'living calculator' different from every other cost tool you've opened."
author: "Jennifer Chapman"
canonical: "https://www.startuplenz.com/blog/why-we-built-startuplenz"
---

## The 11pm spreadsheet

My wife was getting into slimes.

Small-batch, hand-mixed, looking at making her own brand of it. We're both the kind of people who run the numbers on whatever we're considering next, so before she invested time and money into a slime brand, she built a spreadsheet to figure out whether it would actually pencil out.

Materials, packaging, TikTok Shop fees, summer heat-pack costs. The works. She sat down one evening, cracked open the laptop at our kitchen table, and modeled the whole thing.

I looked at what she'd built and thought it was a kind of cool. The more I thought about it, the more I realized: *this same pattern would work for any DIY business someone was seriously considering.*

Could we model a food truck the same way? A cleaning service? A subscription box? A handmade candle brand?

Turns out yes. Once you commit to building one model per vertical, instead of pretending they're all the same kind of business, it's very doable.

That's how StartupLenz started: one couple's slime-brand spreadsheet, expanded into ten verticals (and counting) so other would-be DIY founders can see what their idea actually costs to start, before they jump.

## First product

This is the first product I've ever shipped to real users.

I'm not a serial founder with a backlog of SaaS ideas waiting for the right time. I had a problem at my kitchen table &mdash; a partner who wanted to know if a real business would pencil out &mdash; and a spreadsheet she'd built that I thought was useful enough to expand. So I expanded it.

I'm saying it out loud because I think it matters. Most cost-calculator tools you'll find on the web are built either by big established SaaS shops trying to fill an SEO niche, or by no-name affiliate operations trying to capture a download for an email list. The math in them is often whatever the contractor pulled from a 2019 blog post.

StartupLenz isn't that. It's a real person who lives with a partner running real businesses, building the tool we both wished existed when she sat down to do the slime math. If it gets to ten thousand users, it'll still be that. If it gets to ten, it'll still be that.

That's the only promise I can make at v1, and it's the one that matters most.

## The problem we're solving

Every business-cost calculator I'd ever opened was either:

**(a)** A generic spreadsheet template that treated a candle brand and a food truck like the same business. Office rent, "marketing budget," "professional services," all those line items that have nothing to do with a real indie operation.

**(b)** A polished SaaS tool built for VC-backed startups, where you're modeling $50M ARR and 200 employees by year three. Burn rate, runway, ARR multiples, all the language of a business that needs a Series A.

Neither was useful when the actual question was:

*"If I sell slime on TikTok Shop, with my own packaging and a heat-pack budget for July, do I make money or do I burn out?"*

That question has a specific, knowable answer. Marketplace fees are public. Material costs are knowable. Labor minutes are measurable. The only thing missing was a tool that put those specific dials in your hand, for your specific business, and told you the truth in plain language.

## What makes a "living" calculator different

The single thing that makes StartupLenz different from every other cost calculator on the web is that the math under the hood isn't frozen.

Most calculators (including the ones in business books, YouTube tutorials, and free downloadable Excel templates) are dead. They were built once with whatever data was current that year, published, and then they sat there. By the time you opened them, the platform fees had changed, materials had inflated, channel economics had shifted.

The numbers in those calculators get less accurate every month. There's no mechanism to update them.

StartupLenz is built differently. The data under every vertical &mdash; default fee rates, average shipping costs, industry margin benchmarks, channel-mix splits, materials cost ranges &mdash; lives in our database, not hardcoded into a static spreadsheet.

When Etsy bumps its transaction fee, we update the default and every user opening the handmade calculator from then on sees the new number. When TikTok Shop's average sell-through shifts for a category, the slime model's default reflects it. When a major shipping carrier raises rates, every shipping-cost field across affected verticals updates.

We built the living pathways &mdash; the database schema, the content management tools, the publishing pipeline &mdash; so the calculators can keep up with the markets they describe. Every model engine is versioned in source control, so you can trace exactly when a default changed and why.

That's the backbone. The user-facing sliders are just the surface.

## What we model that other tools skip

A single calculator on StartupLenz has 15&ndash;25 input fields. Every input corresponds to a real lever a founder can move. Some of the things we model that generic calculators don't:

**Channel-aware revenue.** If you sell on Etsy, TikTok Shop, and your own site, each channel has different fees, different average order value, and different conversion. We model the split as a percentage allocation across channels rather than averaging them out. The own-site channel uses standard card-processing (~2.9% + $0.30) &mdash; built-in, not a slider &mdash; so you can't forget about it.

**Vertical-specific quirks.** The slime engine includes a "temp pack cost per order" slider because every slime operator we researched mentioned losing inventory to summer heat. The food-truck engine separates commissary rent from event-day fees because they move independently. The subscription-box engine models monthly churn as a first-class input, computing steady-state subscriber counts from churn + signups rather than pretending the box just grows forever. These quirks don't exist in generic calculators because generic calculators average them away.

**Labor.** Labor minutes per unit times an hourly rate &mdash; including your own time. Most calculators skip this and the founder ends up working for $4/hr without realizing it.

**A written-take insight.** The paragraph below your numbers is the most important thing on the page. It's not a stock template. It's an opinionated read of your specific numbers, generated by the vertical's model engine. "Healthy 24.9% margin &mdash; most slime brands at this tier reinvest into bigger drops + paid creator collabs to scale." The kind of thing a friend who'd already done it would tell you, instead of just a chart you're left to interpret yourself.

## What we deliberately don't do

A few things that other indie tools do that we've decided not to:

**We won't sell your individual data.** Aggregated anonymized benchmarks for future product features, maybe. Your specific plan, attached to your email, sold to a third party? No.

**We won't fabricate testimonials.** Every indie tool launches with three made-up Sarahs from imagined companies. You'll see real testimonials here only when we have real ones.

**We won't add features that aren't decision-useful.** Pretty charts that don't change what a founder does next are noise. If we add it, it's because someone we trust said it would have changed how they built their business.

**We won't pretend to be a financial advisor.** This is a planning tool. We'll never have an affiliate relationship with a payment processor or platform we model, and we'll never recommend specific brokerage products.

## What we honestly don't model

Honest tools have honest limits. We don't model:

- **Taxes.** Self-employment tax, sales tax nexus, quarterly estimates. Talk to an accountant for these.
- **Returns and refunds.** We compute net profit before returns. Build in a returns-reserve assumption if your category has high return rates.
- **Brand-building time horizon.** The first 6 months of a business are usually loss-making while you build the audience. The model doesn't pretend otherwise (the launch phase is intentionally lower than scale), but it can't model the morale tax of working for free.
- **Working capital.** If you need $5k of materials on hand to fulfill orders, the cash-flow timing of that isn't modeled. P&L profitability and cash-positive are different things.
- **Personal expenses.** The calculator tells you what the business produces, not whether that's enough for you to live on. Multiply your tax-adjusted net profit by 0.7&ndash;0.8 to get a rough take-home.

## Where this is going

The 12-month plan is to keep adding verticals (especially service businesses next &mdash; cleaning, lawncare, mobile auto-detail, beauty), build out an email digest so saved plans get nudged when a marketplace fee or industry data point shifts, and ship sector benchmarks so you can see how your model compares to peers operating in the same space.

The 3-year plan is to be the calculator every indie founder opens first. Whether that ends up as a media business with a big email list and sponsored vertical reports, or whether it stays the way it is &mdash; a free tool maintained by ChapHaus for the community &mdash; depends entirely on whether real founders find it useful.

Tell us when it's not.

---

**Try it: [www.startuplenz.com](https://www.startuplenz.com)** &mdash; pick a vertical and start moving sliders. The math is honest, and it's current.

If you're running a vertical we haven't modeled yet, email `hello@startuplenz.com` and tell us what actually drives your P&L. We'll prioritize building yours.

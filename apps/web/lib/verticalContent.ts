// apps/web/lib/verticalContent.ts
//
// Per-vertical SEO and content. Single source of truth for:
//   • Title / description / keywords used in <head>
//   • Hero paragraph above the calculator
//   • Explainer copy below the calculator
//   • FAQ entries (rendered as <details> + emitted as FAQPage JSON-LD)
//   • Suggested email-capture CTA copy
//
// Adding a new vertical: drop an entry here keyed by slug. The page reads
// from it at render time; nothing else needs to change.

export interface VerticalFAQ {
  q: string;
  a: string;
}

export interface VerticalContent {
  /** SEO title — appears in browser tab + search results. */
  seoTitle: string;
  /** Meta description — ~150 chars, shown under search result link. */
  seoDescription: string;
  /** Comma-separated keywords (low SEO weight today but good hygiene). */
  keywords: string[];
  /** One-paragraph hero shown ABOVE the calculator. Sets reader expectations. */
  heroParagraph: string;
  /** Multi-paragraph explainer shown BELOW the calculator. The SEO meat. */
  explainer: string[];
  /** FAQs — rendered as expandable items + structured data. */
  faqs: VerticalFAQ[];
  /** CTA microcopy used on the email-capture button & modal. */
  emailCtaLine: string;
}

export const FALLBACK_CONTENT: VerticalContent = {
  seoTitle: "Startup cost calculator — StartupLenz",
  seoDescription:
    "Estimate monthly revenue, costs, and net profit for your startup. Free, vertical-specific calculator. No signup required.",
  keywords: ["startup cost calculator", "small business unit economics", "founder cost model"],
  heroParagraph:
    "Use the calculator below to model the unit economics of this business. Adjust the sliders, see your projected revenue and profit in real time.",
  explainer: [
    "Every business is a different math problem. This calculator strips it down to the levers that actually move profit, with sensible defaults so you can start playing immediately and tune from there.",
  ],
  faqs: [
    {
      q: "Is this calculator free?",
      a: "Yes. Free, no signup required to use it. You can save plans and get emails if you want, but everything works anonymously too.",
    },
  ],
  emailCtaLine: "Email me my plan",
};

export const VERTICAL_CONTENT: Record<string, VerticalContent> = {
  "handmade-craft": {
    seoTitle: "Handmade / craft business cost calculator — Etsy + TikTok Shop",
    seoDescription:
      "Model the unit economics of an Etsy + TikTok Shop handmade business. Drops, platform fees, shipping — all the math, free.",
    keywords: [
      "handmade business costs", "etsy shop calculator", "tiktok shop costs",
      "craft business unit economics", "small handmade startup costs",
    ],
    heroParagraph:
      "Run the numbers on a handmade brand selling on Etsy, TikTok Shop, or your own site. Drops per month, sell-through rate, platform fees, shipping — the calculator pulls it all together and shows you what actually falls to net profit.",
    explainer: [
      "Handmade businesses look small but the math is busier than it seems. Etsy alone takes a listing fee (every renewal), a 6.5% transaction fee, a payment processing fee around 3%, and 15% Offsite Ads unless you've opted out (which only shops under $10k can do). TikTok Shop has its own stack — a 6% referral fee, payment processing, and creator affiliate commissions averaging 10%. Stack those on a $14 product and a $6 shipping label and there isn't much left.",
      "Where indie makers actually win or lose is sell-through rate. The difference between selling 75% of a drop and 95% is enormous because your material, packaging, and labor costs are sunk the moment the units exist. Idle inventory is the silent killer of handmade margins.",
      "The calculator models the three sales channels (Etsy, TikTok, direct), platform fees specific to each, blended shipping economics, returns, and a 12-month growth trajectory based on real Etsy cohort patterns — slow launch, traction at month 4, scale around month 9. Use it to compare a small-drops/high-cadence strategy against fewer-larger drops, or to see exactly what an extra $2 on your retail price does to your margin.",
    ],
    faqs: [
      {
        q: "What sell-through rate is realistic for a new Etsy shop?",
        a: "New shops without a built-in audience typically see 30–50% sell-through in the first three months. Established shops with reviews and SEO commonly hit 75–90% on the right product/price/photo combination. The calculator uses 75% as a reasonable defaults-good-case starting point.",
      },
      {
        q: "Should I include my own labor as a cost?",
        a: "Depends on what you're trying to learn. To find true business profit (the residual that would survive if you hired your replacement), include labor at a realistic wage. To find your effective hourly takeaway, leave it at zero and the net profit becomes your blended hourly rate after subtracting hours worked.",
      },
      {
        q: "What's the Etsy Offsite Ads fee and should I opt out?",
        a: "If your shop earned under $10k in the last 365 days, you can opt out and skip the 15% Offsite Ads fee. Above $10k, it's mandatory. The opt-out is a real margin lifeline for early-stage shops — toggle the slider in the calculator to see the impact in dollars.",
      },
      {
        q: "Does the calculator handle wholesale?",
        a: "Not yet for handmade — that's in the candle / bath & body vertical (which has the same maker dynamics plus a wholesale channel mix). Adding a wholesale split to handmade is a small follow-up if your readers want it.",
      },
    ],
    emailCtaLine: "Email me my handmade plan",
  },

  "food-truck": {
    seoTitle: "Food truck cost calculator — monthly P&L, food cost %, labor",
    seoDescription:
      "Estimate monthly revenue, food cost %, labor, fuel, fees, and net profit for a food truck. Free calculator, sensible defaults.",
    keywords: [
      "food truck startup costs", "food truck monthly profit", "food truck calculator",
      "food cost percentage", "food truck business plan",
    ],
    heroParagraph:
      "Daily covers × ticket size × days open is the easy part. The interesting math is what's left after food cost, beverage cost, crew wages, fuel, event fees, insurance, and card processing. Adjust the sliders to see your real monthly profit, not gross sales.",
    explainer: [
      "Food trucks live and die on three numbers: covers per day, ticket size, and food cost percent. Independent operators in major US metros average somewhere between 60 and 150 covers on a strong lunch day, with a typical ticket around $10–15. Food cost percent — what you pay for ingredients as a fraction of food revenue — sits around 28–35% for healthy operations. Push past 40% and you're working for your supplier.",
      "Where trucks lose money silently is labor. The IRS recommends payroll costs stay under 30% of revenue. Most owner-operators forget to pay themselves, then resent the truck six months later. Plug a realistic wage into the calculator (even if you're the only crew member) and you'll see the truck's real profitability vs. your effective hourly rate.",
      "Event and location fees are the other invisible hit. A spot at a popular weekly market might cost $50–200 per day; an exclusive corporate catering contract might cost nothing but limit your other gigs. The fixed-cost block — truck loan, insurance, licenses, propane, marketing — is mostly the same whether you serve 40 or 140 people. That's why volume is everything.",
    ],
    faqs: [
      {
        q: "What's a typical food cost percentage for a food truck?",
        a: "28–35% is healthy. Under 28% usually means you're underpricing or your menu has very high-margin items. Over 40% means something's wrong: shrinkage, theft, supplier prices that moved, or menu items that look profitable but actually aren't.",
      },
      {
        q: "How many days a month should I plan to operate?",
        a: "Full-time operators typically run 20–24 days a month: 5–6 days a week minus weather, maintenance, prep days, and holidays. The calculator defaults to 22, which is a strong but achievable cadence. Sub-25 means you're probably either part-time or in a market with weather constraints.",
      },
      {
        q: "Should I include the truck loan in monthly costs?",
        a: "Yes — it's a real cash outflow whether the truck is profitable or not. The calculator has a Truck Loan / Lease line for exactly this. If you bought the truck outright, set it to $0 but consider amortizing the original cost over a realistic useful life (5–7 years) elsewhere.",
      },
      {
        q: "What's the biggest mistake new operators make on this model?",
        a: "Forgetting beverage margins. Beverages run 70–80% gross margin vs. 65–72% for food. If you sell 0% beverages you're leaving real money on the table. If you sell 30%+ beverages, your profit math gets a lot friendlier. The calculator has a Beverage Share slider — try moving it from 0 to 25 and see what happens.",
      },
    ],
    emailCtaLine: "Email me my food truck plan",
  },

  "subscription-box": {
    seoTitle: "Subscription box cost calculator — CAC, churn, MRR economics",
    seoDescription:
      "Subscriber count, churn, CAC, box COGS, shipping — see what your indie subscription box business actually nets each month.",
    keywords: [
      "subscription box business", "subscription box calculator", "subscription box costs",
      "CAC subscription box", "indie subscription startup",
    ],
    heroParagraph:
      "Subscription box economics live or die on three numbers: how much each box costs to assemble, how many subscribers you have, and how fast they're churning. Set yours below and see the monthly profit your model produces.",
    explainer: [
      "The unit economics of a subscription box are deceptively simple — the trap is that churn compounds. A box at $39/mo with 8% monthly churn looks fine on month one and visibly worse by month six. Every percentage point of churn you can knock out of the model is equivalent to a major price increase that customers won't push back on.",
      "Three cost lines deserve scrutiny: contents (what's actually in the box), packaging (the box itself, filler, inserts, branding — usually higher than first-time founders expect), and shipping. Shipping is the single biggest difference between a profitable box and one that bleeds cash, especially if you're absorbing carrier costs to compete with free-shipping competitors. The calculator lets you charge the buyer all, some, or none of the shipping cost so you can find the price elasticity sweet spot.",
      "CAC is the other dial that moves the math. New-school subscription boxes built on TikTok creators are seeing $15–35 CACs; Meta-ads-only boxes are paying $40–80. The calculator pairs CAC with new-signup volume so you can see when your acquisition spend is buying growth vs. when it's just churning through your runway.",
    ],
    faqs: [
      {
        q: "What's a normal monthly churn rate for an indie subscription box?",
        a: "5–10% is the realistic range. Below 5% is great and usually means a strong niche fit and good onboarding. Above 12% is a warning sign — usually a product/value mismatch or a confusing pause/cancel UX. The calculator's default 8% reflects a typical new-box reality.",
      },
      {
        q: "Should I offer free shipping?",
        a: "Free shipping converts better but eats margin, especially with USPS rate hikes. A safer middle ground is to charge a flat $5–8 that covers about 80% of your actual shipping cost. The calculator's Shipping Charged to Buyer slider lets you A/B in your head.",
      },
      {
        q: "How do annual plans actually help?",
        a: "Annual plans reduce churn (the subscriber paid up front, has no monthly cancel temptation) and improve cash flow. The trade is a discount — usually 10–20% off the monthly rate. The calculator lets you set both the discount and the % of subscribers on annual to see the blended revenue impact.",
      },
      {
        q: "What's CAC and where do I find mine?",
        a: "Customer Acquisition Cost = total marketing spend / new subscribers acquired in that period. If you spent $1,000 on ads and got 40 new subscribers, your CAC is $25. Most indie boxes don't track this precisely. Use the calculator to figure out what your CAC needs to be for the model to work, then back into your ad spend ceiling.",
      },
    ],
    emailCtaLine: "Email me my subscription box plan",
  },

  "candle-bath-body": {
    seoTitle: "Candle / bath & body business calculator — multi-channel margins",
    seoDescription:
      "Candle, soap, bath product business calculator. Model own site, Etsy, and wholesale margins side by side. Free.",
    keywords: [
      "candle business cost calculator", "soap business costs", "bath and body startup",
      "candle wholesale margins", "small batch candle business",
    ],
    heroParagraph:
      "Candle and bath & body makers usually run three channels at once: their own site, Etsy, and wholesale to retailers. Each has different margins. The calculator splits them out so you can see which channel is actually carrying your business.",
    explainer: [
      "The candle and bath & body world has a particular trap — wholesale revenue feels great until you do the math. A typical wholesale discount is 50% off retail, which means a unit you'd sell for $22 direct goes to a retailer for $11. If your unit cost (materials + packaging + labor) is $7, your wholesale margin is $4 — about 36%. Your direct margin on the same unit is over 60%. Wholesale only pencils out if it drives volume that you couldn't get directly.",
      "Materials cost is where indie makers under-budget consistently. A candle's wax + fragrance + wick + jar averages $4–6 per unit at small-batch scale; at scale you can push it to $2–3 but you're committing to barrel quantities of fragrance and pallet quantities of glass. The calculator's Material Cost per Unit defaults to $4.50 — a realistic small-batch number that you can drop as you grow.",
      "Labor is the other often-forgotten line. A candle that takes 25 minutes to pour, cool, label, package, and stock is about 0.4 hours. At $18/hr that's $7.50 of your time. Most makers pay themselves nothing in year one, which makes the math look better than it is. The calculator includes a labor minutes slider so you can see what happens when you start valuing your hours.",
    ],
    faqs: [
      {
        q: "Is wholesale worth it for a small candle brand?",
        a: "Only if it drives volume that justifies the cut. A boutique that takes 24 units at 50% off is worth it because it's marketing too — your brand on a shelf. A massive wholesale account that demands 60–70% off and net-90 terms can destroy a small business. The calculator's wholesale share slider lets you test what the right mix is.",
      },
      {
        q: "What's a realistic Etsy fee total?",
        a: "Around 13% all-in: 6.5% transaction fee, 3% payment processing, 15% offsite ads (if you're not opted out — and you can't opt out above $10k revenue), plus listing fees that round to ~$0.20/unit. Subtract that whole stack from your Etsy revenue before calculating margin.",
      },
      {
        q: "How many units a month is a real candle business?",
        a: "Hobby tier: under 50/month. Side-hustle tier: 50–200. Full-time-ish: 200–500. Real business: 500+. The calculator defaults to 120, which is the awkward middle where the math often doesn't quite work yet — useful for seeing what you'd need to change to push past it.",
      },
      {
        q: "Should I include studio rent if I work from home?",
        a: "If you genuinely work from home with no dedicated space, set it to $0. If you have a garage, basement, or spare room you've outfitted (storage racks, ventilation, dedicated table), put down what comparable storage space would cost — usually $200–400/month even at home — so the math reflects what it'd cost to do this without subsidizing it with free space.",
      },
    ],
    emailCtaLine: "Email me my candle / bath & body plan",
  },

  "print-on-demand": {
    seoTitle: "Print-on-demand business calculator — POD margins, ad ROAS",
    seoDescription:
      "Print-on-demand calculator for apparel, posters, and accessories. Model POD provider cost, fees, ad ROAS, and real margin.",
    keywords: [
      "print on demand calculator", "POD business costs", "printful margins",
      "print on demand startup", "POD profit margin",
    ],
    heroParagraph:
      "Print-on-demand looks like a zero-cost business until you do the math. POD providers (Printful, Printify, etc.) charge a base cost per unit. Ads cost more than most founders budget. Margins are real but tighter than the dropshipping influencers will tell you.",
    explainer: [
      "POD is dropshipping for branded goods — you upload designs, a fulfillment partner prints and ships when an order comes in. Your cost per unit is whatever the POD provider charges (a Printful t-shirt is around $11–15 depending on the blank), and your margin is the difference between that and your retail price. A $28 t-shirt at $12 POD base cost = $16 gross margin per shirt, before shipping, platform fees, and ads.",
      "The thing the gurus skip is that ads have to actually pay back. POD businesses live and die by ROAS (return on ad spend). A 2x ROAS means you're breaking even on ads after costs — you're not really making money, you're churning ad dollars through a fulfillment middleman. A 3–4x ROAS is where unit economics actually work. The calculator surfaces this — set Ad Spend per Month and the % of revenue attributable to those ads, and the insight text will warn you if your ROAS is under 1.5x.",
      "Storefront choice matters too. Shopify charges $39/mo plus 2.9% per transaction. Etsy is free monthly but takes ~13% of every sale. Your own site (no platform fee, just payment processing) wins on margin but loses on built-in traffic. The calculator lets you set both monthly and per-transaction fees to model whichever combination you're running.",
    ],
    faqs: [
      {
        q: "What's a realistic POD profit margin?",
        a: "10–25% net margin is realistic for a sustainable POD business. Higher requires premium pricing, a winning design that doesn't need much ad spend, or a niche audience that converts cheaply. Anything claiming 50%+ margin is either lying about ad spend or selling a single hit product that won't last.",
      },
      {
        q: "How much should I spend on ads per month starting out?",
        a: "Start with a budget you can afford to lose entirely — $200–500 is a normal first test. Run for 7–14 days, measure ROAS, then either kill it or scale slowly. The calculator pairs ad spend with attribution % so you can see when ads are actually buying revenue vs. just inflating top-line.",
      },
      {
        q: "Should I use Printful or Printify?",
        a: "Printful is more expensive per unit but quality is more consistent and US-based. Printify is cheaper but quality varies by provider (you can pick). For a brand-building POD shop, Printful's quality consistency usually justifies the cost. For lowest-margin commodity products, Printify wins. Either way, plug your actual base costs into the calculator.",
      },
      {
        q: "What's a good return rate for POD?",
        a: "1–4% is healthy. Over 5% suggests sizing problems (apparel) or shipping damage (posters/mugs). The calculator's Return / Reprint Rate slider lets you see how returns eat into otherwise-healthy margins. A 5% return rate on a 20% margin business is a real drag.",
      },
    ],
    emailCtaLine: "Email me my POD plan",
  },

  "digital-products": {
    seoTitle: "Digital products calculator — courses, templates, presets economics",
    seoDescription:
      "Sell digital products? Calculator for courses, templates, presets, printables. Model conversion, refunds, affiliate payouts.",
    keywords: [
      "digital product business", "sell digital products", "online course calculator",
      "templates business", "digital product margins",
    ],
    heroParagraph:
      "Digital products have near-zero variable costs — but the math still has knobs. Conversion rate, refund rate, affiliate payout, ad spend, and platform fees decide whether your high-margin business is actually profitable.",
    explainer: [
      "The promise of digital products is no inventory, no shipping, no COGS — sell once, deliver instantly, repeat. The reality is that conversion rate becomes your bottleneck. A great landing page converts 2–5% of visitors; a typical one converts under 1%. The calculator pairs visitors per month with sales per month so it can compute your conversion rate and warn you if it's below the 1% bar where most digital sellers should pause and fix the offer before spending more on traffic.",
      "Refunds are the second silent killer. Templates: usually 1–3%. Courses: 5–10% is normal, and platforms like Stripe make refunds frictionless for the buyer. If you're seeing 10%+ refund rate on a course, the curriculum and the sales page don't match — fix that before you scale anything. The calculator's Refund Rate slider makes the dollar impact obvious.",
      "Affiliates are the smartest growth channel for digital products that don't have built-in network effects. A typical affiliate payout is 30–50% of the sale price. That sounds steep until you realize you're only paying when you make a sale — no upfront cost. The calculator separates ad spend (fixed cost) from affiliate payout (variable cost) so you can see which is actually moving the needle.",
      "Note the email list growth metric — for digital products especially, the real business asset isn't this month's revenue, it's the email list you build. The calculator shows you how many new subscribers your traffic + capture rate produces each month. Watch that number — it compounds.",
    ],
    faqs: [
      {
        q: "What's a realistic conversion rate for digital products?",
        a: "1–2% for cold traffic landing on a good page. 3–5% for warm traffic from your email list or a creator you trust. Under 1% means something on the page — offer, pricing, headline, social proof — is broken. The calculator will warn you if it falls below 0.5%.",
      },
      {
        q: "Are courses really better than templates?",
        a: "Different math. Courses have higher AOV ($97–497 is typical) but higher refund rates and require more support. Templates have lower AOV ($9–47) but near-zero refunds and zero ongoing support. Templates compound — once they're built, they sell forever. Courses age. The calculator works for both — just set AOV and refund rate accordingly.",
      },
      {
        q: "Should I sell on a marketplace (Gumroad, Etsy) or my own site?",
        a: "Marketplaces give you traffic but take 8–15% per sale. Your own site (Shopify, Lemon Squeezy, ThriveCart) charges 2.9–3.5% processing but no marketplace fee. If you have an audience already, own your site. If you're starting cold, marketplaces are a faster way to see if the product converts at all.",
      },
      {
        q: "What's bundle uplift and why does it matter?",
        a: "Bundling related products at a discounted price typically lifts your AOV by 15–35%. A template that normally sells for $27 in a $47 bundle of three templates often outsells the standalone version. The calculator has a Bundle Uplift % slider — try moving it from 0% to 30% and watch net revenue jump.",
      },
    ],
    emailCtaLine: "Email me my digital products plan",
  },

  "reseller": {
    seoTitle: "Reseller / thrift flip calculator — eBay, Poshmark, real hourly wage",
    seoDescription:
      "Reseller business calculator. Sourcing cost, sell-through, platform fees, and your effective hourly wage on eBay / Poshmark / Mercari.",
    keywords: [
      "reseller business calculator", "thrift flip business", "ebay reselling profit",
      "poshmark margins", "reselling hourly wage",
    ],
    heroParagraph:
      "Resellers are really running two businesses: a sourcing business (finding underpriced inventory) and a listing business (photographing, writing, shipping). The calculator measures both — including your effective hourly wage, which is usually the real bottleneck.",
    explainer: [
      "Reseller economics look simple — buy low, sell high — but the dollar margin per item often makes resellers a lot less per hour than they think. A typical thrift-flip item: source for $5, sell for $30, after platform fees and shipping you net $18. That's a great gross margin, but if it took you 20 minutes to photograph, list, write the description, and ship it, you're earning $54/hr — only if everything sold. If your sell-through is 40%, your effective hourly halves.",
      "Platform choice changes the math significantly. eBay: 13% final value fee on most categories. Poshmark: 20% on items $15+, $2.95 flat on items under $15 (brutal for low-ticket flips). Mercari: 10% selling fee + payment processing. Depop: 10%. The calculator defaults to 13% (eBay-like) but the slider covers the full range so you can model any platform.",
      "The unique metric reselling needs is sell-through rate. Listing 100 items and selling 45 of them in a month is a 45% sell-through. The 55 that didn't sell are still your inventory carrying cost. Sell-through is where time-on-listing actually pays back — items that don't sell still consumed your minutes. The calculator factors this in: lower sell-through means you had to list more items per item sold, which drives effective hourly down.",
      "Shipping is the third major lever. Most resellers ship USPS Priority Mail Flat Rate or Ground Advantage; the buyer typically pays a shipping fee that approximates your cost. Where you lose money on shipping is when buyers pay $5 but your label is actually $7, or you're absorbing it for a free-shipping promo. The calculator has separate Shipping Cost and Shipping Paid by Buyer fields so you can model the gap.",
    ],
    faqs: [
      {
        q: "What's a realistic sell-through rate for a thrift reseller?",
        a: "30–55% in the first 30 days, 70–85% in 90 days for items priced right. Anything under 30% suggests overpricing or poor photos. Some categories (vintage clothing, mid-century home) are inherently slower — a 90-day sell-through of 60% might be great there. Use the calculator's sell-through slider to see the impact on your hourly wage.",
      },
      {
        q: "Is reselling profitable as a full-time job?",
        a: "Possible but hard at most price points. The math: to earn $50k/year at $30/hr effective wage, you need ~33 hours/week of actual listing+sourcing time, which usually requires 50–60 hours of total commitment when you count sourcing trips, photography, returns, customer service. The calculator's effective hourly metric is the honest test of whether you're approaching that bar.",
      },
      {
        q: "Should I use a cross-listing tool like Vendoo or List Perfectly?",
        a: "Yes, once you're listing 20+ items a month across multiple platforms. The $30–50/mo subscription cost is usually recouped by the extra time you free up. The calculator has a Cross-listing Tool slider — toggle it on and see whether the time savings (modeled as lower minutes-per-listing) justify the cost.",
      },
      {
        q: "What's the biggest mistake new resellers make on this model?",
        a: "Not valuing their time. They focus on cash margin (\"I bought it for $5, sold for $30, made $25!\") and ignore that the $25 took an hour total when you count sourcing, listing, and shipping. The calculator surfaces your effective hourly wage explicitly so you can see whether reselling is genuinely better than your alternatives.",
      },
    ],
    emailCtaLine: "Email me my reseller plan",
  },

  "house-flipping": {
    seoTitle: "House flipping calculator — fix and flip profit, ARV, 70% rule",
    seoDescription:
      "Free fix-and-flip calculator. Model purchase, rehab, holding, and resale. ARV, financing, holding time, and the 70% rule all included.",
    keywords: [
      "house flipping calculator", "fix and flip calculator", "house flipping costs",
      "ARV calculator", "70 percent rule flipping", "fix and flip profit",
    ],
    heroParagraph:
      "Fix-and-flip economics depend on five numbers — purchase price, rehab budget, holding time, financing cost, and ARV. Adjust the sliders to see profit per flip, cash-on-cash return, and whether the deal passes the 70% rule.",
    explainer: [
      "Flipping is project-based — you make money once per project, not monthly. That changes the math compared to every other business on this site. The dial that matters most is holding time. Every extra month you own the property, you're paying interest, taxes, utilities, and insurance. A 4-month flip that becomes a 7-month flip can lose all its margin to carry costs even if everything else stayed the same.",
      "The most-cited heuristic in flipping is the 70% rule: your maximum offer should equal (ARV × 0.70) minus your rehab budget. If a house comps at $275,000 after repair and needs $35,000 of work, the math says don't pay more than $157,500. The calculator's insight text flags when your purchase price is over that ceiling so you know you're leaning on a soft assumption (faster sale, better market, lower interest) to make the deal pencil.",
      "Financing is the other lever — and the one new flippers underweight. Hard-money loans typically run 10–14% annual interest plus 1–3 points, which feels expensive until you compare it to traditional financing that won't approve a property in distressed condition. The calculator models down payment + interest + points so you can see the all-in cost of capital, not just the headline rate. Run the same deal at 10% interest vs. 14% and watch the profit move — that's the cost of shopping around for one extra lender.",
    ],
    faqs: [
      {
        q: "What's a realistic profit per flip for a first-time flipper?",
        a: "$15k–35k per flip is common in mid-market metros. $50k+ requires either a high-ARV market, an efficient crew, or unusually under-priced acquisition. Anything claiming consistent $100k profits per flip from a beginner is selling you a course, not running real numbers.",
      },
      {
        q: "Should I use a hard-money lender or a traditional mortgage?",
        a: "Most flips need hard-money — traditional banks won't lend on distressed properties or close in the timeframe you need. Hard money is expensive (10–14% + points) but it's the cost of access. Once you have 2–3 successful flips and a relationship, some local banks will lend on flips at better rates. The calculator handles either — set the interest rate to your actual quote.",
      },
      {
        q: "Why is the 70% rule a rule?",
        a: "It bakes in a margin of safety. 70% of ARV minus rehab leaves roughly 15% for total project costs (closing, financing, holding, selling fees) and 15% for profit. Markets that allow you to pay above 70% are markets where ARV is rising — which is great until it isn't. Stick to the rule in stable or softening markets; you can push it in obvious upmarkets but know what cushion you're giving up.",
      },
      {
        q: "What rehab contingency should I budget?",
        a: "First two flips: 25–30%. Surprises will happen — sewer lines, mold, knob-and-tube wiring, plumbing under slabs. Experienced flippers with a regular crew can drop it to 10–15% because their estimator gets better. The calculator defaults to 15% but newer flippers should bump it to 25% until they've seen what a full rehab looks like.",
      },
    ],
    emailCtaLine: "Email me my house-flipping plan",
  },

  "slime-business": {
    seoTitle: "Slime brand business calculator — TikTok Shop + Etsy unit economics",
    seoDescription:
      "Free calculator for indie slime brands. Drops, materials, charms, temp packs, TikTok Shop fees — see what your slime brand actually nets.",
    keywords: [
      "slime business calculator", "how to start a slime business", "slime brand profit",
      "slime tiktok shop", "etsy slime business", "small batch slime business",
    ],
    heroParagraph:
      "Indie slime brands run on five numbers: drops per month, units per drop, sell-through rate, materials cost, and platform fees. Adjust the sliders to see what your slime business actually nets after charms, containers, temp packs, and TikTok Shop's cut.",
    explainer: [
      "Slime is a niche where the economics look easy and trip new makers up consistently. A $4 jar of glue makes maybe 8–12 slimes at $11 each — gross math says you're printing money. The reality is that every unit also needs a container (clear plastic jar with lid, ~$0.50–1.50 wholesale), a label, scent + colorant + glitter + charms (often $1–2 in mix-ins per slime), and shipping packaging that survives a hot mailbox. Once you stack all of that plus the inevitable TikTok Shop fee (typically 8–10% including referral + payment processing) and creator affiliate payouts, the per-unit margin lands closer to 30–45%, not the 70%+ the glue math suggests.",
      "The slime market lives on TikTok Shop right now, not Etsy. Most indie brands see 50–70% of their revenue through TikTok, with Etsy as a steady but slower channel. TikTok's algorithm is unusually generous to small brands — a single viral drop video can sell out a 100-unit drop in under an hour. The catch: TikTok rewards consistency. Brands that miss a posting week often see their organic reach halve. The calculator's TikTok mix slider lets you model what happens to your margin as you shift weight between channels.",
      "Two cost lines new slime makers underestimate. First, **temp packs**. Slime gets wrecked by extreme heat (above 85°F it weeps or melts) and extreme cold (below 30°F it stiffens and can break the jar). Adding a heat or ice pack costs $1–2 per order, and depending on your shipping zone + season, 30–50% of orders need one. Second, **labor**. A custom-scented, charm-loaded slime takes 12–20 minutes per unit between mixing, kneading, photographing, jarring, labeling, and packing. At a real wage, that's $4–7 of labor per slime — often the largest single cost. The calculator surfaces both so you can see what \"hobby price\" actually means and where the breakeven really sits.",
    ],
    faqs: [
      {
        q: "What's a realistic sell-through rate for an indie slime drop?",
        a: "75–95% within 24 hours for established brands with engaged followings. New brands (under 1,000 followers) commonly sell 30–50% of a drop in the first week, with the rest moving over 2–4 weeks as new viewers find the listing. The calculator defaults to 80%, which is achievable once you're consistent on TikTok.",
      },
      {
        q: "Should I sell on Etsy too or just TikTok Shop?",
        a: "Both. TikTok handles discovery — that's where new buyers find you. Etsy handles search — that's where buyers go who already know what they want and are comparing options. Brands that nail both typically see ~50% TikTok / ~50% Etsy with very low overlap in buyers. Etsy gives you a steadier base, TikTok gives you the spikes.",
      },
      {
        q: "How much should I budget for charms and mix-ins per slime?",
        a: "$1–2.50 per unit covers the realistic range. Basic slime (color + scent + glitter) is closer to $0.75. Heavily themed slime with foam beads, character charms, and multiple textures pushes $2.50+. The calculator's material cost slider lumps glue + activator + scent + mix-ins into one number — adjust based on the most expensive product in your line.",
      },
      {
        q: "What's the minimum drop size that pencils out?",
        a: "30–50 units per drop is the practical floor. Below 30, your fixed-cost time per drop (photography, listing setup, marketing) eats too much of the revenue. Above 100 units, sell-through drops sharply unless you've built a real audience. Most indie brands run 2 drops/month of 50–80 units each — that's the calculator's default.",
      },
    ],
    emailCtaLine: "Email me my slime brand plan",
  },

  "cleaning-service": {
    seoTitle: "Cleaning / handyman service business calculator — hourly margin model",
    seoDescription:
      "Service business calculator for cleaning, handyman, and trades. Hourly rate, utilization, no-shows, crew wages, real margin.",
    keywords: [
      "cleaning business calculator", "handyman business costs", "service business margins",
      "cleaning business startup costs", "house cleaning profit",
    ],
    heroParagraph:
      "Service businesses run on three numbers: hourly billing rate, utilization (the share of paid hours that are actually billable), and labor cost. Set yours below — the calculator will surface utilization explicitly, which is where most service businesses bleed margin.",
    explainer: [
      "A cleaning or handyman service is essentially a labor arbitrage business. You buy crew time at one rate and sell it at another. The spread, minus fixed costs (vehicle, insurance, scheduling software, marketing), is your profit. The whole thing turns on two numbers: your hourly rate to the customer, and the share of your crew's paid hours that are actually billable. Drive time between jobs, setup, paperwork, and admin all get paid — but they're not invoiced. That's utilization.",
      "Most new cleaning operators charge $35–55/hr in lower-cost-of-living markets and $55–85/hr in higher-cost markets. Handyman is typically $40–80/hr depending on the trade and licensing. Below $35/hr, the math basically doesn't work once you account for unbilled time, vehicle costs, and insurance. The calculator's defaults assume a solid mid-market rate ($65/hr) — adjust to your area.",
      "The hidden cost in service businesses is travel time. 20 minutes between jobs sounds small until you realize it's 1.5 hours of unbilled labor for every 4 hours of billable work — a 27% drag on utilization. The calculator builds in 15% overhead time (admin, setup, breaks) on top of travel, which is conservative. Route density is the operational lever to push utilization up.",
      "No-shows are the other killer. A 10% no-show rate means you scheduled 40 jobs, did 36, and the 4 that flaked still cost you in committed crew time and drive-out fuel. Adding a cancellation fee or pre-paid deposit eliminates most no-show pain — the calculator's slider lets you see what the dollar impact looks like before and after such a policy.",
    ],
    faqs: [
      {
        q: "What's a healthy utilization rate for a cleaning service?",
        a: "60–75% billable-to-paid is healthy. Under 50% means too much drive time, too much admin, or too many short jobs. The fix is route density (geographic batching), longer minimum job sizes, or both. The calculator surfaces your utilization explicitly and warns you if it's below 50%.",
      },
      {
        q: "Should I hire a crew or stay solo?",
        a: "Solo maxes out around 30–35 billable hours/week (~$8–12k/mo gross). Hiring a part-timer takes that to ~$15–20k/mo gross but adds payroll, training, and management overhead. The math works when repeat customers + scheduling software let you keep both of you busy. The calculator's Crew Size slider lets you see the revenue impact before you actually hire.",
      },
      {
        q: "How important is repeat-customer share?",
        a: "Huge. A first-time customer costs you marketing dollars to acquire. A repeat customer costs you nothing extra. A business with 70% repeat customers spends a fraction on marketing compared to one with 20% — same revenue, very different profit. The calculator has a Repeat Customer Share slider you can use to model the long-term lift.",
      },
      {
        q: "What insurance do I actually need?",
        a: "General liability ($1M coverage is standard, ~$50–150/mo) and bonding if you're cleaning inside customer homes (~$50–100/mo). Workers comp if you have a W-2 crew (varies by state — Connecticut, where ChapHaus is based, runs ~5–8% of payroll for cleaning). The calculator's Insurance + Bond slider lumps these together; the default of $180/mo is in the right ballpark for a small solo operator with crew.",
      },
    ],
    emailCtaLine: "Email me my service business plan",
  },
};

export function getVerticalContent(slug: string): VerticalContent {
  return VERTICAL_CONTENT[slug] ?? FALLBACK_CONTENT;
}

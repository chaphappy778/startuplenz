# `@startuplenz/vertical-models/handmade`

**Handmade / Craft E-commerce** — Vertical Module #1  
Tier: Free (Tier 1) · Platforms: Etsy, TikTok Shop

---

## What This Module Does

This module is the complete financial model for a handmade product business
selling on Etsy and/or TikTok Shop. It takes the user's slider inputs plus
live cost snapshot values from the database and returns a clean JSON output
object describing monthly unit economics, a full COGS breakdown, platform fee
breakdown, and a 12-month growth trajectory.

---

## File Structure

```
packages/vertical-models/handmade/
├── definition.js         Vertical metadata, platform fee catalog, UI hints
├── inputs.js             Full slider schema (mirrors vertical_inputs table rows)
├── model.js              Core formula engine → ModelOutput JSON
├── benchmarks.js         Real-world reference data (Etsy/TikTok seller surveys)
├── tariff-sensitivity.js HTS code + BLS series mappings for alert engine
├── index.js              Barrel export
└── README.md             This file
```

---

## Formula Logic

### Step 1 — Resolve Inputs

Live-data fields (material cost, packaging cost, shipping cost) are overridden
by the latest `cost_snapshots` value when available. The caller passes these as
the `snapshots` argument.

```
resolved_input = snapshot_value ?? user_slider_value
```

### Step 2 — Volume

```
units_listed     = units_per_drop × drops_per_month
units_sold       = units_listed × (sell_through_rate / 100)
orders_per_month = units_sold / avg_order_size
```

### Step 3 — Revenue

```
gross_revenue    = units_sold × price_per_unit
refund_deduction = gross_revenue × (return_rate / 100)
net_revenue      = gross_revenue − refund_deduction
```

### Step 4 — COGS

```
material_cost = units_sold × material_cost_per_unit
packaging_cost = orders_per_month × packaging_cost_per_unit
labor_cost = units_sold × (labor_minutes_per_unit / 60) × maker_hourly_rate
total_cogs = material_cost + packaging_cost + labor_cost
```

> **Note on labor**: Set `maker_hourly_rate = 0` to exclude maker labor from
> COGS and see pure product-cost margin. This is the default for sellers who
> don't formally value their time.

### Step 5 — Platform Fees

**Etsy (per order)**

```
listing_fee    = avg_order_size × $0.20
transaction    = order_revenue × 6.5%
payment        = order_revenue × 3.0% + $0.25
offsite_ads    = order_revenue × 15.0%  (waived if opted out and < $10k/yr)
```

**TikTok Shop (per order)**

```
referral       = order_revenue × 6.0%
payment        = order_revenue × 3.0%
affiliate      = order_revenue × tiktok_affiliate_rate%
```

Fees are blended across channel mix:

```
etsy_orders  = orders_per_month × (platform_mix_etsy_pct / 100)
tiktok_orders = orders_per_month × (1 − platform_mix_etsy_pct / 100)
```

### Step 6 — Shipping

```
shipping_absorbed = avg_shipping_cost_per_order
  IF avg_order_value >= free_shipping_threshold: full absorption
  ELSE: 40% partial absorption (buyer pays rest via shipping charge)

total_shipping = orders_per_month × shipping_absorbed
```

### Step 7 — Advertising

```
ad_spend = gross_revenue × (ad_spend_pct_revenue / 100)
```

### Step 8 — Profit

```
gross_profit  = net_revenue − total_cogs
net_profit    = gross_profit − total_platform_fees − total_shipping − ad_spend
profit_margin = net_profit / net_revenue × 100
```

---

## Growth Trajectory

The 12-month trajectory adjusts `sell_through_rate` and `drops_per_month`
using phase multipliers based on real Etsy cohort data:

| Phase       | Months | Sell-Through Mult | Drops Mult |
|-------------|--------|-------------------|------------|
| Launch      | 1–3    | 0.60 → 0.76       | 1.0×       |
| Traction    | 4–8    | 0.82 → 0.97       | 1.0–1.2×   |
| Scale       | 9–12   | 1.00 → 1.15       | 1.3–1.5×   |

These reflect the Etsy algorithm's cold-start penalty for new shops and the
compounding effect of review accumulation on search ranking.

---

## Worked Example: Slime Seller

**Inputs**

| Input                    | Value    |
|--------------------------|----------|
| Drops per month          | 2        |
| Units per drop           | 12       |
| Price per unit           | $12.00   |
| Sell-through rate        | 80%      |
| Avg order size           | 2 units  |
| Material cost / unit     | $2.00    |
| Packaging cost / unit    | $0.75    |
| Labor (mins/unit)        | 15 mins  |
| Maker hourly rate        | $0 (excluded) |
| Avg shipping / order     | $4.50    |
| Free shipping threshold  | $35      |
| Platform mix Etsy        | 80%      |
| Offsite Ads opted out    | No       |
| Ad spend % revenue       | 5%       |
| TikTok affiliate rate    | 10%      |
| Return rate              | 2%       |

**Derived Volume**

```
units_listed     = 12 × 2 = 24
units_sold       = 24 × 0.80 = 19.2
orders_per_month = 19.2 / 2 = 9.6
```

**Revenue**

```
gross_revenue    = 19.2 × $12 = $230.40
refund_deduction = $230.40 × 0.02 = $4.61
net_revenue      = $225.79
```

**COGS**

```
material_cost   = 19.2 × $2.00 = $38.40
packaging_cost  = 9.6 × $0.75  = $7.20
labor_cost      = $0 (excluded)
total_cogs      = $45.60
gross_profit    = $225.79 − $45.60 = $180.19
```

**Platform Fees (Etsy 80%, TikTok 20%)**

```
Etsy orders: 9.6 × 0.80 = 7.68  →  avg order value = ($225.79 × 0.80) / 7.68 = $23.52
  listing    = 2 units × $0.20 × 7.68 orders = $3.07
  transaction = $23.52 × 0.065 = $1.53/order → $11.73
  payment    = $23.52 × 0.03 + $0.25 = $0.96/order → $7.36
  offsite_ads = $23.52 × 0.15 = $3.53/order → $27.09
  Etsy total  ≈ $49.25

TikTok orders: 9.6 × 0.20 = 1.92  → avg order value = ($225.79 × 0.20) / 1.92 = $23.52
  referral   = $23.52 × 0.06 = $1.41/order → $2.71
  payment    = $23.52 × 0.03 = $0.71/order → $1.36
  affiliate  = $23.52 × 0.10 = $2.35/order → $4.51
  TikTok total ≈ $8.58

total_platform_fees ≈ $57.83
```

**Shipping**

```
avg_order_value = $12 × 2 = $24  < $35 threshold → partial absorption (40%)
shipping_absorbed = $4.50 × 0.40 = $1.80/order
total_shipping = 9.6 × $1.80 = $17.28
```

**Advertising**

```
ad_spend = $230.40 × 0.05 = $11.52
```

**Profit**

```
net_profit    = $180.19 − $57.83 − $17.28 − $11.52 = $93.56
profit_margin = $93.56 / $225.79 = 41.4%
```

**ModelOutput (abbreviated)**

```json
{
  "vertical": "handmade-craft",
  "monthly": {
    "revenue":    { "gross": 230.40, "refundDeduction": 4.61, "net": 225.79 },
    "cogs":       { "materials": 38.40, "packaging": 7.20, "labor": 0, "total": 45.60 },
    "fees":       { "total": 57.83 },
    "shipping":   { "total": 17.28 },
    "advertising":{ "total": 11.52 },
    "profit":     { "gross": 180.19, "net": 93.56, "marginPct": 41.43 },
    "volume":     { "unitsListed": 24, "unitsSold": 19.2, "ordersPerMonth": 9.6 }
  },
  "annualized": {
    "grossRevenue": 2764.80,
    "netProfit": 1122.72
  }
}
```

> This slime seller is above the median profit margin (18%) because they excluded
> labor and their sell-through is strong. Including 15 mins/unit labor at $15/hr
> adds $72 in monthly cost, dropping margin to ~9%.

---

## Adding a Future Vertical

Each new vertical follows this exact pattern:

1. **Create** `packages/vertical-models/{slug}/` with the same 6 files.
2. **Insert** a row into `verticals` with your slug.
3. **Write** a migration file inserting `vertical_inputs` rows (one per
   input in `inputs.js`) and `data_source_mappings` rows for live-data fields.
4. **Register** your vertical's `definition.dataSources` keys against the sync
   worker's external API connectors.
5. **Export** from the package's `index.js` barrel.
6. **Add** an entry to `packages/vertical-models/index.js` (root barrel).

The formula engine, alert pipeline, saved plans, and UI shell are all
vertical-agnostic — they consume the standard `ModelOutput` shape. As long as
`runModel()` returns the same top-level structure, the UI renders it correctly.

---

## Data Sources

| Input                  | Source              | Series / Endpoint                         |
|------------------------|---------------------|-------------------------------------------|
| Material cost          | BLS PPI             | `PCU325510325510` (Chemicals/Plastics)    |
| Material cost (yarn)   | USITC HTS           | `5509.21.0060`                            |
| Material cost (resin)  | USITC HTS           | `3907.30.0000`                            |
| Packaging cost         | BLS PPI             | `WPU0915` (Paperboard Containers)         |
| Shipping cost          | Shippo              | USPS First Class Package (live rates)     |
| Etsy transaction fee   | Etsy (static)       | Seeded; update on policy change           |

---

## Assumptions & Limitations

- Growth trajectory multipliers are derived from Etsy cohort medians, not from
  the individual user's actual shop history. A user with an established shop
  should manually adjust `drops_per_month` to reflect their real operations.
- Etsy Offsite Ads fee is modelled as a binary opt-in/out. In practice,
  sellers above $10k/yr cannot opt out and pay the reduced 12% rate.
- TikTok Shop referral fees are subject to frequent promotional changes;
  the sync pipeline should monitor TikTok's seller policy page.
- Labor is excluded from default COGS to match how most Etsy sellers
  self-report margins. Enable `maker_hourly_rate > 0` for a realistic view.

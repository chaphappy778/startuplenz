/**
 * Platform Fee Tracker
 *
 * Platform fees change infrequently but are high-impact when they do.
 * Strategy per platform:
 *
 *   Etsy        — No public fee API. We maintain a versioned config file
 *                 (PLATFORM_FEES in this module). When Etsy announces a fee
 *                 change, a developer updates this config, which is caught
 *                 by the snapshot comparison and triggers alert_events.
 *                 Additionally, we lightly scrape the Etsy seller fee page
 *                 to detect text changes as an early-warning signal.
 *
 *   Shopify     — Partner API exposes plan pricing. We store the current
 *                 transaction fee schedule (which is the key variable for
 *                 merchants not on Shopify Payments).
 *
 *   TikTok Shop — No public API for seller fees. Versioned config + optional
 *                 HTML hash-check of the TikTok Shop seller center fee page.
 *
 *   Printify    — Printify has a Products API (requires key). We store a
 *                 representative sample of print costs for POD cost modeling.
 *                 Printful has a similar API.
 *
 * For scrape-based monitoring we store a SHA-256 hash of the fee page HTML.
 * If the hash changes between runs we log a WARNING and write a sentinel
 * snapshot row — a human then verifies and updates the config if needed.
 */

const https  = require('https');
const crypto = require('crypto');
const { writeSnapshot } = require('../lib/snapshot');

// ── Versioned fee config — update this when platforms announce changes ──────
// All rates are decimal fractions unless noted.
const PLATFORM_FEES = {
  etsy: {
    listing_fee_usd:        0.20,   // flat per listing, renewed every 4 months
    transaction_fee:        0.065,  // 6.5% of sale price + shipping
    payment_processing_fee: 0.03,   // 3% + $0.25 (US) — variable by country
    payment_processing_flat:0.25,
    offsite_ads_fee:        0.15,   // 15% if < $10k revenue; 12% above
    last_updated: '2023-04-11',     // update this when you change values
  },
  shopify: {
    // Transaction fees (non-Shopify Payments)
    basic_plan_fee:    0.02,
    shopify_plan_fee:  0.01,
    advanced_plan_fee: 0.005,
    // Monthly costs (USD)
    basic_monthly:     39,
    shopify_monthly:   105,
    advanced_monthly:  399,
    last_updated: '2023-05-01',
  },
  tiktok_shop: {
    referral_fee:        0.06,   // 6% of GMV (varies by category)
    payment_fee:         0.03,   // 3% payment processing
    shipping_subsidy:    0,      // platform sometimes subsidises; default 0
    last_updated: '2024-01-15',
  },
  printify: {
    // Printify Premium (monthly subscription reduces product costs ~20%)
    premium_monthly_usd: 29,
    base_plan_fee:       0,      // free plan available
    last_updated: '2024-01-01',
  },
  printful: {
    // Printful Growth plan (volume discounts)
    growth_plan_monthly: 0,      // free but requires $12k/yr spend
    order_fulfillment_markup: 0, // included in product price
    last_updated: '2024-01-01',
  },
};

// ── Monitored fee page URLs (for hash-change detection) ─────────────────────
const FEE_PAGES = [
  {
    platform: 'etsy',
    url:  'https://www.etsy.com/legal/fees/',
    key:  'etsy_fee_page_hash',
  },
  {
    platform: 'tiktok_shop',
    url:  'https://seller-us.tiktok.com/university/essay?knowledge_id=10000961',
    key:  'tiktok_fee_page_hash',
  },
];

function fetchPageHash(url) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : require('http');
    const req = protocol.get(url, {
      headers: {
        'User-Agent': 'StartupLenz-FeeMonitor/1.0 (contact: ' +
                      (process.env.CONTACT_EMAIL || 'admin@startuplenz.com') + ')',
      },
      timeout: 10000,
    }, res => {
      let body = '';
      res.on('data', d => (body += d));
      res.on('end', () => {
        const hash = crypto.createHash('sha256').update(body).digest('hex');
        resolve({ hash, statusCode: res.statusCode, length: body.length });
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error(`Timeout: ${url}`)); });
  });
}

/**
 * Fetch Printify product catalog sample for cost benchmarking.
 * Requires PRINTIFY_API_KEY.
 */
async function fetchPrintifySample() {
  if (!process.env.PRINTIFY_API_KEY) return null;

  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.printify.com',
      path:     '/v1/catalog/blueprints.json',
      method:   'GET',
      headers: {
        Authorization: `Bearer ${process.env.PRINTIFY_API_KEY}`,
      },
    };
    https.get(options, res => {
      let body = '';
      res.on('data', d => (body += d));
      res.on('end', () => {
        try {
          // Return just a subset — we only care about a few key products
          const all = JSON.parse(body);
          const tracked = (all || []).filter(p =>
            [3, 12, 145].includes(p.id) // Unisex Staple Tee, Canvas Tote, Mug
          );
          resolve(tracked);
        } catch (e) {
          resolve(null);
        }
      });
    }).on('error', reject);
  });
}

async function syncPlatforms(supabase, syncRunId) {
  let rows_inserted  = 0;
  let rows_unchanged = 0;

  // 1. Write versioned fee config rows
  //    externalKey pattern: '{platform}_{feeKey}' e.g. 'etsy_transaction_fee'
  //    These must match the external_key values in data_source_mappings.
  for (const [platform, fees] of Object.entries(PLATFORM_FEES)) {
    for (const [feeKey, feeValue] of Object.entries(fees)) {
      if (feeKey === 'last_updated') continue;
      if (typeof feeValue !== 'number') continue;

      const isMonetary = feeKey.endsWith('_usd') || feeKey.endsWith('_monthly');

      const result = await writeSnapshot(supabase, {
        externalKey:     `${platform}_${feeKey}`,   // e.g. 'etsy_transaction_fee'
        syncRunId,
        rawValue:        feeValue,
        normalizedValue: feeValue,
        currencyCode:    isMonetary ? 'USD' : 'USD', // rate_decimal or USD — DB stores the number
        metadataJson: {
          platform,
          fee_key:      feeKey,
          label:        `${platform} ${feeKey.replace(/_/g, ' ')}`,
          unit:         isMonetary ? 'usd' : 'rate_decimal',
          last_updated: PLATFORM_FEES[platform].last_updated,
          period:       new Date().toISOString().slice(0, 7),
        },
      });

      if (result.inserted) rows_inserted++;
      else                  rows_unchanged++;
    }
  }

  // 2. Hash-check monitored fee pages (skip on network errors — non-fatal)
  //    externalKey: page.key  e.g. 'etsy_fee_page_hash'
  //    The hash is not a numeric value; we use 0 as a sentinel for raw_value/normalized_value
  //    and store the real hash in metadataJson. The snapshot diff logic compares
  //    metadataJson.hash between runs to detect page changes.
  for (const page of FEE_PAGES) {
    try {
      const { hash, statusCode } = await fetchPageHash(page.url);
      if (statusCode !== 200) continue;

      const result = await writeSnapshot(supabase, {
        externalKey:     page.key,           // e.g. 'etsy_fee_page_hash'
        syncRunId,
        rawValue:        0,                  // no meaningful numeric value for a page hash
        normalizedValue: 0,
        currencyCode:    'USD',
        metadataJson: {
          hash,
          url:      page.url,
          platform: page.platform,
          checked_at: new Date().toISOString(),
        },
      });

      if (result.inserted) rows_inserted++;
      else                  rows_unchanged++;
    } catch (err) {
      console.warn(`[platforms] page monitor failed for ${page.platform}: ${err.message}`);
    }
  }

  // 3. Printify catalog sample (if key is configured)
  //    externalKey: 'printify_blueprint_{id}'  e.g. 'printify_blueprint_3'
  try {
    const sample = await fetchPrintifySample();
    if (sample?.length) {
      for (const product of sample) {
        const result = await writeSnapshot(supabase, {
          externalKey:     `printify_blueprint_${product.id}`,
          syncRunId,
          rawValue:        0,                // base cost varies by variant; stored in metadataJson
          normalizedValue: 0,
          currencyCode:    'USD',
          metadataJson: {
            blueprint_id: product.id,
            title:        product.title,
            fetched_at:   new Date().toISOString(),
          },
        });

        if (result.inserted) rows_inserted++;
        else                  rows_unchanged++;
      }
    }
  } catch (err) {
    console.warn(`[platforms] Printify catalog fetch failed: ${err.message}`);
  }

  return { rows_inserted, rows_unchanged };
}

module.exports = syncPlatforms;

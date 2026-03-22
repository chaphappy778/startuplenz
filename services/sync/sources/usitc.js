/**
 * USITC / HTS Tariff Connector
 *
 * Data source: USITC Tariff Database API
 *   https://hts.usitc.gov/  (web)
 *   https://hts.usitc.gov/reststop/api/details/  (REST)
 *
 * Update cadence: USITC updates the HTS schedule at the start of each year
 * and issues supplements throughout the year for Section 301 tariffs.
 * We fetch nightly but only write new snapshot rows when values change.
 *
 * Tier 1 verticals → relevant HTS chapters/headings:
 *
 *   Craft supplies / yarn / fabric  → Ch 52 (cotton), Ch 55 (manmade fibers), Ch 60 (knit fabric)
 *   Candle / fragrance materials    → 3406.00 (candles), 3301.29 (essential oils), 2712.20 (paraffin)
 *   Packaging (boxes/bags)          → 4819.10 (cartons), 6305.33 (polypropylene bags)
 *   Apparel / print-on-demand blank → 6109.10 (cotton t-shirts), 6109.90 (other t-shirts)
 *   Food truck supplies             → 0901.21 (roasted coffee), 1902.30 (pasta), 2009 (juices)
 *
 * The USITC REST API returns JSON for a given HTS code.
 * Endpoint: GET https://hts.usitc.gov/reststop/api/details/en/{htsCode}
 *
 * We store:
 *   - general (MFN) rate
 *   - special rate (GSP / free trade agreement rates if present)
 *   - col2 rate (adversarial countries)
 *   - any additional Section 301 rate note (parsed from footnote text)
 */

const https = require('https');
const { writeSnapshot } = require('../lib/snapshot');

// HTS codes to monitor, grouped by vertical
const HTS_CODES = [
  // Candle / fragrance
  { hts: '3406.00.0000', vertical: 'candle_bath',    label: 'Candles' },
  { hts: '3301.29.5100', vertical: 'candle_bath',    label: 'Essential oils NES' },
  { hts: '2712.20.0000', vertical: 'candle_bath',    label: 'Paraffin wax' },
  // Craft / textile
  { hts: '5205.11.0000', vertical: 'craft_handmade', label: 'Cotton yarn (single >714mn/kg)' },
  { hts: '5512.11.0000', vertical: 'craft_handmade', label: 'Woven polyester fabric' },
  // Packaging
  { hts: '4819.10.0040', vertical: 'packaging',      label: 'Folding cartons / boxes' },
  { hts: '6305.33.0010', vertical: 'packaging',      label: 'PP woven bags' },
  // Apparel / POD blanks
  { hts: '6109.10.0012', vertical: 'print_on_demand', label: 'Cotton t-shirts, mens' },
  { hts: '6109.90.1067', vertical: 'print_on_demand', label: 'Manmade fiber t-shirts' },
  // Subscription box / general
  { hts: '4819.20.0040', vertical: 'subscription_box', label: 'Folding boxes, other' },
];

function fetchHTS(htsCode) {
  return new Promise((resolve, reject) => {
    // Remove dots and padding zeros for the API endpoint
    const code = htsCode.replace(/\./g, '');
    const url = `https://hts.usitc.gov/reststop/api/details/en/${code}`;

    https.get(url, res => {
      let data = '';
      res.on('data', chunk => (data += chunk));
      res.on('end', () => {
        if (res.statusCode === 404) {
          resolve(null); // code not found — skip gracefully
          return;
        }
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error(`HTS JSON parse error for ${htsCode}: ${e.message}`));
        }
      });
    }).on('error', reject);
  });
}

/**
 * Parse a rate string like "6.5%", "Free", "29.8¢/kg+4.5%", "$1.67/kg" into
 * a decimal multiplier where possible, or store raw string for complex rates.
 */
function parseRate(rateStr) {
  if (!rateStr || rateStr.trim().toLowerCase() === 'free') return { rate: 0, raw: 'Free' };
  const pct = rateStr.match(/^(\d+(?:\.\d+)?)%$/);
  if (pct) return { rate: parseFloat(pct[1]) / 100, raw: rateStr };
  return { rate: null, raw: rateStr }; // compound / specific duty — store raw
}

async function syncUSITC(supabase, syncRunId) {
  let rows_inserted  = 0;
  let rows_unchanged = 0;

  for (const item of HTS_CODES) {
    // Gentle rate limiting — USITC is a public server
    await new Promise(r => setTimeout(r, 300));

    let result;
    try {
      result = await fetchHTS(item.hts);
    } catch (err) {
      console.warn(`[usitc] skipping ${item.hts}: ${err.message}`);
      continue;
    }

    if (!result) continue;

    // The USITC API response shape varies; normalise defensively
    const record = Array.isArray(result) ? result[0] : result;
    if (!record) continue;

    const generalRate = parseRate(record.general || record.generalRate || '');
    const specialRate = parseRate(record.special || record.specialRate || '');

    // rawValue:        the general (MFN) rate as a decimal, or -1 sentinel for compound duties
    // normalizedValue: same — rate is already a clean decimal (0.065 = 6.5%)
    //                  For compound/specific duties where rate is null, we store -1
    //                  so the NOT NULL constraint is satisfied; metadataJson holds the raw string.
    const numericRate = generalRate.rate ?? -1;

    const snapshotResult = await writeSnapshot(supabase, {
      externalKey:     item.hts,          // e.g. '4819.10.0040'
      syncRunId,
      rawValue:        numericRate,
      normalizedValue: numericRate,
      currencyCode:    'USD',
      metadataJson: {
        hts_code:     item.hts,
        vertical:     item.vertical,
        label:        item.label,
        raw_rate:     generalRate.raw,    // original string e.g. "6.5%" or "29.8¢/kg+4.5%"
        special_rate: specialRate.raw,
        col2_rate:    record.col2 || record.col2Rate || null,
        description:  record.description || null,
        period:       new Date().toISOString().slice(0, 7),
        is_compound:  generalRate.rate === null,
      },
    });

    if (snapshotResult.inserted) rows_inserted++;
    else                          rows_unchanged++;
  }

  return { rows_inserted, rows_unchanged };
}

module.exports = syncUSITC;

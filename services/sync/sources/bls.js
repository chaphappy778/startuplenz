/**
 * BLS CPI Connector
 *
 * Pulls Producer Price Index (PPI) and Consumer Price Index (CPI) series
 * most relevant to product-based small businesses, then normalizes them
 * into cost_snapshot rows via snapshot.js.
 *
 * Key series chosen:
 *   WPU03THRU15  — PPI: All commodities (broad materials baseline)
 *   WPU0913      — PPI: Plastics products (packaging)
 *   WPU091303    — PPI: Plastics foam products (shipping fill)
 *   WPU0312      — PPI: Paperboard containers & boxes (cardboard packaging)
 *   PCU4931494931494 — PPI: Couriers & messengers (proxy for shipping labor)
 *   CUUR0000SAF11     — CPI: Food away from home (food-truck input proxy)
 *   WPU0561         — PPI: Industrial chemicals (candle/fragrance inputs)
 *   WPU0371         — PPI: Yarn & thread mills (craft/textile materials)
 *   CUSR0000SETA02   — CPI: Used cars (not used here; left as example to remove)
 *
 * BLS public API: https://api.bls.gov/publicAPI/v2/timeseries/data/
 * Registration key increases daily limit from 25 → 500 queries.
 */

const https = require('https');
const { writeSnapshot } = require('../lib/snapshot');

// Series → our internal cost_category mapping
const SERIES_MAP = [
  { seriesId: 'WPU03THRU15', category: 'materials_general',      label: 'PPI All Commodities' },
  { seriesId: 'WPU0913',     category: 'packaging_plastics',     label: 'PPI Plastics Products' },
  { seriesId: 'WPU0312',     category: 'packaging_cardboard',    label: 'PPI Paperboard Containers' },
  { seriesId: 'WPU0561',     category: 'materials_chemicals',    label: 'PPI Industrial Chemicals' },
  { seriesId: 'WPU0371',     category: 'materials_textile',      label: 'PPI Yarn & Thread Mills' },
  { seriesId: 'PCU4931494931494', category: 'shipping_labor',    label: 'PPI Couriers & Messengers' },
  { seriesId: 'CUUR0000SAF11',    category: 'food_away_from_home', label: 'CPI Food Away From Home' },
];

const BLS_API_URL = 'https://api.bls.gov/publicAPI/v2/timeseries/data/';

function fetchBLS(seriesIds) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      seriesid:  seriesIds,
      startyear: String(new Date().getFullYear() - 1),
      endyear:   String(new Date().getFullYear()),
      registrationkey: process.env.BLS_API_KEY || undefined, // optional but recommended
    });

    const options = {
      method:  'POST',
      headers: {
        'Content-Type':   'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    };

    const req = https.request(BLS_API_URL, options, res => {
      let data = '';
      res.on('data', chunk => (data += chunk));
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error(`BLS JSON parse error: ${e.message}`));
        }
      });
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

/**
 * Extract the most recent period value from a BLS series result.
 * BLS returns periods like 'M01'–'M12'; we want the latest available.
 */
function latestValue(seriesData) {
  if (!seriesData?.data?.length) return null;
  // Data is returned newest-first
  const latest = seriesData.data[0];
  return {
    value:  parseFloat(latest.value),
    period: `${latest.year}-${latest.period.replace('M', '')}`, // e.g. "2024-11"
  };
}

async function syncBLS(supabase, syncRunId) {
  const seriesIds = SERIES_MAP.map(s => s.seriesId);

  // BLS allows max 25 series per request (50 with key)
  const CHUNK = process.env.BLS_API_KEY ? 50 : 25;
  const chunks = [];
  for (let i = 0; i < seriesIds.length; i += CHUNK) {
    chunks.push(seriesIds.slice(i, i + CHUNK));
  }

  const allSeries = {};
  for (const chunk of chunks) {
    const response = await fetchBLS(chunk);
    if (response.status !== 'REQUEST_SUCCEEDED') {
      throw new Error(`BLS API error: ${response.message?.join(', ')}`);
    }
    for (const s of response.Results.series) {
      allSeries[s.seriesID] = s;
    }
  }

  let rows_inserted  = 0;
  let rows_unchanged = 0;

  for (const mapping of SERIES_MAP) {
    const series = allSeries[mapping.seriesId];
    const point  = latestValue(series);
    if (!point) continue;

    // rawValue:        the BLS index number as published (e.g. 112.5)
    // normalizedValue: same — BLS index values are already dimensionless;
    //                  no unit conversion needed. The formula engine
    //                  interprets these as index points relative to base=100.
    const result = await writeSnapshot(supabase, {
      externalKey:     mapping.seriesId,   // e.g. 'WPU0312'
      syncRunId,
      rawValue:        point.value,
      normalizedValue: point.value,
      currencyCode:    'USD',              // not meaningful for index values; stored for schema compliance
      metadataJson: {
        category: mapping.category,
        label:    mapping.label,
        period:   point.period,            // e.g. '2024-11'
        unit:     'index',                 // BLS index (base period = 100)
      },
    });

    if (result.inserted) rows_inserted++;
    else                  rows_unchanged++;
  }

  return { rows_inserted, rows_unchanged };
}

module.exports = syncBLS;

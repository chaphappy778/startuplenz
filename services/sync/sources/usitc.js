/**
 * USITC / HTS Tariff Connector
 *
 * Data source: USITC Tariff Database API
 *   https://hts.usitc.gov/  (web)
 *   https://hts.usitc.gov/reststop/search  (REST — confirmed working 2026)
 *
 * Update cadence: USITC updates the HTS schedule at the start of each year
 * and issues supplements throughout the year for Section 301 tariffs.
 * We fetch nightly but only write new snapshot rows when values change.
 *
 * The USITC REST API returns a JSON array of matching HTS records.
 * Endpoint: GET https://hts.usitc.gov/reststop/search?keyword={htsCode}
 * The old /reststop/api/details/en/{code} path returns 404 — it no longer exists.
 *
 * We store:
 *   - general (MFN) rate
 *   - special rate (GSP / free trade agreement rates if present)
 *   - col2 rate (adversarial countries)
 */

const https = require('https');
const { writeSnapshot } = require('../lib/snapshot');

// HTS codes to monitor — item.hts must match the DB external_key after 'HTS:' prefix is added
const HTS_CODES = [
  { hts: '3907.30.0000', vertical: 'candle_bath',    label: 'Epoxide resins' },
  { hts: '5509.21.0000', vertical: 'craft_handmade', label: 'Yarn of polyester staple fibers' },
  { hts: '3923.21.0000', vertical: 'packaging',      label: 'Sacks and bags of polymers of ethylene' },
];

function fetchHTS(htsCode) {
  return new Promise((resolve, reject) => {
    // Pass the dotted HTS code directly as the search keyword — no dot-stripping.
    // The search endpoint accepts '3907.30.0000' and returns an array of matching records.
    const url = 'https://hts.usitc.gov/reststop/search?keyword=' + encodeURIComponent(htsCode);

    https.get(url, res => {
      let data = '';
      res.on('data', chunk => (data += chunk));
      res.on('end', () => {
        if (res.statusCode === 404) {
          resolve(null); // endpoint not found — skip gracefully
          return;
        }
        try {
          const body = JSON.parse(data);
          // Response is an array of matching records. Find the exact htsno match.
          // The API returns htsno in 10-digit dotted form ('3907.30.00.00') but our
          // HTS_CODES use the 8-digit form ('3907.30.0000'). Compare by stripping dots
          // and using a prefix/startsWith match to handle both formats safely.
          const record = Array.isArray(body) ? body.find(r => {
            const normalized = r.htsno.replace(/\./g, '');
            const target = htsCode.replace(/\./g, '');
            return normalized.startsWith(target) || target.startsWith(normalized);
          }) : body;
          resolve(record);
        } catch (e) {
          reject(new Error('HTS JSON parse error for ' + htsCode + ': ' + e.message));
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

    let record;
    try {
      record = await fetchHTS(item.hts);
    } catch (err) {
      console.warn(`[usitc] fetch error for ${item.hts}: ${err.message}`);
      continue;
    }

    if (!record) continue;

    const generalRate = parseRate(record.general || record.generalRate || '');
    const specialRate = parseRate(record.special || record.specialRate || '');
    const numericRate = generalRate.rate ?? -1;

    const snapshotResult = await writeSnapshot(supabase, {
      externalKey:     `HTS:${item.hts}`,
      syncRunId,
      rawValue:        numericRate,
      normalizedValue: numericRate,
      currencyCode:    'USD',
      metadataJson: {
        hts_code:     item.hts,
        vertical:     item.vertical,
        label:        item.label,
        raw_rate:     generalRate.raw,
        special_rate: specialRate.raw,
        col2_rate:    record.col2 || record.other || null,
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
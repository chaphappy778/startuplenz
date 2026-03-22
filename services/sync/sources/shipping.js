/**
 * Shipping Rate Sampler
 *
 * Pulls representative ground shipping rates via Shippo or EasyPost and
 * stores them as cost benchmarks. We sample a fixed set of package weights
 * across representative origin→destination zone pairs.
 *
 * Packages sampled:
 *   - 1 lb, 2 lb, 5 lb — standard small-product weights
 *
 * Carriers: UPS Ground, USPS Ground Advantage, FedEx Ground
 *
 * Zone pairs (origin zip → destination zip, approximate zone):
 *   - Zone 2: 10001 → 07001  (NY → NJ)
 *   - Zone 4: 10001 → 60601  (NY → Chicago)
 *   - Zone 6: 10001 → 77001  (NY → Houston)
 *   - Zone 8: 10001 → 90001  (NY → LA)
 *
 * We use Shippo's shipment rate endpoint (preferred; no shipment creation needed).
 * Fallback: EasyPost rate endpoint.
 * Both require an API key. If neither key is set, we skip with a warning.
 */

const https = require('https');
const { writeSnapshot } = require('../lib/snapshot');

const WEIGHTS_LB = [1, 2, 5];

const ZONE_PAIRS = [
  { label: 'zone2_ny_nj',      from: '10001', to: '07001' },
  { label: 'zone4_ny_chicago', from: '10001', to: '60601' },
  { label: 'zone6_ny_houston', from: '10001', to: '77001' },
  { label: 'zone8_ny_la',      from: '10001', to: '90001' },
];

// ── Shippo helpers ────────────────────────────────────────────────────────────

function shippoRequest(path, body) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body);
    const options = {
      hostname: 'api.goshippo.com',
      path,
      method:  'POST',
      headers: {
        Authorization:  `ShippoToken ${process.env.SHIPPO_API_KEY}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
      },
    };

    const req = https.request(options, res => {
      let data = '';
      res.on('data', d => (data += d));
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch (e) { reject(new Error(`Shippo parse error: ${e.message}`)); }
      });
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

async function fetchShippoRates(fromZip, toZip, weightLb) {
  const { status, body } = await shippoRequest('/shipments/', {
    address_from: { zip: fromZip, country: 'US' },
    address_to:   { zip: toZip,   country: 'US' },
    parcels: [{
      length: '10', width: '8', height: '4',
      distance_unit: 'in',
      weight: String(weightLb),
      mass_unit: 'lb',
    }],
    async: false,
  });

  if (status !== 200 && status !== 201) {
    throw new Error(`Shippo error ${status}: ${JSON.stringify(body)}`);
  }

  // Filter to ground services only
  const GROUND_SERVICES = [
    'ups_ground', 'usps_ground_advantage', 'fedex_ground',
    'usps_parcel_select', 'ups_surepost',
  ];

  return (body.rates || [])
    .filter(r => GROUND_SERVICES.includes(r.servicelevel?.token))
    .map(r => ({
      carrier:     r.provider,
      service:     r.servicelevel?.token,
      service_name: r.servicelevel?.name,
      amount:      parseFloat(r.amount),
      currency:    r.currency,
      est_days:    r.estimated_days,
    }));
}

// ── EasyPost helpers (fallback) ───────────────────────────────────────────────

function easypostRequest(path, body) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body);
    const auth = Buffer.from(`${process.env.EASYPOST_API_KEY}:`).toString('base64');
    const options = {
      hostname: 'api.easypost.com',
      path:     `/v2${path}`,
      method:   'POST',
      headers: {
        Authorization:  `Basic ${auth}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
      },
    };

    const req = https.request(options, res => {
      let data = '';
      res.on('data', d => (data += d));
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch (e) { reject(new Error(`EasyPost parse error: ${e.message}`)); }
      });
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

async function fetchEasyPostRates(fromZip, toZip, weightLb) {
  const { status, body } = await easypostRequest('/shipments', {
    shipment: {
      from_address: { zip: fromZip, country: 'US', city: 'New York', state: 'NY' },
      to_address:   { zip: toZip,   country: 'US' },
      parcel: {
        length: 10, width: 8, height: 4,
        weight: weightLb * 16, // EasyPost uses ounces
      },
    },
  });

  if (status !== 200 && status !== 201) {
    throw new Error(`EasyPost error ${status}: ${JSON.stringify(body?.error)}`);
  }

  const GROUND_SERVICES = ['Ground', 'Ground Advantage', 'Parcel Select Ground'];

  return (body.rates || [])
    .filter(r => GROUND_SERVICES.some(s => r.service?.includes(s)))
    .map(r => ({
      carrier:      r.carrier,
      service:      r.service,
      service_name: r.service,
      amount:       parseFloat(r.rate),
      currency:     r.currency,
      est_days:     r.delivery_days,
    }));
}

// ── Main sync ─────────────────────────────────────────────────────────────────

async function syncShipping(supabase, syncRunId) {
  const useShippo   = !!process.env.SHIPPO_API_KEY;
  const useEasyPost = !!process.env.EASYPOST_API_KEY;

  if (!useShippo && !useEasyPost) {
    console.warn('[shipping] No SHIPPO_API_KEY or EASYPOST_API_KEY set — skipping shipping sync');
    return { rows_inserted: 0, rows_unchanged: 0, skipped: true };
  }

  let rows_inserted  = 0;
  let rows_unchanged = 0;

  for (const zone of ZONE_PAIRS) {
    for (const weightLb of WEIGHTS_LB) {
      // Rate-limit: avoid hammering APIs
      await new Promise(r => setTimeout(r, 500));

      let rates = [];
      try {
        rates = useShippo
          ? await fetchShippoRates(zone.from, zone.to, weightLb)
          : await fetchEasyPostRates(zone.from, zone.to, weightLb);
      } catch (err) {
        console.warn(`[shipping] rate fetch failed (${zone.label} ${weightLb}lb): ${err.message}`);
        continue;
      }

      for (const rate of rates) {
        // externalKey must match the external_key stored in data_source_mappings.
        // Pattern: 'shipping_{service_token}_{zone_label}_{weight}lb'
        // e.g. 'shipping_ups_ground_zone4_ny_chicago_2lb'
        const externalKey = `shipping_${rate.service}_${zone.label}_${weightLb}lb`
          .replace(/\s+/g, '_').toLowerCase();

        const result = await writeSnapshot(supabase, {
          externalKey,
          syncRunId,
          rawValue:        rate.amount,   // carrier-quoted rate in USD
          normalizedValue: rate.amount,   // already in USD; no conversion needed
          currencyCode:    rate.currency || 'USD',
          metadataJson: {
            carrier:      rate.carrier,
            service:      rate.service,
            service_name: rate.service_name,
            weight_lb:    weightLb,
            zone_pair:    zone.label,
            from_zip:     zone.from,
            to_zip:       zone.to,
            est_days:     rate.est_days,
            source:       useShippo ? 'shippo' : 'easypost',
            sampled_at:   new Date().toISOString(),
          },
        });

        if (result.inserted) rows_inserted++;
        else                  rows_unchanged++;
      }
    }
  }

  return { rows_inserted, rows_unchanged };
}

module.exports = syncShipping;

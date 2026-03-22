/**
 * lib/mappings.js
 *
 * Resolves an external identifier (BLS series ID, HTS code, platform fee key,
 * shipping benchmark key) to the corresponding data_source_mappings.id UUID.
 *
 * data_source_mappings schema (from your migration):
 *   id                  uuid  PK
 *   vertical_input_id   uuid  FK → vertical_inputs(id)
 *   (plus endpoint, jsonpath, alert_threshold, etc.)
 *
 * The sync pipeline needs to look up these UUIDs before writing cost_snapshots
 * or alert_events, both of which have data_source_mapping_id as a NOT NULL FK.
 *
 * STRATEGY
 * ─────────
 * We store an `external_key` value in data_source_mappings that matches the
 * identifier used by each external source:
 *   BLS:       the series ID string,   e.g. 'WPU0312'
 *   USITC:     the HTS code string,    e.g. '4819.10.0040'
 *   Platforms: a slug,                 e.g. 'etsy_transaction_fee'
 *   Shipping:  a slug,                 e.g. 'shipping_ups_ground_zone4_ny_chicago_2lb'
 *
 * This module fetches ALL rows from data_source_mappings once per sync run
 * and caches them in a Map for O(1) lookups throughout the run.
 *
 * If a key has no corresponding row in data_source_mappings the sync code
 * skips that data point and logs a warning rather than hard-failing the run.
 * This allows the mapping table to be populated incrementally.
 *
 * ASSUMPTION
 * ──────────
 * Your data_source_mappings table has an `external_key` text column that
 * stores the identifier used by each external API. If the column is named
 * differently in your migration, update EXTERNAL_KEY_COLUMN below.
 */

const EXTERNAL_KEY_COLUMN = 'external_key'; // ← update if your column is named differently

/** @type {Map<string, string> | null}  key → data_source_mappings UUID */
let _cache = null;

/**
 * Load all data_source_mappings rows into the cache.
 * Called once at the start of each sync run via prime().
 */
async function prime(supabase) {
  const { data, error } = await supabase
    .from('data_source_mappings')
    .select(`id, ${EXTERNAL_KEY_COLUMN}`);

  if (error) {
    throw new Error(`mappings.prime() failed: ${error.message}`);
  }

  _cache = new Map();
  for (const row of data) {
    const key = row[EXTERNAL_KEY_COLUMN];
    if (key) _cache.set(key, row.id);
  }

  return _cache.size;
}

/**
 * Look up a data_source_mappings UUID by its external key.
 *
 * @param   {string}      externalKey  — e.g. 'WPU0312', 'etsy_transaction_fee'
 * @returns {string|null}              — UUID string, or null if not found
 * @throws  {Error}                    — if prime() has not been called yet
 */
function resolve(externalKey) {
  if (_cache === null) {
    throw new Error(
      'mappings.resolve() called before mappings.prime(). ' +
      'Call await mappings.prime(supabase) at the start of the sync run.'
    );
  }
  return _cache.get(externalKey) ?? null;
}

/**
 * Reset the cache (called between test runs or if you need to force a reload).
 */
function reset() {
  _cache = null;
}

module.exports = { prime, resolve, reset };

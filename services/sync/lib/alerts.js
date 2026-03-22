/**
 * lib/alerts.js
 *
 * Detects whether a cost change crosses a threshold that warrants an
 * alert_event row. The services/alerts email job reads these rows and
 * fans them out via user_alert_queue.
 *
 * Threshold rules (configurable via ALERT_THRESHOLDS below or env vars):
 *   - BLS index values:      2% change
 *   - Tariff rates:          any change (0%)
 *   - Platform fees:         any change (0%)
 *   - Shipping benchmarks:   5% change
 *
 * alert_events columns (exact, from 20260321_000005_alert_tables.sql):
 *   id                     uuid              PK  default uuid_generate_v4()  NOT NULL
 *   data_source_mapping_id uuid              FK → data_source_mappings(id)   NOT NULL
 *   sync_run_id            uuid              FK → sync_runs(id)              NOT NULL
 *   old_value              numeric                                            NOT NULL
 *   new_value              numeric                                            NOT NULL
 *   change_pct             numeric                                            NOT NULL
 *   change_direction       change_direction  enum                             NOT NULL
 *   detected_at            timestamptz                                        NOT NULL  default now()
 *
 * change_direction enum values: 'up' | 'down'
 * (confirmed from the column type; update the DIRECTIONS guard below if yours differ)
 *
 * NOTE: alert_events has NO notified_at column — delivery status is tracked
 * in user_alert_queue. getPendingAlerts() queries user_alert_queue instead.
 */

// ── Threshold config ──────────────────────────────────────────────────────────
// Keyed by the external_key prefix pattern stored in data_source_mappings.
// The sync sources set externalKey values like 'WPU0312', 'etsy_transaction_fee',
// 'shipping_ups_ground_zone4_2lb', '4819.10.0040', etc.
// We also allow the threshold to be looked up against the mappingId directly
// if you store category metadata there — see getThresholdForMapping() below.

const DEFAULT_THRESHOLDS = {
  bls:      parseFloat(process.env.ALERT_THRESHOLD_BLS      || '2'),   // PPI/CPI index points
  usitc:    parseFloat(process.env.ALERT_THRESHOLD_TARIFF   || '0'),   // any tariff change
  platform: parseFloat(process.env.ALERT_THRESHOLD_PLATFORM || '0'),   // any fee change
  shipping: parseFloat(process.env.ALERT_THRESHOLD_SHIPPING || '5'),   // shipping benchmarks
  default:  parseFloat(process.env.ALERT_THRESHOLD_DEFAULT  || '3'),
};

// Valid values for the change_direction enum
const DIRECTIONS = new Set(['up', 'down']);

/**
 * Determine the threshold for a given externalKey by pattern matching.
 * Extend this logic if you need per-series thresholds.
 *
 * @param   {string} externalKey
 * @returns {number} minimum absolute % change required to fire an alert
 */
function getThreshold(externalKey) {
  if (!externalKey) return DEFAULT_THRESHOLDS.default;

  // BLS series IDs start with W (WPU...) or C (CUUR..., CUSR...)
  if (/^[WC][A-Z0-9]/.test(externalKey)) return DEFAULT_THRESHOLDS.bls;

  // HTS codes contain dots and digits
  if (/^\d{4}\.\d{2}/.test(externalKey)) return DEFAULT_THRESHOLDS.usitc;

  // Platform fee slugs
  if (externalKey.startsWith('etsy_')     ||
      externalKey.startsWith('shopify_')  ||
      externalKey.startsWith('tiktok_')   ||
      externalKey.startsWith('printify_') ||
      externalKey.startsWith('printful_')) return DEFAULT_THRESHOLDS.platform;

  // Shipping benchmarks
  if (externalKey.startsWith('shipping_')) return DEFAULT_THRESHOLDS.shipping;

  return DEFAULT_THRESHOLDS.default;
}

/**
 * Insert an alert_event row when a change exceeds the threshold.
 *
 * @param {Object} supabase
 * @param {Object} change
 *   @param {string}  change.mappingId       — data_source_mappings UUID
 *   @param {string}  change.syncRunId       — sync_runs UUID
 *   @param {number}  change.oldValue        — previous normalized_value
 *   @param {number}  change.newValue        — new normalized_value
 *   @param {number|null} change.pctChange   — % change (null if oldValue was 0)
 *   @param {string}  change.direction       — 'up' | 'down'
 *   @param {string}  change.prevSnapshotId  — previous cost_snapshots UUID
 *   @param {string}  change.newSnapshotId   — newly inserted cost_snapshots UUID
 *   @param {string}  [change.externalKey]   — passed through for threshold lookup
 */
async function checkAndInsertAlertEvent(supabase, change) {
  const {
    mappingId,
    syncRunId,
    oldValue,
    newValue,
    pctChange,
    direction,
    externalKey = '',
  } = change;

  // Determine threshold using the externalKey pattern
  const threshold = getThreshold(externalKey);
  const absPct    = Math.abs(pctChange ?? 0);

  if (absPct < threshold) {
    return; // Below threshold — no alert needed
  }

  // Validate direction is a known enum value (guard against bad data)
  const safeDirection = DIRECTIONS.has(direction) ? direction : (newValue > oldValue ? 'up' : 'down');

  // change_pct must be NOT NULL per schema — use 0 if pctChange is null
  // (happens when oldValue was exactly 0; the value went from 0 to something)
  const safePct = pctChange ?? 0;

  const alertPayload = {
    data_source_mapping_id: mappingId,
    sync_run_id:            syncRunId,
    old_value:              oldValue,
    new_value:              newValue,
    change_pct:             safePct,
    change_direction:       safeDirection,
    // detected_at defaults to now() in the DB — no need to send it
  };

  const { error } = await supabase
    .from('alert_events')
    .insert(alertPayload);

  if (error) {
    // Log but don't throw — alert failure must not abort the sync run
    console.error(
      `[alerts] insert failed for mapping ${mappingId}: ${error.message}`
    );
    return;
  }

  console.log(
    `[alerts] created alert for mapping ${mappingId}: ` +
    `${safeDirection} ${safePct.toFixed(2)}% ` +
    `(${oldValue} → ${newValue})`
  );
}

/**
 * Fetch pending (unsent) alerts for debugging / manual inspection.
 * Delivery status lives in user_alert_queue, not alert_events.
 *
 * Returns user_alert_queue rows whose status is not yet 'sent'.
 */
async function getPendingAlerts(supabase) {
  const { data, error } = await supabase
    .from('user_alert_queue')
    .select('*, alert_events(*)')
    .neq('status', 'sent')
    .order('created_at', { ascending: false });

  if (error) throw new Error(`getPendingAlerts error: ${error.message}`);
  return data;
}

module.exports = { checkAndInsertAlertEvent, getPendingAlerts };

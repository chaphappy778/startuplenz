/**
 * lib/snapshot.js
 *
 * Handles:
 *   1. Reading the current snapshot for a data_source_mapping_id
 *   2. Comparing new value against old
 *   3. Writing a new immutable cost_snapshots row (only when value changes
 *      OR no row exists for this mapping yet)
 *   4. Updating is_current: the newly inserted row is marked true; the
 *      previous current row is marked false — done in a single transaction
 *      via an RPC call to avoid a race window.
 *   5. Returning a change descriptor consumed by alerts.js
 *
 * cost_snapshots columns (exact, from 20260321_000003_cost_data_tables.sql):
 *   id                     uuid        PK  default uuid_generate_v4()  NOT NULL
 *   data_source_mapping_id uuid        FK → data_source_mappings(id)   NOT NULL
 *   sync_run_id            uuid        FK → sync_runs(id)              NOT NULL
 *   raw_value              numeric                                      NOT NULL
 *   normalized_value       numeric                                      NOT NULL
 *   currency_code          text                                         NOT NULL  default 'USD'
 *   metadata_json          jsonb                                        NULLABLE
 *   is_current             boolean                                      NOT NULL  default false
 *   effective_at           timestamptz                                  NOT NULL  default now()
 *   created_at             timestamptz                                  NOT NULL  default now()
 *
 * is_current management
 * ──────────────────────
 * The schema description says is_current is enforced by a partial unique index.
 * We manage the flip with a small Postgres function called inside a transaction:
 *
 *   SELECT insert_cost_snapshot(
 *     p_data_source_mapping_id,
 *     p_sync_run_id,
 *     p_raw_value,
 *     p_normalized_value,
 *     p_currency_code,
 *     p_metadata_json
 *   );
 *
 * That function (see SQL block at the bottom of this file) atomically:
 *   1. Sets is_current = false on the previous current row for this mapping
 *   2. Inserts the new row with is_current = true
 *   3. Returns the new row's id
 *
 * If you haven't created that function yet, see the SQL at the bottom of this
 * file and run it once in your Supabase SQL editor.
 */

const { checkAndInsertAlertEvent } = require('./alerts');
const mappings = require('./mappings');

// ── SQL function name ────────────────────────────────────────────────────────
const INSERT_FN = 'insert_cost_snapshot';

/**
 * Fetch the current (is_current = true) snapshot for a mapping, if one exists.
 *
 * @param   {Object} supabase
 * @param   {string} mappingId  — data_source_mappings UUID
 * @returns {Object|null}
 */
async function getCurrentSnapshot(supabase, mappingId) {
  const { data, error } = await supabase
    .from('cost_snapshots')
    .select('id, raw_value, normalized_value, currency_code, metadata_json, effective_at')
    .eq('data_source_mapping_id', mappingId)
    .eq('is_current', true)
    .maybeSingle();

  if (error) throw new Error(`getCurrentSnapshot error (mapping ${mappingId}): ${error.message}`);
  return data;
}

/**
 * Write a new snapshot row for one data source mapping.
 * Skips silently if the external key cannot be resolved to a mapping UUID
 * (so the pipeline can be populated incrementally).
 *
 * @param {Object} supabase
 * @param {Object} row
 *   @param {string}  row.externalKey       — BLS series ID, HTS code, platform slug, etc.
 *   @param {string}  row.syncRunId         — sync_runs.id for this job run
 *   @param {number}  row.rawValue          — value as received from the external API
 *   @param {number}  row.normalizedValue   — value after unit normalisation
 *   @param {string}  [row.currencyCode]    — ISO 4217, default 'USD'
 *   @param {Object}  [row.metadataJson]    — arbitrary extra context
 *
 * @returns {{ inserted: boolean, mappingId: string|null, change: Object|null }}
 */
async function writeSnapshot(supabase, row) {
  const {
    externalKey,
    syncRunId,
    rawValue,
    normalizedValue,
    currencyCode = 'USD',
    metadataJson = null,
  } = row;

  // 1. Resolve external key → data_source_mappings UUID
  const mappingId = mappings.resolve(externalKey);
  if (!mappingId) {
    console.warn(
      `[snapshot] no data_source_mappings row for external_key="${externalKey}" — skipping`
    );
    return { inserted: false, mappingId: null, change: null };
  }

  // 2. Read the current snapshot so we can diff
  const current = await getCurrentSnapshot(supabase, mappingId);

  // 3. Decide whether a new row is needed
  //    - Always insert if no current row exists yet
  //    - Insert if normalizedValue has meaningfully changed
  let shouldInsert = !current;
  let change       = null;

  if (current) {
    const oldNorm = parseFloat(current.normalized_value);
    const newNorm = parseFloat(normalizedValue);

    if (Math.abs(newNorm - oldNorm) > 1e-9) {
      shouldInsert = true;
      const pctChange = oldNorm !== 0
        ? ((newNorm - oldNorm) / Math.abs(oldNorm)) * 100
        : null;

      change = {
        mappingId,
        syncRunId,
        oldValue:       oldNorm,
        newValue:       newNorm,
        pctChange,
        direction:      newNorm > oldNorm ? 'up' : 'down',
        prevSnapshotId: current.id,
      };
    }
  }

  if (!shouldInsert) {
    return { inserted: false, mappingId, change: null };
  }

  // 4. Atomically retire old is_current row and insert the new one
  //    via the insert_cost_snapshot Postgres function.
  const { data: rpcData, error: rpcError } = await supabase
    .rpc(INSERT_FN, {
      p_data_source_mapping_id: mappingId,
      p_sync_run_id:            syncRunId,
      p_raw_value:              rawValue,
      p_normalized_value:       normalizedValue,
      p_currency_code:          currencyCode,
      p_metadata_json:          metadataJson,
    });

  if (rpcError) {
    throw new Error(
      `writeSnapshot RPC error (mapping ${mappingId}, key "${externalKey}"): ${rpcError.message}`
    );
  }

  // rpcData is the new row's UUID returned by the function
  const newSnapshotId = rpcData;

  // 5. Trigger alert detection if there was a meaningful value change
  if (change) {
    await checkAndInsertAlertEvent(supabase, {
      ...change,
      newSnapshotId,
    });
  }

  return { inserted: true, mappingId, change };
}

module.exports = { writeSnapshot, getCurrentSnapshot };

/*
================================================================================
REQUIRED POSTGRES FUNCTION — run once in Supabase SQL editor
================================================================================

Create the file supabase/migrations/20260321_000006_fn_insert_cost_snapshot.sql
and paste the SQL below, then run `supabase db push` (or execute it directly
in the SQL editor if you're not using the CLI migration workflow).

--------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION insert_cost_snapshot(
  p_data_source_mapping_id uuid,
  p_sync_run_id            uuid,
  p_raw_value              numeric,
  p_normalized_value       numeric,
  p_currency_code          text    DEFAULT 'USD',
  p_metadata_json          jsonb   DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_new_id uuid;
BEGIN
  -- Retire the previous current row for this mapping (if one exists)
  UPDATE cost_snapshots
     SET is_current = false
   WHERE data_source_mapping_id = p_data_source_mapping_id
     AND is_current = true;

  -- Insert the new current row
  INSERT INTO cost_snapshots (
    data_source_mapping_id,
    sync_run_id,
    raw_value,
    normalized_value,
    currency_code,
    metadata_json,
    is_current
  ) VALUES (
    p_data_source_mapping_id,
    p_sync_run_id,
    p_raw_value,
    p_normalized_value,
    p_currency_code,
    p_metadata_json,
    true
  )
  RETURNING id INTO v_new_id;

  RETURN v_new_id;
END;
$$;

--------------------------------------------------------------------------------
*/

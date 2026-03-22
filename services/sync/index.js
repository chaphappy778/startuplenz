/**
 * StartupLenz — Nightly Sync Orchestrator
 *
 * Lifecycle:
 *   1. INSERT a sync_runs row (status='running') → get its UUID
 *   2. Prime the data_source_mappings cache
 *   3. Run each source, passing the syncRunId down into writeSnapshot
 *   4. UPDATE sync_runs with final status, row counts, and completed_at
 *
 * A failure in one source does NOT abort the others.
 * The sync_runs row is always finalised — even if all sources fail.
 *
 * sync_runs columns (exact, from 20260321_000003_cost_data_tables.sql):
 *   id              uuid              PK   NOT NULL
 *   job_name        text                   NOT NULL
 *   status          sync_run_status   enum NOT NULL  default 'running'
 *   rows_inserted   int                    NULLABLE  default 0
 *   rows_unchanged  int                    NULLABLE  default 0
 *   error_message   text                   NULLABLE
 *   started_at      timestamptz            NOT NULL  default now()
 *   completed_at    timestamptz            NULLABLE
 *
 * sync_run_status enum values: 'running' | 'completed' | 'failed'
 * (update STATUS_* constants below if yours differ)
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const syncBLS       = require('./sources/bls');
const syncUSITC     = require('./sources/usitc');
const syncPlatforms = require('./sources/platforms');
const syncShipping  = require('./sources/shipping');
const mappings      = require('./lib/mappings');

// ── Supabase client (service role — bypasses RLS) ───────────────────────────
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ── sync_run_status enum values ──────────────────────────────────────────────
const STATUS_RUNNING   = 'running';
const STATUS_COMPLETED = 'completed';
const STATUS_FAILED    = 'failed';

// ── Logger ───────────────────────────────────────────────────────────────────
function log(level, source, message, data = {}) {
  const entry = {
    ts: new Date().toISOString(),
    level,
    source,
    message,
    ...data,
  };
  console[level === 'error' ? 'error' : 'log'](JSON.stringify(entry));
}

// ── sync_runs helpers ────────────────────────────────────────────────────────

async function createSyncRun() {
  const { data, error } = await supabase
    .from('sync_runs')
    .insert({
      job_name: 'nightly_sync',
      status:   STATUS_RUNNING,
      // started_at and rows_inserted/unchanged default in the DB
    })
    .select('id')
    .single();

  if (error) throw new Error(`Failed to create sync_runs row: ${error.message}`);
  return data.id;
}

async function finaliseSyncRun(syncRunId, { success, rowsInserted, rowsUnchanged, errorMessage }) {
  const { error } = await supabase
    .from('sync_runs')
    .update({
      status:        success ? STATUS_COMPLETED : STATUS_FAILED,
      rows_inserted: rowsInserted,
      rows_unchanged: rowsUnchanged,
      error_message: errorMessage ?? null,
      completed_at:  new Date().toISOString(),
    })
    .eq('id', syncRunId);

  if (error) {
    // Log but don't throw — we're already in cleanup
    console.error(JSON.stringify({
      ts: new Date().toISOString(),
      level: 'error',
      source: 'orchestrator',
      message: 'Failed to finalise sync_runs row',
      syncRunId,
      error: error.message,
    }));
  }
}

// ── Run one source safely ────────────────────────────────────────────────────

async function runSource(name, fn, syncRunId) {
  const start = Date.now();
  log('info', name, 'starting');
  try {
    const result = await fn(supabase, syncRunId);
    log('info', name, 'completed', {
      duration_ms: Date.now() - start,
      ...result,
    });
    return { name, success: true, ...result };
  } catch (err) {
    log('error', name, 'failed', {
      duration_ms: Date.now() - start,
      error: err.message,
      stack: err.stack,
    });
    return { name, success: false, error: err.message };
  }
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  log('info', 'orchestrator', 'sync job started');

  // 1. Create the sync_runs job record — this gives us the UUID we pass to
  //    every writeSnapshot call so all snapshots are traceable to this run.
  let syncRunId;
  try {
    syncRunId = await createSyncRun();
    log('info', 'orchestrator', 'sync_run created', { syncRunId });
  } catch (err) {
    log('error', 'orchestrator', 'could not create sync_runs row — aborting', {
      error: err.message,
    });
    process.exitCode = 1;
    return;
  }

  // 2. Prime the data_source_mappings cache once for the whole run.
  //    Each source will call mappings.resolve(externalKey) — O(1) lookups.
  let mappingCount;
  try {
    mappingCount = await mappings.prime(supabase);
    log('info', 'orchestrator', 'mappings cache primed', { mappingCount });
  } catch (err) {
    log('error', 'orchestrator', 'could not prime mappings cache — aborting', {
      error: err.message,
    });
    await finaliseSyncRun(syncRunId, {
      success:       false,
      rowsInserted:  0,
      rowsUnchanged: 0,
      errorMessage:  `mappings.prime() failed: ${err.message}`,
    });
    process.exitCode = 1;
    return;
  }

  // 3. Run all sources — failures are isolated per source.
  const results = await Promise.allSettled([
    runSource('bls',       syncBLS,       syncRunId),
    runSource('usitc',     syncUSITC,     syncRunId),
    runSource('platforms', syncPlatforms, syncRunId),
    runSource('shipping',  syncShipping,  syncRunId),
  ]);

  const summary = results.map(r =>
    r.status === 'fulfilled' ? r.value : { success: false, error: r.reason?.message }
  );

  // 4. Aggregate row counts across all sources.
  const failed       = summary.filter(r => !r.success);
  const rowsInserted = summary.reduce((acc, r) => acc + (r.rows_inserted  ?? 0), 0);
  const rowsUnchanged = summary.reduce((acc, r) => acc + (r.rows_unchanged ?? 0), 0);
  const errorMessage  = failed.length
    ? failed.map(r => `${r.name}: ${r.error}`).join('; ')
    : null;

  log('info', 'orchestrator', 'sync job finished', {
    syncRunId,
    total:         summary.length,
    success:       summary.length - failed.length,
    failed:        failed.length,
    rows_inserted: rowsInserted,
    rows_unchanged: rowsUnchanged,
    sources:       summary,
  });

  // 5. Finalise the sync_runs row.
  await finaliseSyncRun(syncRunId, {
    success:       failed.length === 0,
    rowsInserted,
    rowsUnchanged,
    errorMessage,
  });

  if (failed.length > 0) {
    process.exitCode = 1; // signal failure to cron scheduler without throwing
  }
}

main();


-- =============================================================================
-- File:         20260506000013_schema_hygiene.sql
-- Description:  Reconciles two pieces of schema/seed drift surfaced during
--               the Phase 2+3 calculator wiring:
--
--                 1) vertical_inputs.formula_key — declared NOT NULL in
--                    000003_cost_data_tables.sql, but the handmade seed in
--                    000011_handmade_vertical_seed.sql does not insert a
--                    value for it. Backfill from input_key and re-assert
--                    NOT NULL so the column is consistent.
--
--                 2) data_source_mappings.external_key — referenced in the
--                    handmade seed (column list and ON CONFLICT clause) and
--                    in some downstream queries, but the column was never
--                    declared in 000003. Add the column, plus the unique
--                    index the seed's ON CONFLICT (vertical_input_id,
--                    external_key) clause targets.
--
--               This migration is additive and idempotent. It detects the
--               deployed state and only applies the changes that are missing.
--               Safe to re-run.
--
-- Dependencies: 20260321000003_cost_data_tables.sql
--               20260322000011_handmade_vertical_seed.sql
--
-- Note for fresh-DB setups (greenfield, not the deployed environment):
--   The historical migrations 000003 and 000011 are also out of sync with
--   each other. To enable a clean `supabase db reset` from migration 1, the
--   recommended (separate) edits are:
--     • In 000003, add `default ''` to formula_key (or drop NOT NULL).
--     • In 000003, add `external_key text` to data_source_mappings, plus
--       the `(vertical_input_id, external_key)` unique index.
--   Those edits are not required for the existing deployed DB — this
--   migration is sufficient. They are only needed if you rebuild the DB
--   from scratch.
-- =============================================================================

BEGIN;


-- ---------------------------------------------------------------------------
-- 1. vertical_inputs.formula_key
-- ---------------------------------------------------------------------------

-- Defensive: add the column if it doesn't exist (a deployed DB whose 000003
-- ran before formula_key was added wouldn't have it).
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name   = 'vertical_inputs'
          AND column_name  = 'formula_key'
    ) THEN
        ALTER TABLE public.vertical_inputs ADD COLUMN formula_key text;
        RAISE NOTICE 'Added vertical_inputs.formula_key column.';
    ELSE
        RAISE NOTICE 'vertical_inputs.formula_key already present.';
    END IF;
END $$;

-- Backfill any NULL or empty formula_key from input_key.
UPDATE public.vertical_inputs
   SET formula_key = input_key
 WHERE formula_key IS NULL
    OR formula_key = '';

-- Ensure NOT NULL matches the schema declared in 000003.
ALTER TABLE public.vertical_inputs
    ALTER COLUMN formula_key SET NOT NULL;


-- ---------------------------------------------------------------------------
-- 2. data_source_mappings.external_key
-- ---------------------------------------------------------------------------

-- Add the column if it doesn't exist.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name   = 'data_source_mappings'
          AND column_name  = 'external_key'
    ) THEN
        ALTER TABLE public.data_source_mappings ADD COLUMN external_key text;
        RAISE NOTICE 'Added data_source_mappings.external_key column.';
    ELSE
        RAISE NOTICE 'data_source_mappings.external_key already present.';
    END IF;
END $$;

-- Partial unique index to back the ON CONFLICT (vertical_input_id, external_key)
-- clause used in 000011 and future vertical seed migrations. Partial (WHERE
-- external_key IS NOT NULL) so legacy rows without an external_key don't
-- collide on a single NULL slot.
CREATE UNIQUE INDEX IF NOT EXISTS uq_data_source_mappings_input_external
    ON public.data_source_mappings (vertical_input_id, external_key)
    WHERE external_key IS NOT NULL;


COMMIT;


-- =============================================================================
-- Verification (uncomment to run manually after applying):
--
-- -- 1. Every vertical_input row has a formula_key:
-- SELECT count(*) AS rows_missing_formula_key
--   FROM vertical_inputs
--  WHERE formula_key IS NULL OR formula_key = '';
-- -- expected: 0
--
-- -- 2. formula_key is NOT NULL:
-- SELECT column_name, is_nullable
--   FROM information_schema.columns
--  WHERE table_schema = 'public'
--    AND table_name   = 'vertical_inputs'
--    AND column_name  = 'formula_key';
-- -- expected: ('formula_key', 'NO')
--
-- -- 3. external_key column exists on data_source_mappings:
-- SELECT column_name, data_type, is_nullable
--   FROM information_schema.columns
--  WHERE table_schema = 'public'
--    AND table_name   = 'data_source_mappings'
--    AND column_name  = 'external_key';
-- -- expected: one row, ('external_key','text','YES')
--
-- -- 4. The unique index is in place:
-- SELECT indexname, indexdef
--   FROM pg_indexes
--  WHERE schemaname = 'public'
--    AND tablename  = 'data_source_mappings'
--    AND indexname  = 'uq_data_source_mappings_input_external';
-- -- expected: one row
--
-- =============================================================================

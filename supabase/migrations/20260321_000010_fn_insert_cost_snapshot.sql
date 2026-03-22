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
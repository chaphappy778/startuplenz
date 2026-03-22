-- =============================================================================
-- File:         20260321_000009_functions_and_triggers.sql
-- Description:  Stored functions, triggers, and pg_cron job registration.
--               Includes: user auto-provisioning on signup, plan version
--               counter, is_current snapshot flip, alert fan-out, and the
--               nightly sync schedule.
-- Dependencies: All prior migrations (000001–000008)
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Auto-provision a users row when auth.users gets a new entry
--    Fires via Supabase Auth hook (or manually wired as a trigger on auth.users
--    if you have superuser access in a self-hosted deployment).
-- ---------------------------------------------------------------------------
create or replace function handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_free_tier_id uuid;
  v_sub_id       uuid;
begin
  -- Look up the Free tier
  select id into v_free_tier_id
  from subscription_tiers
  where slug = 'free'
  limit 1;

  -- Create the internal user row
  insert into users (auth_user_id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', '')
  )
  on conflict (auth_user_id) do nothing;

  -- Create a Free subscription for the new user
  insert into user_subscriptions (user_id, tier_id, status)
  select u.id, v_free_tier_id, 'active'
  from users u
  where u.auth_user_id = new.id
  returning id into v_sub_id;

  -- Point the user's active_subscription_id at it
  update users
  set active_subscription_id = v_sub_id
  where auth_user_id = new.id;

  return new;
end;
$$;

-- Wire the trigger (idempotent: drop first)
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_auth_user();

-- ---------------------------------------------------------------------------
-- 2. Auto-increment plan version number on plan_snapshots insert
-- ---------------------------------------------------------------------------
create or replace function set_plan_snapshot_version()
returns trigger
language plpgsql
as $$
begin
  select coalesce(max(version_number), 0) + 1
  into new.version_number
  from plan_snapshots
  where saved_plan_id = new.saved_plan_id;
  return new;
end;
$$;

drop trigger if exists trg_plan_snapshot_version on plan_snapshots;
create trigger trg_plan_snapshot_version
  before insert on plan_snapshots
  for each row execute procedure set_plan_snapshot_version();

-- ---------------------------------------------------------------------------
-- 3. Auto-update saved_plans.updated_at on any row change
-- ---------------------------------------------------------------------------
create or replace function touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_saved_plans_updated_at on saved_plans;
create trigger trg_saved_plans_updated_at
  before update on saved_plans
  for each row execute procedure touch_updated_at();

drop trigger if exists trg_users_updated_at on users;
create trigger trg_users_updated_at
  before update on users
  for each row execute procedure touch_updated_at();

-- ---------------------------------------------------------------------------
-- 4. Flip is_current atomically when a new cost_snapshot is inserted
--    Ensures the partial unique index is never violated.
-- ---------------------------------------------------------------------------
create or replace function flip_current_snapshot()
returns trigger
language plpgsql
as $$
begin
  -- Mark the previous current snapshot as no longer current
  update cost_snapshots
  set is_current = false
  where data_source_mapping_id = new.data_source_mapping_id
    and is_current = true
    and id <> new.id;

  -- Ensure the incoming row is marked current
  new.is_current = true;
  return new;
end;
$$;

drop trigger if exists trg_flip_current_snapshot on cost_snapshots;
create trigger trg_flip_current_snapshot
  before insert on cost_snapshots
  for each row execute procedure flip_current_snapshot();

-- ---------------------------------------------------------------------------
-- 5. Alert fan-out
--    Queues one user_alert_queue row per affected Pro/Team user whenever
--    an alert_event is inserted. Users qualify if they have an active,
--    non-archived saved_plan for the affected vertical AND their tier
--    has alerts_enabled = true.
-- ---------------------------------------------------------------------------
create or replace function fanout_alert_to_users(p_alert_event_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_vertical_input_id uuid;
  v_vertical_id       uuid;
begin
  -- Resolve which vertical_input and vertical this alert belongs to
  select dsm.vertical_input_id
  into v_vertical_input_id
  from alert_events ae
  join data_source_mappings dsm on dsm.id = ae.data_source_mapping_id
  where ae.id = p_alert_event_id;

  select vi.vertical_id
  into v_vertical_id
  from vertical_inputs vi
  where vi.id = v_vertical_input_id;

  -- Fan out to every eligible user
  insert into user_alert_queue (user_id, alert_event_id, channel)
  select distinct
    sp.user_id,
    p_alert_event_id,
    'email'::alert_channel
  from saved_plans sp
  join users u                  on u.id  = sp.user_id
  join user_subscriptions us    on us.id = u.active_subscription_id
  join subscription_tiers st    on st.id = us.tier_id
  where sp.vertical_id  = v_vertical_id
    and sp.is_archived  = false
    and st.alerts_enabled = true
    and us.status       = 'active'
  on conflict (user_id, alert_event_id, channel) do nothing;
end;
$$;

-- Trigger that calls fanout automatically on alert_event insert
create or replace function trg_fanout_on_alert_event()
returns trigger
language plpgsql
as $$
begin
  perform fanout_alert_to_users(new.id);
  return new;
end;
$$;

drop trigger if exists trg_alert_event_fanout on alert_events;
create trigger trg_alert_event_fanout
  after insert on alert_events
  for each row execute procedure trg_fanout_on_alert_event();

-- ---------------------------------------------------------------------------
-- 6. pg_cron — nightly sync schedule
--    Calls the Edge Function 'sync-cost-data' every night at 02:00 UTC.
--    Requires pg_cron + pg_net extensions (installed in migration 000001).
--    The Edge Function URL must be set in the Supabase project env vars.
--
--    To customise: update the cron expression or the Edge Function name.
--    To disable:   select cron.unschedule('nightly-cost-sync');
-- ---------------------------------------------------------------------------
do $$
begin
  -- Remove existing schedule if present so we can safely update it
  perform cron.unschedule('nightly-cost-sync')
  where exists (
    select 1 from cron.job where jobname = 'nightly-cost-sync'
  );

  perform cron.schedule(
    'nightly-cost-sync',
    '0 2 * * *',   -- 02:00 UTC every day
    $$
      select net.http_post(
        url     := current_setting('app.supabase_url') || '/functions/v1/sync-cost-data',
        headers := jsonb_build_object(
          'Content-Type',  'application/json',
          'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key')
        ),
        body    := '{}'::jsonb
      );
    $$
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- 7. Convenience view — current costs per vertical input
--    Used by the formula engine to look up live input values without
--    joining through the is_current filter every time.
-- ---------------------------------------------------------------------------
create or replace view current_costs as
select
  vi.vertical_id,
  vi.id           as vertical_input_id,
  vi.input_key,
  vi.formula_key,
  cs.normalized_value,
  cs.currency_code,
  cs.effective_at,
  dsm.source_name
from cost_snapshots cs
join data_source_mappings dsm on dsm.id = cs.data_source_mapping_id
join vertical_inputs vi       on vi.id  = dsm.vertical_input_id
where cs.is_current = true;

-- Grant read access to authenticated users
grant select on current_costs to authenticated;

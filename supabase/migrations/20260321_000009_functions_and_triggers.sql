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
--    NOTE: Creating triggers on auth.users may be disallowed on Supabase hosted
--    projects. Prefer using Auth Webhooks or an Edge Function if permission
--    errors occur.
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
  select id into v_free_tier_id
  from subscription_tiers
  where slug = 'free'
  limit 1;

  insert into users (auth_user_id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', '')
  )
  on conflict (auth_user_id) do nothing;

  insert into user_subscriptions (user_id, tier_id, status)
  select u.id, v_free_tier_id, 'active'
  from users u
  where u.auth_user_id = new.id
  returning id into v_sub_id;

  update users
  set active_subscription_id = v_sub_id
  where auth_user_id = new.id
    and v_sub_id is not null;

  return new;
end;
$$;

revoke execute on function handle_new_auth_user() from public;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_auth_user();

-- ---------------------------------------------------------------------------
-- 2. Auto-increment plan version number on plan_snapshots insert
--    Advisory lock serializes concurrent inserts per saved_plan_id to
--    prevent duplicate version numbers from a MAX() race condition.
-- ---------------------------------------------------------------------------
create or replace function set_plan_snapshot_version()
returns trigger
language plpgsql
as $$
declare
  _lock_key bigint;
begin
  _lock_key := ('x' || substr(md5(new.saved_plan_id::text), 1, 16))::bit(64)::bigint;
  perform pg_advisory_xact_lock(_lock_key);

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
-- 3. Auto-update updated_at on saved_plans and users
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
--    Advisory lock keyed by data_source_mapping_id prevents concurrent
--    inserts from violating the partial unique index.
-- ---------------------------------------------------------------------------
create or replace function flip_current_snapshot()
returns trigger
language plpgsql
as $$
declare
  _lock_key bigint;
begin
  _lock_key := ('x' || substr(md5(new.data_source_mapping_id::text), 1, 16))::bit(64)::bigint;
  perform pg_advisory_xact_lock(_lock_key);

  update cost_snapshots
  set is_current = false
  where data_source_mapping_id = new.data_source_mapping_id
    and is_current = true;

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
--    an alert_event is inserted.
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
  select dsm.vertical_input_id
  into v_vertical_input_id
  from alert_events ae
  join data_source_mappings dsm on dsm.id = ae.data_source_mapping_id
  where ae.id = p_alert_event_id;

  if v_vertical_input_id is null then
    raise notice 'fanout_alert_to_users: no data_source_mapping found for alert_event %', p_alert_event_id;
    return;
  end if;

  select vi.vertical_id
  into v_vertical_id
  from vertical_inputs vi
  where vi.id = v_vertical_input_id;

  if v_vertical_id is null then
    raise notice 'fanout_alert_to_users: no vertical found for vertical_input %', v_vertical_input_id;
    return;
  end if;

  insert into user_alert_queue (user_id, alert_event_id, channel)
  select distinct
    sp.user_id,
    p_alert_event_id,
    'email'::alert_channel
  from saved_plans sp
  join users u               on u.id  = sp.user_id
  join user_subscriptions us on us.id = u.active_subscription_id
  join subscription_tiers st on st.id = us.tier_id
  where sp.vertical_id    = v_vertical_id
    and sp.is_archived    = false
    and st.alerts_enabled = true
    and us.status         = 'active'
  on conflict (user_id, alert_event_id, channel) do nothing;
end;
$$;

revoke execute on function fanout_alert_to_users(uuid) from public;

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
-- 6. Nightly sync schedule
--    pg_cron on Supabase hosted does not support DO blocks or $$ quoting
--    inside the job body string. The job body must be a single plain SQL
--    statement with all internal quotes escaped as ''.
--
--    If pg_cron or pg_net are not installed this block skips gracefully.
--    Recommended alternative: use the Supabase Dashboard to schedule the
--    Edge Function directly (Edge Functions → sync-cost-data → Schedule).
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_extension where extname = 'pg_cron') then
    raise notice 'pg_cron not installed — skipping nightly-cost-sync schedule';
    return;
  end if;

  if not exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where p.proname = 'http_post' and n.nspname = 'net'
  ) then
    raise notice 'pg_net not available — skipping nightly-cost-sync schedule';
    return;
  end if;

  if exists (select 1 from cron.job where jobname = 'nightly-cost-sync') then
    perform cron.unschedule('nightly-cost-sync');
  end if;

  perform cron.schedule(
    'nightly-cost-sync',
    '0 2 * * *',
    'select net.http_post(
       url     := current_setting(''app.supabase_url'') || ''/functions/v1/sync-cost-data'',
       headers := jsonb_build_object(
                    ''Content-Type'',  ''application/json'',
                    ''Authorization'', ''Bearer '' || current_setting(''app.supabase_service_role_key'')
                  ),
       body    := ''{}''::jsonb
     );'
  );

  raise notice 'nightly-cost-sync scheduled successfully';
end;
$$;

-- ---------------------------------------------------------------------------
-- 7. Convenience view — current costs per vertical input
--    Used by the formula engine to look up live input values without
--    repeating the is_current filter on every query.
-- ---------------------------------------------------------------------------
create or replace view current_costs as
select
  vi.vertical_id,
  vi.id            as vertical_input_id,
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

grant select on current_costs to authenticated;

-- ---------------------------------------------------------------------------
-- 8. Unique index on user_alert_queue
--    Ensures ON CONFLICT (user_id, alert_event_id, channel) in the fan-out
--    function has a concrete unique constraint to target.
--    CREATE INDEX CONCURRENTLY cannot run inside a transaction block so this
--    is issued as a plain statement, not wrapped in DO $$.
-- ---------------------------------------------------------------------------
create unique index if not exists idx_user_alert_queue_unique
  on user_alert_queue (user_id, alert_event_id, channel);
-- =============================================================================
-- File:         20260321_000007_rls_policies.sql
-- Description:  Row Level Security — enable RLS on all tables, define all
--               policies, and create the auth_user_id() helper function.
--               The sync worker uses the service_role key and bypasses RLS.
-- Dependencies: 20260321_000002_core_tables.sql through 000005
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Helper function
-- ---------------------------------------------------------------------------
create or replace function auth_user_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from users where auth_user_id = auth.uid()
$$;

-- ---------------------------------------------------------------------------
-- Enable RLS on every table
-- ---------------------------------------------------------------------------
alter table users                   enable row level security;
alter table user_subscriptions      enable row level security;
alter table saved_plans             enable row level security;
alter table plan_snapshots          enable row level security;
alter table user_alert_queue        enable row level security;
alter table alert_notification_log  enable row level security;

alter table subscription_tiers      enable row level security;
alter table verticals               enable row level security;
alter table vertical_inputs         enable row level security;
alter table vertical_access_limits  enable row level security;
alter table data_source_mappings    enable row level security;
alter table cost_snapshots          enable row level security;
alter table sync_runs               enable row level security;
alter table alert_events            enable row level security;

-- ---------------------------------------------------------------------------
-- Drop existing policies before recreating (idempotent re-run safety)
-- ---------------------------------------------------------------------------
do $$ declare
  pol record;
begin
  for pol in
    select policyname, tablename
    from pg_policies
    where schemaname = 'public'
  loop
    execute format('drop policy if exists %I on %I', pol.policyname, pol.tablename);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- USERS — own row only
-- ---------------------------------------------------------------------------
create policy "users: select own"
  on users for select
  using (auth_user_id = auth.uid());

create policy "users: update own"
  on users for update
  using (auth_user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- USER_SUBSCRIPTIONS — own rows only
-- ---------------------------------------------------------------------------
create policy "user_subscriptions: select own"
  on user_subscriptions for select
  using (user_id = auth_user_id());

-- ---------------------------------------------------------------------------
-- SAVED_PLANS — full CRUD on own rows
-- ---------------------------------------------------------------------------
create policy "saved_plans: select own"
  on saved_plans for select
  using (user_id = auth_user_id());

create policy "saved_plans: insert own"
  on saved_plans for insert
  with check (user_id = auth_user_id());

create policy "saved_plans: update own"
  on saved_plans for update
  using (user_id = auth_user_id());

create policy "saved_plans: delete own"
  on saved_plans for delete
  using (user_id = auth_user_id());

-- ---------------------------------------------------------------------------
-- PLAN_SNAPSHOTS — readable if the parent saved_plan belongs to the user
-- ---------------------------------------------------------------------------
create policy "plan_snapshots: select own"
  on plan_snapshots for select
  using (
    exists (
      select 1
      from saved_plans sp
      where sp.id = plan_snapshots.saved_plan_id
        and sp.user_id = auth_user_id()
    )
  );

create policy "plan_snapshots: insert own"
  on plan_snapshots for insert
  with check (
    exists (
      select 1
      from saved_plans sp
      where sp.id = plan_snapshots.saved_plan_id
        and sp.user_id = auth_user_id()
    )
  );

-- ---------------------------------------------------------------------------
-- USER_ALERT_QUEUE — own rows only
-- ---------------------------------------------------------------------------
create policy "user_alert_queue: select own"
  on user_alert_queue for select
  using (user_id = auth_user_id());

-- ---------------------------------------------------------------------------
-- ALERT_NOTIFICATION_LOG — readable if parent queue item belongs to user
-- ---------------------------------------------------------------------------
create policy "alert_notification_log: select own"
  on alert_notification_log for select
  using (
    exists (
      select 1
      from user_alert_queue q
      where q.id = alert_notification_log.user_alert_queue_id
        and q.user_id = auth_user_id()
    )
  );

-- ---------------------------------------------------------------------------
-- PUBLIC READ TABLES
-- verticals, vertical_inputs, vertical_access_limits — public read so
-- unauthenticated users can browse verticals and the access gate can resolve
-- tier permissions before a session exists.
-- All other shared tables remain authenticated-only.
-- ---------------------------------------------------------------------------
create policy "subscription_tiers: read"
  on subscription_tiers for select
  using (true);

create policy "verticals: read"
  on verticals for select
  using (true);

create policy "vertical_inputs: read"
  on vertical_inputs for select
  using (true);

create policy "vertical_access_limits: read"
  on vertical_access_limits for select
  using (true);

create policy "data_source_mappings: read"
  on data_source_mappings for select
  using (auth.role() = 'authenticated');

create policy "cost_snapshots: read"
  on cost_snapshots for select
  using (auth.role() = 'authenticated');

create policy "sync_runs: read"
  on sync_runs for select
  using (auth.role() = 'authenticated');

create policy "alert_events: read"
  on alert_events for select
  using (auth.role() = 'authenticated');
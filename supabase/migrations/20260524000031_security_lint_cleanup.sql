-- =============================================================================
-- Migration: 20260524000031_security_lint_cleanup
-- Purpose:   Resolve the Supabase database linter warnings reported on
--            2026-05-24. Groups the fixes by lint code so each section is
--            independently auditable.
--
--   0011  function_search_path_mutable           — pin search_path on 5 fns
--   0026  pg_graphql_anon_table_exposed          — revoke SELECT from anon
--   0027  pg_graphql_authenticated_table_exposed — revoke SELECT from auth
--   0028  anon_security_definer_function_executable / 0029 (authenticated)
--          — revoke EXECUTE on internal SECURITY DEFINER functions
--
-- NOT handled here (intentionally):
--   • 0014  extension_in_public (pg_net)
--     pg_net does not support ALTER EXTENSION ... SET SCHEMA (Postgres
--     restriction; pg_net only supports public-schema installation). The
--     extension is used by the `nightly-cost-sync` pg_cron job which calls
--     `net.http_post(...)` — moving it would require dropping + recreating
--     the extension and rewriting the cron job body. Net risk > 1 lint
--     warning, so this stays put. Documented as known-accepted.
--
-- NOT handled here (dashboard toggles, not SQL):
--   • auth_leaked_password_protection — enable in Supabase dashboard:
--     Authentication → Policies → "Leaked password protection" → ON
-- =============================================================================

BEGIN;

-- ─── 0011  Function search_path mutable ────────────────────────────────────
-- Pin search_path so a malicious actor can't shadow built-ins via a sibling
-- schema. `pg_temp` is included so per-session temp objects still resolve.

ALTER FUNCTION public.touch_updated_at()             SET search_path = public, pg_temp;
ALTER FUNCTION public.flip_current_snapshot()        SET search_path = public, pg_temp;
ALTER FUNCTION public.trg_fanout_on_alert_event()    SET search_path = public, pg_temp;
ALTER FUNCTION public.set_plan_snapshot_version()    SET search_path = public, pg_temp;
ALTER FUNCTION public.insert_cost_snapshot(
    uuid, uuid, numeric, numeric, text, jsonb
)                                                    SET search_path = public, pg_temp;
-- Bonus: also pin search_path on the other SECURITY DEFINER functions for
-- defense-in-depth, even though the linter didn't flag them by name today.
ALTER FUNCTION public.handle_new_auth_user()         SET search_path = public, pg_temp;
ALTER FUNCTION public.fanout_alert_to_users(uuid)    SET search_path = public, pg_temp;
ALTER FUNCTION public.auth_user_id()                 SET search_path = public, pg_temp;

-- ─── 0028 / 0029  Public callable SECURITY DEFINER functions ───────────────
-- These are internal: triggers, RLS helpers, and sync helpers. None of them
-- should be callable directly by client roles. REVOKE EXECUTE locks down the
-- /rest/v1/rpc endpoint. The functions keep SECURITY DEFINER so the triggers
-- and service-role calls that legitimately use them keep working.

REVOKE EXECUTE ON FUNCTION public.auth_user_id()
    FROM PUBLIC, anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.fanout_alert_to_users(uuid)
    FROM PUBLIC, anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.handle_new_auth_user()
    FROM PUBLIC, anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.insert_cost_snapshot(
    uuid, uuid, numeric, numeric, text, jsonb
) FROM PUBLIC, anon, authenticated;

-- ─── 0026 / 0027  GraphQL/REST exposure on internal tables ─────────────────
-- These tables are only ever accessed via the service role (server-side
-- ingestion, admin panel, webhook handlers). Revoking SELECT from anon and
-- authenticated removes them from the auto-generated GraphQL schema AND the
-- PostgREST API surface. RLS on the underlying tables already gated reads,
-- but Supabase's linter rightly flags the discovery surface itself.

DO $$
DECLARE
    t text;
    internal_tables text[] := ARRAY[
        'alert_events',
        'alert_notification_log',
        'cost_snapshots',
        'current_costs',           -- view over cost_snapshots
        'data_source_mappings',
        'email_events',
        'email_subscribers',
        'plan_snapshots',
        'subscriber_engagement',   -- admin view over email_subscribers
        'sync_runs',
        'user_alert_queue'
    ];
BEGIN
    FOREACH t IN ARRAY internal_tables LOOP
        EXECUTE format(
            'REVOKE SELECT ON public.%I FROM anon, authenticated',
            t
        );
    END LOOP;
END
$$;

-- ─── 0026  Anon-side exposure on auth-only tables ──────────────────────────
-- Signed-in users legitimately read their own rows from these tables via
-- RLS. Anon never should. Revoking only the anon grant resolves lint 0026
-- without breaking the authenticated user experience (lint 0027 still allows
-- authenticated read, gated by RLS).

REVOKE SELECT ON public.users              FROM anon;
REVOKE SELECT ON public.user_subscriptions FROM anon;
REVOKE SELECT ON public.saved_plans        FROM anon;

-- Tables intentionally kept readable by anon AND authenticated (client uses
-- them via the public anon key on /verticals, /, /model/[vertical], etc.):
--   public.verticals
--   public.vertical_inputs
--   public.vertical_access_limits
--   public.subscription_tiers
-- Their RLS still gates row-level reads; the linter warnings for these tables
-- are expected and intentional.

COMMIT;

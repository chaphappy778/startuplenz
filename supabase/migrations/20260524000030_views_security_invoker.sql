-- =============================================================================
-- Migration: 20260524000030_views_security_invoker
-- Purpose:   Resolve Supabase database linter rule 0010 (Security Definer View)
--            for the two affected views — `public.current_costs` and
--            `public.subscriber_engagement`.
--
-- Background:
--   By default, Postgres views are evaluated with the privileges of the view's
--   OWNER (effectively SECURITY DEFINER semantics), which means RLS policies
--   on the underlying tables are evaluated against the view owner rather than
--   the calling user. Supabase's linter (rule 0010) flags this because it can
--   leak data past per-row RLS rules.
--
-- Fix:
--   Set `security_invoker = true` on each view so they evaluate with the
--   calling user's privileges and respect RLS on the base tables.
--
--   This is a metadata change — no view body is altered. Existing GRANTs,
--   indexes, and downstream consumers continue to work unchanged.
--
-- Requires: Postgres 15+ (Supabase runs PG 15/16, so this is safe).
-- =============================================================================

BEGIN;

ALTER VIEW public.current_costs           SET (security_invoker = true);
ALTER VIEW public.subscriber_engagement   SET (security_invoker = true);

COMMIT;

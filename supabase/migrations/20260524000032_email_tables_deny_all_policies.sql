-- =============================================================================
-- Migration: 20260524000032_email_tables_deny_all_policies
-- Purpose:   Resolve Supabase linter rule 0008 (rls_enabled_no_policy) for
--            the two email-pipeline tables. These tables already had RLS
--            enabled with zero policies, which in Postgres means "nobody
--            can read or write." That's the correct configuration since
--            these tables are only ever touched by the service role (which
--            bypasses RLS), but the linter rightly flags the lack of an
--            explicit policy because intent is implicit.
--
-- Fix:       Add explicit deny-all policies for both anon and authenticated
--            roles. Service role continues to bypass RLS entirely. Net
--            behavior is identical; intent is now declarative.
-- =============================================================================

BEGIN;

-- email_events: full audit log of webhook events from Resend. Only service
-- role inserts. No client should ever read or write.
DROP POLICY IF EXISTS deny_all_anon ON public.email_events;
DROP POLICY IF EXISTS deny_all_authenticated ON public.email_events;

CREATE POLICY deny_all_anon
    ON public.email_events
    FOR ALL
    TO anon
    USING (false)
    WITH CHECK (false);

CREATE POLICY deny_all_authenticated
    ON public.email_events
    FOR ALL
    TO authenticated
    USING (false)
    WITH CHECK (false);

-- email_subscribers: PII-bearing aggregate of subscriber state. Same story.
DROP POLICY IF EXISTS deny_all_anon ON public.email_subscribers;
DROP POLICY IF EXISTS deny_all_authenticated ON public.email_subscribers;

CREATE POLICY deny_all_anon
    ON public.email_subscribers
    FOR ALL
    TO anon
    USING (false)
    WITH CHECK (false);

CREATE POLICY deny_all_authenticated
    ON public.email_subscribers
    FOR ALL
    TO authenticated
    USING (false)
    WITH CHECK (false);

COMMIT;

-- =============================================================================
-- Migration: 20260323000012_auth_trigger.sql
-- Purpose:   Auto-create a `users` row (with Free tier subscription) the first
--            time a Supabase Auth account is confirmed.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Helper function — looks up the Free tier id once and caches it in a local
--    variable so we never hard-code a UUID here.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
-- Run as the table owner so RLS / role restrictions on `users` don't block us.
SET search_path = public
AS $$
DECLARE
  v_free_tier_id        uuid;
  v_user_id             uuid;
  v_subscription_id     uuid;
BEGIN
  -- ── 1. Resolve the Free tier ──────────────────────────────────────────────
  SELECT id
    INTO v_free_tier_id
    FROM public.subscription_tiers
   WHERE name ILIKE 'free'          -- case-insensitive match for 'Free'
   LIMIT 1;

  IF v_free_tier_id IS NULL THEN
    RAISE EXCEPTION
      'handle_new_auth_user: could not find a subscription tier named "Free". '
      'Ensure the subscription_tiers table is seeded before enabling auth.';
  END IF;

  -- ── 2. Insert the internal user profile ──────────────────────────────────
  --    active_subscription_id is set to NULL initially; we update it after
  --    creating the subscription row (avoids a circular FK dependency).
  INSERT INTO public.users (
    id,
    auth_user_id,
    active_subscription_id,
    created_at,
    updated_at
  )
  VALUES (
    gen_random_uuid(),
    NEW.id,            -- auth.users.id from the trigger row
    NULL,              -- filled in below
    NOW(),
    NOW()
  )
  RETURNING id INTO v_user_id;

  -- ── 3. Create the Free tier subscription row ─────────────────────────────
  INSERT INTO public.user_subscriptions (
    id,
    user_id,
    tier_id,
    status,
    created_at,
    updated_at
  )
  VALUES (
    gen_random_uuid(),
    v_user_id,
    v_free_tier_id,
    'active',
    NOW(),
    NOW()
  )
  RETURNING id INTO v_subscription_id;

  -- ── 4. Back-fill active_subscription_id on the user row ──────────────────
  UPDATE public.users
     SET active_subscription_id = v_subscription_id,
         updated_at             = NOW()
   WHERE id = v_user_id;

  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------------
-- 2. Trigger — fires AFTER INSERT on auth.users (i.e. on every new sign-up,
--    including OAuth providers).  We use AFTER so auth.users.id is committed
--    and safe to FK-reference before our INSERT runs.
-- ---------------------------------------------------------------------------
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_auth_user();

-- ---------------------------------------------------------------------------
-- 3. Grant EXECUTE to postgres role used by the trigger (SECURITY DEFINER
--    means the body runs as the function owner, but the trigger itself must
--    be invocable).  No additional grants are needed for service_role because
--    it bypasses RLS and already has broad privileges.
-- ---------------------------------------------------------------------------
GRANT EXECUTE ON FUNCTION public.handle_new_auth_user() TO postgres;

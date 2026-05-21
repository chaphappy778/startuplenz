-- =============================================================================
-- File:         20260521000025_fix_auth_trigger_email.sql
-- Description:  Fixes a NOT-NULL violation in handle_new_auth_user().
--               The original trigger (migration 012) inserted into public.users
--               without setting `email`, which is declared NOT NULL in the
--               schema (migration 002). Result: every new signup — email/
--               password OR Google OAuth — raised "Database error saving new
--               user" from auth.users-side, and the trigger silently aborted.
--
--               This migration replaces the function to also persist:
--                 • email           — from auth.users.email
--                 • full_name       — from raw_user_meta_data ('full_name' or 'name')
--                 • avatar_url      — from raw_user_meta_data ('avatar_url' or 'picture')
--
--               OAuth providers (Google, GitHub, Apple) populate raw_user_meta_data
--               under varying keys, so we COALESCE through the common ones.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
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
   WHERE name ILIKE 'free'
   LIMIT 1;

  IF v_free_tier_id IS NULL THEN
    RAISE EXCEPTION
      'handle_new_auth_user: could not find a subscription tier named "Free". '
      'Ensure the subscription_tiers table is seeded before enabling auth.';
  END IF;

  -- ── 2. Insert the internal user profile ──────────────────────────────────
  INSERT INTO public.users (
    id,
    auth_user_id,
    email,
    full_name,
    avatar_url,
    active_subscription_id,
    created_at,
    updated_at
  )
  VALUES (
    gen_random_uuid(),
    NEW.id,
    -- auth.users.email is NOT NULL for OAuth signups (Google always provides
    -- it) and email/password signups. Fall back to a synthesized placeholder
    -- if a provider ever omits it, so the trigger doesn't fail outright.
    COALESCE(NEW.email, 'unknown-' || NEW.id::text || '@example.invalid'),
    COALESCE(
      NEW.raw_user_meta_data ->> 'full_name',
      NEW.raw_user_meta_data ->> 'name'
    ),
    COALESCE(
      NEW.raw_user_meta_data ->> 'avatar_url',
      NEW.raw_user_meta_data ->> 'picture'
    ),
    NULL,
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

-- (Trigger itself doesn't need to be recreated — it still points at this
-- function by name. CREATE OR REPLACE FUNCTION updates the body in place.)

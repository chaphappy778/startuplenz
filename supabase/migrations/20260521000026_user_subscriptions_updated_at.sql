-- =============================================================================
-- File:         20260521000026_user_subscriptions_updated_at.sql
-- Description:  Adds the missing `updated_at` column to user_subscriptions.
--
--               handle_new_auth_user() (migrations 012 + 025) inserts
--               `updated_at` into user_subscriptions, but the table's
--               original schema (migration 002) never declared the column.
--               Result: every signup — email/password and OAuth — failed
--               with "column 'updated_at' of relation 'user_subscriptions'
--               does not exist." Supabase surfaces this back to the client
--               as the generic "Database error saving new user."
--
--               Idempotent: adds the column only if missing. Default NOW()
--               for backfilled rows.
-- =============================================================================

BEGIN;

ALTER TABLE public.user_subscriptions
    ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- Optional: keep updated_at in sync automatically on row changes. The
-- trigger function itself is idempotent (CREATE OR REPLACE).
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS user_subscriptions_touch_updated_at ON public.user_subscriptions;
CREATE TRIGGER user_subscriptions_touch_updated_at
  BEFORE UPDATE ON public.user_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_updated_at();

COMMIT;

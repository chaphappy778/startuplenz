-- =============================================================================
-- File:         20260515000023_email_events_and_profile.sql
-- Description:  Engagement + profiling layer on top of email_subscribers.
--               • email_events: granular event log (Resend webhooks land here)
--               • email_subscribers gets aggregates so common queries don't
--                 need a JOIN: opens_count, clicks_count, bounced flag,
--                 complained flag, stage (progressive profiling)
-- =============================================================================

BEGIN;

-- ── Add aggregate / profile columns to email_subscribers ──────────────────
ALTER TABLE email_subscribers
    ADD COLUMN IF NOT EXISTS opens_count      int          NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS clicks_count     int          NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS last_opened_at   timestamptz,
    ADD COLUMN IF NOT EXISTS last_clicked_at  timestamptz,
    ADD COLUMN IF NOT EXISTS bounced          boolean      NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS complained       boolean      NOT NULL DEFAULT false,
    -- Progressive profile: where in the journey is this person?
    ADD COLUMN IF NOT EXISTS stage            text;        -- 'researching' | 'planning' | 'building' | 'operating' | NULL

-- Constraint on stage values (NULL allowed)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'email_subscribers_stage_chk'
    ) THEN
        ALTER TABLE email_subscribers
            ADD CONSTRAINT email_subscribers_stage_chk
            CHECK (stage IS NULL OR stage IN ('researching', 'planning', 'building', 'operating'));
    END IF;
END $$;

-- Index for engagement queries
CREATE INDEX IF NOT EXISTS idx_email_subscribers_engagement
    ON email_subscribers (opens_count DESC, last_opened_at DESC)
    WHERE unsubscribed_at IS NULL;

-- ── email_events: granular log of every webhook event ─────────────────────
CREATE TABLE IF NOT EXISTS email_events (
    id                  uuid         PRIMARY KEY DEFAULT uuid_generate_v4(),
    email               text         NOT NULL,
    resend_email_id     text,                                -- Resend's email id, if known
    event_type          text         NOT NULL,               -- 'sent' | 'delivered' | 'opened' | 'clicked' | 'bounced' | 'complained' | 'delivery_delayed'
    payload             jsonb,                               -- raw event for forensics
    happened_at         timestamptz  NOT NULL DEFAULT now(),
    created_at          timestamptz  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_events_email_time
    ON email_events (lower(email), happened_at DESC);

CREATE INDEX IF NOT EXISTS idx_email_events_type_time
    ON email_events (event_type, happened_at DESC);

-- email_events is service-role-only (webhook route + admin view)
ALTER TABLE email_events ENABLE ROW LEVEL SECURITY;
-- No policies = locked down.

COMMIT;

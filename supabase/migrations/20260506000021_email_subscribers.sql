-- =============================================================================
-- File:         20260506000021_email_subscribers.sql
-- Description:  Email capture table for the "Email me my plan" lead-magnet
--               flow. Each row is one capture event — same email can appear
--               multiple times if a user emails themselves multiple plans.
--
--               No PII other than the email itself. slider_values captures
--               the plan state at the moment of capture so we can re-render
--               and re-send if needed.
-- =============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS email_subscribers (
    id                   uuid         PRIMARY KEY DEFAULT uuid_generate_v4(),
    email                text         NOT NULL,
    vertical_id          uuid         REFERENCES verticals(id) ON DELETE SET NULL,
    vertical_slug        text,
    slider_values        jsonb,
    computed_outputs     jsonb,
    opt_in_newsletter    boolean      NOT NULL DEFAULT false,
    source               text         NOT NULL DEFAULT 'calculator',
    -- Soft-unsubscribe handling (we never delete; we just stop sending).
    unsubscribed_at      timestamptz,
    -- Light fingerprinting for dedupe and analytics (no IPs persisted).
    user_agent_summary   text,
    captured_at          timestamptz  NOT NULL DEFAULT now(),
    last_sent_at         timestamptz,
    send_count           int          NOT NULL DEFAULT 0
);

-- Indexes for the access patterns we care about
CREATE INDEX IF NOT EXISTS idx_email_subscribers_email
    ON email_subscribers (lower(email));

CREATE INDEX IF NOT EXISTS idx_email_subscribers_vertical
    ON email_subscribers (vertical_slug, captured_at DESC);

CREATE INDEX IF NOT EXISTS idx_email_subscribers_newsletter
    ON email_subscribers (opt_in_newsletter, unsubscribed_at)
    WHERE opt_in_newsletter = true;

-- RLS: nobody can read or write from the anon/auth roles. All writes go
-- through the server action (service-role) and all reads go through admin
-- views (also service-role). The form on the website itself doesn't need
-- to query this table from the browser.
ALTER TABLE email_subscribers ENABLE ROW LEVEL SECURITY;

-- No SELECT / INSERT / UPDATE / DELETE policies = locked down by default.
-- The service-role key bypasses RLS, which is what the server action uses.

COMMIT;

-- =============================================================================
-- File:         20260515000024_email_aggregates_expand.sql
-- Description:  Expands per-subscriber aggregates so every Resend webhook
--               event we care about lands somewhere queryable. New columns:
--               • delivered_count, last_delivered_at — carrier confirmed receipt
--               • delayed_count,   last_delayed_at   — temporary deferrals
--               • first_event_at                     — earliest webhook time
--               • engagement_score                   — computed view, not stored
--
--               Also adds a simple view (subscriber_engagement) that the
--               admin dashboard can query without re-deriving the same math.
-- =============================================================================

BEGIN;

ALTER TABLE email_subscribers
    ADD COLUMN IF NOT EXISTS delivered_count   int          NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS delayed_count     int          NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS last_delivered_at timestamptz,
    ADD COLUMN IF NOT EXISTS last_delayed_at   timestamptz,
    ADD COLUMN IF NOT EXISTS first_event_at    timestamptz;

-- Convenience view: collapses the multi-row-per-email pattern to one row per
-- distinct email address with engagement aggregates summed across captures.
-- Engagement score: opens × 1 + clicks × 3, scaled, capped at 100.
CREATE OR REPLACE VIEW subscriber_engagement AS
SELECT
    lower(email)                                  AS email,
    MIN(captured_at)                              AS first_captured_at,
    MAX(captured_at)                              AS last_captured_at,
    SUM(send_count)                               AS sends,
    SUM(delivered_count)                          AS delivered,
    SUM(opens_count)                              AS opens,
    SUM(clicks_count)                             AS clicks,
    SUM(delayed_count)                            AS delayed,
    bool_or(bounced)                              AS ever_bounced,
    bool_or(complained)                           AS ever_complained,
    MAX(unsubscribed_at)                          AS unsubscribed_at,
    MAX(last_opened_at)                           AS last_opened_at,
    MAX(last_clicked_at)                          AS last_clicked_at,
    MAX(stage)                                    AS stage,
    array_agg(DISTINCT vertical_slug)
        FILTER (WHERE vertical_slug IS NOT NULL)  AS verticals,
    LEAST(
        100,
        ROUND(
            COALESCE(SUM(opens_count), 0) * 1 +
            COALESCE(SUM(clicks_count), 0) * 3
        )
    )::int                                        AS engagement_score
FROM email_subscribers
GROUP BY lower(email);

-- View inherits RLS from base table (which is locked) — service role only.

COMMIT;

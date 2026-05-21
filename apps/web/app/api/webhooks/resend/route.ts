// apps/web/app/api/webhooks/resend/route.ts
//
// Receives Resend webhook events and lands them in two places:
//
//   1. email_events  — full audit log of the raw payload (forensics + buyer
//      due-diligence pack later). One row per event.
//   2. email_subscribers — aggregates so the common queries don't need to
//      re-aggregate the log. opens_count, last_opened_at, etc.
//
// Resend uses Svix signing: svix-id + svix-timestamp + svix-signature headers
// over an HMAC-SHA256 of `${id}.${timestamp}.${body}`. We verify manually to
// avoid a runtime dep on the svix SDK.
//
// Events handled (all from the Resend docs):
//   email.sent             — Resend accepted the message for delivery
//   email.delivered        — Recipient's mail server accepted it
//   email.delivery_delayed — Temporary deferral; will be retried
//   email.bounced          — Permanent bounce
//   email.complained       — Marked as spam (auto-unsub on our side)
//   email.opened           — Recipient opened (tracking pixel)
//   email.clicked          — Recipient clicked a link (URL in payload)

import { NextResponse, type NextRequest } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

interface ResendEvent {
  type: string;
  created_at?: string;
  data?: {
    email_id?: string;
    to?: string | string[];
    from?: string;
    subject?: string;
    click?: { link?: string; ipAddress?: string; userAgent?: string };
    bounce?: { type?: string; subType?: string; message?: string };
    [key: string]: unknown;
  };
}

interface AggregateUpdates {
  set: Record<string, unknown>;
  increment: Array<"opens_count" | "clicks_count" | "delivered_count" | "delayed_count" | "send_count">;
}

// ─── Signature verification ─────────────────────────────────────────────────

function verifySvixSignature(
  body: string,
  id: string | null,
  timestamp: string | null,
  signature: string | null,
  secret: string,
): boolean {
  if (!id || !timestamp || !signature) return false;

  const stripped = secret.startsWith("whsec_") ? secret.slice(6) : secret;
  let key: Buffer;
  try {
    key = Buffer.from(stripped, "base64");
  } catch {
    return false;
  }

  const signedContent = `${id}.${timestamp}.${body}`;
  const expectedDigest = createHmac("sha256", key).update(signedContent).digest("base64");

  const provided = signature.split(" ");
  for (const sig of provided) {
    const [, digest] = sig.split(",");
    if (!digest) continue;
    try {
      if (
        digest.length === expectedDigest.length &&
        timingSafeEqual(Buffer.from(digest), Buffer.from(expectedDigest))
      ) {
        return true;
      }
    } catch {
      // length mismatch — continue
    }
  }
  return false;
}

// ─── Event → aggregate mapping ──────────────────────────────────────────────

function aggregatesForEvent(eventType: string, happenedAt: string): AggregateUpdates {
  const updates: AggregateUpdates = { set: {}, increment: [] };

  switch (eventType) {
    case "sent":
      updates.set.last_sent_at = happenedAt;
      updates.increment.push("send_count");
      break;
    case "delivered":
      updates.set.last_delivered_at = happenedAt;
      updates.increment.push("delivered_count");
      break;
    case "delivery_delayed":
      updates.set.last_delayed_at = happenedAt;
      updates.increment.push("delayed_count");
      break;
    case "opened":
      updates.set.last_opened_at = happenedAt;
      updates.increment.push("opens_count");
      break;
    case "clicked":
      updates.set.last_clicked_at = happenedAt;
      updates.increment.push("clicks_count");
      break;
    case "bounced":
      updates.set.bounced = true;
      // Hard bounces also count as a permanent-failure unsub for hygiene.
      updates.set.unsubscribed_at = happenedAt;
      break;
    case "complained":
      updates.set.complained = true;
      // Spam complaints are an immediate unsub — required for deliverability.
      updates.set.unsubscribed_at = happenedAt;
      break;
    default:
      // Unknown event types still log but don't update aggregates.
      break;
  }

  return updates;
}

function extractEmail(event: ResendEvent): string | null {
  const to = event.data?.to;
  if (!to) return null;
  if (Array.isArray(to)) return to[0]?.toLowerCase() ?? null;
  return String(to).toLowerCase();
}

// ─── Route handler ──────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  const bodyText = await req.text();

  // Verify signature ONLY when a secret is set. Dev (no secret) accepts all
  // requests so we can curl-test; production should always set the secret.
  if (secret) {
    const ok = verifySvixSignature(
      bodyText,
      req.headers.get("svix-id"),
      req.headers.get("svix-timestamp"),
      req.headers.get("svix-signature"),
      secret,
    );
    if (!ok) {
      return NextResponse.json({ error: "invalid signature" }, { status: 401 });
    }
  }

  let event: ResendEvent;
  try {
    event = JSON.parse(bodyText);
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const email = extractEmail(event);
  if (!email) {
    return NextResponse.json({ ok: true, skipped: "no_email" });
  }

  const eventType = (event.type ?? "").replace(/^email\./, "");
  const happenedAt = event.created_at ?? new Date().toISOString();

  const supabase = createAdminClient();

  // 1. Audit log — every event goes here, regardless of type. This is the
  //    forensic trail buyers will eventually want to see.
  const { error: eventInsertErr } = await supabase.from("email_events").insert({
    email,
    resend_email_id: event.data?.email_id ?? null,
    event_type: eventType,
    payload: event,
    happened_at: happenedAt,
  });
  if (eventInsertErr) {
    // Log but don't fail the webhook — Resend will retry if we 500, which
    // we don't want for a logging hiccup.
    console.error("[resend webhook] event log failed:", eventInsertErr.message);
  }

  // 2. Aggregate updates
  const updates = aggregatesForEvent(eventType, happenedAt);

  // Set first_event_at on the earliest event we ever record for this address
  updates.set.first_event_at = happenedAt;

  if (Object.keys(updates.set).length === 0 && updates.increment.length === 0) {
    return NextResponse.json({ ok: true, eventType, note: "no_aggregate_change" });
  }

  // Pull current rows for this email so we can do conditional sets +
  // increments in a single round-trip per row.
  const selectCols = "id,opens_count,clicks_count,delivered_count,delayed_count,send_count,first_event_at";
  const { data: rows, error: selectErr } = await supabase
    .from("email_subscribers")
    .select(selectCols)
    .ilike("email", email);

  if (selectErr || !rows || rows.length === 0) {
    // No subscriber rows for this email yet. Probably a stale webhook for a
    // deleted row or a test send. Already logged the event; we're done.
    return NextResponse.json({ ok: true, eventType, skipped: "no_subscriber_rows" });
  }

  await Promise.all(
    rows.map((row) => {
      const r = row as Record<string, unknown> & { id: string };
      const rowUpdates: Record<string, unknown> = { ...updates.set };

      for (const col of updates.increment) {
        rowUpdates[col] = ((r[col] as number) ?? 0) + 1;
      }

      // first_event_at only set if not already present
      if ("first_event_at" in rowUpdates && r.first_event_at) {
        delete rowUpdates.first_event_at;
      }

      return supabase
        .from("email_subscribers")
        .update(rowUpdates)
        .eq("id", r.id);
    }),
  );

  return NextResponse.json({ ok: true, eventType, affected: rows.length });
}

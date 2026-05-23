"use server";

// apps/web/lib/actions/emailCapture.ts
//
// "Email me my plan" capture flow.
//   1. Validate input (email format, vertical exists, values present)
//   2. Re-run the model server-side (don't trust client-computed outputs)
//   3. Insert into email_subscribers via service-role (RLS is locked)
//   4. Send the HTML email via Resend
//
// Failure modes are surfaced but write attempts continue best-effort.
// if the email send fails we still log the capture so we can re-send.

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient as createServerSupabase } from "@/lib/supabase/server";
import { buildPlanEmail } from "@/lib/emails/planEmail";
import { getFromAddress, getReplyTo, getResend } from "@/lib/resend";
import { computeModel } from "@/lib/modelClient";
import { buildShareUrl } from "@/lib/planUrl";
import { buildUnsubscribeToken } from "@/lib/unsubscribeToken";
import type { SliderDef, SliderValues } from "@/lib/types";

export interface EmailCaptureResult {
  ok: boolean;
  emailedTo?: string;
  error?: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function captureEmail(input: {
  email: string;
  verticalSlug: string;
  values: SliderValues;
  optInNewsletter?: boolean;
}): Promise<EmailCaptureResult> {
  const email = (input.email || "").trim().toLowerCase();
  if (!EMAIL_RE.test(email)) {
    return { ok: false, error: "That email doesn't look right." };
  }

  // ── 1. Resolve the vertical (anon read OK, public table) ─────────────
  const supabase = await createServerSupabase();
  const { data: vertical, error: vErr } = await supabase
    .from("verticals")
    .select("id, slug, display_name")
    .eq("slug", input.verticalSlug)
    .eq("is_active", true)
    .maybeSingle();
  if (vErr || !vertical) {
    return { ok: false, error: `Unknown vertical: ${input.verticalSlug}` };
  }

  // ── 2. Pull sliders for nice labels in the email ─────────────────────
  const { data: inputRows } = await supabase
    .from("vertical_inputs")
    .select("input_key, display_label, unit_label, default_value, min_value, max_value, step_size, formula_key, is_live_data, sort_order")
    .eq("vertical_id", vertical.id)
    .order("sort_order", { ascending: true });

  const sliders: SliderDef[] = (inputRows ?? []).map((row) => ({
    key: row.input_key as string,
    label: row.display_label as string,
    min: Number(row.min_value),
    max: Number(row.max_value),
    step: Number(row.step_size),
    defaultValue: Number(row.default_value),
    unit: (row.unit_label ?? "") as string,
    formulaKey: (row.formula_key ?? row.input_key) as string,
    isLiveData: !!row.is_live_data,
    sortOrder: Number(row.sort_order ?? 0),
  }));

  // ── 3. Compute the model server-side ─────────────────────────────────
  const output = computeModel(input.values ?? {}, vertical.slug);

  // ── 4. Check if this email is already unsubscribed ──────────────────
  const admin = createAdminClient();
  const { data: existing } = await admin
    .from("email_subscribers")
    .select("unsubscribed_at, bounced, complained")
    .ilike("email", email)
    .not("unsubscribed_at", "is", null)
    .limit(1);
  if (existing && existing.length > 0) {
    return {
      ok: false,
      error: "That address previously unsubscribed. Use a different email if you want updates.",
    };
  }

  // ── 5. Insert the subscriber row (service-role bypasses RLS) ─────────
  const { error: insertErr } = await admin.from("email_subscribers").insert({
    email,
    vertical_id: vertical.id,
    vertical_slug: vertical.slug,
    slider_values: input.values,
    computed_outputs: {
      gross_revenue: output.grossRevenue,
      net_profit: output.netProfit,
      profit_margin: output.profitMargin,
      orders_per_month: output.ordersPerMonth,
    },
    opt_in_newsletter: !!input.optInNewsletter,
    source: "calculator",
  });
  if (insertErr) {
    return { ok: false, error: `Couldn't save your email: ${insertErr.message}` };
  }

  // ── 6. Send the email via Resend ─────────────────────────────────────
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://startuplenz.com";
  const shareUrl = buildShareUrl(input.values, {
    path: `/model/${vertical.slug}`,
    origin: siteUrl,
  });
  const unsubscribeUrl = `${siteUrl}/unsubscribe?t=${buildUnsubscribeToken(email)}`;

  const message = buildPlanEmail({
    verticalDisplayName: vertical.display_name,
    verticalSlug: vertical.slug,
    sliders,
    values: input.values,
    output,
    shareUrl,
    siteUrl,
    unsubscribeUrl,
  });

  try {
    const resend = getResend();
    const replyTo = getReplyTo();
    const sendResult = await resend.emails.send({
      from: getFromAddress(),
      to: [email],
      ...(replyTo ? { replyTo } : {}),
      subject: message.subject,
      html: message.html,
      text: message.text,
      // RFC-compliant unsubscribe headers, Gmail/Apple Mail show a one-click
      // unsub link in the UI when these are present.
      headers: {
        "List-Unsubscribe": `<${unsubscribeUrl}>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      },
    });
    if (sendResult.error) {
      // Capture succeeded; email failed. Surface to user but the row is saved.
      return {
        ok: true,
        emailedTo: email,
        error: `Saved but couldn't send the email: ${sendResult.error.message}`,
      };
    }

    // Mark this row as sent
    await admin
      .from("email_subscribers")
      .update({
        last_sent_at: new Date().toISOString(),
        send_count: 1,
      })
      .eq("email", email)
      .order("captured_at", { ascending: false })
      .limit(1);

    return { ok: true, emailedTo: email };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      ok: true,
      emailedTo: email,
      error: `Saved but couldn't send the email: ${msg}`,
    };
  }
}

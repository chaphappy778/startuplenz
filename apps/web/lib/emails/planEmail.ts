// apps/web/lib/emails/planEmail.ts
//
// Builds the HTML + plain-text bodies for the "your plan" email. Uses inline
// styles only — most email clients ignore <style> blocks. Tested target
// width is 600px (Gmail / Apple Mail / Outlook all render fine at that).
//
// Future: a PDF version. For now the email itself IS the artifact.

import type { ModelOutput, SliderDef, SliderValues } from "@/lib/types";

interface BuildPlanEmailArgs {
  verticalDisplayName: string;
  verticalSlug: string;
  sliders: SliderDef[];
  values: SliderValues;
  output: ModelOutput;
  shareUrl: string;
  siteUrl: string;
  /** Absolute URL — included in the footer to satisfy CAN-SPAM. */
  unsubscribeUrl: string;
}

function fmtMoney(n: number): string {
  return "$" + Math.round(n).toLocaleString();
}

function fmtPct(n: number): string {
  return (n * 100).toFixed(1) + "%";
}

function fmtValue(s: SliderDef, raw: number): string {
  const v = Number.isFinite(raw) ? raw : s.defaultValue;
  const unit = s.unit ?? "";
  if (unit === "$" || unit === "USD")        return "$" + (Number.isInteger(v) ? v : v.toFixed(2));
  if (unit === "%")                          return v + "%";
  if (unit === "USD/hr")                     return "$" + v + "/hr";
  if (unit === "mins")                       return v + " min";
  if (unit === "hrs")                        return v + " hr";
  if (unit === "bool")                       return v >= 1 ? "Yes" : "No";
  if (unit)                                  return v + " " + unit;
  return String(v);
}

export interface PlanEmailContent {
  subject: string;
  html: string;
  text: string;
}

export function buildPlanEmail(args: BuildPlanEmailArgs): PlanEmailContent {
  const { verticalDisplayName, sliders, values, output, shareUrl, siteUrl, unsubscribeUrl } = args;

  const margin = fmtPct(output.profitMargin);
  const subject = `Your ${verticalDisplayName} cost model — ${fmtMoney(output.netProfit)}/mo at ${margin} margin`;

  // ─── Plain text fallback ────────────────────────────────────────────────
  const textLines = [
    `Your ${verticalDisplayName} cost model — saved from StartupLenz`,
    `--------------------------------------------------------------`,
    ``,
    `Monthly snapshot`,
    `  Gross revenue:  ${fmtMoney(output.grossRevenue)}`,
    `  Cost of goods:  ${fmtMoney(output.costOfGoods)}`,
    `  Net profit:     ${fmtMoney(output.netProfit)}  (${margin} margin)`,
    `  Orders/month:   ${output.ordersPerMonth.toLocaleString()}`,
    ``,
    `Assumptions you set`,
  ];
  sliders.forEach((s) => {
    const v = values[s.key] ?? s.defaultValue;
    textLines.push(`  ${s.label}: ${fmtValue(s, v)}`);
  });
  textLines.push("");
  textLines.push(`Insight: ${output.insight}`);
  textLines.push("");
  textLines.push(`Re-open this plan: ${shareUrl}`);
  textLines.push(`Browse more verticals: ${siteUrl}`);
  textLines.push("");
  textLines.push(`Don't want these emails? Unsubscribe: ${unsubscribeUrl}`);
  textLines.push("");
  textLines.push("— StartupLenz, an indie project from ChapHaus");
  const text = textLines.join("\n");

  // ─── HTML body (inline styles) ──────────────────────────────────────────
  const c = {
    bg:        "#0f1422",
    card:      "#182037",
    border:    "#283454",
    text:      "#f0f4ff",
    textDim:   "#95a4c8",
    textMuted: "#5a6a8d",
    accent:    "#6366f1",
    accent2:   "#a78bfa",
    green:     "#4ade80",
    red:       "#f43f5e",
  };

  const snapshotCards = [
    { label: "Gross revenue",  value: fmtMoney(output.grossRevenue),  color: c.text },
    { label: "Cost of goods",  value: fmtMoney(output.costOfGoods),   color: c.red },
    { label: "Net profit",     value: fmtMoney(output.netProfit),     color: output.netProfit >= 0 ? c.green : c.red },
    { label: "Margin",         value: margin,                          color: output.netProfit >= 0 ? c.green : c.red },
  ];

  const snapshotHtml = `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 20px 0;">
      <tr>
        ${snapshotCards.map((card, i) => `
          <td align="center" style="padding: 14px 8px; background: ${c.bg}; border: 1px solid ${c.border}; border-radius: 8px; ${i > 0 ? "border-left: none;" : ""}">
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 11px; color: ${c.textMuted}; text-transform: uppercase; letter-spacing: 1px;">${card.label}</div>
            <div style="font-family: 'SF Mono', Menlo, Consolas, monospace; font-size: 18px; font-weight: 600; color: ${card.color}; margin-top: 4px;">${card.value}</div>
          </td>
        `).join("")}
      </tr>
    </table>`;

  const sliderRows = sliders.map((s) => {
    const v = values[s.key] ?? s.defaultValue;
    return `
      <tr>
        <td style="padding: 8px 12px; border-bottom: 1px solid ${c.border}; font-family: -apple-system, BlinkMacSystemFont, sans-serif; font-size: 13px; color: ${c.textDim};">${s.label}</td>
        <td style="padding: 8px 12px; border-bottom: 1px solid ${c.border}; font-family: 'SF Mono', Menlo, monospace; font-size: 13px; color: ${c.text}; text-align: right; white-space: nowrap;">${fmtValue(s, v)}</td>
      </tr>`;
  }).join("");

  const costRows = output.costBreakdown.map((item) => `
    <tr>
      <td style="padding: 6px 12px; font-family: -apple-system, BlinkMacSystemFont, sans-serif; font-size: 13px; color: ${c.textDim};">${item.label}</td>
      <td style="padding: 6px 12px; font-family: 'SF Mono', Menlo, monospace; font-size: 13px; color: ${c.text}; text-align: right;">${fmtMoney(item.value)}</td>
      <td style="padding: 6px 12px; font-family: 'SF Mono', Menlo, monospace; font-size: 11px; color: ${c.textMuted}; text-align: right; width: 60px;">${fmtPct(item.pct)}</td>
    </tr>`).join("");

  const growthHtml = `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 14px 0;">
      <tr>
        ${(["launch", "traction", "scale"] as const).map((k) => {
          const phase = output.growth[k];
          return `
            <td align="center" style="padding: 14px 8px; background: ${c.bg}; border: 1px solid ${c.border}; border-radius: 8px;">
              <div style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; font-size: 11px; color: ${c.accent2}; text-transform: uppercase; letter-spacing: 1px;">${k} · months ${phase.months}</div>
              <div style="font-family: 'SF Mono', Menlo, monospace; font-size: 18px; font-weight: 600; color: ${phase.netProfit >= 0 ? c.green : c.red}; margin-top: 6px;">${fmtMoney(phase.netProfit)}/mo</div>
              <div style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; font-size: 11px; color: ${c.textMuted}; margin-top: 4px;">${phase.label}</div>
            </td>
          `;
        }).join("")}
      </tr>
    </table>`;

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escapeHtml(subject)}</title></head>
<body style="margin: 0; padding: 0; background: ${c.bg}; color: ${c.text}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background: ${c.bg};">
    <tr><td align="center" style="padding: 32px 16px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="max-width: 600px;">
        <tr><td style="padding: 0 0 24px;">
          <div style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; font-size: 12px; color: ${c.accent2}; text-transform: uppercase; letter-spacing: 2px;">StartupLenz · ${escapeHtml(verticalDisplayName)}</div>
          <h1 style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; font-size: 24px; font-weight: 600; color: ${c.text}; margin: 8px 0 0; letter-spacing: -0.01em;">Your cost model is ready</h1>
        </td></tr>

        <tr><td>
          <p style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; font-size: 14px; color: ${c.textDim}; line-height: 1.5; margin: 0 0 8px;">Here's the snapshot from the assumptions you set:</p>
          ${snapshotHtml}
        </td></tr>

        <tr><td>
          <h2 style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; font-size: 13px; color: ${c.textMuted}; text-transform: uppercase; letter-spacing: 2px; margin: 24px 0 12px;">12-month trajectory</h2>
          ${growthHtml}
        </td></tr>

        <tr><td style="padding: 16px 0;">
          <div style="background: ${c.card}; border: 1px solid ${c.border}; border-left: 3px solid ${c.accent2}; border-radius: 8px; padding: 14px 16px;">
            <div style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; font-size: 11px; color: ${c.accent2}; text-transform: uppercase; letter-spacing: 1.5px;">Insight</div>
            <p style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; font-size: 14px; color: ${c.text}; line-height: 1.5; margin: 6px 0 0;">${escapeHtml(output.insight)}</p>
          </div>
        </td></tr>

        <tr><td>
          <h2 style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; font-size: 13px; color: ${c.textMuted}; text-transform: uppercase; letter-spacing: 2px; margin: 24px 0 12px;">Cost breakdown</h2>
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background: ${c.card}; border: 1px solid ${c.border}; border-radius: 8px;">
            ${costRows}
          </table>
        </td></tr>

        <tr><td>
          <h2 style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; font-size: 13px; color: ${c.textMuted}; text-transform: uppercase; letter-spacing: 2px; margin: 24px 0 12px;">Your assumptions</h2>
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background: ${c.card}; border: 1px solid ${c.border}; border-radius: 8px;">
            ${sliderRows}
          </table>
        </td></tr>

        <tr><td style="padding: 28px 0 0;">
          <a href="${escapeAttr(shareUrl)}" style="display: inline-block; background: ${c.accent}; color: #ffffff; padding: 12px 24px; border-radius: 8px; font-family: -apple-system, BlinkMacSystemFont, sans-serif; font-size: 14px; font-weight: 600; text-decoration: none;">Re-open this plan →</a>
          <a href="${escapeAttr(siteUrl)}" style="display: inline-block; margin-left: 10px; background: transparent; color: ${c.textDim}; padding: 12px 18px; border: 1px solid ${c.border}; border-radius: 8px; font-family: -apple-system, BlinkMacSystemFont, sans-serif; font-size: 14px; font-weight: 600; text-decoration: none;">Browse more verticals</a>
        </td></tr>

        <tr><td style="padding: 40px 0 0; border-top: 1px solid ${c.border}; margin-top: 32px;"></td></tr>
        <tr><td style="padding: 16px 0;">
          <p style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; font-size: 12px; color: ${c.textMuted}; line-height: 1.6; margin: 0;">
            You&rsquo;re getting this because you asked us to email your plan from <a href="${escapeAttr(siteUrl)}" style="color: ${c.textDim};">StartupLenz</a>, an indie project from <a href="https://chaphaus.com" style="color: ${c.textDim};">ChapHaus</a>. We won&rsquo;t email you again unless you opted in to updates.
          </p>
          <p style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; font-size: 11px; color: ${c.textMuted}; line-height: 1.6; margin: 8px 0 0;">
            <a href="${escapeAttr(unsubscribeUrl)}" style="color: ${c.textDim}; text-decoration: underline;">Unsubscribe</a>
            &nbsp;·&nbsp; ChapHaus LLC, Glastonbury, CT
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;

  return { subject, html, text };
}

function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
function escapeAttr(s: string): string { return escapeHtml(s); }

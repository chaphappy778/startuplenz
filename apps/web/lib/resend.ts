// apps/web/lib/resend.ts
// Lazy singleton Resend client. Throws a clear error if RESEND_API_KEY is
// missing so misconfigured deployments fail loud, not silent.

import { Resend } from "resend";

let cached: Resend | null = null;

export function getResend(): Resend {
  if (cached) return cached;
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    throw new Error(
      "RESEND_API_KEY is not set. Add it to apps/web/.env.local — see .env.local.example.",
    );
  }
  cached = new Resend(key);
  return cached;
}

export function getFromAddress(): string {
  return (
    process.env.RESEND_FROM_ADDRESS ??
    "StartupLenz <hello@chaphaus.com>"
  );
}

/**
 * Optional Reply-To. When the FROM domain is shared with another product
 * (e.g. sending from chaphaus.com but branding as StartupLenz), set this
 * to a StartupLenz-domain alias that forwards into your real inbox so
 * replies don't get cross-routed.
 */
export function getReplyTo(): string | undefined {
  const raw = process.env.RESEND_REPLY_TO?.trim();
  return raw && raw.length > 0 ? raw : undefined;
}

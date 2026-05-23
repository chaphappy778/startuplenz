// apps/web/lib/unsubscribeToken.ts
//
// Lightweight HMAC tokens for unsubscribe links. The token binds an email
// address to a server-known secret so users can't enumerate/unsub others.
//
// Format: <base64url(email)>.<hex(hmac-sha256(secret, email))>
// Truncated to 16 hex chars, 64 bits of entropy is plenty for this use.

import { createHmac, timingSafeEqual } from "node:crypto";

const HMAC_HEX_LEN = 16; // 64 bits

function getSecret(): string {
  const s = process.env.UNSUBSCRIBE_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!s) throw new Error("UNSUBSCRIBE_SECRET (or SUPABASE_SERVICE_ROLE_KEY fallback) must be set.");
  return s;
}

function b64urlEncode(s: string): string {
  return Buffer.from(s, "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function b64urlDecode(s: string): string {
  const padded = s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4);
  return Buffer.from(padded, "base64").toString("utf8");
}

function sigFor(email: string): string {
  const hmac = createHmac("sha256", getSecret());
  hmac.update(email.toLowerCase());
  return hmac.digest("hex").slice(0, HMAC_HEX_LEN);
}

export function buildUnsubscribeToken(email: string): string {
  const normalized = email.trim().toLowerCase();
  return `${b64urlEncode(normalized)}.${sigFor(normalized)}`;
}

export interface VerifiedToken { email: string }

export function verifyUnsubscribeToken(token: string): VerifiedToken | null {
  if (!token || typeof token !== "string") return null;
  const dot = token.indexOf(".");
  if (dot <= 0 || dot >= token.length - 1) return null;
  const emailPart = token.slice(0, dot);
  const sigPart = token.slice(dot + 1);

  let email: string;
  try {
    email = b64urlDecode(emailPart);
  } catch {
    return null;
  }

  const expected = sigFor(email);
  if (sigPart.length !== expected.length) return null;
  try {
    if (!timingSafeEqual(Buffer.from(sigPart, "hex"), Buffer.from(expected, "hex"))) {
      return null;
    }
  } catch {
    return null;
  }
  return { email };
}

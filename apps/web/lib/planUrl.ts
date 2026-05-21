// apps/web/lib/planUrl.ts
//
// Compact, URL-safe encoding/decoding of slider values for the ?q= share param.
// Format: base64url-encoded JSON. For the handmade vertical's 16 numeric inputs
// this stays under ~400 chars, well under any URL-length limit.
//
// We intentionally keep the shape "just a Record<string, number>" so any vertical
// works without an encoder-per-vertical. Numbers are rounded to 4 decimals to
// keep payloads small without losing precision for sliders that step at 0.05 / 0.1.

import type { SliderValues } from "./types";

const MAX_DECIMALS = 4;

function roundForUrl(n: number): number {
  if (!Number.isFinite(n)) return 0;
  const m = 10 ** MAX_DECIMALS;
  return Math.round(n * m) / m;
}

function toBase64Url(bytes: string): string {
  // bytes is a binary string (Latin-1 of UTF-8)
  const b64 = typeof btoa !== "undefined"
    ? btoa(bytes)
    : Buffer.from(bytes, "binary").toString("base64");
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(s: string): string {
  // Pad back to 4-char boundary
  const padded = s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4);
  return typeof atob !== "undefined"
    ? atob(padded)
    : Buffer.from(padded, "base64").toString("binary");
}

export function encodeValuesToParam(values: SliderValues): string {
  const compact: SliderValues = {};
  for (const [k, v] of Object.entries(values)) {
    if (typeof v === "number" && Number.isFinite(v)) {
      compact[k] = roundForUrl(v);
    }
  }
  const json = JSON.stringify(compact);
  // Encode the JSON as UTF-8 then to binary string for btoa
  const utf8 = typeof TextEncoder !== "undefined"
    ? new TextEncoder().encode(json)
    : Buffer.from(json, "utf8");
  let bin = "";
  for (let i = 0; i < utf8.length; i++) bin += String.fromCharCode(utf8[i]);
  return toBase64Url(bin);
}

export function decodeValuesFromParam(param: string | null | undefined): SliderValues | null {
  if (!param) return null;
  try {
    const bin = fromBase64Url(param);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    const json = typeof TextDecoder !== "undefined"
      ? new TextDecoder().decode(bytes)
      : Buffer.from(bytes).toString("utf8");
    const parsed = JSON.parse(json);
    if (!parsed || typeof parsed !== "object") return null;
    const out: SliderValues = {};
    for (const [k, v] of Object.entries(parsed)) {
      if (typeof k === "string" && typeof v === "number" && Number.isFinite(v)) {
        out[k] = v;
      }
    }
    return Object.keys(out).length > 0 ? out : null;
  } catch {
    return null;
  }
}

/**
 * Build a shareable URL for the current calculator state.
 * Origin is read from window.location at call time so this works
 * across localhost and production without configuration.
 */
export function buildShareUrl(values: SliderValues, opts: { path: string; origin?: string }): string {
  const origin = opts.origin ?? (typeof window !== "undefined" ? window.location.origin : "");
  const q = encodeValuesToParam(values);
  return `${origin}${opts.path}?q=${q}`;
}

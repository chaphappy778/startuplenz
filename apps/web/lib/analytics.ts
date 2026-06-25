// apps/web/lib/analytics.ts
// Small wrapper around gtag for custom event tracking. Use these helpers
// from client components so we never reference `window.gtag` directly
// outside this file.

declare global {
  interface Window {
    // gtag is injected by the Google Tag script loaded in
    // components/GoogleAnalytics.tsx. Optional because it's not present
    // when GA is disabled (no NEXT_PUBLIC_GA_ID set) or before the
    // script finishes loading.
    gtag?: (
      command: "config" | "event" | "set" | "consent" | "js",
      ...args: unknown[]
    ) => void;
    dataLayer?: unknown[];
  }
}

export const GA_ID = process.env.NEXT_PUBLIC_GA_ID ?? "";

/** True if a measurement ID is configured. Cheap to read; use this as a
 *  guard before doing any tracking work. */
export const gaEnabled = (): boolean => GA_ID.length > 0;

/** Fire a pageview manually. We rely on this for client-side route
 *  changes since the gtag script's automatic pageview only fires on
 *  initial load. */
export function trackPageview(path: string): void {
  if (!gaEnabled() || typeof window === "undefined" || !window.gtag) return;
  window.gtag("config", GA_ID, { page_path: path });
}

/** Fire a custom event. The `event_category` and `event_label` fields
 *  follow GA4's standard schema so they show up nicely in the Reports →
 *  Engagement → Events view without extra configuration. */
export function trackEvent(
  name: string,
  params?: { category?: string; label?: string; value?: number; [k: string]: unknown },
): void {
  if (!gaEnabled() || typeof window === "undefined" || !window.gtag) return;
  const { category, label, value, ...rest } = params ?? {};
  window.gtag("event", name, {
    event_category: category,
    event_label: label,
    value,
    ...rest,
  });
}

// apps/web/components/GoogleAnalytics.tsx
// Loads the Google Analytics 4 gtag script and wires:
//   1. Pageview tracking across client-side route changes (Next App
//      Router doesn't fire a hard navigation, so we listen for pathname
//      changes and call gtag config ourselves).
//   2. Scroll depth events at 25 / 50 / 75 / 100% with per-pathname
//      deduplication so a single visit produces at most four scroll
//      events.
//   3. CTA click events for any element with a data-track-cta="<label>"
//      attribute. This keeps tracking declarative — drop the attribute
//      on a button or link, get a clean GA event with no per-component
//      wiring.
//
// Renders nothing if NEXT_PUBLIC_GA_ID isn't set, so this is safe to
// drop into the layout regardless of environment.

"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import Script from "next/script";
import { GA_ID, gaEnabled, trackEvent, trackPageview } from "@/lib/analytics";

const SCROLL_MILESTONES = [25, 50, 75, 100] as const;

export default function GoogleAnalytics() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  /** Milestones already fired on the current pathname so a user who
   *  scrolls up and down doesn't fire duplicates. Resets when the
   *  pathname changes. */
  const firedMilestones = useRef<Set<number>>(new Set());

  // 1. Pageviews on client-side navigation.
  useEffect(() => {
    if (!gaEnabled()) return;
    const qs = searchParams?.toString();
    const path = qs ? `${pathname}?${qs}` : pathname;
    trackPageview(path);
    firedMilestones.current = new Set();
  }, [pathname, searchParams]);

  // 2. Scroll depth tracking.
  useEffect(() => {
    if (!gaEnabled()) return;

    function onScroll(): void {
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const docHeight =
        document.documentElement.scrollHeight - window.innerHeight;
      if (docHeight <= 0) return;
      const pct = Math.min(100, Math.round((scrollTop / docHeight) * 100));
      for (const m of SCROLL_MILESTONES) {
        if (pct >= m && !firedMilestones.current.has(m)) {
          firedMilestones.current.add(m);
          trackEvent("scroll_depth", {
            category: "engagement",
            label: `${m}%`,
            value: m,
            page_path: pathname,
          });
        }
      }
    }

    // Passive listener avoids blocking the main thread during scroll.
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [pathname]);

  // 3. CTA click tracking via data attribute.
  useEffect(() => {
    if (!gaEnabled()) return;

    function onClick(e: MouseEvent): void {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      // walk up to find a [data-track-cta] ancestor — handles cases
      // where the click lands on an inner span/icon of a button
      const trackEl = target.closest<HTMLElement>("[data-track-cta]");
      if (!trackEl) return;
      const label = trackEl.dataset.trackCta || "(unlabeled)";
      const location = trackEl.dataset.trackLocation || pathname;
      trackEvent("cta_click", {
        category: "cta",
        label,
        cta_location: location,
      });
    }

    document.addEventListener("click", onClick, { capture: true });
    return () => document.removeEventListener("click", onClick, { capture: true });
  }, [pathname]);

  if (!gaEnabled()) {
    if (process.env.NODE_ENV === "development") {
      // Loud but not blocking — surfaces "you forgot the env var" without
      // noise in production.
      // eslint-disable-next-line no-console
      console.warn("[GoogleAnalytics] NEXT_PUBLIC_GA_ID not set; tracking disabled.");
    }
    return null;
  }

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
        strategy="afterInteractive"
      />
      <Script id="gtag-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          window.gtag = gtag;
          gtag('js', new Date());
          gtag('config', '${GA_ID}', { send_page_view: true });
        `}
      </Script>
    </>
  );
}

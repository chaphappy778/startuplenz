// apps/web/app/robots.ts

import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Crawl-budget triage: keep Google focused on canonical content
        // (homepage, /verticals, /model/*, /about, /how-it-works, /pulse,
        // /blog/*, /compare, /goal/*). Block authenticated / transactional
        // surfaces that have no SEO value and were bloating the
        // "Discovered — currently not indexed" queue in GSC.
        disallow: [
          "/admin",
          "/api",
          "/auth",
          "/account",
          "/plans",
          "/login",
          "/signup",
          "/unsubscribe",
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}

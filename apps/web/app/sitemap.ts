// apps/web/app/sitemap.ts
// Dynamic sitemap — lists static pages + every active vertical.

import type { MetadataRoute } from "next";
import { createClient } from "@/lib/supabase/server";
import { SITE_URL } from "@/lib/seo";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const supabase = await createClient();

  const { data: verticals } = await supabase
    .from("verticals")
    .select("slug, is_active")
    .eq("is_active", true)
    .order("slug", { ascending: true });

  const slugs = (verticals ?? []).map((v) => v.slug as string);

  const verticalEntries: MetadataRoute.Sitemap = slugs.map((slug) => ({
    url: `${SITE_URL}/model/${slug}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  // Compare pairs — one canonical URL per unordered pair (alphabetical).
  // With N verticals there are N*(N-1)/2 pairs.
  const comparePairs: MetadataRoute.Sitemap = [];
  for (let i = 0; i < slugs.length; i++) {
    for (let j = i + 1; j < slugs.length; j++) {
      comparePairs.push({
        url: `${SITE_URL}/compare?a=${slugs[i]}&b=${slugs[j]}`,
        lastModified: now,
        changeFrequency: "monthly",
        priority: 0.6,
      });
    }
  }

  // Goal-seek SEO landing pages — common profit targets per vertical.
  // N verticals × 5 targets = 5N pages (45 at N=9).
  const goalTargets = [1000, 2500, 5000, 10000, 25000];
  const goalEntries: MetadataRoute.Sitemap = [];
  for (const slug of slugs) {
    for (const target of goalTargets) {
      goalEntries.push({
        url: `${SITE_URL}/goal/${slug}?net=${target}`,
        lastModified: now,
        changeFrequency: "monthly",
        priority: 0.7,
      });
    }
  }

  return [
    { url: `${SITE_URL}/`,        lastModified: now, changeFrequency: "weekly",  priority: 1.0 },
    { url: `${SITE_URL}/compare`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE_URL}/login`,   lastModified: now, changeFrequency: "yearly",  priority: 0.3 },
    { url: `${SITE_URL}/signup`,  lastModified: now, changeFrequency: "yearly",  priority: 0.3 },
    ...verticalEntries,
    ...comparePairs,
    ...goalEntries,
  ];
}

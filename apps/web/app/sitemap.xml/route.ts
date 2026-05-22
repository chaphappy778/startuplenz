// apps/web/app/sitemap.xml/route.ts
//
// Hand-rolled XML sitemap. Replaces the previous `app/sitemap.ts` which
// relied on Next's MetadataRoute.Sitemap serializer — that serializer
// doesn't escape `&` to `&amp;` in URL query strings, which breaks XML
// parsing the moment any /compare?a=X&b=Y URL appears.
//
// We render the XML directly so we own the escaping.

import { createClient } from "@/lib/supabase/server";
import { SITE_URL } from "@/lib/seo";

type ChangeFreq = "weekly" | "monthly" | "yearly";

interface Entry {
  loc: string;
  lastmod: string;
  changefreq: ChangeFreq;
  priority: number;
}

// XML 1.0 spec requires escaping these five characters in element content.
function xmlEscape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function renderUrl(entry: Entry): string {
  return [
    "  <url>",
    `    <loc>${xmlEscape(entry.loc)}</loc>`,
    `    <lastmod>${entry.lastmod}</lastmod>`,
    `    <changefreq>${entry.changefreq}</changefreq>`,
    `    <priority>${entry.priority.toFixed(1)}</priority>`,
    "  </url>",
  ].join("\n");
}

export async function GET() {
  const now = new Date().toISOString();
  const supabase = await createClient();

  const { data: verticals } = await supabase
    .from("verticals")
    .select("slug, is_active")
    .eq("is_active", true)
    .order("slug", { ascending: true });

  const slugs = (verticals ?? []).map((v) => v.slug as string);

  const entries: Entry[] = [
    { loc: `${SITE_URL}/`,        lastmod: now, changefreq: "weekly",  priority: 1.0 },
    { loc: `${SITE_URL}/compare`, lastmod: now, changefreq: "monthly", priority: 0.5 },
    { loc: `${SITE_URL}/login`,   lastmod: now, changefreq: "yearly",  priority: 0.3 },
    { loc: `${SITE_URL}/signup`,  lastmod: now, changefreq: "yearly",  priority: 0.3 },
  ];

  // Per-vertical model pages.
  for (const slug of slugs) {
    entries.push({
      loc: `${SITE_URL}/model/${slug}`,
      lastmod: now,
      changefreq: "weekly",
      priority: 0.8,
    });
  }

  // Compare pairs — one canonical URL per unordered pair (alphabetical).
  // The `&` here is what broke the previous sitemap; xmlEscape handles it.
  for (let i = 0; i < slugs.length; i++) {
    for (let j = i + 1; j < slugs.length; j++) {
      entries.push({
        loc: `${SITE_URL}/compare?a=${slugs[i]}&b=${slugs[j]}`,
        lastmod: now,
        changefreq: "monthly",
        priority: 0.6,
      });
    }
  }

  // Goal-seek SEO landing pages — common profit targets per vertical.
  const goalTargets = [1000, 2500, 5000, 10000, 25000];
  for (const slug of slugs) {
    for (const target of goalTargets) {
      entries.push({
        loc: `${SITE_URL}/goal/${slug}?net=${target}`,
        lastmod: now,
        changefreq: "monthly",
        priority: 0.7,
      });
    }
  }

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...entries.map(renderUrl),
    "</urlset>",
  ].join("\n");

  return new Response(xml, {
    status: 200,
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      // Let the CDN cache for an hour; sitemap changes are infrequent.
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}

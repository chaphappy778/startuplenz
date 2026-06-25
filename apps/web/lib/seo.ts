// apps/web/lib/seo.ts
// Shared SEO helpers, site URL, default metadata, structured-data builders.

import type { Metadata } from "next";
import { getVerticalContent } from "@/lib/verticalContent";

export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
  "https://startuplenz.com";

export const SITE_NAME = "StartupLenz";

export const DEFAULT_OG_IMAGE = `${SITE_URL}/opengraph-image`;

/** Common metadata applied to every page; pages can extend/override.
 *
 *  IMPORTANT: do not set a default canonical here. A global canonical
 *  on the base would make every page that inherits this metadata
 *  advertise the homepage as its canonical URL, which causes Google to
 *  drop every non-home URL as a duplicate. Each page that calls
 *  baseMetadata() must pass its own `alternates: { canonical: ... }`. */
export function baseMetadata(overrides?: Partial<Metadata>): Metadata {
  return {
    title: {
      default: "StartupLenz, Live cost modeling for new businesses",
      template: "%s, StartupLenz",
    },
    description:
      "Free, vertical-specific cost calculators for indie founders. Food trucks, candle makers, subscription boxes, print-on-demand, and more.",
    metadataBase: new URL(SITE_URL),
    openGraph: {
      type: "website",
      url: SITE_URL,
      siteName: SITE_NAME,
      title: "StartupLenz, Live cost modeling for new businesses",
      description:
        "Free, vertical-specific cost calculators for indie founders.",
      images: [{ url: DEFAULT_OG_IMAGE, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title: "StartupLenz",
      description: "Free, vertical-specific cost calculators for indie founders.",
      images: [DEFAULT_OG_IMAGE],
    },
    robots: { index: true, follow: true },
    ...overrides,
  };
}

export function verticalMetadata(slug: string, displayName: string): Metadata {
  const content = getVerticalContent(slug);
  const url = `${SITE_URL}/model/${slug}`;
  const og = `${SITE_URL}/opengraph-image?vertical=${encodeURIComponent(slug)}`;
  return {
    title: content.seoTitle,
    description: content.seoDescription,
    keywords: content.keywords,
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      url,
      siteName: SITE_NAME,
      title: content.seoTitle,
      description: content.seoDescription,
      images: [{ url: og, width: 1200, height: 630, alt: displayName }],
    },
    twitter: {
      card: "summary_large_image",
      title: content.seoTitle,
      description: content.seoDescription,
      images: [og],
    },
  };
}

/** SoftwareApplication structured-data for the home page. */
export function softwareApplicationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: SITE_NAME,
    url: SITE_URL,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    description:
      "Free, vertical-specific startup cost calculators for indie founders.",
  };
}

/** FAQPage structured-data, given the vertical's FAQs. */
export function faqPageJsonLd(faqs: Array<{ q: string; a: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
}

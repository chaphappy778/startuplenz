"use client";

import Link from "next/link";
import type { VerticalDef } from "@/lib/types";

const VERTICALS: VerticalDef[] = [
  {
    id: "handmade-craft",
    slug: "handmade-craft",
    label: "Handmade / Craft",
    description: "Candles, bath bombs, jewelry, slime",
    icon: "🕯️",
    sliders: [], // populated by vertical module
  },
  {
    id: "food-truck",
    slug: "food-truck",
    label: "Food Truck",
    description: "Mobile food service & events",
    icon: "🚚",
    sliders: [],
  },
  {
    id: "print-on-demand",
    slug: "print-on-demand",
    label: "Print-on-Demand",
    description: "Apparel, posters, home goods",
    icon: "👕",
    sliders: [],
  },
  {
    id: "digital-products",
    slug: "digital-products",
    label: "Digital Products",
    description: "Templates, presets, courses",
    icon: "💾",
    sliders: [],
  },
  {
    id: "subscription-box",
    slug: "subscription-box",
    label: "Subscription Box",
    description: "Curated monthly boxes",
    icon: "📦",
    sliders: [],
  },
  {
    id: "reseller",
    slug: "reseller",
    label: "Reseller / Thrift",
    description: "Sourced goods, vintage, wholesale",
    icon: "🏷️",
    sliders: [],
  },
];

interface Props {
  activeSlug?: string;
}

export default function VerticalSelector({ activeSlug }: Props) {
  return (
    <div className="vertical-selector">
      <p className="selector-label">Choose your business type</p>
      <div className="vertical-grid">
        {VERTICALS.map((v) => {
          const isActive = v.slug === activeSlug;
          const isComingSoon = v.slug !== "handmade-craft";
          return (
            <Link
              key={v.id}
              href={isComingSoon ? "#" : `/model/${v.slug}`}
              className={`vertical-card ${isActive ? "active" : ""} ${isComingSoon ? "soon" : ""}`}
              aria-disabled={isComingSoon}
              onClick={(e) => isComingSoon && e.preventDefault()}
            >
              <span className="vertical-icon">{v.icon}</span>
              <span className="vertical-name">{v.label}</span>
              <span className="vertical-desc">{v.description}</span>
              {isComingSoon && <span className="soon-badge">Soon</span>}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

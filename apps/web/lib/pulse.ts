// apps/web/lib/pulse.ts
//
// Data-freshness reader. Combines a hand-curated changelog (JSON file at
// content/pulse/changelog.json) with live counts from Supabase. Powers the
// /pulse page and the home-page "Live data" teaser.
//
// The changelog is intentionally manual right now — meaningful updates
// (vertical added, fee refresh, engine improvement) get human-curated
// entries so the page tells a story rather than spamming every default-
// value tweak. When/if we wire in automatic change tracking from the
// vertical_inputs table, this same reader will merge both sources.

import fs from "fs";
import path from "path";
import { createClient } from "@/lib/supabase/server";

export type PulseKind = "launch" | "vertical" | "data" | "engine" | "feature";

export interface PulseEntry {
  date: string;          // ISO yyyy-mm-dd
  iso: string;           // full ISO datetime (date + T00:00:00Z) for sort
  dateDisplay: string;   // "May 21, 2026"
  kind: PulseKind;
  title: string;
  description: string;
  verticalSlug?: string;
}

export interface PulseStats {
  activeVerticals: number;
  totalInputs: number;
  changelogEntriesAll: number;
  changelogEntriesThisMonth: number;
  lastUpdatedIso: string | null;
  lastUpdatedDisplay: string | null;
  /** Days since the most recent changelog entry. */
  daysSinceLastUpdate: number | null;
}

const CHANGELOG_PATH = path.join(
  process.cwd(),
  "content",
  "pulse",
  "changelog.json",
);

function displayDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function readChangelog(): PulseEntry[] {
  if (!fs.existsSync(CHANGELOG_PATH)) return [];
  const raw = fs.readFileSync(CHANGELOG_PATH, "utf-8");
  const parsed = JSON.parse(raw) as { entries?: Array<Omit<PulseEntry, "iso" | "dateDisplay">> };
  const entries = parsed.entries ?? [];

  return entries
    .map((e) => {
      const iso = new Date(`${e.date}T00:00:00Z`).toISOString();
      return {
        ...e,
        iso,
        dateDisplay: displayDate(iso),
      };
    })
    .sort((a, b) => b.iso.localeCompare(a.iso));
}

export function getAllPulseEntries(): PulseEntry[] {
  return readChangelog();
}

export function getRecentPulseEntries(limit: number): PulseEntry[] {
  return readChangelog().slice(0, limit);
}

export async function getPulseStats(): Promise<PulseStats> {
  const entries = readChangelog();
  const supabase = await createClient();

  // Active verticals + total inputs are real numbers from the DB.
  const [{ count: verticalCount }, { count: inputCount }] = await Promise.all([
    supabase
      .from("verticals")
      .select("id", { count: "exact", head: true })
      .eq("is_active", true),
    supabase
      .from("vertical_inputs")
      .select("id", { count: "exact", head: true }),
  ]);

  // Window the changelog by month for the "updates this month" stat.
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const thisMonthCount = entries.filter((e) => e.iso >= startOfMonth).length;

  const last = entries[0]?.iso ?? null;
  const daysSince = last
    ? Math.floor((now.getTime() - new Date(last).getTime()) / (1000 * 60 * 60 * 24))
    : null;

  return {
    activeVerticals: verticalCount ?? 0,
    totalInputs: inputCount ?? 0,
    changelogEntriesAll: entries.length,
    changelogEntriesThisMonth: thisMonthCount,
    lastUpdatedIso: last,
    lastUpdatedDisplay: last ? displayDate(last) : null,
    daysSinceLastUpdate: daysSince,
  };
}

/** Friendly label for an update kind. */
export function pulseKindLabel(kind: PulseKind): string {
  switch (kind) {
    case "launch":   return "Launch";
    case "vertical": return "New vertical";
    case "data":     return "Data refresh";
    case "engine":   return "Engine update";
    case "feature":  return "New feature";
  }
}

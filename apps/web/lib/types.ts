// ─── Vertical Definition ──────────────────────────────────────────────────────

export interface SliderDef {
  key: string;
  label: string;
  min: number;
  max: number;
  step: number;
  defaultValue: number;
  unit?: string; // "$", "%", ""
  formulaKey: string; // maps to vertical model input
}

export interface VerticalDef {
  id: string;
  slug: string;
  label: string;
  description: string;
  icon: string; // emoji or lucide icon name
  sliders: SliderDef[];
}

// ─── Model Input / Output ─────────────────────────────────────────────────────

export type SliderValues = Record<string, number>;

export interface GrowthPhase {
  months: string;
  netProfit: number;
  label: string;
}

export interface CostItem {
  label: string;
  value: number;
  pct: number;
}

export interface ModelOutput {
  grossRevenue: number;
  costOfGoods: number;
  platformAndShipping: number;
  netProfit: number;
  profitMargin: number;
  ordersPerMonth: number;
  growth: {
    launch: GrowthPhase;
    traction: GrowthPhase;
    scale: GrowthPhase;
  };
  costBreakdown: CostItem[];
  insight: string;
}

// ─── Snapshot / Plan ──────────────────────────────────────────────────────────

export interface SavedPlanSummary {
  id: string;
  name: string;
  verticalId: string;
  updatedAt: string;
}

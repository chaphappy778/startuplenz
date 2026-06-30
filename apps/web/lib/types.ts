// ─── Vertical Definition ──────────────────────────────────────────────────────

export interface SliderDef {
  key: string;
  label: string;
  min: number;
  max: number;
  step: number;
  defaultValue: number;
  unit?: string; // "$" | "%" | "USD" | "units" | "mins" | "USD/hr" | "drops" | "bool" | ""
  formulaKey: string; // maps to vertical model input
  isLiveData?: boolean; // true when the value can be overridden by a cost_snapshot
  sortOrder?: number; // ascending order for UI display
  helpText?: string; // hover tooltip, what does this slider actually mean?
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

/** One rule-of-thumb check returned by a vertical's model. Surfaces in the
 *  RulesCheck card on the calculator. Only the house-flipping model populates
 *  this today; other verticals leave it undefined and the UI hides the card. */
export interface RuleCheckItem {
  rule: string;
  status: "pass" | "warn" | "fail";
  message: string;
  detail?: string;
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
  /** Optional. House flipping is the first vertical to populate this.
   *  Verticals that don't supply it get nothing on the dashboard. */
  rulesCheck?: RuleCheckItem[];
}

// ─── Snapshot / Plan ──────────────────────────────────────────────────────────

export interface SavedPlanSummary {
  id: string;
  name: string;
  verticalId: string;
  updatedAt: string;
}

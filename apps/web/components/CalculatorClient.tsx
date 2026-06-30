"use client";

// apps/web/components/CalculatorClient.tsx
//
// Composes the existing calculator panels into a working calculator.
// Sliders are sourced from the vertical_inputs table in Supabase (read in the
// page component) and passed in via the `sliders` prop. Numbers come from
// computeModel() in lib/modelClient.ts, which calls the real
// @startuplenz/vertical-models/handmade engine.
//
// Phase 4 additions:
//   • initialValues prop, used when loading a saved plan or a ?q= shared URL
//   • signedIn prop, enables/disables the Save button
//   • Share button, copies a URL with ?q=<encoded values> to the clipboard
//   • Save button, calls the savePlan server action and redirects to /plans/[id]

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import AssumptionsPanel from "@/components/AssumptionsPanel";
import CostBreakdown from "@/components/CostBreakdown";
import GoalSeekPanel from "@/components/GoalSeekPanel";
import GrowthTrajectory from "@/components/GrowthTrajectory";
import InsightCallout from "@/components/InsightCallout";
import RulesCheck from "@/components/RulesCheck";
import MonthlySnapshot from "@/components/MonthlySnapshot";

import { computeModel } from "@/lib/modelClient";
import { deletePlan, savePlan, updatePlan } from "@/lib/actions/plans";
import { captureEmail } from "@/lib/actions/emailCapture";
import { setSubscriberStage, type SubscriberStage } from "@/lib/actions/profile";
import { buildShareUrl, decodeValuesFromParam } from "@/lib/planUrl";
import { houseFlippingOverridesForState } from "@/lib/stateDefaultsShared";
import type { SliderDef, SliderValues } from "@/lib/types";

interface StateDefaultRow {
  state_code: string;
  state_name: string;
  property_tax_rate_pct: number;
  insurance_avg_per_month: number;
  realtor_commission_pct: number;
  median_arv: number;
  typical_holding_months: number;
}

interface SavedPlanRef {
  id: string;
  name: string;
}

interface Props {
  verticalSlug: string;
  /** Optional display name for the calc top bar (e.g. "Slime Brand"). */
  verticalDisplayName?: string;
  /** Optional short tagline shown under the title in the top bar. */
  verticalTagline?: string;
  sliders: SliderDef[];
  initialValues?: SliderValues;
  signedIn?: boolean;
  savedPlan?: SavedPlanRef;
  /** Optional initial goal-seek target (used by /goal/[vertical] landing pages). */
  initialGoalTarget?: number;
  /**
   * Optional state-defaults list. Only passed for location-sensitive
   * verticals (today: house-flipping). When the user picks a state from
   * the dropdown, location-dependent sliders auto-shift to the values
   * computed in lib/stateDefaults.
   */
  stateDefaults?: StateDefaultRow[];
}

export default function CalculatorClient({
  verticalSlug,
  verticalDisplayName,
  verticalTagline,
  sliders,
  initialValues,
  signedIn = false,
  savedPlan,
  initialGoalTarget,
  stateDefaults,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Build the starting state: explicit initialValues (saved plan) > ?q= URL > slider defaults
  const startingValues: SliderValues = useMemo(() => {
    const defaults = Object.fromEntries(
      sliders.map((s) => [s.key, s.defaultValue]),
    ) as SliderValues;

    const urlValues = decodeValuesFromParam(searchParams.get("q"));

    if (initialValues && Object.keys(initialValues).length > 0) {
      return { ...defaults, ...initialValues };
    }
    if (urlValues) {
      return { ...defaults, ...urlValues };
    }
    return defaults;
  }, [sliders, initialValues, searchParams]);

  const [values, setValues] = useState<SliderValues>(startingValues);
  const [selectedState, setSelectedState] = useState<string>("");
  const [shareStatus, setShareStatus] = useState<"" | "copied" | "failed">("");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [planNameDraft, setPlanNameDraft] = useState<string>(
    savedPlan?.name ?? "",
  );
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [isPending, startTransition] = useTransition();

  // If a ?q= URL is loaded directly (no initialValues handed in by the server),
  // we want a visible "Loaded from shared link" indicator.
  const [loadedFromUrl] = useState<boolean>(
    !initialValues && !!decodeValuesFromParam(searchParams.get("q")),
  );

  const output = useMemo(
    () => computeModel(values, verticalSlug),
    [values, verticalSlug],
  );

  const handleChange = (key: string, value: number) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  };

  /**
   * State-picker handler. When the user selects a state from the dropdown
   * (house-flipping vertical only today), we compute the per-input
   * overrides and apply them in one update so the calculator re-renders
   * once instead of per-slider.
   */
  const handleStateChange = (code: string) => {
    setSelectedState(code);
    if (!stateDefaults || code === "") return;
    const row = stateDefaults.find((r) => r.state_code === code);
    if (!row) return;
    const overrides = houseFlippingOverridesForState(row);
    setValues((prev) => ({ ...prev, ...overrides }));
  };

  const handleShare = async () => {
    setShareStatus("");
    try {
      const url = buildShareUrl(values, {
        path: `/model/${verticalSlug}`,
      });
      await navigator.clipboard.writeText(url);
      setShareStatus("copied");
      setTimeout(() => setShareStatus(""), 1800);
    } catch {
      setShareStatus("failed");
      setTimeout(() => setShareStatus(""), 2200);
    }
  };

  // On /plans/[id], the primary Save updates in place and the dialog opens
  // for a "Save as copy" (saveAsCopy: true).
  const [saveMode, setSaveMode] = useState<"new" | "copy">(
    savedPlan ? "copy" : "new",
  );

  const handleSavePrimary = () => {
    if (!signedIn) {
      const q = buildShareUrl(values, { path: "" }).split("?q=")[1] ?? "";
      const next = `/model/${verticalSlug}${q ? `?q=${q}` : ""}`;
      router.push(`/login?next=${encodeURIComponent(next)}`);
      return;
    }
    // Owner of an existing plan, update in place, no dialog needed.
    if (savedPlan) {
      setSaveError(null);
      startTransition(async () => {
        const result = await updatePlan({
          planId: savedPlan.id,
          values,
          name: savedPlan.name,
          computedOutputs: {
            gross_revenue: output.grossRevenue,
            net_profit: output.netProfit,
            profit_margin: output.profitMargin,
            orders_per_month: output.ordersPerMonth,
          },
        });
        if (!result.ok) {
          setSaveError(result.error ?? "Couldn't update plan.");
        } else {
          router.refresh();
        }
      });
      return;
    }
    // Otherwise: open the "name your plan" dialog
    setSaveMode("new");
    setShowSaveDialog(true);
  };

  const handleSaveCopy = () => {
    setSaveMode("copy");
    setShowSaveDialog(true);
  };

  const submitSave = () => {
    setSaveError(null);
    startTransition(async () => {
      const result = await savePlan({
        verticalSlug,
        values,
        name: planNameDraft.trim() || "Untitled Plan",
        computedOutputs: {
          gross_revenue: output.grossRevenue,
          net_profit: output.netProfit,
          profit_margin: output.profitMargin,
          orders_per_month: output.ordersPerMonth,
        },
      });
      if (result.ok && result.planId) {
        router.push(`/plans/${result.planId}`);
      } else {
        setSaveError(result.error ?? "Something went wrong.");
      }
    });
  };

  // ─── Email capture ──────────────────────────────────────────────────
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [emailDraft, setEmailDraft] = useState("");
  const [emailOptIn, setEmailOptIn] = useState(true);
  const [emailStatus, setEmailStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [emailMessage, setEmailMessage] = useState<string | null>(null);
  // Progressive profiling: after the email lands, ask one optional question.
  const [stageChoice, setStageChoice] = useState<SubscriberStage | null>(null);
  const [stageSaved, setStageSaved] = useState(false);

  const openEmailDialog = () => {
    setEmailStatus("idle");
    setEmailMessage(null);
    setStageChoice(null);
    setStageSaved(false);
    setShowEmailDialog(true);
  };

  const submitStage = (stage: SubscriberStage) => {
    setStageChoice(stage);
    startTransition(async () => {
      const result = await setSubscriberStage({
        email: emailDraft.trim(),
        stage,
      });
      if (result.ok) setStageSaved(true);
      // Don't surface the error if it fails, this is opt-in, nice-to-have data.
    });
  };

  const submitEmail = () => {
    const email = emailDraft.trim();
    if (!email) {
      setEmailStatus("error");
      setEmailMessage("Add an email first.");
      return;
    }
    setEmailStatus("sending");
    setEmailMessage(null);
    startTransition(async () => {
      const result = await captureEmail({
        email,
        verticalSlug,
        values,
        optInNewsletter: emailOptIn,
      });
      if (result.ok) {
        setEmailStatus("sent");
        setEmailMessage(result.error ?? null);
      } else {
        setEmailStatus("error");
        setEmailMessage(result.error ?? "Something went wrong.");
      }
    });
  };

  const handleDelete = () => {
    if (!savedPlan) return;
    if (!confirm(`Delete "${savedPlan.name}"? This can't be undone.`)) return;
    setSaveError(null);
    startTransition(async () => {
      const result = await deletePlan(savedPlan.id);
      if (result.ok) {
        router.push("/plans");
      } else {
        setSaveError(result.error ?? "Couldn't delete plan.");
      }
    });
  };

  return (
    <section className="calc-main calc-main-v2">
      {/* ── Top bar, vertical info on left, action buttons on right ── */}
      <header className="calc-topbar">
        <div className="calc-topbar-info">
          <span className="calc-topbar-eyebrow">Vertical</span>
          <h2 className="calc-topbar-title">
            {verticalDisplayName ?? "Cost model"}
          </h2>
          {verticalTagline && (
            <p className="calc-topbar-tagline">{verticalTagline}</p>
          )}
        </div>

        <div className="calc-topbar-actions">
          <button
            type="button"
            className="calc-topbar-btn"
            onClick={handleShare}
            aria-label="Share this scenario"
          >
            Share
            {shareStatus === "copied" && (
              <span className="calc-toolbar-flash"> · copied</span>
            )}
            {shareStatus === "failed" && (
              <span className="calc-toolbar-flash failed"> · couldn’t copy</span>
            )}
          </button>
          <button
            type="button"
            className="calc-topbar-btn"
            onClick={openEmailDialog}
            aria-label="Email me my plan"
          >
            Email plan
          </button>
          <button
            type="button"
            className="calc-topbar-btn primary"
            onClick={handleSavePrimary}
            disabled={isPending}
          >
            {savedPlan
              ? isPending
                ? "Updating…"
                : "Save changes"
              : signedIn
                ? "Save plan"
                : "Sign in to save"}
          </button>
          {savedPlan && (
            <>
              <button
                type="button"
                className="calc-topbar-btn"
                onClick={handleSaveCopy}
                disabled={isPending}
              >
                Save as copy
              </button>
              <button
                type="button"
                className="calc-topbar-btn calc-topbar-btn-danger"
                onClick={handleDelete}
                disabled={isPending}
              >
                Delete
              </button>
            </>
          )}
        </div>
      </header>

      {loadedFromUrl && (
        <div className="calc-banner">
          Loaded from a shared link, edit anything to make it your own
          {signedIn ? ". Save plan to keep your version." : "."}
        </div>
      )}

      {saveError && <div className="calc-save-error">{saveError}</div>}

      {/* State picker. Only rendered for location-sensitive verticals
          (house-flipping today). Selecting a state shifts purchase price,
          ARV, holding costs, commission, and holding months to the
          state's actuals. */}
      {stateDefaults && stateDefaults.length > 0 && (
        <div className="calc-state-picker">
          <label className="calc-state-picker-label" htmlFor="calc-state-select">
            <span className="calc-state-eyebrow">Customize for your state</span>
            <span className="calc-state-help">
              This vertical is location-sensitive. Picking your state
              pre-fills property tax, insurance, median home values,
              realtor commission, and typical holding time for your area.
            </span>
          </label>
          <select
            id="calc-state-select"
            className="calc-state-select"
            value={selectedState}
            onChange={(e) => handleStateChange(e.target.value)}
          >
            <option value="">National average (no state selected)</option>
            {stateDefaults.map((s) => (
              <option key={s.state_code} value={s.state_code}>
                {s.state_name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* ── Main 2-col shell: slider rail (left) + results (right) ── */}
      <div className="calc-shell">
        <aside className="calc-rail">
          <AssumptionsPanel
            sliders={sliders}
            values={values}
            onChange={handleChange}
          />
        </aside>

        <div className="calc-results">
          {/* Headline KPI strip, the "what are the numbers" answer. */}
          <MonthlySnapshot output={output} />

          {/* Promoted insight callout, the "what does it mean" answer. */}
          <InsightCallout text={output.insight} />

          {/* Rules-of-thumb checklist. Currently only the house-flipping
              model populates this; other verticals leave it undefined and
              RulesCheck renders nothing. */}
          <RulesCheck items={output.rulesCheck} />

          {/* Dashboard grid, donut + growth side by side. */}
          <div className="dashboard-grid">
            <CostBreakdown items={output.costBreakdown} />
            <GrowthTrajectory growth={output.growth} />
          </div>

          <GoalSeekPanel
            verticalSlug={verticalSlug}
            sliders={sliders}
            values={values}
            onApply={handleChange}
            initialTarget={initialGoalTarget}
          />
        </div>
      </div>

      {showEmailDialog && (
        <div className="calc-save-overlay" role="dialog">
          <div
            className="calc-save-backdrop"
            onClick={() => emailStatus !== "sending" && setShowEmailDialog(false)}
          />
          <div className="calc-save-card">
            {emailStatus === "sent" ? (
              <>
                <h3 className="calc-save-title">Plan sent</h3>
                <p style={{ color: "var(--text-secondary)", fontSize: 13, marginBottom: 14 }}>
                  Check <strong>{emailDraft.trim()}</strong> for your plan, usually arrives within a minute. If you don&rsquo;t see it, check spam.
                </p>
                {emailMessage && (
                  <div className="calc-save-error">{emailMessage}</div>
                )}

                <div className="stage-prompt">
                  <p className="stage-prompt-q">
                    {stageSaved
                      ? "Got it, thanks for letting us know."
                      : "One quick question, where are you in this process? (Optional, helps us send better content.)"}
                  </p>
                  {!stageSaved && (
                    <div className="stage-prompt-options">
                      {([
                        ["researching", "Researching"],
                        ["planning",    "Planning"],
                        ["building",    "Building"],
                        ["operating",   "Operating"],
                      ] as Array<[SubscriberStage, string]>).map(([key, label]) => (
                        <button
                          key={key}
                          type="button"
                          className={`stage-option ${stageChoice === key ? "selected" : ""}`}
                          onClick={() => submitStage(key)}
                          disabled={isPending || stageChoice !== null}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="calc-save-actions">
                  <button
                    type="button"
                    className="calc-toolbar-btn primary"
                    onClick={() => setShowEmailDialog(false)}
                  >
                    Done
                  </button>
                </div>
              </>
            ) : (
              <>
                <h3 className="calc-save-title">Email me my plan</h3>
                <p style={{ color: "var(--text-secondary)", fontSize: 13, marginBottom: 14 }}>
                  We&rsquo;ll send you this plan as an email, your numbers, your assumptions, and a link to re-open and edit it later.
                </p>
                <label className="calc-save-label" htmlFor="calc-email-input">
                  Email
                </label>
                <input
                  id="calc-email-input"
                  type="email"
                  className="calc-save-input"
                  value={emailDraft}
                  onChange={(e) => setEmailDraft(e.target.value)}
                  placeholder="you@example.com"
                  autoFocus
                  disabled={emailStatus === "sending"}
                />
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    marginTop: 12,
                    fontSize: 13,
                    color: "var(--text-secondary)",
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={emailOptIn}
                    onChange={(e) => setEmailOptIn(e.target.checked)}
                    disabled={emailStatus === "sending"}
                  />
                  Also send me occasional tips for {verticalSlug.replace(/-/g, " ")} founders. Unsubscribe anytime.
                </label>
                {emailStatus === "error" && emailMessage && (
                  <div className="calc-save-error">{emailMessage}</div>
                )}
                <div className="calc-save-actions">
                  <button
                    type="button"
                    className="calc-toolbar-btn"
                    onClick={() => setShowEmailDialog(false)}
                    disabled={emailStatus === "sending"}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="calc-toolbar-btn primary"
                    onClick={submitEmail}
                    disabled={emailStatus === "sending"}
                  >
                    {emailStatus === "sending" ? "Sending…" : "Send my plan"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {showSaveDialog && (
        <div className="calc-save-overlay" role="dialog">
          <div className="calc-save-backdrop" onClick={() => !isPending && setShowSaveDialog(false)} />
          <div className="calc-save-card">
            <h3 className="calc-save-title">
              {saveMode === "copy" ? "Save as a new plan" : "Save this plan"}
            </h3>
            <label className="calc-save-label" htmlFor="calc-save-name">
              Plan name
            </label>
            <input
              id="calc-save-name"
              className="calc-save-input"
              value={planNameDraft}
              onChange={(e) => setPlanNameDraft(e.target.value)}
              placeholder={
                saveMode === "copy"
                  ? `Copy of ${savedPlan?.name ?? "this plan"}`
                  : "e.g. Handmade, base case"
              }
              autoFocus
              disabled={isPending}
            />
            {saveError && <div className="calc-save-error">{saveError}</div>}
            <div className="calc-save-actions">
              <button
                type="button"
                className="calc-toolbar-btn"
                onClick={() => setShowSaveDialog(false)}
                disabled={isPending}
              >
                Cancel
              </button>
              <button
                type="button"
                className="calc-toolbar-btn primary"
                onClick={submitSave}
                disabled={isPending}
              >
                {isPending ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

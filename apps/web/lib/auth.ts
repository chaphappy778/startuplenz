// apps/web/lib/auth.ts
// Typed server-side auth helpers.  Call these from Server Components,
// Route Handlers, or anywhere you have access to the request cookies.

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { Session, User } from "@supabase/supabase-js";

// ─── Types ────────────────────────────────────────────────────────────────────

export type TierName = "free" | "pro" | "team";

export interface UserTier {
  tierId: string;
  tierName: TierName;
  maxPlans: number | null;
  maxVerticals: number | null;
  alertsEnabled: boolean;
}

// ─── Session & User ───────────────────────────────────────────────────────────

export async function getSession(): Promise<Session | null> {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session;
}

export async function getUser(): Promise<User | null> {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) return null;
  return user;
}

export async function requireUser(): Promise<User> {
  const user = await getUser();
  if (!user) redirect("/login");
  return user;
}

// ─── Tier resolution ──────────────────────────────────────────────────────────

export async function getUserTier(): Promise<UserTier> {
  const FREE_FALLBACK: UserTier = {
    tierId: "",
    tierName: "free",
    maxPlans: null,
    maxVerticals: 3,
    alertsEnabled: false,
  };

  const user = await getUser();
  if (!user) return FREE_FALLBACK;

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("users")
    .select(
      `
      active_subscription_id,
      user_subscriptions (
        tier_id,
        status,
        subscription_tiers (
          id,
          name,
          max_plans,
          max_verticals,
          alerts_enabled
        )
      )
    `,
    )
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (error || !data) {
    console.error("[getUserTier] query error:", error);
    return FREE_FALLBACK;
  }

  const sub = Array.isArray(data.user_subscriptions)
    ? data.user_subscriptions[0]
    : data.user_subscriptions;

  if (!sub || sub.status !== "active") return FREE_FALLBACK;

  const tier = Array.isArray(sub.subscription_tiers)
    ? sub.subscription_tiers[0]
    : sub.subscription_tiers;

  if (!tier) return FREE_FALLBACK;

  return {
    tierId: tier.id,
    tierName: (tier.name?.toLowerCase() ?? "free") as TierName,
    maxPlans: tier.max_plans ?? null,
    maxVerticals: tier.max_verticals ?? null,
    alertsEnabled: tier.alerts_enabled ?? false,
  };
}

// ─── Vertical access ──────────────────────────────────────────────────────────

export async function canAccessVertical(verticalId: string): Promise<boolean> {
  const user = await getUser();

  const supabase = await createClient();

  let tierId: string | null = null;

  if (user) {
    const { data: userData } = await supabase
      .from("users")
      .select("user_subscriptions(tier_id, status)")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    const sub = Array.isArray(userData?.user_subscriptions)
      ? userData?.user_subscriptions[0]
      : userData?.user_subscriptions;

    if (sub?.status === "active") {
      tierId = sub.tier_id ?? null;
    }
  }

  if (!tierId) {
    const { data: freeTier } = await supabase
      .from("subscription_tiers")
      .select("id")
      .ilike("name", "free")
      .maybeSingle();
    tierId = freeTier?.id ?? null;
  }

  if (!tierId) return false;

  const { data, error } = await supabase
    .from("vertical_access_limits")
    .select("id")
    .eq("tier_id", tierId)
    .eq("vertical_id", verticalId)
    .maybeSingle();

  if (error) {
    console.error("[canAccessVertical] query error:", error);
    return false;
  }

  return data !== null;
}

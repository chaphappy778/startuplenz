"use server";

// apps/web/lib/actions/profile.ts
//
// Progressive profiling: after capture, the user can optionally tell us
// where they are in the journey. One column, four legal values.
// Doubles the value of the subscriber list for downstream segmentation.

import { createAdminClient } from "@/lib/supabase/admin";

export type SubscriberStage = "researching" | "planning" | "building" | "operating";
const VALID_STAGES: SubscriberStage[] = ["researching", "planning", "building", "operating"];

export async function setSubscriberStage(input: {
  email: string;
  stage: SubscriberStage;
}): Promise<{ ok: boolean; error?: string }> {
  const email = (input.email || "").trim().toLowerCase();
  if (!email) return { ok: false, error: "email required" };
  if (!VALID_STAGES.includes(input.stage)) {
    return { ok: false, error: "invalid stage" };
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("email_subscribers")
    .update({ stage: input.stage })
    .ilike("email", email);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

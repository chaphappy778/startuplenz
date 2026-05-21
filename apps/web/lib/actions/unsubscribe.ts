"use server";

// apps/web/lib/actions/unsubscribe.ts
//
// Server action invoked by the unsubscribe confirmation form.
// Verifies the HMAC token, then marks ALL email_subscribers rows for that
// email as unsubscribed (service-role bypasses RLS).

import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyUnsubscribeToken } from "@/lib/unsubscribeToken";

export async function unsubscribeAction(formData: FormData) {
  const token = String(formData.get("token") ?? "");
  const verified = verifyUnsubscribeToken(token);
  if (!verified) {
    // Token invalid — bounce to the same page without ?done=1
    redirect("/unsubscribe");
  }

  const supabase = createAdminClient();
  const now = new Date().toISOString();

  // Mark every row for this email as unsubscribed (idempotent: only update
  // rows that aren't already unsubscribed, so we keep the original timestamp).
  await supabase
    .from("email_subscribers")
    .update({ unsubscribed_at: now })
    .ilike("email", verified.email)
    .is("unsubscribed_at", null);

  redirect("/unsubscribe?done=1");
}

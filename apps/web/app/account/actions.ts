// apps/web/app/account/actions.ts
//
// Server actions for the account page. Lets the signed-in user update their
// own display name. Falls under RLS: a user can only update their own row,
// scoped via the auth_user_id match.

"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth";

export interface UpdateDisplayNameResult {
  ok: boolean;
  error?: string;
}

export async function updateDisplayName(
  rawName: string,
): Promise<UpdateDisplayNameResult> {
  const name = (rawName ?? "").trim();
  if (name.length > 80) {
    return { ok: false, error: "Display name must be 80 characters or fewer." };
  }

  const user = await getUser();
  if (!user) return { ok: false, error: "You're not signed in." };

  const supabase = await createClient();

  const { error } = await supabase
    .from("users")
    .update({
      full_name: name || null,
      updated_at: new Date().toISOString(),
    })
    .eq("auth_user_id", user.id);

  if (error) {
    console.error("[updateDisplayName]", error);
    return { ok: false, error: "Couldn't save. Please try again." };
  }

  revalidatePath("/account");
  return { ok: true };
}

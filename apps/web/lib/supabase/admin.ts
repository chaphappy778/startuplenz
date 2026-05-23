// apps/web/lib/supabase/admin.ts
//
// Service-role Supabase client. Bypasses RLS, use ONLY in server actions
// and route handlers that have already verified the caller is an admin
// (see lib/auth.ts → isAdmin).
//
// NEVER import this from a client component, and NEVER expose the service
// role key to the browser.

import { createClient as createBaseClient } from "@supabase/supabase-js";

export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "createAdminClient: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set",
    );
  }

  return createBaseClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

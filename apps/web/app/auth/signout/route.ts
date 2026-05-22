// apps/web/app/auth/signout/route.ts
//
// POST here to sign the current user out and redirect back to /.
// Used by the SiteHeader's "Sign out" button.

import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  const url = new URL("/", request.url);
  return NextResponse.redirect(url, { status: 303 });
}

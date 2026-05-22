// apps/web/app/api/whoami/route.ts
//
// Diagnostic endpoint. Hit this in the browser AFTER signing in to see
// what the server actually sees:
//   • Whether the Supabase session cookies are present
//   • What supabase.auth.getUser() returns
//   • Which request headers / origin the server received
//
// SAFE to keep deployed — it only echoes the requesting user's own state
// and cookie NAMES (not values). No secrets are leaked.

import { cookies, headers } from "next/headers";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const cookieStore = await cookies();
  const headerStore = await headers();

  const allCookies = cookieStore.getAll();
  const sbCookies = allCookies
    .map((c) => c.name)
    .filter((n) => n.startsWith("sb-") || n === "oauth_next")
    .sort();

  let userId: string | null = null;
  let userEmail: string | null = null;
  let getUserError: string | null = null;

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.getUser();
    if (error) {
      getUserError = error.message;
    } else if (data.user) {
      userId = data.user.id;
      userEmail = data.user.email ?? null;
    }
  } catch (e) {
    getUserError = e instanceof Error ? e.message : String(e);
  }

  return NextResponse.json(
    {
      now: new Date().toISOString(),
      host: headerStore.get("host"),
      origin: headerStore.get("origin"),
      referer: headerStore.get("referer"),
      cookieCount: allCookies.length,
      supabaseCookieNames: sbCookies,
      user: {
        id: userId,
        email: userEmail,
        error: getUserError,
      },
      env: {
        siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? null,
        supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? null,
      },
    },
    { status: 200 },
  );
}

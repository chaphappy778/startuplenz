// apps/web/app/auth/callback/route.ts
//
// Supabase Auth calls this URL after:
//   • Email confirmation link is clicked
//   • Google OAuth redirect completes
//
// It exchanges the one-time `code` for a session cookie, then redirects the
// user to their intended destination.
//
// CRITICAL: In Next 16 Route Handlers, `cookies()` cookieStore writes do NOT
// reliably propagate to a `NextResponse.redirect()` response. We must set the
// session cookies directly on the response we return. Without this, the
// browser never receives the Set-Cookie header from Supabase and subsequent
// page loads look unauthenticated.

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  const cookieStore = await cookies();

  // Resolve the post-OAuth destination. Prefer the URL param; fall back to the
  // `oauth_next` cookie the login page sets before initiating OAuth, since
  // Supabase sometimes drops query strings from the redirectTo URL.
  const rawNext =
    searchParams.get("next") ??
    cookieStore.get("oauth_next")?.value ??
    "/";
  let next: string;
  try {
    next = decodeURIComponent(rawNext);
  } catch {
    next = "/";
  }
  if (!next.startsWith("/") || next.startsWith("//")) next = "/";

  // Pre-construct the redirect response we'll write cookies onto. We do this
  // before the exchange call so the setAll callback can attach Set-Cookie
  // headers to the response the browser will actually receive.
  const response = NextResponse.redirect(`${origin}${next}`);

  // One-shot oauth_next cookie — clear it on the way out.
  if (cookieStore.get("oauth_next")) {
    response.cookies.set("oauth_next", "", { maxAge: 0, path: "/" });
  }

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=no_code`);
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          // Mirror the writes to both:
          //   • cookieStore: so any code reading cookies later in THIS request
          //     (e.g. supabase.auth.getUser() inside this handler) sees them.
          //   • response.cookies: so the BROWSER receives Set-Cookie headers
          //     on the redirect response. Without this, the session never
          //     persists past the OAuth round-trip.
          cookiesToSet.forEach(({ name, value, options }) => {
            try {
              cookieStore.set(name, value, options);
            } catch {
              // cookieStore is read-only in some contexts; ignore.
            }
            response.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error("[auth/callback] exchangeCodeForSession failed:", error.message);
    return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
  }

  return response;
}

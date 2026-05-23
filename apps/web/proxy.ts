// apps/web/middleware.ts
// Runs on every request that matches the config below.
// Responsibilities:
//   1. Refresh the Supabase session cookie (keep JWTs alive)
//   2. Redirect unauthenticated users away from protected routes
//   3. Redirect authenticated users away from auth pages (/login, /signup)

import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Routes that require an authenticated session.
const PROTECTED_PREFIXES = [
  '/dashboard',
  '/account',
  '/settings',
  // Add more protected route prefixes here as the app grows.
]

// Routes that should redirect to /dashboard when the user IS authenticated.
const AUTH_ONLY_PATHS = ['/login', '/signup']

export async function proxy(request: NextRequest) {
  const { pathname: earlyPath, searchParams: earlyParams } = request.nextUrl

  // ── OAuth code rescue ───────────────────────────────────────────────────
  // If Supabase's Redirect URL allow-list rejects our requested callback URL,
  // it falls back to the configured Site URL, which means the OAuth code
  // ends up on (e.g.) `/?code=...` instead of `/auth/callback?code=...`.
  // Forward it through to the callback so the session still gets created.
  // We only do this when the PKCE verifier cookie is present, so legitimate
  // links with an unrelated `code` query param aren't hijacked.
  if (
    earlyParams.has("code") &&
    !earlyPath.startsWith("/auth/callback") &&
    request.cookies
      .getAll()
      .some((c) => c.name.endsWith("-auth-token-code-verifier"))
  ) {
    const url = request.nextUrl.clone()
    url.pathname = "/auth/callback"
    // Preserve the original path as `next` so the user lands where they
    // would have if Supabase had done the right thing.
    if (earlyPath !== "/" && !url.searchParams.has("next")) {
      url.searchParams.set("next", earlyPath)
    }
    return NextResponse.redirect(url)
  }

  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          // Write cookies onto both the outgoing request (so the next
          // middleware / route handler sees them) and the response.
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          )
        },
      },
    },
  )

  // IMPORTANT: Do not add any logic between createServerClient and
  // supabase.auth.getUser().  A subtle bug in the session refresh can
  // randomly log users out if you await something else first.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  // ── Redirect authenticated users away from login/signup ─────────────────
  if (user && AUTH_ONLY_PATHS.some((p) => pathname.startsWith(p))) {
    const url = request.nextUrl.clone()
    // /dashboard doesn't exist. Send signed-in users to a sensible default.
    // If a ?next= was preserved (e.g. ?next=/admin/inputs), honor it.
    const next = request.nextUrl.searchParams.get('next')
    url.pathname = next && next.startsWith('/') ? next : '/'
    url.search = ''
    return NextResponse.redirect(url)
  }

  // ── Redirect unauthenticated users away from protected routes ───────────
  if (!user && PROTECTED_PREFIXES.some((p) => pathname.startsWith(p))) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('next', pathname) // preserve intended destination
    return NextResponse.redirect(url)
  }

  // ── Pass through with refreshed session cookies ──────────────────────────
  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all request paths EXCEPT:
     *  - _next/static  (static files)
     *  - _next/image   (image optimisation)
     *  - favicon.ico
     *  - public assets (png, jpg, svg, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}

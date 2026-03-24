// apps/web/app/auth/callback/route.ts
// Supabase Auth calls this URL after:
//   • Email confirmation link is clicked
//   • Google OAuth redirect completes
// It exchanges the one-time `code` for a session cookie, then
// redirects the user to their intended destination.

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse, type NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    const cookieStore = cookies()

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          },
        },
      },
    )

    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      // Use the `origin` so we never redirect to a different host.
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // If anything goes wrong, send the user to an error page or back to login.
  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`)
}

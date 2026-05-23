// apps/web/app/login/page.tsx
"use client";

import { Suspense, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// Wrap so the inner component's useSearchParams() suspends inside a boundary
//, required by Next 16's prerender step.
export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginPageContent />
    </Suspense>
  );
}

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  // Surface errors propagated via ?error= (e.g. auth_callback_failed from the
  // OAuth callback route) so they don't get silently lost when the page reloads.
  const urlError = searchParams.get("error");
  const [error, setError] = useState<string | null>(
    urlError === "auth_callback_failed"
      ? "Sign-in didn't complete. Check that this site's URL is allowed in Supabase Auth → URL Configuration."
      : urlError
        ? urlError
        : null,
  );
  const [isPending, startTransition] = useTransition();

  function handleEmailLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setError(error.message);
        return;
      }

      router.push(next);
      router.refresh();
    });
  }

  async function handleGoogleLogin() {
    setError(null);
    // Stash the post-OAuth destination in a short-lived cookie. Supabase
    // sometimes drops query strings from the redirectTo URL, so we can't
    // rely on ?next= surviving the round-trip. The /auth/callback route
    // reads this cookie as a fallback.
    document.cookie = `oauth_next=${encodeURIComponent(next)}; max-age=600; path=/; SameSite=Lax`;
    const supabase = createClient();

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });

    if (error) setError(error.message);
  }

  return (
    <main className="auth-page">
      <div className="auth-shell">
        <div className="auth-intro">
          <h1 className="auth-title">Welcome back</h1>
          <p className="auth-sub">Sign in to your StartupLenz account</p>
        </div>

        <div className="auth-card">
          {error && <div className="auth-error">{error}</div>}

          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={isPending}
            className="auth-google-btn"
          >
            <svg viewBox="0 0 24 24" className="auth-google-icon" aria-hidden="true">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            <span>Continue with Google</span>
          </button>

          <div className="auth-divider"><span>or</span></div>

          <form onSubmit={handleEmailLogin} className="auth-form">
            <div className="auth-field">
              <label htmlFor="email" className="auth-label">Email</label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="auth-input"
              />
            </div>

            <div className="auth-field">
              <div className="auth-label-row">
                <label htmlFor="password" className="auth-label">Password</label>
                <Link href="/forgot-password" className="auth-link auth-link-small">
                  Forgot password?
                </Link>
              </div>
              <input
                id="password"
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="auth-input"
              />
            </div>

            <button type="submit" disabled={isPending} className="auth-submit">
              {isPending ? "Signing in…" : "Sign in"}
            </button>
          </form>
        </div>

        <p className="auth-footer-text">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="auth-link">Sign up free</Link>
        </p>
      </div>
    </main>
  );
}

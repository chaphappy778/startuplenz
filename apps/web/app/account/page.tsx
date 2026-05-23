// apps/web/app/account/page.tsx
//
// User account / settings page. Shows the signed-in user's profile pulled
// from the `users` table (mirror of auth.users) and the tier from
// `user_subscriptions`. Lets the user update their display name and sign out.

import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getUser, getUserTier } from "@/lib/auth";
import AccountForm from "@/components/AccountForm";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Account, StartupLenz",
  description: "Manage your StartupLenz account, profile, and subscription.",
};

interface UserRow {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function tierLabel(name: string): string {
  if (!name) return "Free";
  return name.charAt(0).toUpperCase() + name.slice(1);
}

function initials(email: string | undefined, name: string | null | undefined): string {
  if (name) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return parts[0].slice(0, 2).toUpperCase();
  }
  return (email ?? "??").slice(0, 2).toUpperCase();
}

export default async function AccountPage() {
  const authUser = await getUser();
  if (!authUser) redirect("/login?next=/account");

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("users")
    .select("id, email, full_name, avatar_url, created_at")
    .eq("auth_user_id", authUser.id)
    .maybeSingle<UserRow>();

  if (error) {
    console.error("[account] load failed:", error);
  }

  const profile: UserRow = data ?? {
    id: authUser.id,
    email: authUser.email ?? "",
    full_name: (authUser.user_metadata?.full_name as string | null) ?? null,
    avatar_url: (authUser.user_metadata?.avatar_url as string | null) ?? null,
    created_at: authUser.created_at,
  };

  const tier = await getUserTier();

  return (
    <main className="account-page">
      <div className="account-shell">
        <header className="account-header">
          <h1 className="account-title">Account</h1>
          <p className="account-sub">Manage your profile and subscription.</p>
        </header>

        <section className="account-card">
          <div className="account-identity">
            {profile.avatar_url ? (
              // Allowing img here, avatars are remote (Google) and we don't
              // want next/image's domain whitelist overhead for a single use.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profile.avatar_url}
                alt=""
                className="account-avatar"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="account-avatar account-avatar-fallback">
                {initials(profile.email, profile.full_name)}
              </div>
            )}
            <div className="account-identity-text">
              <span className="account-name">
                {profile.full_name || profile.email.split("@")[0] || "Account"}
              </span>
              <span className="account-email">{profile.email}</span>
            </div>
          </div>

          <AccountForm
            initialName={profile.full_name ?? ""}
            email={profile.email}
          />
        </section>

        <section className="account-card">
          <h2 className="account-section-title">Subscription</h2>
          <div className="account-row">
            <span className="account-row-label">Current plan</span>
            <span className="account-row-value">
              <span className={`account-tier-pill account-tier-${tier.tierName}`}>
                {tierLabel(tier.tierName)}
              </span>
            </span>
          </div>
          {tier.maxVerticals != null && (
            <div className="account-row">
              <span className="account-row-label">Verticals included</span>
              <span className="account-row-value">{tier.maxVerticals}</span>
            </div>
          )}
          <div className="account-row">
            <span className="account-row-label">Member since</span>
            <span className="account-row-value">{formatDate(profile.created_at)}</span>
          </div>
          <div className="account-actions">
            <Link href="/plans" className="account-action-link">My saved plans →</Link>
          </div>
        </section>

        <section className="account-card account-card-quiet">
          <h2 className="account-section-title">Session</h2>
          <p className="account-help-text">
            Signing out clears your session on this device. You can sign back in
            anytime with Google or your email.
          </p>
          <form action="/auth/signout" method="post">
            <button type="submit" className="account-signout-btn">Sign out</button>
          </form>
        </section>
      </div>
    </main>
  );
}

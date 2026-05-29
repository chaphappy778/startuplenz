// apps/web/app/login/layout.tsx
//
// Login is a client component, so its metadata has to live in a server-
// component layout. We only need this layout to attach the noindex robots
// directive — auth pages have no SEO value and don't belong in the index.

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign in, StartupLenz",
  robots: { index: false, follow: false },
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}

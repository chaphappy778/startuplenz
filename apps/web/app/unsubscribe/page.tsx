// apps/web/app/unsubscribe/page.tsx
//
// Public unsubscribe page. Token in ?t= is verified server-side;
// confirm button calls a server action that marks the email as
// unsubscribed across every email_subscribers row for that address.

import Link from "next/link";
import { verifyUnsubscribeToken } from "@/lib/unsubscribeToken";
import { unsubscribeAction } from "@/lib/actions/unsubscribe";

interface PageProps {
  searchParams: Promise<{ t?: string; done?: string }>;
}

export const dynamic = "force-dynamic";

export default async function UnsubscribePage({ searchParams }: PageProps) {
  const { t, done } = await searchParams;

  if (done === "1") {
    return (
      <main className="unsubscribe-page">
        <div className="unsubscribe-card">
          <h1>You&rsquo;re unsubscribed</h1>
          <p>
            We won&rsquo;t email you again. If this was a mistake, sign up for
            anything on <Link href="/">startuplenz.com</Link> and you&rsquo;ll
            be opted back in.
          </p>
        </div>
      </main>
    );
  }

  const verified = t ? verifyUnsubscribeToken(t) : null;

  if (!verified) {
    return (
      <main className="unsubscribe-page">
        <div className="unsubscribe-card">
          <h1>Link expired or invalid</h1>
          <p>
            We couldn&rsquo;t verify this unsubscribe link. If you keep getting
            our emails, reply to one of them and we&rsquo;ll remove you
            manually.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="unsubscribe-page">
      <div className="unsubscribe-card">
        <h1>Unsubscribe?</h1>
        <p>
          You&rsquo;ll stop receiving StartupLenz emails sent to{" "}
          <strong>{verified.email}</strong>.
        </p>
        <form action={unsubscribeAction}>
          <input type="hidden" name="token" value={t} />
          <button type="submit" className="unsubscribe-confirm-btn">
            Unsubscribe me
          </button>
        </form>
        <p className="unsubscribe-secondary">
          Changed your mind? <Link href="/">Take me back to StartupLenz</Link>.
        </p>
      </div>
    </main>
  );
}

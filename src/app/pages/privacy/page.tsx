import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Privacy policy" };

export default function PagesPrivacyPage() {
  return (
    <article className="mx-auto max-w-2xl space-y-6">
      <nav className="text-sm text-[var(--brand-muted)]">
        <Link href="/">Home</Link> / Privacy
      </nav>
      <h1 className="font-display text-3xl text-[var(--brand-ink)]">Privacy policy</h1>
      <div className="space-y-4 text-sm text-[var(--brand-muted)]">
        <p>
          We use the information you provide at checkout and in your account to fulfil orders, send updates,
          and improve our service.
        </p>
        <p>
          When you sign in, we may set a first-party session cookie to keep you logged in. It is not used for
          advertising.
        </p>
        <p>
          For the previous standalone privacy page, see{" "}
          <Link href="/privacy" className="text-[var(--brand-amber)] hover:underline">
            /privacy
          </Link>
          .
        </p>
      </div>
    </article>
  );
}

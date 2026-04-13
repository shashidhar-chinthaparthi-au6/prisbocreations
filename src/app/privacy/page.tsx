import Link from "next/link";

export const metadata = { title: "Privacy & cookies" };

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <p className="text-sm text-accent">
        <Link href="/categories">Shop</Link> / Privacy
      </p>
      <h1 className="font-display text-3xl text-ink">Privacy &amp; cookies</h1>
      <div className="space-y-4 text-sm text-ink-muted">
        <section className="rounded-2xl border border-sand-deep bg-white p-6 shadow-sm">
          <h2 className="font-display text-lg text-ink">Essential cookies</h2>
          <p className="mt-2">
            When you sign in, we set a first-party cookie named{" "}
            <code className="rounded bg-sand px-1.5 py-0.5 text-ink">prisbo_session</code> (HTTP-only,
            secure in production). It keeps you logged in for a limited time (configurable via{" "}
            <code className="rounded bg-sand px-1.5 py-0.5 text-ink">SESSION_MAX_AGE_SECONDS</code> in
            your server environment). It is not used for advertising.
          </p>
        </section>
        <section className="rounded-2xl border border-sand-deep bg-white p-6 shadow-sm">
          <h2 className="font-display text-lg text-ink">Your data</h2>
          <p className="mt-2">
            We use the information you provide at checkout and in your account to fulfil orders and
            communicate about them. Expand this page with your full privacy policy when you engage a
            lawyer or use a policy generator for your jurisdiction.
          </p>
        </section>
      </div>
    </div>
  );
}

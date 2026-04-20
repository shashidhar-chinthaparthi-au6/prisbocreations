"use client";

import { useState } from "react";

export function HomeNewsletter() {
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const r = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const j = (await r.json()) as { ok?: boolean };
      if (j.ok) {
        setMsg("You’re subscribed. Thank you!");
        setEmail("");
      } else {
        setMsg("Could not subscribe. Try again.");
      }
    } catch {
      setMsg("Could not subscribe. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-2xl bg-[var(--brand-amber-light)] px-6 py-12 sm:px-10">
      <div className="mx-auto max-w-xl text-center">
        <h2 className="font-display text-2xl text-[var(--brand-ink)] sm:text-3xl">Stay in the loop</h2>
        <p className="mt-2 text-sm text-[var(--brand-muted)] sm:text-base">
          New designs, limited drops, and gifting inspiration — straight to your inbox.
        </p>
        <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-3 sm:flex-row">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="min-h-12 flex-1 rounded-lg border border-[var(--brand-border)] bg-white px-4 text-[var(--brand-ink)] outline-none focus:ring-2 focus:ring-[var(--brand-amber)]"
          />
          <button type="submit" disabled={busy} className="btn-primary min-h-12 px-8">
            {busy ? "…" : "Subscribe"}
          </button>
        </form>
        {msg ? <p className="mt-3 text-sm font-medium text-[var(--brand-success)]">{msg}</p> : null}
        <p className="mt-3 text-xs text-[var(--brand-muted)]">No spam. Unsubscribe any time.</p>
      </div>
    </section>
  );
}

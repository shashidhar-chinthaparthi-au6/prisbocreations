"use client";

import { useState } from "react";
import Link from "next/link";

export function GuestVerifyStep({
  productId,
  onVerified,
}: {
  productId: string;
  onVerified: (guestEmail: string, guestName: string | null) => void;
}) {
  const [email, setEmail] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      const r = await fetch("/api/reviews/verify-guest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), productId }),
      });
      const j = (await r.json()) as {
        ok?: boolean;
        data?: { eligible: boolean; guestName: string | null };
        error?: string;
      };
      if (!j.ok || !j.data?.eligible) {
        setErr(j.error ?? "No delivered order found for this email.");
        return;
      }
      onVerified(email.trim().toLowerCase(), j.data.guestName);
    } catch {
      setErr("Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-display text-lg text-[var(--brand-ink)]">Verify your purchase</h3>
        <p className="mt-1 text-sm text-[var(--brand-muted)]">
          Enter the email address you used when ordering to submit a verified review.
        </p>
      </div>
      <form onSubmit={verify} className="space-y-3">
        <label className="block text-sm font-medium text-[var(--brand-ink)]">
          Email address
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-lg border border-[var(--brand-border)] px-3 py-2 text-sm"
          />
        </label>
        {err ? <p className="text-sm text-red-700">{err}</p> : null}
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={loading}
            className="btn-primary min-h-10 px-5 text-sm"
          >
            {loading ? "Checking…" : "Verify →"}
          </button>
          <span className="text-sm text-[var(--brand-muted)]">Or</span>
          <Link href="/login" className="text-sm font-medium text-[var(--brand-amber)] hover:underline">
            Sign in
          </Link>
        </div>
      </form>
    </div>
  );
}

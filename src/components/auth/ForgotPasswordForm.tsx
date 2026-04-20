"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Spinner } from "@/components/ui/Spinner";
import { AuthErrorBanner } from "@/components/auth/AuthErrorBanner";
import { forgotSchema } from "@/lib/auth/auth-schemas";

function EnvelopeIcon() {
  return (
    <svg width="56" height="56" viewBox="0 0 64 64" fill="none" aria-hidden className="mx-auto text-[#C47A2B]">
      <rect x="8" y="16" width="48" height="36" rx="4" stroke="currentColor" strokeWidth="2" />
      <path d="M8 22 32 38 56 22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [sentTo, setSentTo] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = window.setTimeout(() => setCooldown((c) => (c <= 1 ? 0 : c - 1)), 1000);
    return () => window.clearTimeout(id);
  }, [cooldown]);

  async function submit(emailToSend: string) {
    setErr(null);
    const parsed = forgotSchema.safeParse({ email: emailToSend.trim() });
    if (!parsed.success) {
      setErr(parsed.error.flatten().fieldErrors.email?.[0] ?? "Enter a valid email address");
      return;
    }
    setBusy(true);
    try {
      const r = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: parsed.data.email }),
      });
      const j = (await r.json()) as { ok?: boolean; data?: { accountFound?: boolean } };
      if (!r.ok || !j.ok) {
        setErr("Something went wrong. Please try again.");
        return;
      }
      const found = j.data?.accountFound !== false;
      if (!found) {
        setErr("No account found with this email address.");
        return;
      }
      setSentTo(parsed.data.email);
      setDone(true);
      setCooldown(60);
    } catch {
      setErr("Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    await submit(email);
  }

  function onResend() {
    if (cooldown > 0 || !sentTo) return;
    void submit(sentTo);
  }

  if (done) {
    return (
      <div className="space-y-5 text-center">
        <EnvelopeIcon />
        <div>
          <h2 className="font-display text-xl text-[#1A1A1A]">Check your inbox</h2>
          <p className="mt-2 text-sm text-[#6B6560]">
            We&apos;ve sent a reset link to {sentTo}. It expires in 1 hour.
          </p>
        </div>
        <p className="text-sm text-[#6B6560]">Didn&apos;t receive it?</p>
        <button
          type="button"
          disabled={cooldown > 0}
          onClick={onResend}
          className="w-full rounded-full border border-[#E8E0D6] bg-white py-3 text-sm font-medium text-[#1A1A1A] hover:bg-[#F5E6D0] disabled:opacity-50"
        >
          {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend email"}
        </button>
        <Link
          href="/login"
          className="inline-flex w-full items-center justify-center rounded-full py-3 text-sm font-medium text-[#6B6560] hover:text-[#1A1A1A]"
        >
          ← Back to login
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div>
        <h1 className="font-display text-2xl text-[#1A1A1A]">Reset your password</h1>
        <p className="mt-1 text-sm text-[#6B6560]">
          Enter your email and we&apos;ll send you a link to reset your password.
        </p>
      </div>
      <label className="block text-sm font-medium text-[#1A1A1A]">
        <span className="mb-1.5 block">Email address *</span>
        <input
          type="email"
          autoComplete="email"
          autoFocus
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-xl border border-[#E8E0D6] bg-white px-3 py-3 text-base outline-none focus:border-[#C47A2B] focus:ring-2 focus:ring-[#C47A2B]/30"
        />
      </label>
      {err ? <AuthErrorBanner>{err}</AuthErrorBanner> : null}
      <button
        type="submit"
        disabled={busy}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#C47A2B] text-sm font-semibold text-white hover:bg-[#9A5E1E] disabled:opacity-60"
      >
        {busy ? (
          <>
            <Spinner size="sm" className="text-white" />
            Sending…
          </>
        ) : (
          "Send reset link"
        )}
      </button>
    </form>
  );
}

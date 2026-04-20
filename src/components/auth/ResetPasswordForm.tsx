"use client";

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Spinner } from "@/components/ui/Spinner";
import { PasswordInput } from "@/components/auth/PasswordInput";
import { PasswordStrength } from "@/components/auth/PasswordStrength";
import { AuthErrorBanner } from "@/components/auth/AuthErrorBanner";
import { resetSchema } from "@/lib/auth/auth-schemas";

function CheckIcon() {
  return (
    <svg width="56" height="56" viewBox="0 0 64 64" fill="none" aria-hidden className="mx-auto text-[#2D7A4E]">
      <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="2" />
      <path d="M20 33l8 8 16-16" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ResetPasswordFormInner() {
  const sp = useSearchParams();
  const token = sp.get("token") ?? "";
  const email = sp.get("email") ?? "";

  const [checking, setChecking] = useState(true);
  const [tokenOk, setTokenOk] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!token || !email) {
        setChecking(false);
        setTokenOk(false);
        return;
      }
      try {
        const r = await fetch(
          `/api/auth/validate-reset-token?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`,
        );
        const j = (await r.json()) as { ok?: boolean; data?: { valid?: boolean } };
        if (!cancelled) {
          setTokenOk(Boolean(j.data?.valid));
        }
      } catch {
        if (!cancelled) setTokenOk(false);
      } finally {
        if (!cancelled) setChecking(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, email]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    const parsed = resetSchema.safeParse({ password, confirmPassword });
    if (!parsed.success) {
      const flat = parsed.error.flatten().fieldErrors;
      setErr(flat.password?.[0] ?? flat.confirmPassword?.[0] ?? "Check your password.");
      return;
    }
    setBusy(true);
    try {
      const r = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          email,
          newPassword: parsed.data.password,
        }),
      });
      const j = (await r.json()) as { ok?: boolean; error?: string };
      if (!r.ok) {
        setErr(j.error ?? "Could not update password.");
        return;
      }
      setSuccess(true);
    } catch {
      setErr("Could not update password.");
    } finally {
      setBusy(false);
    }
  }

  if (checking) {
    return (
      <p className="flex items-center justify-center gap-2 py-8 text-sm text-[#6B6560]">
        <Spinner size="sm" /> Verifying link…
      </p>
    );
  }

  if (!token || !email || !tokenOk) {
    return (
      <div className="space-y-4">
        <AuthErrorBanner>
          This reset link has expired or is invalid. Reset links are only valid for 1 hour.
        </AuthErrorBanner>
        <Link
          href="/forgot-password"
          className="flex h-12 w-full items-center justify-center rounded-full bg-[#C47A2B] text-sm font-semibold text-white hover:bg-[#9A5E1E]"
        >
          Request a new reset link
        </Link>
      </div>
    );
  }

  if (success) {
    return (
      <div className="space-y-5 text-center">
        <CheckIcon />
        <div>
          <h2 className="font-display text-xl text-[#1A1A1A]">Password updated!</h2>
          <p className="mt-2 text-sm text-[#6B6560]">Your password has been changed successfully.</p>
        </div>
        <Link
          href="/login?reset=1"
          className="flex h-12 w-full items-center justify-center rounded-full bg-[#C47A2B] text-sm font-semibold text-white hover:bg-[#9A5E1E]"
        >
          Sign in to your account →
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div>
        <h1 className="font-display text-2xl text-[#1A1A1A]">Set a new password</h1>
        <p className="mt-1 text-sm text-[#6B6560]">Choose a strong password for your account.</p>
      </div>
      <div className="space-y-2">
        <PasswordInput
          label="New password *"
          value={password}
          onChange={setPassword}
          placeholder="At least 8 characters"
          autoComplete="new-password"
          required
          disabled={busy}
        />
        <PasswordStrength password={password} />
      </div>
      <PasswordInput
        label="Confirm new password *"
        value={confirmPassword}
        onChange={setConfirmPassword}
        placeholder="Repeat your password"
        autoComplete="new-password"
        required
        disabled={busy}
      />
      {err ? <AuthErrorBanner>{err}</AuthErrorBanner> : null}
      <button
        type="submit"
        disabled={busy}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#C47A2B] text-sm font-semibold text-white hover:bg-[#9A5E1E] disabled:opacity-60"
      >
        {busy ? (
          <>
            <Spinner size="sm" className="text-white" />
            Updating…
          </>
        ) : (
          "Update password"
        )}
      </button>
    </form>
  );
}

export function ResetPasswordForm() {
  return (
    <Suspense
      fallback={
        <p className="flex items-center gap-2 py-8 text-sm text-[#6B6560]">
          <Spinner size="sm" /> Loading…
        </p>
      }
    >
      <ResetPasswordFormInner />
    </Suspense>
  );
}

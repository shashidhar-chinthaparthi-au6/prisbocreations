"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { Spinner } from "@/components/ui/Spinner";
import { PasswordInput } from "@/components/auth/PasswordInput";
import { AuthErrorBanner } from "@/components/auth/AuthErrorBanner";
import { mergeGuestCartAfterSignIn } from "@/lib/auth/post-signin-cart";
import { mergeWishlistAfterSignIn } from "@/lib/auth/sync-wishlist-after-login";
import { useWishlistStore } from "@/lib/store/wishlist-store";
import { loginSchema, safeRedirectPath } from "@/lib/auth/auth-schemas";

export function LoginForm({ redirectTo }: { redirectTo?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const qpRedirect = searchParams.get("redirect") ?? undefined;
  const nextAfterLogin = safeRedirectPath(redirectTo ?? qpRedirect, "/account/orders");
  const passwordResetOk = searchParams.get("reset") === "1";
  const sessionExpired = searchParams.get("reason") === "session_expired";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function clearErrOnChange() {
    if (err) setErr(null);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    const parsed = loginSchema.safeParse({ email: email.trim(), password });
    if (!parsed.success) {
      setErr(parsed.error.flatten().fieldErrors.email?.[0] ?? "Check your email and password.");
      return;
    }
    setLoading(true);
    const wishSnapshot = useWishlistStore.getState().ids.slice();
    useWishlistStore.setState({ mergeInProgress: true });
    try {
      const res = await signIn("credentials", {
        email: parsed.data.email,
        password: parsed.data.password,
        redirect: false,
      });
      if (res?.error) {
        setErr("Incorrect email or password. Please try again.");
        return;
      }
      await mergeWishlistAfterSignIn(wishSnapshot);
      await mergeGuestCartAfterSignIn();
      router.push(nextAfterLogin);
      router.refresh();
    } catch {
      setErr("Incorrect email or password. Please try again.");
    } finally {
      useWishlistStore.setState({ mergeInProgress: false });
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div>
        <h1 className="font-display text-[26px] leading-tight text-[#1A1A1A]">Welcome back</h1>
        <p className="mt-1 text-sm text-[#6B6560]">Sign in to your account</p>
      </div>

      {sessionExpired ? (
        <p className="rounded-lg border border-amber-200/90 bg-amber-50 px-3.5 py-2.5 text-[13px] text-amber-950">
          Your session ended; please sign in again.
        </p>
      ) : null}
      {passwordResetOk ? (
        <p className="rounded-lg border border-emerald-200/90 bg-emerald-50 px-3.5 py-2.5 text-[13px] text-emerald-900">
          Your password was updated. Sign in with your new password.
        </p>
      ) : null}

      <label className="block text-sm font-medium text-[#1A1A1A]">
        <span className="mb-1.5 block">Email address *</span>
        <input
          type="email"
          autoComplete="email"
          autoFocus
          required
          placeholder="you@example.com"
          value={email}
          onChange={(e) => {
            clearErrOnChange();
            setEmail(e.target.value);
          }}
          className="w-full rounded-xl border border-[#E8E0D6] bg-white px-3 py-3 text-base text-[#1A1A1A] outline-none ring-[#C47A2B]/30 placeholder:text-[#A8A29E] focus:border-[#C47A2B] focus:ring-2"
        />
      </label>

      <div className="space-y-1">
        <PasswordInput
          label="Password *"
          value={password}
          onChange={(v) => {
            clearErrOnChange();
            setPassword(v);
          }}
          placeholder="Your password"
          autoComplete="current-password"
          required
          disabled={loading}
          onKeyDown={clearErrOnChange}
        />
        <div className="flex justify-end pt-0.5">
          <Link href="/forgot-password" className="text-[13px] font-medium text-[#C47A2B] hover:underline">
            Forgot password?
          </Link>
        </div>
      </div>

      {err ? <AuthErrorBanner>{err}</AuthErrorBanner> : null}

      <button
        type="submit"
        disabled={loading}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#C47A2B] text-sm font-semibold text-white shadow-sm hover:bg-[#9A5E1E] disabled:opacity-60"
      >
        {loading ? (
          <>
            <Spinner size="sm" className="text-white" />
            Signing in…
          </>
        ) : (
          "Sign in"
        )}
      </button>

      <div className="relative py-2">
        <div className="absolute inset-0 flex items-center" aria-hidden>
          <span className="w-full border-t border-[#E8E0D6]" />
        </div>
        <div className="relative flex justify-center text-xs text-[#6B6560]">
          <span className="bg-white px-3">or</span>
        </div>
      </div>

      <p className="text-center text-sm text-[#6B6560]">Don&apos;t have an account?</p>
      <Link
        href={
          redirectTo
            ? `/register?redirect=${encodeURIComponent(redirectTo)}`
            : "/register"
        }
        className="flex h-12 w-full items-center justify-center rounded-full border-[1.5px] border-[#C47A2B] bg-transparent text-sm font-semibold text-[#C47A2B] hover:bg-[#F5E6D0]"
      >
        Create account →
      </Link>
    </form>
  );
}

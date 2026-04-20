"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { Spinner } from "@/components/ui/Spinner";
import { PasswordInput } from "@/components/auth/PasswordInput";
import { PasswordStrength } from "@/components/auth/PasswordStrength";
import { mergeGuestCartAfterSignIn } from "@/lib/auth/post-signin-cart";
import { mergeWishlistAfterSignIn } from "@/lib/auth/sync-wishlist-after-login";
import { useWishlistStore } from "@/lib/store/wishlist-store";
import { registerSchema, safeRedirectPath } from "@/lib/auth/auth-schemas";
import { firstNameFromFullName } from "@/lib/auth/display-name";
import { dispatchStoreToast } from "@/components/store/StoreToaster";

export function RegisterForm({ redirectTo }: { redirectTo?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const qpRedirect = searchParams.get("redirect") ?? undefined;
  const qpEmail = searchParams.get("email")?.trim() ?? "";
  const dest = safeRedirectPath(redirectTo ?? qpRedirect, "/account/orders");

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fieldErr, setFieldErr] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (qpEmail) setEmail(qpEmail);
  }, [qpEmail]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFieldErr({});
    const parsed = registerSchema.safeParse({
      fullName: fullName.trim(),
      email: email.trim(),
      phone: phone.trim() || undefined,
      password,
      confirmPassword,
    });
    if (!parsed.success) {
      const flat = parsed.error.flatten().fieldErrors;
      const next: Record<string, string> = {};
      if (flat.fullName?.[0]) next.fullName = flat.fullName[0];
      if (flat.email?.[0]) next.email = flat.email[0];
      if (flat.phone?.[0]) next.phone = flat.phone[0];
      if (flat.password?.[0]) next.password = flat.password[0];
      if (flat.confirmPassword?.[0]) next.confirmPassword = flat.confirmPassword[0];
      setFieldErr(next);
      return;
    }

    setLoading(true);
    const wishSnapshot = useWishlistStore.getState().ids.slice();
    useWishlistStore.setState({ mergeInProgress: true });
    try {
      const r = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: parsed.data.fullName,
          email: parsed.data.email,
          password: parsed.data.password,
          phone: parsed.data.phone,
        }),
      });
      const j = (await r.json()) as { ok?: boolean; error?: string };
      if (!r.ok) {
        if (r.status === 409) {
          setFieldErr({ email: "An account with this email already exists" });
          return;
        }
        setFieldErr({ email: j.error ?? "Registration failed" });
        return;
      }

      const sign = await signIn("credentials", {
        email: parsed.data.email,
        password: parsed.data.password,
        redirect: false,
      });
      if (sign?.error) {
        setFieldErr({ email: "Account created but sign-in failed. Try logging in." });
        return;
      }

      await mergeWishlistAfterSignIn(wishSnapshot);
      await mergeGuestCartAfterSignIn();
      const first = firstNameFromFullName(parsed.data.fullName);
      dispatchStoreToast(`Welcome to Prisbo Creations, ${first}! Your account is ready.`);
      router.push(dest);
      router.refresh();
    } catch {
      setFieldErr({ email: "Something went wrong. Please try again." });
    } finally {
      useWishlistStore.setState({ mergeInProgress: false });
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <h1 className="font-display text-[26px] leading-tight text-[#1A1A1A]">Create your account</h1>
        <p className="mt-1 text-sm text-[#6B6560]">
          Join Prisbo Creations for order tracking and a faster checkout.
        </p>
      </div>

      <label className="block text-sm font-medium text-[#1A1A1A]">
        <span className="mb-1.5 block">Full name *</span>
        <input
          autoComplete="name"
          required
          placeholder="Your full name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          className="w-full rounded-xl border border-[#E8E0D6] bg-white px-3 py-3 text-base outline-none placeholder:text-[#A8A29E] focus:border-[#C47A2B] focus:ring-2 focus:ring-[#C47A2B]/30"
        />
        {fieldErr.fullName ? <p className="mt-1 text-xs text-[#A32D2D]">{fieldErr.fullName}</p> : null}
      </label>

      <label className="block text-sm font-medium text-[#1A1A1A]">
        <span className="mb-1.5 block">Email address *</span>
        <input
          type="email"
          autoComplete="email"
          required
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-xl border border-[#E8E0D6] bg-white px-3 py-3 text-base outline-none placeholder:text-[#A8A29E] focus:border-[#C47A2B] focus:ring-2 focus:ring-[#C47A2B]/30"
        />
        {fieldErr.email ? <p className="mt-1 text-xs text-[#A32D2D]">{fieldErr.email}</p> : null}
      </label>

      <label className="block text-sm font-medium text-[#1A1A1A]">
        <span className="mb-1.5 block">Phone number</span>
        <span className="mb-1.5 block text-xs font-normal text-[#6B6560]">Optional — used for order updates</span>
        <input
          type="tel"
          autoComplete="tel"
          placeholder="+91 98765 43210"
          value={phone}
          onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
          className="w-full rounded-xl border border-[#E8E0D6] bg-white px-3 py-3 text-base outline-none placeholder:text-[#A8A29E] focus:border-[#C47A2B] focus:ring-2 focus:ring-[#C47A2B]/30"
        />
        {fieldErr.phone ? <p className="mt-1 text-xs text-[#A32D2D]">{fieldErr.phone}</p> : null}
      </label>

      <div className="space-y-2">
        <PasswordInput
          label="Password *"
          value={password}
          onChange={setPassword}
          placeholder="At least 8 characters"
          autoComplete="new-password"
          required
          disabled={loading}
        />
        <PasswordStrength password={password} />
        {fieldErr.password ? <p className="text-xs text-[#A32D2D]">{fieldErr.password}</p> : null}
      </div>

      <PasswordInput
        label="Confirm password *"
        value={confirmPassword}
        onChange={setConfirmPassword}
        placeholder="Repeat your password"
        autoComplete="new-password"
        required
        disabled={loading}
      />
      {fieldErr.confirmPassword ? (
        <p className="text-xs text-[#A32D2D]">{fieldErr.confirmPassword}</p>
      ) : null}

      <p className="text-[13px] leading-relaxed text-[#6B6560]">
        By creating an account you agree to our{" "}
        <Link href="/pages/terms" target="_blank" rel="noopener noreferrer" className="text-[#C47A2B] hover:underline">
          Terms of Service
        </Link>{" "}
        and{" "}
        <Link href="/pages/privacy" target="_blank" rel="noopener noreferrer" className="text-[#C47A2B] hover:underline">
          Privacy Policy
        </Link>
        .
      </p>

      <button
        type="submit"
        disabled={loading}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#C47A2B] text-sm font-semibold text-white hover:bg-[#9A5E1E] disabled:opacity-60"
      >
        {loading ? (
          <>
            <Spinner size="sm" className="text-white" />
            Creating…
          </>
        ) : (
          "Create account"
        )}
      </button>

      <p className="text-center text-sm text-[#6B6560]">Already have an account?</p>
      <Link
        href={
          dest !== "/account/orders"
            ? `/login?redirect=${encodeURIComponent(dest)}`
            : "/login"
        }
        className="flex h-12 w-full items-center justify-center rounded-full border-[1.5px] border-[#C47A2B] bg-transparent text-sm font-semibold text-[#C47A2B] hover:bg-[#F5E6D0]"
      >
        Sign in →
      </Link>
    </form>
  );
}

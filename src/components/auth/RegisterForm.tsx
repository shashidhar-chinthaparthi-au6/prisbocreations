"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { Spinner } from "@/components/ui/Spinner";
import { PasswordInput } from "@/components/auth/PasswordInput";
import { PasswordStrength } from "@/components/auth/PasswordStrength";
import { AuthErrorBanner } from "@/components/auth/AuthErrorBanner";
import { EmailExistsNote } from "@/components/auth/EmailExistsNote";
import { syncCartAfterLogin } from "@/lib/syncCartAfterLogin";
import { syncAfterLogin } from "@/lib/syncAfterLogin";
import { registerSchema, safeRedirectPath } from "@/lib/auth/auth-schemas";
import { firstNameFromFullName } from "@/lib/auth/display-name";
import { dispatchStoreToast } from "@/components/store/StoreToaster";

type ApiFieldErrors = Record<string, string[] | undefined>;

function firstError(errors: ApiFieldErrors, key: string): string | undefined {
  const v = errors[key];
  return Array.isArray(v) && v[0] ? v[0] : undefined;
}

export function RegisterForm({ redirectTo }: { redirectTo?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const qpRedirect = searchParams.get("redirect") ?? undefined;
  const qpEmail = searchParams.get("email")?.trim() ?? "";
  const qpName = searchParams.get("name")?.trim() ?? "";
  const source = searchParams.get("source")?.trim() ?? "";
  const dest = safeRedirectPath(redirectTo ?? qpRedirect, "/account/orders");
  const signInDest =
    dest !== "/account/orders" ? `/login?redirect=${encodeURIComponent(dest)}` : "/login";

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fieldErr, setFieldErr] = useState<Record<string, string>>({});
  const [pageErr, setPageErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitPhase, setSubmitPhase] = useState<"idle" | "success">("idle");
  const [emailCheckLoading, setEmailCheckLoading] = useState(false);
  const [emailKnownExists, setEmailKnownExists] = useState<boolean | null>(null);

  const emailDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const heading =
    source === "wishlist"
      ? "Save your wishlist permanently"
      : source === "checkout"
        ? "Create account to checkout faster"
        : "Create your account";

  const subheading = "Join us for faster checkout, order tracking, and a saved wishlist.";

  useEffect(() => {
    if (qpEmail) setEmail(qpEmail);
  }, [qpEmail]);

  useEffect(() => {
    if (qpName) setFullName(qpName);
  }, [qpName]);

  const clearField = useCallback((key: string) => {
    setFieldErr((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  const runBlurValidate = useCallback(
    (field: "fullName" | "email" | "phone" | "password" | "confirmPassword") => {
      const parsed = registerSchema.safeParse({
        fullName: fullName.trim(),
        email: email.trim(),
        phone: phone.trim() || undefined,
        password,
        confirmPassword,
      });
      if (!parsed.success) {
        const flat = parsed.error.flatten().fieldErrors;
        const msg = flat[field]?.[0];
        if (msg) setFieldErr((prev) => ({ ...prev, [field]: msg }));
        else clearField(field);
      } else {
        clearField(field);
      }
    },
    [fullName, email, phone, password, confirmPassword, clearField],
  );

  const checkEmailExists = useCallback((raw: string) => {
    if (emailDebounce.current) clearTimeout(emailDebounce.current);
    emailDebounce.current = setTimeout(async () => {
      const em = raw.trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) {
        setEmailKnownExists(null);
        return;
      }
      setEmailCheckLoading(true);
      try {
        const r = await fetch(`/api/auth/check-email?email=${encodeURIComponent(em)}`);
        const j = (await r.json()) as { ok?: boolean; data?: { exists?: boolean } };
        setEmailKnownExists(Boolean(j.data?.exists));
      } catch {
        setEmailKnownExists(null);
      } finally {
        setEmailCheckLoading(false);
      }
    }, 300);
  }, []);

  function onFormInput() {
    setPageErr(null);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPageErr(null);
    setFieldErr({});
    setSubmitPhase("idle");

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
    let successUi = false;
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
      const j = (await r.json()) as {
        ok?: boolean;
        data?: { success?: boolean; fullName?: string };
        error?: string;
        errors?: ApiFieldErrors;
      };

      if (!r.ok) {
        if (r.status === 429) {
          setPageErr(
            j.error ??
              "Too many accounts created from this device. Please try again in an hour.",
          );
          return;
        }
        if (r.status === 422 && j.errors) {
          const next: Record<string, string> = {};
          const fe = j.errors;
          const fk = ["fullName", "email", "phone", "password"] as const;
          for (const k of fk) {
            const msg = firstError(fe, k);
            if (msg) next[k] = msg;
          }
          setFieldErr(next);
          if (Object.keys(next).length === 0) {
            setPageErr("Something went wrong. Please try again.");
          }
          return;
        }
        if (r.status === 409) {
          const msg = firstError(j.errors ?? {}, "email");
          setFieldErr({
            email: msg ?? "An account with this email already exists",
          });
          return;
        }
        setPageErr(j.error ?? "Something went wrong. Please try again.");
        return;
      }

      const registeredName = j.data?.fullName ?? parsed.data.fullName;

      const sign = await signIn("credentials", {
        email: parsed.data.email,
        password: parsed.data.password,
        redirect: false,
      });
      if (sign?.error) {
        setPageErr("Account created but sign-in failed. Please sign in manually.");
        router.push(signInDest);
        return;
      }

      try {
        await syncAfterLogin();
      } catch {
        /* non-blocking */
      }
      try {
        await syncCartAfterLogin();
      } catch {
        /* non-blocking */
      }
      try {
        const cr = await fetch("/api/auth/claim-guest-orders", {
          method: "POST",
          credentials: "include",
        });
        if (cr.ok) {
          const cj = (await cr.json()) as { ok?: boolean; data?: { claimed?: number } };
          const claimed = cj.data?.claimed ?? 0;
          if (claimed > 0) {
            dispatchStoreToast(
              `${claimed} previous order${claimed > 1 ? "s" : ""} linked to your account!`,
            );
          }
        }
      } catch {
        /* non-blocking */
      }

      const first = firstNameFromFullName(registeredName);
      dispatchStoreToast(`Welcome to Prisbo Creations, ${first}!`);

      setSubmitPhase("success");
      successUi = true;
      setLoading(false);
      window.setTimeout(() => {
        router.push(dest);
        router.refresh();
      }, 800);
    } catch {
      setPageErr("Something went wrong. Please try again.");
    } finally {
      if (!successUi) setLoading(false);
    }
  }

  const btnDisabled = loading || submitPhase === "success";
  const btnClass =
    submitPhase === "success"
      ? "bg-[#2D6A4F] hover:bg-[#2D6A4F]"
      : loading
        ? "bg-[#9A5E1E] hover:bg-[#9A5E1E]"
        : "bg-[#C47A2B] hover:bg-[#9A5E1E]";

  return (
    <form onSubmit={onSubmit} onInput={onFormInput} className="space-y-4">
      <div className="text-center">
        <h1 className="font-display text-[26px] leading-tight text-[#1A1A1A]">{heading}</h1>
        <p className="mt-1 text-sm text-[#6B6560]">{subheading}</p>
      </div>

      {pageErr ? (
        <div className="mb-2">
          <AuthErrorBanner message={pageErr} />
        </div>
      ) : null}

      <label className="block text-sm font-medium text-[#1A1A1A]">
        <span className="mb-1.5 block">Full name *</span>
        <input
          autoComplete="name"
          required
          placeholder="Your full name"
          value={fullName}
          onChange={(e) => {
            setFullName(e.target.value);
            clearField("fullName");
          }}
          onBlur={() => runBlurValidate("fullName")}
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
          onChange={(e) => {
            setEmail(e.target.value);
            clearField("email");
            setEmailKnownExists(null);
          }}
          onBlur={(e) => {
            runBlurValidate("email");
            checkEmailExists(e.target.value);
          }}
          className="w-full rounded-xl border border-[#E8E0D6] bg-white px-3 py-3 text-base outline-none placeholder:text-[#A8A29E] focus:border-[#C47A2B] focus:ring-2 focus:ring-[#C47A2B]/30"
        />
        {emailCheckLoading ? (
          <p className="mt-1 text-xs text-[#6B6560]">Checking…</p>
        ) : null}
        {emailKnownExists === true && !fieldErr.email ? (
          <EmailExistsNote signInHref={signInDest} />
        ) : null}
        {fieldErr.email ? <p className="mt-1 text-xs text-[#A32D2D]">{fieldErr.email}</p> : null}
      </label>

      <label className="block text-sm font-medium text-[#1A1A1A]">
        <span className="mb-1.5 block">Phone number</span>
        <span className="mb-1.5 block text-xs font-normal text-[#6B6560]">
          For order dispatch and delivery SMS updates
        </span>
        <input
          type="tel"
          autoComplete="tel"
          placeholder="+91 98765 43210"
          value={phone}
          onChange={(e) => {
            setPhone(e.target.value.replace(/\D/g, "").slice(0, 10));
            clearField("phone");
          }}
          onBlur={() => runBlurValidate("phone")}
          className="w-full rounded-xl border border-[#E8E0D6] bg-white px-3 py-3 text-base outline-none placeholder:text-[#A8A29E] focus:border-[#C47A2B] focus:ring-2 focus:ring-[#C47A2B]/30"
        />
        {fieldErr.phone ? <p className="mt-1 text-xs text-[#A32D2D]">{fieldErr.phone}</p> : null}
      </label>

      <div className="space-y-2">
        <PasswordInput
          label="Password *"
          value={password}
          onChange={(v) => {
            setPassword(v);
            clearField("password");
          }}
          placeholder="At least 8 characters"
          autoComplete="new-password"
          required
          disabled={btnDisabled}
        />
        <PasswordStrength password={password} />
        {fieldErr.password ? <p className="text-xs text-[#A32D2D]">{fieldErr.password}</p> : null}
      </div>

      <PasswordInput
        label="Confirm password *"
        value={confirmPassword}
        onChange={(v) => {
          setConfirmPassword(v);
          clearField("confirmPassword");
        }}
        placeholder="Type your password again"
        autoComplete="new-password"
        required
        disabled={btnDisabled}
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
        disabled={btnDisabled}
        className={`flex h-12 w-full items-center justify-center gap-2 rounded-full text-sm font-semibold text-white transition-colors disabled:opacity-90 ${btnClass}`}
      >
        {submitPhase === "success" ? (
          "✓ Account created!"
        ) : loading ? (
          <>
            <Spinner size="sm" className="text-white" />
            Creating account…
          </>
        ) : (
          "Create account →"
        )}
      </button>

      <p className="text-center text-sm text-[#6B6560]">Already have an account?</p>
      <Link
        href={signInDest}
        className="flex h-12 w-full items-center justify-center rounded-full border-[1.5px] border-[#C47A2B] bg-transparent text-sm font-semibold text-[#C47A2B] hover:bg-[#F5E6D0]"
      >
        Sign in →
      </Link>
    </form>
  );
}

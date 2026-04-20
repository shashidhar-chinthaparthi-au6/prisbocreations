"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { apiFetch } from "@/lib/api/fetch-client";
import { Spinner } from "@/components/ui/Spinner";
import { PasswordInput } from "@/components/auth/PasswordInput";

/** Admin storefront login: JWT cookie (`prisbo_session`). Do not use for customer accounts. */
export function AdminJwtLoginForm({ nextPath }: { nextPath: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionExpired = searchParams.get("reason") === "session_expired";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      const data = await apiFetch<{ user: { role: string } }>("/api/v1/auth/login", {
        method: "POST",
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const dest =
        data.user.role === "admin"
          ? nextPath.startsWith("/admin")
            ? nextPath
            : "/admin"
          : "/account/profile?denied=admin";
      router.push(dest);
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-md space-y-6 rounded-2xl border border-[#E8E0D6] bg-white px-6 py-8 shadow-sm sm:px-10">
      <div>
        <h1 className="font-display text-2xl text-[#1A1A1A]">Admin sign in</h1>
        <p className="mt-1 text-sm text-[#6B6560]">Use your admin credentials to open the dashboard.</p>
      </div>
      {sessionExpired ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
          Your session ended; please sign in again.
        </p>
      ) : null}
      <form onSubmit={onSubmit} className="space-y-4">
        <label className="block text-sm font-medium text-[#1A1A1A]">
          <span className="mb-1.5 block">Email</span>
          <input
            type="email"
            autoComplete="username"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-xl border border-[#E8E0D6] px-3 py-3 text-base outline-none focus:border-[#C47A2B] focus:ring-2 focus:ring-[#C47A2B]/30"
          />
        </label>
        <PasswordInput
          label="Password"
          value={password}
          onChange={setPassword}
          autoComplete="current-password"
          required
          disabled={loading}
        />
        {err ? <p className="text-sm text-red-700">{err}</p> : null}
        <button
          type="submit"
          disabled={loading}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#1A1A1A] text-sm font-semibold text-white hover:bg-[#333] disabled:opacity-60"
        >
          {loading ? (
            <>
              <Spinner size="sm" className="text-white" />
              Signing in…
            </>
          ) : (
            "Sign in to admin"
          )}
        </button>
      </form>
      <p className="text-center text-sm text-[#6B6560]">
        <Link href="/login" className="text-[#C47A2B] hover:underline">
          Customer sign in
        </Link>
      </p>
    </div>
  );
}

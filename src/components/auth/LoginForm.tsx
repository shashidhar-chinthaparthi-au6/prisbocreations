"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api/fetch-client";
import { Spinner } from "@/components/ui/Spinner";

export function LoginForm({ nextPath }: { nextPath: string }) {
  const router = useRouter();
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
        body: JSON.stringify({ email, password }),
      });
      const isDefaultCustomerLanding =
        nextPath === "/account" || nextPath === "/" || nextPath === "";
      const dest =
        data.user.role === "admin" && isDefaultCustomerLanding ? "/admin" : nextPath;
      router.push(dest);
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <label className="block text-sm">
        <span className="text-ink-muted">Email</span>
        <input
          type="email"
          required
          className="mt-1 w-full rounded-lg border border-sand-deep px-3 py-2"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </label>
      <label className="block text-sm">
        <span className="text-ink-muted">Password</span>
        <input
          type="password"
          required
          className="mt-1 w-full rounded-lg border border-sand-deep px-3 py-2"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </label>
      {err ? <p className="text-sm text-rose">{err}</p> : null}
      <button
        type="submit"
        disabled={loading}
        className="flex w-full items-center justify-center gap-2 rounded-full bg-ink py-3 text-sm font-semibold text-white hover:bg-ink/90 disabled:opacity-60"
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
    </form>
  );
}

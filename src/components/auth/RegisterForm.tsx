"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api/fetch-client";
import { Spinner } from "@/components/ui/Spinner";

export function RegisterForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      await apiFetch("/api/v1/auth/register", {
        method: "POST",
        body: JSON.stringify({ name, email, password, phone: phone || undefined }),
      });
      router.push("/account");
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <label className="block text-sm">
        <span className="text-ink-muted">Name</span>
        <input
          required
          className="mt-1 w-full rounded-lg border border-sand-deep px-3 py-2"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </label>
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
        <span className="text-ink-muted">Phone (optional)</span>
        <input
          className="mt-1 w-full rounded-lg border border-sand-deep px-3 py-2"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
      </label>
      <label className="block text-sm">
        <span className="text-ink-muted">Password (min 8 characters)</span>
        <input
          type="password"
          required
          minLength={8}
          className="mt-1 w-full rounded-lg border border-sand-deep px-3 py-2"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </label>
      {err ? <p className="text-sm text-rose">{err}</p> : null}
      <button
        type="submit"
        disabled={loading}
        className="flex w-full items-center justify-center gap-2 rounded-full bg-accent py-3 text-sm font-semibold text-white hover:bg-accent-light disabled:opacity-60"
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
    </form>
  );
}

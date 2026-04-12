"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { apiFetch } from "@/lib/api/fetch-client";
import { Spinner } from "@/components/ui/Spinner";

function ResetPasswordFormInner() {
  const router = useRouter();
  const sp = useSearchParams();
  const uid = sp.get("uid") ?? "";
  const token = sp.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (password !== password2) {
      setErr("Passwords do not match");
      return;
    }
    if (!uid || !token) {
      setErr("Invalid reset link. Request a new one from forgot password.");
      return;
    }
    setBusy(true);
    try {
      await apiFetch("/api/v1/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ uid, token, password }),
      });
      router.push("/login?reset=1");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Reset failed");
    } finally {
      setBusy(false);
    }
  }

  if (!uid || !token) {
    return (
      <p className="text-sm text-rose">
        This link is incomplete.{" "}
        <Link href="/forgot-password" className="text-accent underline">
          Request a new reset email
        </Link>
        .
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <label className="block text-sm">
        <span className="text-ink-muted">New password</span>
        <input
          type="password"
          required
          minLength={8}
          className="mt-1 w-full rounded-lg border border-sand-deep px-3 py-2"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </label>
      <label className="block text-sm">
        <span className="text-ink-muted">Confirm password</span>
        <input
          type="password"
          required
          minLength={8}
          className="mt-1 w-full rounded-lg border border-sand-deep px-3 py-2"
          value={password2}
          onChange={(e) => setPassword2(e.target.value)}
        />
      </label>
      {err ? <p className="text-sm text-rose">{err}</p> : null}
      <button
        type="submit"
        disabled={busy}
        className="flex w-full items-center justify-center gap-2 rounded-full bg-ink py-3 text-sm font-semibold text-white hover:bg-ink/90 disabled:opacity-60"
      >
        {busy ? (
          <>
            <Spinner size="sm" className="text-white" />
            Updating…
          </>
        ) : (
          "Set new password"
        )}
      </button>
    </form>
  );
}

export function ResetPasswordForm() {
  return (
    <Suspense
      fallback={
        <p className="inline-flex items-center gap-2 text-sm text-ink-muted">
          <Spinner size="sm" /> Loading…
        </p>
      }
    >
      <ResetPasswordFormInner />
    </Suspense>
  );
}

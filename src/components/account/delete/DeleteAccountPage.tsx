"use client";

import Link from "next/link";
import { useState } from "react";
import { signOut } from "next-auth/react";
import { apiFetch } from "@/lib/api/fetch-client";
import { DeleteConfirmInput } from "./DeleteConfirmInput";
import { Spinner } from "@/components/ui/Spinner";

export function DeleteAccountPage() {
  const [ok, setOk] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onDelete() {
    if (!ok || busy) return;
    setErr(null);
    setBusy(true);
    try {
      await apiFetch("/api/account", { method: "DELETE" });
      await signOut({ callbackUrl: "/?deleted=true" });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not delete account");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-[480px]">
      <div className="rounded-2xl border border-red-200 bg-red-50/80 p-6 shadow-[var(--shadow-card)] sm:p-8">
        <div className="flex gap-3 text-[var(--brand-error)]">
          <span className="text-2xl" aria-hidden>
            ⚠
          </span>
          <div>
            <h1 className="font-display text-xl text-[var(--brand-ink)]">Delete your account</h1>
            <p className="mt-3 text-sm text-[var(--brand-muted)]">
              This will permanently delete your profile and login access, saved addresses, and wishlist.
            </p>
            <p className="mt-3 text-sm font-medium text-[var(--brand-ink)]">This will NOT delete:</p>
            <ul className="mt-2 list-inside list-disc text-sm text-[var(--brand-muted)]">
              <li>Your order history (kept for legal and tax records)</li>
              <li>Orders currently in transit</li>
            </ul>
          </div>
        </div>

        <div className="mt-8 space-y-4">
          <DeleteConfirmInput onValidityChange={setOk} />
          {err ? <p className="text-sm text-[var(--brand-error)]">{err}</p> : null}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <button
              type="button"
              disabled={!ok || busy}
              onClick={() => void onDelete()}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[var(--brand-error)] px-6 text-sm font-semibold text-white disabled:opacity-50"
            >
              {busy ? <Spinner size="sm" className="text-white" /> : null}
              Delete my account
            </button>
            <Link
              href="/account/profile"
              className="text-center text-sm font-medium text-[var(--brand-amber)] hover:underline sm:ml-4"
            >
              ← Cancel, keep my account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

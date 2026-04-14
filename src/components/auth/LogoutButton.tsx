"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api/fetch-client";
import { Spinner } from "@/components/ui/Spinner";

type LogoutButtonProps = {
  /** `menu` = full-width row for header dropdowns. */
  variant?: "default" | "menu";
  className?: string;
};

export function LogoutButton({ variant = "default", className = "" }: LogoutButtonProps) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const base =
    variant === "menu"
      ? "inline-flex w-full items-center justify-start gap-2 rounded-lg border-0 px-3 py-2.5 text-left text-sm font-medium text-ink hover:bg-sand/60 disabled:opacity-60"
      : "inline-flex items-center justify-center gap-2 rounded-full border border-sand-deep px-4 py-2 text-sm text-ink hover:bg-sand-deep disabled:opacity-60";
  return (
    <button
      type="button"
      disabled={busy}
      className={`${base} ${className}`.trim()}
      onClick={async () => {
        setBusy(true);
        try {
          await apiFetch("/api/v1/auth/logout", { method: "POST" });
          router.push("/");
          router.refresh();
        } finally {
          setBusy(false);
        }
      }}
    >
      {busy ? (
        <>
          <Spinner size="sm" />
          Signing out…
        </>
      ) : (
        "Log out"
      )}
    </button>
  );
}

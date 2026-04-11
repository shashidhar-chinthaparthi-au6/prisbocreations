"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api/fetch-client";
import { Spinner } from "@/components/ui/Spinner";

export function LogoutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      disabled={busy}
      className="inline-flex items-center justify-center gap-2 rounded-full border border-sand-deep px-4 py-2 text-sm text-ink hover:bg-sand-deep disabled:opacity-60"
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

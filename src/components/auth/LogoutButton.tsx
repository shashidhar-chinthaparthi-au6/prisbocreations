"use client";

import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api/fetch-client";

export function LogoutButton() {
  const router = useRouter();
  return (
    <button
      type="button"
      className="rounded-full border border-sand-deep px-4 py-2 text-sm text-ink hover:bg-sand-deep"
      onClick={async () => {
        await apiFetch("/api/v1/auth/logout", { method: "POST" });
        router.push("/");
        router.refresh();
      }}
    >
      Log out
    </button>
  );
}

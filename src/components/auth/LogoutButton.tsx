"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { Spinner } from "@/components/ui/Spinner";
import { useWishlistStore } from "@/lib/store/wishlist-store";
import { useCartStore } from "@/lib/store/cart-store";
import { dispatchStoreToast } from "@/components/store/StoreToaster";

type LogoutButtonProps = {
  /** `menu` = full-width row for header dropdowns. */
  variant?: "default" | "menu";
  className?: string;
};

export function LogoutButton({ variant = "default", className = "" }: LogoutButtonProps) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const setWishIds = useWishlistStore((s) => s.setIds);
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
          await signOut({ redirect: false });
          try {
            await fetch("/api/v1/auth/logout", { method: "POST", credentials: "include" });
          } catch {
            /* ignore */
          }
          try {
            localStorage.removeItem("prisbo_cart");
            localStorage.removeItem("prisbo_recently_viewed");
            localStorage.removeItem("prisbo_wishlist");
            localStorage.removeItem("prisbo_wishlist_guest");
            await useCartStore.persist.clearStorage();
          } catch {
            /* ignore */
          }
          useCartStore.getState().clear();
          setWishIds([]);
          dispatchStoreToast("You've been signed out.");
          const path = typeof window !== "undefined" ? window.location.pathname : "";
          if (path.startsWith("/account") || path.startsWith("/checkout")) {
            router.push("/");
          } else {
            router.refresh();
          }
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

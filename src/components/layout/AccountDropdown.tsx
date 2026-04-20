"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useWishlistStore } from "@/lib/store/wishlist-store";
import { useCartStore } from "@/lib/store/cart-store";
import { dispatchStoreToast } from "@/components/store/StoreToaster";

type Props = {
  fullName: string;
  email: string;
  onClose: () => void;
};

export function AccountDropdown({ fullName, email, onClose }: Props) {
  const router = useRouter();
  const setWishIds = useWishlistStore((s) => s.setIds);

  async function onSignOut() {
    onClose();
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
  }

  const row =
    "block w-full px-4 py-2.5 text-left text-sm text-[#1A1A1A] hover:bg-[#F5E6D0] first:rounded-t-[10px] last:rounded-b-[10px]";

  return (
    <div
      role="menu"
      aria-label="Account menu"
      className="min-w-[220px] overflow-hidden rounded-xl border border-[#E8E0D6] bg-white shadow-[0_4px_20px_rgba(0,0,0,0.1)]"
    >
      <div className="px-4 py-3">
        <p className="text-sm font-semibold text-[#1A1A1A]">{fullName}</p>
        <p className="mt-0.5 text-xs text-[#6B6560]">{email}</p>
      </div>
      <div className="border-t border-[#E8E0D6]" />
      <div className="py-1">
        <Link href="/account/orders" role="menuitem" className={row} onClick={onClose}>
          My orders
        </Link>
        <Link href="/account/profile" role="menuitem" className={row} onClick={onClose}>
          My profile
        </Link>
        <Link href="/account/addresses" role="menuitem" className={row} onClick={onClose}>
          Saved addresses
        </Link>
        <Link href="/account/wishlist" role="menuitem" className={row} onClick={onClose}>
          Wishlist
        </Link>
      </div>
      <div className="border-t border-[#E8E0D6]" />
      <div className="py-1">
        <button type="button" role="menuitem" className={`${row} font-medium text-[#C47A2B]`} onClick={() => void onSignOut()}>
          Sign out
        </button>
      </div>
    </div>
  );
}

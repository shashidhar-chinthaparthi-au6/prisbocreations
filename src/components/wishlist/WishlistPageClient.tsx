"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { ProductCard } from "@/components/storefront/ProductCard";
import { useCart } from "@/components/cart/CartProvider";
import { dispatchStoreToast } from "@/components/store/StoreToaster";
import type { StorefrontProductCard } from "@/lib/services/storefrontCatalog";
import { readGuestWishlistIds } from "@/lib/wishlist-guest";
import { useWishlistStore } from "@/lib/store/wishlist-store";
import { StoreEmptyState } from "@/components/ui/StoreEmptyState";

function WishlistGuestBanner() {
  return (
    <div className="rounded-2xl border border-[#E8E0D6] bg-[#FDFAF7] p-5 text-sm text-[#3D3835] shadow-sm">
      <p className="font-medium">You&apos;re browsing as a guest.</p>
      <p className="mt-1 text-[#6B6560]">
        <Link
          href="/register?redirect=/account/wishlist&source=wishlist"
          className="font-semibold text-[#C47A2B] hover:underline"
        >
          Create account
        </Link>{" "}
        to save your wishlist permanently and access it on any device.
      </p>
      <div className="mt-4 flex flex-wrap gap-3">
        <Link
          href="/register?redirect=/account/wishlist&source=wishlist"
          className="inline-flex rounded-full bg-[#C47A2B] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#9A5E1E]"
        >
          Create account →
        </Link>
        <Link
          href="/login?redirect=/account/wishlist"
          className="inline-flex rounded-full border border-[#C47A2B] bg-white px-5 py-2.5 text-sm font-semibold text-[#C47A2B] hover:bg-[#F5E6D0]"
        >
          Sign in →
        </Link>
      </div>
    </div>
  );
}

function WishlistSkeletonGrid() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="overflow-hidden rounded-[12px] bg-[var(--brand-card)] shadow-[var(--shadow-card)]">
          <div className="aspect-square animate-pulse bg-[#E8E0D6]" />
          <div className="space-y-2 p-4">
            <div className="h-3 w-1/3 animate-pulse rounded bg-[#E8E0D6]" />
            <div className="h-4 w-4/5 animate-pulse rounded bg-[#E8E0D6]" />
            <div className="h-5 w-1/2 animate-pulse rounded bg-[#E8E0D6]" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function WishlistPageClient() {
  const { status } = useSession();
  const { add } = useCart();
  const [items, setItems] = useState<StorefrontProductCard[] | null>(null);
  const [mode, setMode] = useState<"guest" | "auth" | null>(null);
  const [addingAll, setAddingAll] = useState(false);

  const loadProducts = useCallback(async () => {
    if (status === "loading") return;

    let cancelled = false;

    if (status === "authenticated") {
      try {
        const r = await fetch("/api/wishlist", { credentials: "include" });
        if (!cancelled && r.ok) {
          const j = (await r.json()) as { data?: { productIds?: string[] } };
          const ids = j.data?.productIds ?? [];
          if (ids.length === 0) {
            setItems([]);
            setMode("auth");
            return;
          }
          const pr = await fetch(`/api/products?ids=${encodeURIComponent(ids.join(","))}`);
          const pj = (await pr.json()) as { data?: { items?: StorefrontProductCard[] } };
          if (!cancelled) {
            setItems(pj.data?.items ?? []);
            setMode("auth");
          }
          return;
        }
      } catch {
        /* fall through */
      }
      if (!cancelled) {
        setItems([]);
        setMode("auth");
      }
      return;
    }

    const ids =
      useWishlistStore.getState().ids.length > 0 ? useWishlistStore.getState().ids : readGuestWishlistIds();
    if (ids.length === 0) {
      if (!cancelled) {
        setItems([]);
        setMode("guest");
      }
      return;
    }
    const pr = await fetch(`/api/products?ids=${encodeURIComponent(ids.join(","))}`);
    const pj = (await pr.json()) as { data?: { items?: StorefrontProductCard[] } };
    if (!cancelled) {
      setItems(pj.data?.items ?? []);
      setMode("guest");
    }
  }, [status]);

  useEffect(() => {
    void loadProducts();
  }, [loadProducts]);

  useEffect(() => {
    function onWishlist() {
      void loadProducts();
    }
    window.addEventListener("prisbo-wishlist", onWishlist);
    return () => window.removeEventListener("prisbo-wishlist", onWishlist);
  }, [loadProducts]);

  const onAddAll = useCallback(() => {
    if (!items?.length || addingAll) return;
    setAddingAll(true);
    let skippedOos = 0;
    let skippedOptions = 0;
    try {
      for (const p of items) {
        if (p.stock <= 0) {
          skippedOos++;
          continue;
        }
        if (p.multi || p.hasColorVariants) {
          skippedOptions++;
          continue;
        }
        add({
          productId: p.id,
          slug: p.slug,
          name: p.name,
          image: p.imageUrl,
          pricePaise: p.listPricePaise,
        });
      }
      if (skippedOos > 0) {
        dispatchStoreToast(
          `${skippedOos} item${skippedOos === 1 ? "" : "s"} ${skippedOos === 1 ? "was" : "were"} out of stock and weren’t added.`,
        );
      }
      if (skippedOptions > 0) {
        dispatchStoreToast(
          `${skippedOptions} item${skippedOptions === 1 ? "" : "s"} need size or colour — open the product to add ${skippedOptions === 1 ? "it" : "them"}.`,
        );
      }
    } finally {
      setAddingAll(false);
    }
  }, [add, addingAll, items]);

  const count = items?.length ?? 0;
  const showGuestBanner = status === "unauthenticated" && mode === "guest";
  const showSkeleton = status === "loading" || items === null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <h1 className="font-display text-3xl text-[var(--brand-ink)]">
          My wishlist
          {items && items.length > 0 ? (
            <span className="ml-2 text-lg font-normal text-[var(--brand-muted)]">({count} items)</span>
          ) : null}
        </h1>
        {items && items.length > 0 ? (
          <button
            type="button"
            disabled={addingAll}
            onClick={() => void onAddAll()}
            className="inline-flex items-center justify-center rounded-full border border-[#C47A2B] bg-white px-5 py-2.5 text-sm font-semibold text-[#C47A2B] hover:bg-[#F5E6D0] disabled:opacity-50"
          >
            {addingAll ? "Adding…" : "Add all to cart →"}
          </button>
        ) : null}
      </div>

      {showGuestBanner ? <WishlistGuestBanner /> : null}

      {showSkeleton ? (
        <WishlistSkeletonGrid />
      ) : items.length === 0 ? (
        <StoreEmptyState
          illustration="heart"
          title="Your wishlist is empty"
          description="Tap the heart on any product to save it here — perfect for gifts you’re still deciding on."
          primary={{ label: "Browse products →", href: "/products" }}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((p) => (
            <ProductCard
              key={p.id}
              product={p}
              wishlistRemoveUndo
              onStockNotify={
                p.stock <= 0
                  ? () =>
                      dispatchStoreToast(
                        "We’ll email you when this is back in stock. (Stock alerts are coming soon — you can also reach us via Contact.)",
                        { duration: 5000 },
                      )
                  : undefined
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}

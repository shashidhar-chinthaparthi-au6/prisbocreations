"use client";

import Link from "next/link";
import { StoreMedia } from "@/components/store/StoreMedia";
import { useEffect, useMemo, useState } from "react";
import { formatInrFromPaise } from "@/lib/format";
import { WishlistHeart } from "@/components/ui/WishlistHeart";
import type { StorefrontProductCard } from "@/lib/services/storefrontCatalog";

type Props = {
  product: StorefrontProductCard;
  /** 0-based position, shown as 01, 02… on the image */
  index?: number;
  /** Kept so existing callers still type-check. The card links through to the product. */
  defaultOptionKey?: string;
  /** Wishlist page: undo toast when removing; optional restock notify for OOS. */
  wishlistRemoveUndo?: boolean;
  onStockNotify?: () => void;
};

export function ProductCard({ product, index, wishlistRemoveUndo, onStockNotify }: Props) {
  const [hover, setHover] = useState(false);
  const [primaryImgError, setPrimaryImgError] = useState(false);
  const [secondaryImgError, setSecondaryImgError] = useState(false);

  useEffect(() => {
    setPrimaryImgError(false);
    setSecondaryImgError(false);
  }, [product.id, product.imageUrl, product.hoverImageUrl, product.listingColorKey]);

  const productHref = useMemo(() => {
    const q = product.listingColorKey?.trim();
    return q
      ? `/products/${product.slug}?color=${encodeURIComponent(q)}`
      : `/products/${product.slug}`;
  }, [product.slug, product.listingColorKey]);

  const out = product.stock <= 0;
  const secondaryImg = product.hoverImageUrl;
  const indexLabel = index != null ? String(index + 1).padStart(2, "0") : null;
  const eyebrow = product.subcategoryName?.trim();

  return (
    <article
      className={`group relative flex flex-col ${out ? "opacity-80" : ""}`}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <Link href={productHref} className="block shrink-0 overflow-hidden">
        <div className="relative aspect-[4/5] overflow-hidden bg-[#f3f1ec]">
          {indexLabel ? (
            <span className="absolute left-3 top-3 z-10 text-[12px] tabular-nums tracking-[0.04em] text-[#1c1612]/40">
              {indexLabel}
            </span>
          ) : null}
          {product.imageUrl && !primaryImgError ? (
            <>
              <StoreMedia
                src={product.imageUrl}
                alt={product.name}
                fill
                className={`object-cover transition duration-300 ${
                  secondaryImg && !secondaryImgError && hover ? "opacity-0" : "opacity-100"
                }`}
                sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                fetchPriority="low"
                onMediaError={() => setPrimaryImgError(true)}
              />
              {secondaryImg && !secondaryImgError ? (
                <StoreMedia
                  src={secondaryImg}
                  alt=""
                  fill
                  className={`object-cover transition-opacity duration-[250ms] ease-out ${
                    hover ? "opacity-100" : "opacity-0"
                  }`}
                  sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                  fetchPriority="low"
                  onMediaError={() => setSecondaryImgError(true)}
                />
              ) : null}
            </>
          ) : (
            <div
              className="flex h-full w-full items-center justify-center font-semibold"
              style={{ background: "#f7f2ec", fontSize: 32, color: "#C47A2B" }}
              aria-hidden
            >
              {(product.name.trim()[0] ?? "?").toUpperCase()}
            </div>
          )}

          <span className="absolute top-2 right-2 z-10 opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100 sm:focus-within:opacity-100">
            <WishlistHeart
              productId={product.id}
              productName={product.name}
              size="sm"
              density="compact"
              showRemoveUndo={wishlistRemoveUndo}
            />
          </span>
        </div>
      </Link>

      <div className="flex flex-col px-0.5 pt-3">
        {eyebrow ? (
          <p className="text-[12px] text-[#1c1612]/45">{eyebrow}</p>
        ) : null}

        <Link href={productHref} className="mt-1">
          <h3 className="line-clamp-2 text-[15px] font-semibold leading-snug text-[#1c1612]">
            {product.name}
          </h3>
        </Link>

        {product.blurb ? (
          <p className="mt-1 line-clamp-1 text-[13px] leading-relaxed text-[#1c1612]/50">{product.blurb}</p>
        ) : null}

        <div className="mt-4 flex items-center justify-between gap-3">
          <span className="text-[15px] font-medium tabular-nums text-[#1c1612]">
            {formatInrFromPaise(product.listPricePaise)}
          </span>
          {out ? (
            onStockNotify ? (
              <button
                type="button"
                onClick={onStockNotify}
                className="text-[13px] text-[#1c1612]/70 underline-offset-4 hover:underline"
              >
                Notify me
              </button>
            ) : (
              <span className="text-[13px] text-[#1c1612]/40">Sold out</span>
            )
          ) : (
            <Link
              href={productHref}
              className="inline-flex items-center gap-1 text-[13px] text-[#1c1612]/80 transition hover:text-[#1c1612]"
            >
              Customise <span aria-hidden>↗</span>
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}

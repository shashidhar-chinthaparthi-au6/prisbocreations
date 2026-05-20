"use client";

import Link from "next/link";
import { StoreMedia } from "@/components/store/StoreMedia";
import { useEffect, useMemo, useState } from "react";
import { useCart } from "@/components/cart/CartProvider";
import { cartLineId } from "@/lib/cart-line-id";
import { formatInrFromPaise } from "@/lib/format";
import { getLowStockThreshold } from "@/lib/admin/low-stock";
import { WishlistHeart } from "@/components/ui/WishlistHeart";
import { StarRatingRow } from "@/components/product/StarRating";
import type { StorefrontProductCard } from "@/lib/services/storefrontCatalog";

type Props = {
  product: StorefrontProductCard;
  /** Quick add uses default option when product has pack rows */
  defaultOptionKey?: string;
  /** Wishlist page: undo toast when removing; optional restock notify for OOS. */
  wishlistRemoveUndo?: boolean;
  onStockNotify?: () => void;
};

export function ProductCard({ product, defaultOptionKey, wishlistRemoveUndo, onStockNotify }: Props) {
  const { add, lines, setQty } = useCart();
  const [hover, setHover] = useState(false);
  const [justAdded, setJustAdded] = useState(false);
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

  const lineId = useMemo(
    () => cartLineId(product.id, defaultOptionKey, {}),
    [product.id, defaultOptionKey],
  );
  const line = lines.find((l) => l.id === lineId);
  const inCartQty = line?.quantity ?? 0;
  const maxQty = Math.max(1, product.stock);

  const out = product.stock <= 0;
  const low = !out && product.stock <= getLowStockThreshold();
  const discountPct =
    product.compareAtPaise && product.compareAtPaise > product.listPricePaise
      ? Math.round((1 - product.listPricePaise / product.compareAtPaise) * 100)
      : null;

  const secondaryImg = product.hoverImageUrl;

  const onAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (out) return;
    if (product.multi) {
      window.location.href = productHref;
      return;
    }
    add({
      productId: product.id,
      slug: product.slug,
      name: product.name,
      image: product.imageUrl,
      pricePaise: product.listPricePaise,
      optionKey: defaultOptionKey,
    });
    setJustAdded(true);
    window.setTimeout(() => setJustAdded(false), 1500);
  };

  const onDec = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setQty(lineId, inCartQty - 1);
  };

  const onInc = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (inCartQty >= maxQty) return;
    setQty(lineId, inCartQty + 1);
  };

  return (
    <article
      className={`group relative flex flex-col overflow-hidden rounded-[16px] bg-white border border-[var(--brand-border)] shadow-[0_1px_3px_rgba(24,12,4,0.06)] transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_8px_24px_rgba(24,12,4,0.12)] hover:border-[var(--brand-border-dark)] ${out ? "opacity-80" : ""}`}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      {/* Image wrapper */}
      <Link href={productHref} className="block shrink-0 overflow-hidden">
        <div className="relative aspect-[4/5] overflow-hidden bg-[#f7f2ec]">
          {product.imageUrl && !primaryImgError ? (
            <>
              <StoreMedia
                src={product.imageUrl}
                alt={product.name}
                fill
                className={`object-cover transition duration-300 ${
                  secondaryImg && !secondaryImgError && hover ? "opacity-0" : "opacity-100"
                } ${out ? "grayscale-[30%]" : ""}`}
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

          {/* Badges — top-left */}
          {out ? (
            <span className="absolute top-2 left-2 z-10 rounded-full bg-[#18120e]/80 backdrop-blur-sm px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-white">
              Sold out
            </span>
          ) : low ? (
            <span className="absolute top-2 left-2 z-10 rounded-full bg-[#92400e]/85 backdrop-blur-sm px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-white">
              Almost gone
            </span>
          ) : product.isNew ? (
            <span className="absolute top-2 left-2 z-10 rounded-full bg-[#18120e] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-white">
              New
            </span>
          ) : null}

          {/* Color previews — bottom center */}
          {product.listingColorLabel && product.listingColorKey ? (
            <div
              className="pointer-events-none absolute bottom-2 left-0 right-0 z-[4] flex justify-center"
              aria-hidden
            >
              <span className="max-w-[90%] truncate rounded-full border border-white/35 bg-black/35 px-2.5 py-1 text-[10px] font-semibold text-white backdrop-blur-sm">
                {product.listingColorLabel}
              </span>
            </div>
          ) : product.colorPreviewUrls != null &&
            product.colorPreviewUrls.length >= 2 &&
            product.imageUrl &&
            !primaryImgError ? (
            <div
              className="pointer-events-none absolute bottom-2 left-0 right-0 z-[3] flex justify-center"
              aria-hidden
            >
              <div className="inline-flex max-w-full gap-1 rounded-full border border-white/35 bg-black/28 px-1.5 py-1 backdrop-blur-[8px]">
                {product.colorPreviewUrls.slice(0, 6).map((src, i) => (
                  <span
                    key={`${product.id}-cv-${i}`}
                    className="relative h-6 w-6 shrink-0 overflow-hidden rounded-full ring-2 ring-white/95"
                  >
                    <StoreMedia
                      src={src}
                      alt=""
                      fill
                      className="object-cover"
                      sizes="24px"
                      fetchPriority="low"
                      eager
                    />
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          {/* Wishlist heart — top-right */}
          <span className="absolute top-2 right-2 z-10">
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

      {/* Card body */}
      <div className="flex flex-col gap-1.5 p-3 pt-2.5">
        {/* Subcategory label */}
        {product.subcategoryName ? (
          <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--brand-muted)] line-clamp-1">
            {product.subcategoryName}
          </p>
        ) : null}

        {/* Product name */}
        <Link href={productHref}>
          <h3 className="text-[13px] font-medium leading-snug text-[var(--brand-ink)] line-clamp-2 min-h-[36px]">
            {product.name}
          </h3>
        </Link>

        {/* Stars */}
        {product.avgRating != null && product.reviewCount != null && product.reviewCount >= 1 ? (
          <StarRatingRow
            rating={product.avgRating}
            reviewCount={product.reviewCount}
            className="mt-0.5"
          />
        ) : null}

        {/* Price row */}
        <div className="flex items-baseline gap-1.5 mt-0.5">
          <span className="text-[15px] font-bold text-[var(--brand-ink)]">
            {formatInrFromPaise(product.listPricePaise)}
          </span>
          {product.compareAtPaise && product.compareAtPaise > product.listPricePaise ? (
            <>
              <span className="text-[12px] text-[var(--brand-muted)] line-through">
                {formatInrFromPaise(product.compareAtPaise)}
              </span>
              {discountPct != null ? (
                <span className="rounded-full bg-[#fef3c7] px-1.5 py-0.5 text-[10px] font-bold text-[#92400e]">
                  {discountPct}% off
                </span>
              ) : null}
            </>
          ) : null}
        </div>

        {/* Add-to-cart / stepper */}
        {out ? (
          onStockNotify ? (
            <button
              type="button"
              onClick={onStockNotify}
              className="w-full rounded-full border border-[var(--brand-amber)] bg-transparent py-2 text-[12px] font-semibold text-[var(--brand-amber-dark)] transition-all duration-150 hover:bg-[var(--brand-amber-light)] mt-1"
            >
              Notify me
            </button>
          ) : (
            <button
              type="button"
              disabled
              className="w-full rounded-full border border-[var(--brand-border)] bg-transparent py-2 text-[12px] font-semibold text-[var(--brand-muted)] cursor-not-allowed opacity-60 mt-1"
            >
              Notify me
            </button>
          )
        ) : product.multi ? (
          <button
            type="button"
            onClick={onAdd}
            className="w-full rounded-full bg-[var(--brand-amber-dark)] py-2 text-[12px] font-semibold text-white transition-all duration-150 hover:bg-[#73400f] mt-1"
          >
            Choose options
          </button>
        ) : inCartQty >= 1 ? (
          <div
            className="mt-1 flex items-center justify-between rounded-full border border-[var(--brand-border)] bg-[var(--brand-surface)] p-1"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              aria-label="Decrease quantity"
              onClick={onDec}
              className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-[var(--brand-amber-light)] text-base font-bold text-[var(--brand-ink)]"
            >
              −
            </button>
            <span className="min-w-[2rem] text-center text-sm font-semibold tabular-nums text-[var(--brand-ink)]">
              {inCartQty}
            </span>
            <button
              type="button"
              aria-label="Increase quantity"
              onClick={onInc}
              disabled={inCartQty >= maxQty}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--brand-amber)] text-white hover:bg-[var(--brand-amber-dark)] text-base font-bold disabled:cursor-not-allowed disabled:opacity-45"
            >
              +
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={onAdd}
            className={`w-full rounded-full py-2 text-[12px] font-semibold text-white transition-all duration-150 mt-1 ${
              justAdded
                ? "bg-[var(--brand-success)]"
                : "bg-[var(--brand-amber-dark)] hover:bg-[#73400f]"
            }`}
          >
            {justAdded ? "✓ Added" : "Add to cart"}
          </button>
        )}
      </div>
    </article>
  );
}

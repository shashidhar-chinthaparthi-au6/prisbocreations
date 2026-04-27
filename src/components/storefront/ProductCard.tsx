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
  }, [product.id, product.imageUrl, product.hoverImageUrl]);

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
      window.location.href = `/products/${product.slug}`;
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

  const cardClass = useMemo(
    () =>
      `product-card group flex h-full min-h-0 flex-col rounded-[12px] bg-[var(--brand-card)] shadow-[var(--shadow-card)] transition duration-150 hover:-translate-y-0.5 hover:shadow-[0_4px_14px_rgba(0,0,0,0.12)] ${
        out ? "opacity-95" : ""
      }`,
    [out],
  );

  return (
    <article
      className={cardClass}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <Link href={`/products/${product.slug}`} className="card-img block shrink-0 overflow-hidden rounded-t-[9px]">
        <div className="relative aspect-square overflow-hidden rounded-t-[9px] bg-[var(--sf)]">
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
                  className={`img-secondary transition-opacity duration-[250ms] ease-out ${
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
              style={{
                background: "#F5F0EA",
                fontSize: 32,
                color: "#C47A2B",
              }}
              aria-hidden
            >
              {(product.name.trim()[0] ?? "?").toUpperCase()}
            </div>
          )}
          {out ? (
            <span className="absolute left-1.5 top-1.5 rounded-[20px] bg-[#FEF2F2] px-[7px] py-0.5 text-[9px] font-semibold text-[#991B1B] md:left-2 md:top-2">
              Out of stock
            </span>
          ) : low ? (
            <span className="absolute left-1.5 top-1.5 rounded-[20px] bg-[#FEF3C7] px-[7px] py-0.5 text-[9px] font-semibold text-[#92400E] md:left-2 md:top-2">
              Low stock
            </span>
          ) : product.isNew ? (
            <span className="absolute left-1.5 top-1.5 rounded-[20px] bg-[#E6F1FB] px-[7px] py-0.5 text-[9px] font-semibold text-[#185FA5] md:left-2 md:top-2">
              New
            </span>
          ) : null}
          <span className="absolute right-1 top-1 z-[2] md:right-1.5 md:top-1.5">
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
      <div className="card-body flex flex-1 flex-col px-[7px] pb-2 pt-1.5 md:px-2 md:pb-3 md:pt-3">
        {product.subcategoryName ? (
          <p className="text-[10px] font-medium uppercase tracking-wide text-[var(--muted)] line-clamp-1">
            {product.subcategoryName}
          </p>
        ) : null}
        <Link href={`/products/${product.slug}`}>
          <h3 className="card-name mt-0.5 min-h-[28px] line-clamp-2 text-[11px] font-medium leading-snug text-[var(--ink)] md:min-h-0 md:text-[13px] lg:text-sm">
            {product.name}
          </h3>
        </Link>
        {product.avgRating != null && product.reviewCount != null && product.reviewCount >= 1 ? (
          <StarRatingRow
            rating={product.avgRating}
            reviewCount={product.reviewCount}
            className="mt-1.5"
          />
        ) : null}
        <div className="card-price mt-2 flex flex-wrap items-baseline gap-1.5 md:gap-2">
          <span className="font-mono text-[12px] font-semibold text-[var(--ink)] md:text-[13px]">
            {formatInrFromPaise(product.listPricePaise)}
          </span>
          {product.compareAtPaise && product.compareAtPaise > product.listPricePaise ? (
            <>
              <span className="font-mono text-[11px] text-[var(--muted)] line-through md:text-[13px]">
                {formatInrFromPaise(product.compareAtPaise)}
              </span>
              {discountPct != null ? (
                <span className="text-[11px] font-semibold text-[var(--ok)] md:text-xs">{discountPct}% off</span>
              ) : null}
            </>
          ) : null}
        </div>
        {out ? (
          onStockNotify ? (
            <button type="button" onClick={onStockNotify} className="btn-primary mt-3 w-full">
              Notify me
            </button>
          ) : (
            <button type="button" disabled className="btn-primary mt-3 w-full cursor-not-allowed opacity-60">
              Notify me
            </button>
          )
        ) : product.multi ? (
          <button type="button" onClick={onAdd} className="btn-primary mt-3 w-full">
            Choose options
          </button>
        ) : inCartQty >= 1 ? (
          <div
            className="mt-3 inline-flex w-full items-center justify-between rounded-full border border-[var(--brand-border)] bg-[var(--brand-card)] p-1 shadow-[var(--shadow-card)]"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              aria-label="Decrease quantity"
              onClick={onDec}
              className="inline-flex h-9 min-w-9 flex-1 items-center justify-center rounded-full bg-[var(--brand-surface)] text-base font-semibold text-[var(--brand-ink)] hover:bg-[var(--brand-amber-light)] sm:h-10 sm:min-w-10"
            >
              −
            </button>
            <span className="min-w-[2rem] flex-1 text-center text-sm font-semibold tabular-nums text-[var(--brand-ink)] sm:text-base">
              {inCartQty}
            </span>
            <button
              type="button"
              aria-label="Increase quantity"
              onClick={onInc}
              disabled={inCartQty >= maxQty}
              className="inline-flex h-9 min-w-9 flex-1 items-center justify-center rounded-full bg-[var(--brand-amber)] text-base font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-45 sm:h-10 sm:min-w-10"
            >
              +
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={onAdd}
            className={`card-add mt-2.5 w-full rounded-[20px] border-none py-[5px] text-[10px] font-medium text-white md:mt-3 md:h-[34px] md:py-0 md:text-[11px] ${
              justAdded ? "bg-[var(--ok)]" : "bg-[var(--am)] hover:opacity-95"
            }`}
          >
            {justAdded ? "✓ Added" : "Add to cart"}
          </button>
        )}
      </div>
    </article>
  );
}

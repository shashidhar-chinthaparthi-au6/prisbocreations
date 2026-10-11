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
  /** 0-based position, shown as 01, 02… on the image */
  index?: number;
  /** Quick add uses default option when product has pack rows */
  defaultOptionKey?: string;
  /** Wishlist page: undo toast when removing; optional restock notify for OOS. */
  wishlistRemoveUndo?: boolean;
  onStockNotify?: () => void;
};

export function ProductCard({ product, index, defaultOptionKey, wishlistRemoveUndo, onStockNotify }: Props) {
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

  const indexLabel =
    index != null ? String(index + 1).padStart(2, "0") : null;
  const meta = [product.subcategoryName, product.listingColorLabel].filter(Boolean).join(" · ");

  return (
    <article
      className={`group relative flex flex-col ${out ? "opacity-80" : ""}`}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      {/* Image wrapper */}
      <Link href={productHref} className="block shrink-0 overflow-hidden">
        <div className="relative aspect-[4/5] overflow-hidden rounded-[4px] bg-[#eceae6]">
          {indexLabel ? (
            <span className="absolute left-3 top-3 z-10 text-[11px] tracking-[0.14em] text-[var(--brand-ink)]/45">
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

          {/* Badges — bottom-left, editorial pills */}
          {out ? (
            <span className="absolute bottom-3 left-3 z-10 rounded-full bg-[#1c1612]/85 px-2.5 py-1 text-[11px] text-white">
              Sold out
            </span>
          ) : product.featured ? (
            <span className="absolute bottom-3 left-3 z-10 rounded-full bg-[#f6f1e8] px-2.5 py-1 text-[11px] text-[var(--brand-ink)]">
              Bestseller
            </span>
          ) : product.multi ? (
            <span className="absolute bottom-3 left-3 z-10 inline-flex items-center gap-1.5 rounded-full bg-[#2a241f]/90 px-2.5 py-1 text-[11px] text-white">
              Customise <span aria-hidden>↗</span>
            </span>
          ) : low ? (
            <span className="absolute bottom-3 left-3 z-10 rounded-full bg-[#2a241f]/90 px-2.5 py-1 text-[11px] text-white">
              Almost gone
            </span>
          ) : product.isNew ? (
            <span className="absolute bottom-3 left-3 z-10 rounded-full bg-[#f6f1e8] px-2.5 py-1 text-[11px] text-[var(--brand-ink)]">
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
      <div className="flex flex-col gap-1 px-0.5 pb-2 pt-3">
        {meta ? (
          <p className="line-clamp-1 text-[12px] text-[var(--brand-muted)]">{meta}</p>
        ) : null}

        <Link href={productHref}>
          <h3 className="line-clamp-2 text-[15px] font-semibold leading-snug text-[var(--brand-ink)]">
            {product.name}
          </h3>
        </Link>

        {product.avgRating != null && product.reviewCount != null && product.reviewCount >= 1 ? (
          <StarRatingRow
            rating={product.avgRating}
            reviewCount={product.reviewCount}
            className="mt-0.5"
          />
        ) : null}

        <div className="mt-1.5 flex items-baseline gap-2">
          <span className="text-[15px] font-semibold text-[var(--brand-ink)]">
            {formatInrFromPaise(product.listPricePaise)}
          </span>
          {product.compareAtPaise && product.compareAtPaise > product.listPricePaise ? (
            <span className="text-[13px] text-[var(--brand-muted)] line-through">
              {formatInrFromPaise(product.compareAtPaise)}
            </span>
          ) : null}
        </div>
        <p className="text-[11px] text-[var(--brand-muted)]">Inclusive of taxes</p>

        {/* Add-to-cart / stepper */}
        {out ? (
          onStockNotify ? (
            <button
              type="button"
              onClick={onStockNotify}
              className="mt-2 w-full border border-[var(--brand-ink)]/20 py-2 text-[12px] font-medium text-[var(--brand-ink)] transition hover:bg-[var(--brand-ink)] hover:text-[#f6f1e8]"
            >
              Notify me
            </button>
          ) : (
            <button
              type="button"
              disabled
              className="mt-2 w-full cursor-not-allowed border border-[var(--brand-ink)]/10 py-2 text-[12px] font-medium text-[var(--brand-muted)] opacity-60"
            >
              Notify me
            </button>
          )
        ) : product.multi ? (
          <button
            type="button"
            onClick={onAdd}
            className="mt-2 w-full bg-[var(--brand-ink)] py-2 text-[12px] font-medium text-[#f6f1e8] transition hover:bg-black"
          >
            Choose options
          </button>
        ) : inCartQty >= 1 ? (
          <div
            className="mt-2 flex items-center justify-between border border-[var(--brand-ink)]/15 bg-transparent p-1"
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
              className="flex h-8 w-8 items-center justify-center bg-[var(--brand-ink)] text-base font-bold text-[#f6f1e8] hover:bg-black disabled:cursor-not-allowed disabled:opacity-45"
            >
              +
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={onAdd}
            className={`mt-2 w-full py-2 text-[12px] font-medium text-[#f6f1e8] transition ${
              justAdded ? "bg-[var(--brand-success)]" : "bg-[var(--brand-ink)] hover:bg-black"
            }`}
          >
            {justAdded ? "✓ Added" : "Add to cart"}
          </button>
        )}
      </div>
    </article>
  );
}
